import chalk from "chalk";
import inquirer from "inquirer";
import { generateMnemonic, mnemonicToSeed } from "../vault/mnemonic";
import { saveVault, loadVault, vaultExists } from "../vault/keystore";
import { deriveAccount } from "../vault/accounts";
import { getBalance, requestAirdrop } from "../solana/rpc";
import {
  updateCluster,
  loadConfig,
  updateAccountStore,
  createConfig,
  saveConfig,
} from "../vault/config";
import { getAllSessions } from "../bridge/session";
import { pairWithDapp, disconnectDapp } from "../bridge/walletConnect";
import { askPassword } from "./prompts";
import { WALLET_PASS } from "..";

// ── In-memory session ─────────────────────────────────────────────────────────

let sessionPassword: string | null = null;
let sessionMnemonic: string | null = null;

export function isUnlocked(): boolean {
  return sessionMnemonic !== null;
}

async function requireUnlocked(): Promise<{
  password: string;
  mnemonic: string;
}> {
  if (WALLET_PASS && !sessionMnemonic) {
    const vault = await loadVault(WALLET_PASS);
    sessionPassword = WALLET_PASS;

    sessionMnemonic = vault.mnemonic;
  }
  if (!sessionPassword || !sessionMnemonic) {
    throw new Error("Wallet is locked. Run: wallet unlock");
  }
  return { password: sessionPassword, mnemonic: sessionMnemonic };
}

// ── init ──────────────────────────────────────────────────────────────────────

export async function cmdInit(): Promise<void> {
  if (vaultExists()) {
    console.log(
      chalk.yellow("Vault already exists. Use `wallet unlock` to access it."),
    );
    return;
  }

  const { wordCount } = await inquirer.prompt([
    {
      type: "list",
      name: "wordCount",
      message: "Mnemonic length:",
      choices: [
        { name: "12 words (standard)", value: 12 },
        { name: "24 words (extra secure)", value: 24 },
      ],
      default: 12,
    },
  ]);

  const { mnemonic } = generateMnemonic(wordCount);

  console.log(
    chalk.bold("\n⚠️  Write down your seed phrase. Store it safely.\n"),
  );
  console.log(chalk.yellow(mnemonic));
  console.log();

  const { confirmed } = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirmed",
      message: "I have written down my seed phrase",
      default: false,
    },
  ]);
  if (!confirmed) {
    console.log(chalk.red("Aborted."));
    return;
  }

  //   const  password  = await inquirer.prompt([
  //     {
  //       type: "password",
  //       name: "password",
  //       message: "Set vault password:",
  //       mask: "*",
  //     },
  //   ]);

  const password = await askPassword("Set vault password:");
  //   const { confirm } = await inquirer.prompt([
  //     {
  //       type: "password",
  //       name: "confirm",
  //       message: "Confirm password:",
  //       mask: "*",
  //     },
  //   ]);

  const confirm = await askPassword("Confirm password:");

  if (password !== confirm) {
    console.log(chalk.red("Passwords do not match."));
    return;
  }

  // Derive first account public key
  const seed = await mnemonicToSeed(mnemonic);
  const firstKp = deriveAccount(seed, 0, "Main");

  // Save encrypted vault (mnemonic only)
  await saveVault(
    { mnemonic, createdAt: new Date().toISOString(), version: 1 },
    password,
  );

  // Save account metadata to config
  const config = createConfig("");
  config.accountStore.accounts[0] = {
    index: 0,
    name: "Main",
    publicKey: firstKp.publicKey,
    derivationPath: `m/44'/501'/0'/0'`,
    createdAt: new Date().toISOString(),
  };
  saveConfig(config);

  sessionPassword = password;
  sessionMnemonic = mnemonic;

  console.log(chalk.green("\n✓ Wallet created"));
  console.log(chalk.dim(`  Address: ${firstKp.publicKey}`));
}

// ── unlock ────────────────────────────────────────────────────────────────────

export async function cmdUnlock(): Promise<void> {
  if (!vaultExists()) {
    console.log(chalk.red("No vault found. Run: wallet init"));
    return;
  }

  const password = await askPassword("Vault password: ");

  try {
    const vault = await loadVault(password);
    sessionPassword = password;
    sessionMnemonic = vault.mnemonic;
    console.log(chalk.green("✓ Wallet unlocked"));
  } catch {
    console.log(chalk.red("Wrong password."));
  }
}

// ── lock ──────────────────────────────────────────────────────────────────────

export function cmdLock(): void {
  sessionPassword = null;
  sessionMnemonic = null;
  console.log(chalk.green("✓ Wallet locked"));
}

// ── accounts ──────────────────────────────────────────────────────────────────

