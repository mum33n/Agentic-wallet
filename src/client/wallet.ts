/**
 * agent-wallet.ts
 *
 * AgentWallet — a self-contained wallet for autonomous agents.
 *
 * Connects to the vault directly (no daemon, no WebSocket).
 * Finds or creates an account by name, derives its keypair,
 * and exposes a clean API to sign/send/simulate transactions.
 *
 * Usage:
 *   const wallet = await AgentWallet.connect('Trading Bot')
 *
 *   const balance = await wallet.getBalance()
 *   const sig     = await wallet.signAndSendTransaction(tx)
 *   const proof   = await wallet.signMessage('hello')
 */

import {
  Transaction,
  VersionedTransaction,
  PublicKey,
  LAMPORTS_PER_SOL,
  Connection,
} from "@solana/web3.js";
import { loadVault, vaultExists } from "../vault/keystore";
import { loadConfig, updateAccountStore } from "../vault/config";
import { mnemonicToSeed } from "../vault/mnemonic";
import { deriveAccount, AccountKeypair } from "../vault/accounts";
import { getConnection, getBalance, requestAirdrop } from "../solana/rpc";
import { simulateTransaction, SimulationResult } from "../solana/simulate";
import {
  signTransaction,
  signAllTransactions,
  signAndSendTransaction,
  signOffchainMessage,
  SignedTransaction,
  SendResult,
} from "../solana/tx";
import WebSocket from "ws";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AgentWalletOptions {
  /** Vault password. Falls back to WALLET_PASSWORD env var. */
  password?: string;
}

export interface TransactionResult {
  signature: string;
  confirmed: boolean;
  explorerUrl: string;
}

type TxInput =
  | Transaction
  | VersionedTransaction
  | Buffer
  | Uint8Array
  | string; // string = base64

// ── AgentWallet ───────────────────────────────────────────────────────────────

export class AgentWallet {
  /** Account name */
  readonly name: string;
  /** Base58 public key — the Solana address */
  readonly publicKey: string;
  /** PublicKey object for use with @solana/web3.js */
  readonly solanaPublicKey: PublicKey;
  /** Account index in the vault's BIP-44 derivation */
  readonly accountIndex: number;

  private readonly keypair: AccountKeypair;

  private constructor(name: string, keypair: AccountKeypair, index: number) {
    this.name = name;
    this.publicKey = keypair.publicKey;
    this.solanaPublicKey = new PublicKey(keypair.publicKey);
    this.accountIndex = index;
    this.keypair = keypair;
  }

  // ── Factory ───────────────────────────────────────────────────────────────

  /**
   * Connect as a named agent account.
   * If the account doesn't exist yet it is created automatically.
   *
   * @param accountName - Human-readable name e.g. "Trading Bot"
   * @param opts        - Options including vault password
   */
  static async connect(
    accountName: string,
    opts: AgentWalletOptions = {},
  ): Promise<AgentWallet> {
    const password = opts.password ?? process.env.WALLET_PASSWORD ?? "";

    if (!password) {
      try {
        const keypair = await AgentWallet._fetchFromDaemon(
          accountName,
          "ws://localhost:3000/ws/agent",
        );
        console.log(
          `[AgentWallet] Connected via daemon: "${accountName}" (${keypair.publicKey})`,
        );
        return new AgentWallet(accountName, keypair, keypair.index);
      } catch (err: any) {
        // Daemon not running or unreachable — fall through to password path
        const isDaemonDown =
          err.message.includes("ECONNREFUSED") ||
          err.message.includes("timed out") ||
          err.message.includes("connect");
        if (!isDaemonDown)
          throw new Error(
            "AgentWallet: vault password required. " +
              "Pass it as opts.password or start the daemon",
          );
        console.log(`[AgentWallet] Daemon not available — using password.`);
      }
    }

    if (!vaultExists()) {
      throw new Error("AgentWallet: no vault found. Run `wallet init` first.");
    }

    // Decrypt vault to get the mnemonic
    const vaultData = await loadVault(password);
    const seed = await mnemonicToSeed(vaultData.mnemonic);
    const config = loadConfig();

    // Find existing account by name (case-insensitive)
    let account = config.accountStore.accounts.find(
      (a) => a.name.toLowerCase() === accountName.toLowerCase(),
    );

    let index: number;

    if (account) {
      // Found — use existing index
      index = account.index;
    } else {
      // Not found — derive next index and persist
      index = config.accountStore.accounts.length;

      const derived = deriveAccount(seed, index, accountName);

      account = {
        index,
        name: accountName,
        publicKey: derived.publicKey,
        derivationPath: `m/44'/501'/${index}'/0'`,
        createdAt: new Date().toISOString(),
      };

      updateAccountStore({
        ...config.accountStore,
        accounts: [...config.accountStore.accounts, account],
      });

      console.log(
        `[AgentWallet] Created account "${accountName}" at index ${index} (${derived.publicKey})`,
      );
    }

    // Derive the keypair for this index
    const keypair = deriveAccount(seed, index, accountName);
    return new AgentWallet(accountName, keypair, index);
  }

  // ── Balance ───────────────────────────────────────────────────────────────

  /**
   * Get current SOL balance.
   */
  async getBalance(): Promise<number> {
    const result = await getBalance(this.publicKey);
    return result.sol;
  }

  /**
   * Get current balance in lamports.
   */
  async getBalanceLamports(): Promise<number> {
    const result = await getBalance(this.publicKey);
    return result.lamports;
  }

  // ── Airdrop ───────────────────────────────────────────────────────────────

