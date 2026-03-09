import { WebSocketServer, WebSocket } from "ws";
import { handleRequest, WalletRequest, HandlerOptions } from "./handler";
import { deriveAccount } from "../vault/accounts";
import chalk from "chalk";
import { getBalance, getConnection, requestAirdrop } from "../solana/rpc";
import { simulateTransaction } from "../solana/simulate";
import { loadConfig, mnemonicToSeed, updateAccountStore } from "../vault";

export interface WSServerOptions {
  port: number;
  options: HandlerOptions;
}

export function startWebSocketServer(opts: WSServerOptions): WebSocketServer {
  const wss = new WebSocketServer({ port: opts.port });

  wss.on("listening", () => {
    console.log(
      chalk.green(
        `[WS] WebSocket server listening on ws://localhost:${opts.port}`,
      ),
    );
    console.log(chalk.dim(`  /ws/agent  → agent programs`));
    console.log(chalk.dim(`  /ws/dapp   → browser companion (window.solana)`));
  });

  wss.on("connection", (ws: WebSocket, req) => {
    const path = req.url ?? "/";
    const isAgent = path.includes("/ws/agent");
    const isDapp = path.includes("/ws/dapp");

    console.log(chalk.cyan(`[WS] New connection on ${path}`));

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

      console.log(
        chalk.yellow(`[WS] ${msg.method} from ${isAgent ? "agent" : "dapp"}`),
      );

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

            console.log(
              chalk.green(
                `[WS] Created account: ${accountName} (${keypair.publicKey})`,
              ),
            );
          } else {
            console.log(
              chalk.dim(
                `[WS] Found account: ${accountName} (${account.publicKey})`,
              ),
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
            console.log(
              chalk.green(
                `[WS] Created account: ${accountName} (${keypair.publicKey})`,
              ),
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
        console.log(
          chalk.red(
            `[WS] Request handled with error: ${response.error.message}`,
          ),
        );
      } else {
        console.log(chalk.green(`[WS] Request handled successfully`));
      }
    });

    ws.on("close", () => {
      console.log(chalk.dim(`[WS] Connection closed on ${path}`));
    });

    ws.on("error", (err) => {
      console.error(chalk.red(`[WS] Error: ${err.message}`));
    });
  });

  return wss;
}
