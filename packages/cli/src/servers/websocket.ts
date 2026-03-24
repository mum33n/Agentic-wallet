import { WebSocketServer, WebSocket } from "ws";
import {
  loadConfig,
  addLog,
  mnemonicToSeed,
  simulateTransaction,
  getBalance,
  getConnection,
  requestAirdrop,
  deriveAccount,
  HandlerOptions,
  handleRequest,
  WalletRequest,
  updateAccountStore,
} from "@execra/core";

export interface WSServerOptions {
  port: number;
  options: HandlerOptions;
}

export function startWebSocketServer(opts: WSServerOptions): WebSocketServer {
  const wss = new WebSocketServer({ port: opts.port });

  wss.on("listening", () => {
    addLog("ws", `listening on ws://localhost:${opts.port}`, "success");
    addLog("ws", "/ws/agent → agent programs", "info");
    addLog("ws", "/ws/dapp  → browser companion (window.solana)", "info");
  });

  wss.on("connection", (ws: WebSocket, req) => {
    const path = req.url ?? "/";
    const isAgent = path.includes("/ws/agent");
    const isDapp = path.includes("/ws/dapp");

    addLog("ws", `new connection on ${path}`, "info");

    ws.on("message", async (raw) => {
      let msg: any;

      try {
        msg = JSON.parse(raw.toString());
      } catch {
        ws.send(
          JSON.stringify({ error: { code: -32700, message: "Parse error" } }),
        );
        return;
      }

      addLog("ws", `${msg.method} from ${isAgent ? "agent" : "dapp"}`, "info");

      // ── agent_connect — find or create account by name ─────────────────────
      if (msg.method === "agent_connect") {
        try {
          const { accountName } = msg.params;
          const vault = opts.options.vault;
          const config = loadConfig();

          // Find existing account by name
          let account = config.accountStore.accounts.find(
            (a: any) => a.name.toLowerCase() === accountName.toLowerCase(),
          );

          // Create if not found
          if (!account) {
            const nextIndex = config.accountStore.accounts.length;

            const vaultData = vault.getMnemonic(); // exposed below
            const seed = await mnemonicToSeed(vaultData);
            const keypair = deriveAccount(seed, nextIndex, accountName);

            account = {
              index: nextIndex,
              name: accountName,
              publicKey: keypair.publicKey,
              derivationPath: `m/44'/501'/${nextIndex}'/0'`,
              createdAt: new Date().toISOString(),
            };

            updateAccountStore({
              ...config.accountStore,
              accounts: [...config.accountStore.accounts, account],
            });

            // Reload vault so new keypair is available
            await vault.reload();

            addLog(
              "ws",
              `created account: ${accountName} (${keypair.publicKey})`,
              "success",
            );
          } else {
            addLog(
              "ws",
              `found account: ${accountName} (${account.publicKey})`,
              "info",
            );
          }

          ws.send(
            JSON.stringify({
              id: msg.id,
              result: {
                publicKey: account.publicKey,
                name: account.name,
                index: account.index,
              },
            }),
          );
        } catch (err: any) {
          ws.send(
            JSON.stringify({
              id: msg.id,
              error: { code: 4000, message: err.message },
            }),
          );
        }
        return;
      }

      // ── agent_getKeypair — return secret key for a named account ────────────
      // Only served over /ws/agent (not /ws/dapp) for security
      if (msg.method === "agent_getKeypair") {
        if (!isAgent) {
          ws.send(
            JSON.stringify({
              id: msg.id,
              error: {
                code: 4001,
                message: "agent_getKeypair only available on /ws/agent",
              },
            }),
          );
          return;
        }
        try {
          const { accountName } = msg.params;
          const vault = opts.options.vault;
          const config = loadConfig();

          let account = config.accountStore.accounts.find(
            (a: any) => a.name.toLowerCase() === accountName.toLowerCase(),
          );

          // Create if not found
          if (!account) {
            const nextIndex = config.accountStore.accounts.length;
            const seed = await mnemonicToSeed(vault.getMnemonic());
            const keypair = deriveAccount(seed, nextIndex, accountName);

            account = {
              index: nextIndex,
              name: accountName,
              publicKey: keypair.publicKey,
              derivationPath: `m/44'/501'/${nextIndex}'/0'`,
              createdAt: new Date().toISOString(),
            };

            updateAccountStore({
              ...config.accountStore,
              accounts: [...config.accountStore.accounts, account],
            });

            await vault.reload();
            addLog(
              "ws",
              `created account: ${accountName} (${keypair.publicKey})`,
              "success",
            );
          }

          // Return keypair — secretKey as base64
          const keypair = vault.getKeypair(account.index);
          ws.send(
            JSON.stringify({
              id: msg.id,
              result: {
                publicKey: keypair.publicKey,
                secretKey: Buffer.from(keypair.secretKey).toString("base64"),
                name: keypair.name,
                index: keypair.index,
              },
            }),
          );
        } catch (err: any) {
          ws.send(
            JSON.stringify({
              id: msg.id,
              error: { code: 4000, message: err.message },
            }),
          );
        }
        return;
      }

      // ── solana_getBalance ───────────────────────────────────────────────────
      if (msg.method === "solana_getBalance") {
        try {
          const result = await getBalance(msg.params.publicKey);
          ws.send(JSON.stringify({ id: msg.id, result }));
        } catch (err: any) {
          ws.send(
            JSON.stringify({
              id: msg.id,
              error: { code: 4000, message: err.message },
            }),
          );
        }
        return;
      }

      // ── solana_requestAirdrop ───────────────────────────────────────────────
      if (msg.method === "solana_requestAirdrop") {
        try {
          const sig = await requestAirdrop(
            msg.params.publicKey,
            msg.params.sol ?? 1,
          );
          ws.send(JSON.stringify({ id: msg.id, result: { signature: sig } }));
        } catch (err: any) {
          ws.send(
            JSON.stringify({
              id: msg.id,
              error: { code: 4000, message: err.message },
            }),
          );
        }
        return;
      }

      // ── solana_getTransactions ──────────────────────────────────────────────
      if (msg.method === "solana_getTransactions") {
        try {
          const { PublicKey } = await import("@solana/web3.js");
          const conn = getConnection();
          const sigs = await conn.getSignaturesForAddress(
            new PublicKey(msg.params.publicKey),
            { limit: msg.params.limit ?? 10 },
          );
          ws.send(
            JSON.stringify({
              id: msg.id,
              result: { signatures: sigs.map((s: any) => s.signature) },
            }),
          );
        } catch (err: any) {
          ws.send(
            JSON.stringify({
              id: msg.id,
              error: { code: 4000, message: err.message },
            }),
          );
        }
        return;
      }

      // ── solana_simulateTransaction ──────────────────────────────────────────
      if (msg.method === "solana_simulateTransaction") {
        try {
          const vault = opts.options.vault;
          const keypair = vault.getActiveKeypair();
          const result = await simulateTransaction(
            msg.params.transaction,
            keypair.publicKey,
          );
          ws.send(JSON.stringify({ id: msg.id, result }));
        } catch (err: any) {
          ws.send(
            JSON.stringify({
              id: msg.id,
              error: { code: 4000, message: err.message },
            }),
          );
        }
        return;
      }

      // ── All other methods → main handler ────────────────────────────────────
      const request: WalletRequest = msg;
      const response = await handleRequest(request, opts.options);
      ws.send(JSON.stringify(response));

      if (response.error) {
        addLog("ws", `error: ${response.error.message}`, "error");
      } else {
        addLog("ws", `${request.method} handled`, "success");
      }
    });

    ws.on("close", () => {
      addLog("ws", `connection closed on ${path}`, "info");
    });

    ws.on("error", (err) => {
      addLog("ws", `error: ${err.message}`, "error");
    });
  });

  return wss;
}
