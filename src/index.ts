#!/usr/bin/env node
// import "dotenv/config";
import * as readline from "readline";
import chalk from "chalk";
import { vaultExists, loadVault } from "./vault/keystore";
import { loadConfig } from "./vault/config";
import { mnemonicToSeed } from "./vault/mnemonic";
import { deriveAccount } from "./vault/accounts";
import { WalletVault } from "./vault";
import { startWebSocketServer } from "./bridge/websocket";
import { initWalletConnect } from "./bridge/walletConnect";
import { startRepl } from "./cli/repl";
import { setReadline, askPassword } from "./cli/prompts";
import { cmdInit } from "./cli/commands";
import type { HandlerOptions } from "./bridge/handler";

const WS_PORT = parseInt(process.env.WS_PORT ?? "3000");
const WC_PROJECT_ID = process.env.WALLETCONNECT_PROJECT_ID ?? "";
export let WALLET_PASS = process.env.WALLET_PASSWORD ?? "";
const args = process.argv.slice(2);

// ── Create ONE readline for the entire process lifetime ───────────────────────
// Never close it. askPassword pauses/resumes it. The REPL reuses it.
// Creating a second readline, or closing and reopening, corrupts stdin echo.

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: chalk.green("wallet") + chalk.dim(" › "),
});
setReadline(rl);

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(chalk.bold("\n⬡  Agentic Wallet\n"));

  if (args[0] === "init") {
    await cmdInit();
    process.exit(0);
  }

  await startDaemon();
}

async function startDaemon() {
  // ── 1. Init vault if missing ─────────────────────────────────────────────────
  if (!vaultExists()) {
    console.log(chalk.yellow("No vault found. Creating one now.\n"));
    await cmdInit();
    if (!vaultExists()) process.exit(0);
  }

  // ── 2. Unlock vault ──────────────────────────────────────────────────────────
  // askPassword pauses rl, takes raw mode, then resumes rl — no new readline needed
  if (!WALLET_PASS) {
    WALLET_PASS = await askPassword("Vault password: ");
  }

  let vaultData: { mnemonic: string; createdAt: string; version: number };
  try {
    vaultData = await loadVault(WALLET_PASS);
  } catch {
    console.log(chalk.red("\nWrong password.\n"));
    process.exit(1);
  }

  // ── 3. Derive active account ─────────────────────────────────────────────────
  const config = loadConfig();
  const entry = config.accountStore.accounts.find(
    (a) => a.index === config.accountStore.activeIndex,
  );
  if (!entry) {
    console.log(chalk.red("No active account. Run: accounts new"));
    process.exit(1);
  }

  const seed = await mnemonicToSeed(vaultData.mnemonic);
  const account = deriveAccount(seed, entry.index, entry.name);

  console.log(chalk.green("\n✓ Vault unlocked"));
  console.log(chalk.dim(`  Account: ${account.name} (${account.publicKey})`));
  console.log(chalk.dim(`  Network: ${config.cluster}`));

  // ── 4. Build vault instance ──────────────────────────────────────────────────
  const walletVault = new WalletVault();
  await walletVault.unlock(WALLET_PASS);
  const handlerOptions: HandlerOptions = { vault: walletVault };

  // ── 5. WebSocket server ──────────────────────────────────────────────────────
  startWebSocketServer({ port: WS_PORT, options: handlerOptions });
  console.log(chalk.green(`\n✓ WebSocket server on ws://localhost:${WS_PORT}`));
  console.log(chalk.dim(`  Agents → /ws/agent`));
  console.log(chalk.dim(`  dApps  → /ws/dapp`));

  // ── 6. WalletConnect ─────────────────────────────────────────────────────────
  if (WC_PROJECT_ID) {
    await initWalletConnect({
      projectId: WC_PROJECT_ID,
      handlerOptions,
      onSessionProposal: async (meta) => {
        console.log(chalk.cyan(`\n[WC] Connected: ${meta.name} (${meta.url})`));
        return true;
      },
    });
    console.log(chalk.green("✓ WalletConnect ready"));
  } else {
    console.log(
      chalk.yellow("\n[WC] Disabled — set WALLETCONNECT_PROJECT_ID to enable"),
    );
  }

  // ── 7. REPL — pass the existing readline, do not create a new one ────────────
  console.log(chalk.dim("\n─────────────────────────────────────"));
  console.log(chalk.dim('  Type "help" for commands.'));
  console.log(chalk.dim("─────────────────────────────────────\n"));

  startRepl(rl);
}

// ── Cleanup ───────────────────────────────────────────────────────────────────

process.on("SIGINT", () => {
  console.log(chalk.dim("\nShutting down.\n"));
  process.exit(0);
});

process.on("uncaughtException", (err) => {
  console.error(chalk.red(`\nError: ${err.message}\n`));
  process.exit(1);
});

main().catch((err) => {
  console.error(chalk.red(`Fatal: ${err.message}`));
  process.exit(1);
});
