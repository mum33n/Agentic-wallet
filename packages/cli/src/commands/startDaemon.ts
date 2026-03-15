import chalk from "chalk";
import {
  cmdInit,
  deriveAccount,
  HandlerOptions,
  inkPassword,
  loadConfig,
  loadVault,
  mnemonicToSeed,
  startInkUI,
  vaultExists,
  WalletVault,
  initWalletConnect,
} from "core";
import { startWebSocketServer } from "../servers/websocket";

const WS_PORT = parseInt(process.env.WS_PORT ?? "3000");
const WC_PROJECT_ID = process.env.WALLETCONNECT_PROJECT_ID ?? "";
export let WALLET_PASS = process.env.WALLET_PASSWORD ?? "";

export async function startDaemon() {
  // ── 1. Init vault if missing ─────────────────────────────────────────────────
  if (!vaultExists()) {
    console.log(chalk.yellow("No vault found. Creating one now.\n"));
    await cmdInit();
    if (!vaultExists()) process.exit(0);
  }

  // ── 2. Unlock vault ──────────────────────────────────────────────────────────
  // askPassword pauses rl, takes raw mode, then resumes rl — no new readline needed
  if (!WALLET_PASS) {
    WALLET_PASS = await inkPassword("Vault password:");
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
      projectId: WC_PROJECT_ID!,
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

  startInkUI(
    walletVault,
    () => [],
    () => {},
  );
}