  /**
   * Request a devnet airdrop. Max 2 SOL per request.
   * Returns transaction signature.
   */
  async requestAirdrop(sol: number = 1): Promise<string> {
    return requestAirdrop(this.publicKey, sol);
  }

  // ── Simulate ──────────────────────────────────────────────────────────────

  /**
   * Simulate a transaction without signing or sending.
   * Use this to preview what a transaction will do before committing.
   */
  async simulate(transaction: TxInput): Promise<SimulationResult> {
    const base64 = toBase64(transaction);
    return simulateTransaction(base64, this.publicKey);
  }

  // ── Sign only ─────────────────────────────────────────────────────────────

  /**
   * Sign a transaction without broadcasting it.
   * Returns signed transaction as a Buffer (ready to send or pass to another party).
   */
  async signTransaction(transaction: TxInput): Promise<Buffer> {
    const base64 = toBase64(transaction);
    const result = await signTransaction(base64, this.keypair);
    return Buffer.from(result.serialized, "base64");
  }

  /**
   * Sign multiple transactions in a batch.
   */
  async signAllTransactions(transactions: TxInput[]): Promise<Buffer[]> {
    const encoded = transactions.map(toBase64);
    const results = await signAllTransactions(encoded, this.keypair);
    return results.map((r) => Buffer.from(r.serialized, "base64"));
  }

  // ── Sign and submit ─────────────────────────────────────────────────────────

  /**
   * Sign and broadcast a transaction to Solana.
   *
   * Simulates first — throws if simulation fails.
   * Returns signature, confirmation status, and explorer link.
   *
   * @param transaction - Transaction, Buffer, Uint8Array, or base64 string
   * @param cluster     - For the explorer link (default: devnet)
   * @param skipSimulation - Skip pre-flight simulation (default: false)
   */
  async signAndSendTransaction(
    transaction: TxInput,
    cluster: "devnet" | "mainnet-beta" | "testnet" = "devnet",
    skipSimulation: boolean = false,
  ): Promise<TransactionResult> {
    const base64 = toBase64(transaction);

    // Simulate before signing
    if (!skipSimulation) {
      const sim = await simulateTransaction(base64, this.publicKey);
      if (!sim.success) {
        throw new Error(`Transaction simulation failed: ${sim.error}`);
      }
    }

    const result = await signAndSendTransaction(base64, this.keypair);

    return {
      signature: result.txHash,
      confirmed: result.confirmed,
      explorerUrl: `https://explorer.solana.com/tx/${result.txHash}?cluster=${cluster}`,
    };
  }

  // ── Sign message ──────────────────────────────────────────────────────────

  /**
   * Sign an arbitrary off-chain message.
   * Useful for authentication / proof of ownership.
   *
   * @param message - string or Uint8Array
   * @returns base58-encoded signature
   */
  signMessage(message: string | Uint8Array): string {
    const bytes =
      typeof message === "string" ? new TextEncoder().encode(message) : message;
    return signOffchainMessage(bytes, this.keypair);
  }

  // ── Transaction history ───────────────────────────────────────────────────

  /**
   * Get recent transaction signatures for this account.
   */
  async getRecentTransactions(limit = 10): Promise<string[]> {
    const conn = getConnection();
    const sigs = await conn.getSignaturesForAddress(this.solanaPublicKey, {
      limit,
    });
    return sigs.map((s) => s.signature);
  }

  // ── Build helpers ─────────────────────────────────────────────────────────

  /**
   * Get a fresh blockhash for building transactions.
   * Convenience method so agents don't need to import getConnection().
   */
  async getLatestBlockhash() {
    return getConnection().getLatestBlockhash();
  }

  /**
   * Get the underlying Connection for advanced use.
   */
  getConnection(): Connection {
    return getConnection();
  }

  // ── Daemon fetch ────────────────────────────────────────────────────────────

  private static _fetchFromDaemon(
    accountName: string,
    daemonUrl: string,
  ): Promise<AccountKeypair & { index: number }> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(daemonUrl);
      const tid = setTimeout(() => {
        ws.terminate();
        reject(new Error("AgentWallet: daemon connection timed out"));
      }, 5_000);

      ws.once("error", (err: Error) => {
        clearTimeout(tid);
        reject(err);
      });

      ws.once("open", () => {
        ws.send(
          JSON.stringify({
            id: 1,
            jsonrpc: "2.0",
            method: "agent_getKeypair",
            params: { accountName },
          }),
        );
      });

      ws.once("message", (raw: Buffer) => {
        clearTimeout(tid);
        ws.close();
        try {
          const msg = JSON.parse(raw.toString());
          if (msg.error) {
            reject(new Error(msg.error.message));
            return;
          }
          const { publicKey, secretKey, name, index } = msg.result;
          resolve({
            publicKey,
            secretKey: Buffer.from(secretKey, "base64"),
            name,
            index,
            derivationPath: `m/44'/501'/${index}'/0'`,
            createdAt: new Date().toISOString(),
          });
        } catch (e) {
          reject(e);
        }
      });
    });
  }
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function toBase64(tx: TxInput): string {
  if (typeof tx === "string") return tx; // already base64
  if (tx instanceof Transaction)
    return tx.serialize({ requireAllSignatures: false }).toString("base64");
  if (tx instanceof VersionedTransaction)
    return Buffer.from(tx.serialize()).toString("base64");
  if (tx instanceof Buffer) return tx.toString("base64");
  return Buffer.from(tx).toString("base64"); // Uint8Array
}
