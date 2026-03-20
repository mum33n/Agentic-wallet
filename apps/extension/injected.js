/**
 * injected.js
 *
 * Runs in the main page context at document_start.
 * Registers window.solana AND the Wallet Standard interface
 * so Jupiter and all modern Solana dApps discover the wallet.
 *
 * Wallet Standard spec:
 * https://github.com/wallet-standard/wallet-standard
 */

(function () {
  let nextId = 1;
  const pending = new Map();

  // ── Base58 decoder ─────────────────────────────────────────────────────────
  // Needed to convert base58 public keys to raw 32-byte Uint8Array
  // which is what the Wallet Standard requires.

  const BASE58_ALPHABET =
    "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const BASE58_MAP = new Uint8Array(256).fill(255);
  for (let i = 0; i < BASE58_ALPHABET.length; i++) {
    BASE58_MAP[BASE58_ALPHABET.charCodeAt(i)] = i;
  }

  function decodeBase58(str) {
    // Count leading '1's (each represents a leading zero byte)
    let leadingZeros = 0;
    for (const c of str) {
      if (c === "1") leadingZeros++;
      else break;
    }

    const size = Math.ceil((str.length * 733) / 1000) + 1; // log(58) / log(256) ≈ 0.733
    const bytes = new Uint8Array(size);

    for (let i = 0; i < str.length; i++) {
      let value = BASE58_MAP[str.charCodeAt(i)];
      if (value === 255) throw new Error("Invalid base58 character: " + str[i]);

      let carry = value;
      for (let j = size - 1; j >= 0; j--) {
        carry += 58 * bytes[j];
        bytes[j] = carry & 0xff;
        carry >>= 8;
      }
    }

    // Find first non-zero byte
    let firstNonZero = 0;
    while (firstNonZero < size && bytes[firstNonZero] === 0) firstNonZero++;

    // Result: leading zeros + decoded bytes
    const result = new Uint8Array(leadingZeros + (size - firstNonZero));
    result.set(bytes.subarray(firstNonZero), leadingZeros);
    return result;
  }

  // ── Response listener from content-script ─────────────────────────────────

  window.addEventListener("AgenticWallet:response", (event) => {
    const msg = event.detail;
    const entry = pending.get(msg.id);
    if (!entry) return;
    pending.delete(msg.id);
    msg.error
      ? entry.reject(new Error(msg.error.message))
      : entry.resolve(msg.result);
  });

  // ── Send to daemon via content-script relay ────────────────────────────────

  function send(method, params) {
    return new Promise((resolve, reject) => {
      const id = nextId++;
      pending.set(id, { resolve, reject });

      window.dispatchEvent(
        new CustomEvent("AgenticWallet:request", {
          detail: { id, method, params },
        }),
      );

      setTimeout(() => {
        if (pending.has(id)) {
          pending.delete(id);
          reject(new Error("Agentic Wallet: request timed out"));
        }
      }, 30_000);
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  let _publicKey = null;

  function toUint8Array(b64) {
    return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  }

  function toBase64(bytes) {
    return btoa(String.fromCharCode(...bytes));
  }

  function serializeTx(transaction) {
    try {
      return toBase64(transaction.serialize({ requireAllSignatures: false }));
    } catch {
      // VersionedTransaction
      return toBase64(transaction.serialize());
    }
  }

  // ── window.solana (legacy adapter support) ────────────────────────────────

  const legacyProvider = {
    isAgenticWallet: true,
    isPhantom: false,

    get publicKey() {
      return _publicKey
        ? { toString: () => _publicKey, toBase58: () => _publicKey }
        : null;
    },
    get connected() {
      return _publicKey !== null;
    },

    async connect() {
      const result = await send("solana_connect", {});
      _publicKey = result.publicKey;
      legacyProvider._emit("connect", legacyProvider.publicKey);
      return { publicKey: legacyProvider.publicKey };
    },

    async disconnect() {
      await send("solana_disconnect", {});
      _publicKey = null;
      legacyProvider._emit("disconnect");
    },

    async signTransaction(tx) {
      const result = await send("solana_signTransaction", {
        transaction: serializeTx(tx),
      });
      return toUint8Array(result.signedTransaction);
    },

    async signAllTransactions(txs) {
      const result = await send("solana_signAllTransactions", {
        transactions: txs.map(serializeTx),
      });
      return result.signedTransactions.map(toUint8Array);
    },

    async signAndSendTransaction(tx, options) {
      const result = await send("solana_signAndSendTransaction", {
        transaction: serializeTx(tx),
        options: options ?? {},
      });
      return { signature: result.signature };
    },

    async signMessage(message) {
      const result = await send("solana_signMessage", {
        message: toBase64(message),
      });
      return {
        signature: toUint8Array(result.signature),
        publicKey: legacyProvider.publicKey,
      };
    },

    _listeners: {},
    on(e, fn) {
      (this._listeners[e] ??= []).push(fn);
      return this;
    },
    off(e, fn) {
      this._listeners[e] = (this._listeners[e] ?? []).filter((l) => l !== fn);
      return this;
    },
    _emit(e, ...a) {
      (this._listeners[e] ?? []).forEach((fn) => fn(...a));
    },
  };

  // Register window.solana for legacy dApps
  if (!window.solana) {
    window.solana = legacyProvider;
  }

  // ── Wallet Standard registration ───────────────────────────────────────────
  // Jupiter and modern dApps use this interface exclusively.
  // Must implement all required features exactly as specified.

  const SOLANA_CHAINS = [
    "solana:mainnet-beta",
    "solana:devnet",
    "solana:testnet",
  ];

  const standardWallet = {
    version: "1.0.0",
    name: "Agentic Wallet",
    icon: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgdmlld0JveD0iMCAwIDEyOCAxMjgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iNjQiIGN5PSI2NCIgcj0iNjQiIGZpbGw9IiM2MzY2RjEiLz48dGV4dCB4PSI1MCUiIHk9IjU1JSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1zaXplPSI2NCIgZmlsbD0id2hpdGUiPuKencK8L3RleHQ+PC9zdmc+",
    chains: SOLANA_CHAINS,
    features: {
      // ── standard:connect ──────────────────────────────────────────────────
      "standard:connect": {
        version: "1.0.0",
        async connect({ silent } = {}) {
          if (silent && _publicKey) {
            return { accounts: [makeStandardAccount()] };
          }
          const result = await send("solana_connect", {});
          _publicKey = result.publicKey;
          standardWallet._notifyListeners("change", {
            accounts: [makeStandardAccount()],
          });
          return { accounts: [makeStandardAccount()] };
        },
      },

      // ── standard:disconnect ───────────────────────────────────────────────
      "standard:disconnect": {
        version: "1.0.0",
        async disconnect() {
          await send("solana_disconnect", {});
          _publicKey = null;
          standardWallet._notifyListeners("change", { accounts: [] });
        },
      },

      // ── standard:events ───────────────────────────────────────────────────
      "standard:events": {
        version: "1.0.0",
        on(event, listener) {
          standardWallet._on(event, listener);
          return () => standardWallet._off(event, listener);
        },
      },

      // ── solana:signTransaction ─────────────────────────────────────────────
      "solana:signTransaction": {
        version: "1.0.0",
        supportedTransactionVersions: ["legacy", 0],
        async signTransaction(...inputs) {
          return Promise.all(
            inputs.map(async ({ transaction }) => {
              const result = await send("solana_signTransaction", {
                transaction: toBase64(transaction),
              });
              return {
                signedTransaction: toUint8Array(result.signedTransaction),
              };
            }),
          );
        },
      },

      // ── solana:signAndSendTransaction ─────────────────────────────────────
      "solana:signAndSendTransaction": {
        version: "1.0.0",
        supportedTransactionVersions: ["legacy", 0],
        async signAndSendTransaction(...inputs) {
          return Promise.all(
            inputs.map(async ({ transaction, options }) => {
              const result = await send("solana_signAndSendTransaction", {
                transaction: toBase64(transaction),
                options: options ?? {},
              });
              // Wallet Standard expects raw Uint8Array(64) signature bytes
              return { signature: decodeBase58(result.signature) };
            }),
          );
        },
      },

      // ── solana:signMessage ─────────────────────────────────────────────────
      "solana:signMessage": {
        version: "1.0.0",
        async signMessage(...inputs) {
          return Promise.all(
            inputs.map(async ({ message, account }) => {
              const result = await send("solana_signMessage", {
                message: toBase64(message),
              });
              return {
                signedMessage: message,
                signature: toUint8Array(result.signature),
              };
            }),
          );
        },
      },
    },

    // ── Accounts ─────────────────────────────────────────────────────────────

    get accounts() {
      return _publicKey ? [makeStandardAccount()] : [];
    },

    // ── Event emitter ─────────────────────────────────────────────────────────

    _listeners: {},

    _on(event, fn) {
      (this._listeners[event] ??= []).push(fn);
    },
    _off(event, fn) {
      this._listeners[event] = (this._listeners[event] ?? []).filter(
        (l) => l !== fn,
      );
    },

    _notifyListeners(event, ...args) {
      (this._listeners[event] ?? []).forEach((fn) => fn(...args));
    },
  };

  function makeStandardAccount() {
    // publicKey must be raw 32 bytes — Jupiter passes this directly
    // to new PublicKey(bytes) and will throw if it's not exactly 32 bytes
    const pubkeyBytes = _publicKey
      ? decodeBase58(_publicKey)
      : new Uint8Array(32);

    return {
      address: _publicKey ?? "",
      publicKey: pubkeyBytes,
      chains: SOLANA_CHAINS,
      features: Object.keys(standardWallet.features),
    };
  }

  // ── Register with Wallet Standard ─────────────────────────────────────────
  // Two registration paths:
  //   1. App not yet loaded — fire register-wallet, app picks it up on init
  //   2. App already loaded — fire app-ready response directly

  function registerWallet(register) {
    register(standardWallet);
  }

  // Path 1: we load first — tell the app about us when it initialises
  window.addEventListener("wallet-standard:app-ready", ({ detail }) => {
    detail.register(standardWallet);
  });

  // Path 2: app loaded first — tell it about us immediately
  window.dispatchEvent(
    new CustomEvent("wallet-standard:register-wallet", {
      bubbles: false,
      cancelable: false,
      composed: false,
      detail: { register: registerWallet },
    }),
  );

  console.log("[AgenticWallet] Registered — window.solana + Wallet Standard");
})();
