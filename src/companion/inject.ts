/**
 * Agentic Wallet — Browser Companion Script
 *
 * Drop this via a <script> tag or Tampermonkey to register
 * window.solana so any Solana dApp finds the Agentic Wallet.
 *
 * Usage:
 *   <script src="inject.js"></script>
 *
 * The script opens a persistent WebSocket to the wallet daemon
 * at ws://localhost:3000/ws/dapp and proxies all wallet calls.
 */

interface WalletStandardEvent extends Event {
  detail?: { register: (provider: unknown) => void };
}

declare global {
  interface Window {
    solana?: unknown;
  }
}

(function () {
  const WS_URL = "ws://localhost:3000/ws/dapp";
  let ws: WebSocket | null = null;
  let ready = false;

  // Pending promise resolvers keyed by request id
  const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
  let nextId = 1;

  function connect() {
    ws = new WebSocket(WS_URL);

    ws.addEventListener("open", () => {
      console.log("[AgenticWallet] Connected to wallet daemon");
      ready = true;
    });

    ws.addEventListener("message", (event) => {
      try {
        const msg = JSON.parse(event.data);
        const entry = pending.get(msg.id);
        if (!entry) return;
        pending.delete(msg.id);
        msg.error ? entry.reject(new Error(msg.error.message)) : entry.resolve(msg.result);
      } catch (e) {
        console.error("[AgenticWallet] Bad message", e);
      }
    });

    ws.addEventListener("close", () => {
      ready = false;
      console.warn("[AgenticWallet] Daemon disconnected. Retrying in 3s...");
      setTimeout(connect, 3_000);
    });

    ws.addEventListener("error", () => {
      console.error("[AgenticWallet] WebSocket error");
    });
  }

  function send(method: string, params: unknown): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!ready || !ws) {
        reject(new Error("Agentic Wallet daemon not connected"));
        return;
      }
      const id = nextId++;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  // ── Public key cache (set on connect) ─────────────────────────────────────
  let _publicKey: string | null = null;

  // ── window.solana provider ─────────────────────────────────────────────────
  const AgenticWalletProvider = {
    isAgenticWallet: true,
    isPhantom: false, // don't masquerade as Phantom

    get publicKey() {
      return _publicKey
        ? { toString: () => _publicKey, toBase58: () => _publicKey }
        : null;
    },

    async connect() {
      const result = await send("solana_connect", {}) as { publicKey: string };
      _publicKey = result.publicKey;
      return { publicKey: AgenticWalletProvider.publicKey };
    },

    async disconnect() {
      await send("solana_disconnect", {});
      _publicKey = null;
    },

    async signTransaction(transaction: { serialize: (opts: { requireAllSignatures: boolean }) => Uint8Array }) {
      const serialized = transaction.serialize({ requireAllSignatures: false });
      const encoded = btoa(String.fromCharCode(...serialized));
      const result = await send("solana_signTransaction", {
        transaction: encoded,
      }) as { transaction: string };
      const bytes = Uint8Array.from(atob(result.transaction), (c) =>
        c.charCodeAt(0),
      );
      // Return deserialized — dApp handles the actual Transaction object
      return bytes;
    },

    async signAllTransactions(transactions: Array<{ serialize: (opts: { requireAllSignatures: boolean }) => Uint8Array }>) {
      const encoded = transactions.map((tx) => {
        const s = tx.serialize({ requireAllSignatures: false });
        return btoa(String.fromCharCode(...s));
      });
      const result = await send("solana_signAllTransactions", {
        transactions: encoded,
      }) as { transactions: string[] };
      return result.transactions.map((t: string) =>
        Uint8Array.from(atob(t), (c) => c.charCodeAt(0)),
      );
    },

    async signAndSendTransaction(
      transaction: { serialize: (opts: { requireAllSignatures: boolean }) => Uint8Array },
      options: unknown,
    ) {
      const serialized = transaction.serialize({ requireAllSignatures: false });
      const encoded = btoa(String.fromCharCode(...serialized));
      const result = await send("solana_signAndSendTransaction", {
        transaction: encoded,
        options,
      }) as { signature: string };
      return { signature: result.signature };
    },

    async signMessage(message: Uint8Array) {
      const encoded = btoa(String.fromCharCode(...message));
      const result = await send("solana_signMessage", { message: encoded }) as { signature: string };
      return {
        signature: Uint8Array.from(atob(result.signature), (c) =>
          c.charCodeAt(0),
        ),
        publicKey: AgenticWalletProvider.publicKey,
      };
    },
  };

  // Register on window — dApps check window.solana
  if (!window.solana) {
    window.solana = AgenticWalletProvider;
    console.log("[AgenticWallet] Registered as window.solana");
  } else {
    console.warn(
      "[AgenticWallet] window.solana already taken by another wallet",
    );
  }

  // Also register with Wallet Standard if available
  if (window.addEventListener) {
    window.addEventListener("wallet-standard:app-ready", (e) => {
      (e as WalletStandardEvent).detail?.register(AgenticWalletProvider);
    });
  }

  connect();
})();
