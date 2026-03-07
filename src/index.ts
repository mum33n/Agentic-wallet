#!/usr/bin/env node
/**
 * src/index.ts
 *
 * App entry point. Two modes:
 *
 *   wallet             → interactive REPL (no vault required to start)
 *   wallet daemon      → start WebSocket + WalletConnect, then drop into REPL
 *
 * Vault unlock happens inside the REPL via `unlock` command.
 * The daemon reads WALLET_PASSWORD from .env to unlock automatically.
 */

// import 'dotenv/config'
import chalk from "chalk";
import { vaultExists, loadVault } from "./vault/keystore";
import { loadConfig } from "./vault/config";
import { deriveAccount } from "./vault/accounts";
import { mnemonicToSeed } from "./vault/mnemonic";
import { WalletVault } from "./vault";
import { startWebSocketServer } from "./bridge/websocket";
import { initWalletConnect } from "./bridge/walletConnect";
import { startRepl } from "./cli/repl";
import type { HandlerOptions } from "./bridge/handler";
import { askPassword, setReadline } from "./cli/prompts";

const WS_PORT = parseInt(process.env.WS_PORT ?? "3000");
const WC_PROJECT_ID =
  process.env.WALLETCONNECT_PROJECT_ID ?? "a5309d58dcac1d40ae335dc00d87ee09";
export let WALLET_PASS = process.env.WALLET_PASSWORD ?? "";

const args = process.argv.slice(2);
const isDaemon = args.includes("daemon");

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(chalk.bold("\n⬡  Agentic Wallet\n"));

  if (isDaemon) {
    await startDaemon();
  } else {
    startRepl();
  }
}

// ── Daemon mode ───────────────────────────────────────────────────────────────

async function startDaemon() {
  // ── 1. Require vault ────────────────────────────────────────────────────────
  if (!vaultExists()) {
    console.log(chalk.yellow("No vault found. Run `wallet init` first.\n"));
    startRepl();
    return;
  }

  // ── 2. Unlock vault ─────────────────────────────────────────────────────────
  // Use env var for fully autonomous mode, otherwise prompt
  // let password;

  if (!WALLET_PASS) {
    // Need readline for askPassword — create a temporary one
    const readline = await import("readline");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: chalk.green("wallet") + chalk.dim(" › "),
    });
    setReadline(rl);
    // rl.close();
  }
  WALLET_PASS = await askPassword("Vault password: ");

  let vault: VaultData;
  try {
    vault = await loadVault(WALLET_PASS);
  } catch {
    console.log(chalk.red("Wrong password."));
    process.exit(1);
  }

  // ── 3. Derive active account ─────────────────────────────────────────────────
  const config = loadConfig();
  const entry = config.accountStore.accounts.find(
    (a) => a.index === config.accountStore.activeIndex,
  );

  if (!entry) {
    console.log(chalk.red("No active account found in config."));
    process.exit(1);
  }

  const seed = await mnemonicToSeed(vault.mnemonic);
  const account = deriveAccount(seed, entry.index, entry.name);

  console.log(chalk.green("✓ Vault unlocked"));
  console.log(chalk.dim(`  Account: ${account.name} (${account.publicKey})`));
  console.log(chalk.dim(`  Network: ${config.cluster}\n`));

  // ── 4. Build handler options ─────────────────────────────────────────────────
  const walletVault = new WalletVault();
  await walletVault.unlock(WALLET_PASS);

  const handlerOptions: HandlerOptions = {
    vault: walletVault,
  };

  // ── 5. Start WebSocket server ────────────────────────────────────────────────
  startWebSocketServer({ port: WS_PORT, options: handlerOptions });
  console.log(
    chalk.green(`✓ WebSocket server started on ws://localhost:${WS_PORT}`),
  );
  console.log(chalk.dim(`  Agents: ws://localhost:${WS_PORT}/ws/agent`));
  console.log(chalk.dim(`  dApps:  ws://localhost:${WS_PORT}/ws/dapp\n`));

  // ── 6. Start WalletConnect ───────────────────────────────────────────────────
  if (WC_PROJECT_ID) {
    await initWalletConnect({
      projectId: WC_PROJECT_ID,
      handlerOptions,
      onSessionProposal: async (meta) => {
        // In daemon mode — auto-approve all session proposals
        // (agent is autonomous — it decides per-transaction, not per-connection)
        console.log(
          chalk.cyan(
            `[WC] Auto-approved connection from: ${meta.name} (${meta.url})`,
          ),
        );
        return true;
      },
    });
    console.log(chalk.green("✓ WalletConnect ready"));
    console.log(chalk.dim("  Use `connect wc:..." + "` to pair with a dApp\n"));
  } else {
    console.log(
      chalk.yellow(
        "[WC] WALLETCONNECT_PROJECT_ID not set — WalletConnect disabled",
      ),
    );
    console.log(
      chalk.dim("     Get a free ID at https://cloud.walletconnect.com\n"),
    );
  }

  // ── 7. Drop into REPL ────────────────────────────────────────────────────────
  // Daemon stays running via the REPL and WebSocket server
  startRepl();
}

// ── Cleanup ───────────────────────────────────────────────────────────────────

process.on("SIGINT", () => {
  console.log(chalk.dim("\n\nShutting down..."));
  process.exit(0);
});

process.on("uncaughtException", (err) => {
  console.error(chalk.red(`Uncaught error: ${err.message}`));
  process.exit(1);
});

// ── Boot ──────────────────────────────────────────────────────────────────────

main().catch((err) => {
  console.error(chalk.red(`Fatal: ${err.message}`));
  process.exit(1);
});

// ── Internal type (avoid circular import) ────────────────────────────────────
interface VaultData {
  mnemonic: string;
  createdAt: string;
  version: number;
}
