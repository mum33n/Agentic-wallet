/**
 * vault/config.ts
 *
 * Reads and writes ~/.wallet/config.json
 * Stores non-sensitive wallet preferences:
 *   - Active account index
 *   - RPC endpoint (mainnet / devnet)
 *   - Account metadata (names, indices — no keys)
 *   - WalletConnect project ID
 *
 * Dependencies: Node.js built-in `fs`, `os`, `path`
 */

import fs from "fs";
import { getConfigPath, ensureWalletDir } from "./keystore";
import { AccountStore, createAccountStore } from "./accounts";
import config from "../config";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ClusterType = "mainnet-beta" | "devnet" | "testnet" | "localnet";

export interface WalletConfig {
  version: number;
  cluster: ClusterType;
  rpcUrl: string;
  walletConnectProjectId: string;
  accountStore: AccountStore;
  createdAt: string;
  updatedAt: string;
}

// ── Defaults ──────────────────────────────────────────────────────────────────

const RPC_URLS: Record<ClusterType, string> = {
  "mainnet-beta": config.heliusKey
    ? `https://mainnet.helius-rpc.com/?api-key=${config.heliusKey}`
    : "https://api.mainnet-beta.solana.com",
  devnet: config.heliusKey
    ? `https://devnet.helius-rpc.com/?api-key=${config.heliusKey}`
    : "https://api.devnet.solana.com",
  testnet: "https://api.testnet.solana.com",
  localnet: "http://localhost:8899",
};

const CONFIG_VERSION = 1;

// ── Read / Write ──────────────────────────────────────────────────────────────

export function configExists(): boolean {
  return fs.existsSync(getConfigPath());
}

export function loadConfig(): WalletConfig {
  if (!configExists()) {
    throw new Error("No config found. Run `wallet init` first.");
  }
  const raw = fs.readFileSync(getConfigPath(), "utf8");
  return JSON.parse(raw) as WalletConfig;
}

export function saveConfig(config: WalletConfig): void {
  ensureWalletDir();
  const updated = { ...config, updatedAt: new Date().toISOString() };
  fs.writeFileSync(getConfigPath(), JSON.stringify(updated, null, 2), {
    mode: 0o600,
  });
}

/**
 * Create a fresh config on `wallet init`.
 */
export function createConfig(
  walletConnectProjectId: string = "",
  cluster: ClusterType = "devnet", // default to devnet for development
): WalletConfig {
  const now = new Date().toISOString();
  return {
    version: CONFIG_VERSION,
    cluster,
    rpcUrl: RPC_URLS[cluster],
    walletConnectProjectId,
    accountStore: createAccountStore("Account 1"),
    createdAt: now,
    updatedAt: now,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function updateCluster(cluster: ClusterType): void {
  const config = loadConfig();
  config.cluster = cluster;
  config.rpcUrl = RPC_URLS[cluster];
  saveConfig(config);
}

export function updateRpcUrl(url: string): void {
  const config = loadConfig();
  config.rpcUrl = url;
  saveConfig(config);
}

export function updateAccountStore(accountStore: AccountStore): void {
  const config = loadConfig();
  config.accountStore = accountStore;
  saveConfig(config);
}

export function getRpcUrl(): string {
  return loadConfig().rpcUrl;
}

export function getCluster(): ClusterType {
  return loadConfig().cluster;
}

export function getAccountStore(): AccountStore {
  return loadConfig().accountStore;
}