export async function cmdAccounts(): Promise<void> {
  await requireUnlocked();
  const config = loadConfig();

  console.log(chalk.bold("\n── Accounts ─────────────────────────"));
  for (const entry of config.accountStore.accounts) {
    const active = entry.index === config.accountStore.activeIndex;
    const marker = active ? chalk.green("●") : chalk.dim("○");
    let balance = "...";
    try {
      const { sol } = await getBalance(entry.publicKey);
      balance = sol.toFixed(4) + " SOL";
    } catch {}
    console.log(
      `  ${marker} [${entry.index}] ${entry.name.padEnd(16)} ${entry.publicKey}  ${balance}`,
    );
  }
  console.log(chalk.dim(`\n  Network: ${config.cluster} (${config.rpcUrl})`));
  console.log("─────────────────────────────────────\n");
}

// ── accounts new ──────────────────────────────────────────────────────────────

export async function cmdNewAccount(name: string): Promise<void> {
  const { mnemonic } = await requireUnlocked();
  const config = loadConfig();
  const nextIndex = config.accountStore.accounts.length;
  const accountName = name || `Account ${nextIndex + 1}`;
  const seed = await mnemonicToSeed(mnemonic);
  const keypair = deriveAccount(seed, nextIndex, accountName);

  updateAccountStore({
    ...config.accountStore,
    accounts: [
      ...config.accountStore.accounts,
      {
        index: nextIndex,
        name: accountName,
        publicKey: keypair.publicKey,
        derivationPath: `m/44'/501'/${nextIndex}'/0'`,
        createdAt: new Date().toISOString(),
      },
    ],
  });

  console.log(chalk.green(`✓ Account created: ${accountName}`));
  console.log(chalk.dim(`  Address: ${keypair.publicKey}`));
}

// ── accounts use ──────────────────────────────────────────────────────────────

export async function cmdUseAccount(nameOrIndex: string): Promise<void> {
  await requireUnlocked();
  const config = loadConfig();
  const found = config.accountStore.accounts.find(
    (a) => a.name === nameOrIndex || a.index === parseInt(nameOrIndex),
  );
  if (!found) {
    console.log(chalk.red(`Account not found: ${nameOrIndex}`));
    return;
  }

  updateAccountStore({ ...config.accountStore, activeIndex: found.index });
  console.log(
    chalk.green(`✓ Active account: ${found.name} (${found.publicKey})`),
  );
}

// ── airdrop ───────────────────────────────────────────────────────────────────

export async function cmdAirdrop(sol: number = 1): Promise<void> {
  await requireUnlocked();
  const config = loadConfig();
  const active = config.accountStore.accounts.find(
    (a) => a.index === config.accountStore.activeIndex,
  );
  if (!active) {
    console.log(chalk.red("No active account."));
    return;
  }

  console.log(chalk.dim(`Requesting ${sol} SOL airdrop...`));
  try {
    const sig = await requestAirdrop(active.publicKey, sol);
    console.log(chalk.green(`✓ Airdrop complete`));
    console.log(chalk.dim(`  tx: ${sig}`));
  } catch (err: any) {
    console.log(chalk.red(`Airdrop failed: ${err.message}`));
  }
}

// ── connect ───────────────────────────────────────────────────────────────────

export async function cmdConnect(wcUri: string): Promise<void> {
  if (!wcUri || !wcUri.startsWith("wc:")) {
    console.log(chalk.red("Invalid WalletConnect URI. Must start with wc:"));
    return;
  }
  console.log(chalk.dim("Pairing with dApp..."));
  await pairWithDapp(wcUri);
}

// ── sessions ──────────────────────────────────────────────────────────────────

export function cmdSessions(): void {
  const sessions = getAllSessions();
  if (sessions.length === 0) {
    console.log(chalk.dim("No active sessions."));
    return;
  }

  console.log(chalk.bold("\n── Connected dApps ──────────────────"));
  sessions.forEach((s) => {
    console.log(
      `  ${chalk.cyan(s.dappName.padEnd(20))} ` +
        `${s.connectedAccount.slice(0, 8)}...  ` +
        `since ${s.connectedAt.slice(0, 10)}`,
    );
    console.log(
      chalk.dim(`    ${s.dappUrl}  topic: ${s.topic.slice(0, 8)}...`),
    );
  });
  console.log("─────────────────────────────────────\n");
}

// ── disconnect ────────────────────────────────────────────────────────────────

export async function cmdDisconnect(dappName: string): Promise<void> {
  const sessions = getAllSessions();
  const session = sessions.find((s) =>
    s.dappName.toLowerCase().includes(dappName.toLowerCase()),
  );
  if (!session) {
    console.log(chalk.red(`No session found for: ${dappName}`));
    return;
  }
  await disconnectDapp(session.topic);
  console.log(chalk.green(`✓ Disconnected from ${session.dappName}`));
}

// ── config cluster ────────────────────────────────────────────────────────────

export function cmdSetCluster(cluster: string): void {
  const valid = ["mainnet-beta", "devnet", "testnet"];
  if (!valid.includes(cluster)) {
    console.log(chalk.red(`Valid clusters: ${valid.join(", ")}`));
    return;
  }
  updateCluster(cluster as any);
  console.log(chalk.green(`✓ Cluster set to: ${cluster}`));
}
