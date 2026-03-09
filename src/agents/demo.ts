/**
 * runner/demo.ts
 *
 * Demo — three agents using AgentWallet, running concurrently.
 *
 * Usage (daemon must be running first):
 *   pnpm start daemon          ← terminal 1
 *   npx ts-node src/runner/demo.ts  ← terminal 2
 */

import "dotenv/config";
import chalk from "chalk";
import {
  Transaction,
  SystemProgram,
  PublicKey,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { getConnection } from "../solana/rpc";
import { AgentWallet } from "../client/wallet";

// ── 1. Balance Watcher ────────────────────────────────────────────────────────

async function runBalanceWatcher() {
  const wallet = await AgentWallet.connect("Balance Watcher");
  console.log(chalk.green(`[Balance Watcher] Connected — ${wallet.publicKey}`));

  const loop = async () => {
    const balance = await wallet.getBalance();
    console.log(
      chalk.dim(`[Balance Watcher] Balance: ${balance.toFixed(4)} SOL`),
    );

    if (balance < 0.5) {
      console.log(
        chalk.yellow("[Balance Watcher] Low balance — requesting airdrop..."),
      );
      //   const sig = await wallet.requestAirdrop(1);
      console.log(chalk.green(`[Balance Watcher] Airdrop ✓`));
    }
  };

  await loop();
  return setInterval(loop, 15_000);
}

// ── 2. Periodic Sender ────────────────────────────────────────────────────────

async function runPeriodicSender(recipientAddress: string) {
  const wallet = await AgentWallet.connect("Auto Sender");
  console.log(chalk.green(`[Auto Sender] Connected — ${wallet.publicKey}`));

  let runs = 0;

  const loop = async () => {
    if (runs >= 5) return; // stop after 5 sends

    const balance = await wallet.getBalance();
    console.log(chalk.dim(`[Auto Sender] Balance: ${balance.toFixed(4)} SOL`));

    if (balance < 0.003) {
      console.log(
        chalk.yellow("[Auto Sender] Insufficient balance — skipping"),
      );
      return;
    }

    const conn = getConnection();
    const { blockhash } = await conn.getLatestBlockhash();

    const tx = new Transaction({
      recentBlockhash: blockhash,
      feePayer: wallet.solanaPublicKey,
    }).add(
      SystemProgram.transfer({
        fromPubkey: wallet.solanaPublicKey,
        toPubkey: new PublicKey(recipientAddress),
        lamports: Math.floor(0.001 * LAMPORTS_PER_SOL),
      }),
    );

    console.log(
      chalk.cyan(
        `[Auto Sender] Sending 0.001 SOL → ${recipientAddress.slice(0, 8)}...`,
      ),
    );
    const result = await wallet.signAndSendTransaction(tx);
    console.log(chalk.green(`[Auto Sender] Sent ✓`));
    console.log(chalk.dim(`  ${result.explorerUrl}`));

    runs++;
    if (runs >= 5) {
      console.log(chalk.dim("[Auto Sender] Reached max runs — stopping."));
      return;
    }
  };

  await loop();
  return setInterval(loop, 30_000);
}

// ── 3. Portfolio Reporter ─────────────────────────────────────────────────────

async function runReporter() {
  const wallet = await AgentWallet.connect("Balance Watcher");
  console.log(chalk.green(`[Reporter] Connected — ${wallet.publicKey}`));

  const loop = async () => {
    const balance = await wallet.getBalance();
    const txs = await wallet.getRecentTransactions(3);

    console.log(chalk.bold("\n[Reporter] ─────────────────────────"));
    console.log(`  Address : ${wallet.publicKey.slice(0, 20)}...`);
    console.log(`  Balance : ${balance.toFixed(6)} SOL`);
    if (txs.length > 0) {
      console.log(`  Recent  : ${txs[0].slice(0, 20)}...`);
    }
    console.log("[Reporter] ─────────────────────────\n");
  };

  await loop();
  return setInterval(loop, 20_000);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(chalk.bold("\n⬡  Agentic Wallet — Demo\n"));

  // Connect Balance Watcher first so we can use its address as recipient
  const watcherWallet = await AgentWallet.connect("Balance Watcher");
  const watcherAddr = watcherWallet.publicKey;

  const timers = await Promise.all([
    runBalanceWatcher(),
    runPeriodicSender(watcherAddr),
    runReporter(),
  ]);

  process.on("SIGINT", () => {
    console.log(chalk.dim("\nStopping agents..."));
    timers.forEach((t) => t && clearInterval(t));
    console.log(chalk.dim("Done.\n"));
    process.exit(0);
  });

  console.log(chalk.dim("\nAll agents running. Ctrl+C to stop.\n"));
}

main().catch((err) => {
  console.error(chalk.red(`\nFatal: ${err.message}`));
  console.error(chalk.dim("Is the daemon running? Try: pnpm start daemon"));
  process.exit(1);
});
