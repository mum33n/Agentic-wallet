/**
 *
 * Solana RPC connection manager.
 * Single shared connection instance for the daemon session.
 *
 * Dependencies: @solana/web3.js
 */

import {
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
  clusterApiUrl,
} from "@solana/web3.js";
import { getRpcUrl, getCluster } from "../vault/config";

// Singleton connection

let _connection: Connection | null = null;

export function getConnection(forceNew: boolean = false): Connection {
  if (!_connection || forceNew) {
    const rpcUrl = getRpcUrl();
    _connection = new Connection(rpcUrl, "confirmed");
  }
  return _connection;
}

/**
 * Reset connection — used when RPC URL or cluster changes.
 */
export function resetConnection(): void {
  _connection = null;
}

// Balance─

/**
 * Get SOL balance for an address in lamports and SOL.
 */
export async function getBalance(
  publicKeyStr: string,
): Promise<{ lamports: number; sol: number }> {
  const connection = getConnection();
  const pubkey = new PublicKey(publicKeyStr);
  const lamports = await connection.getBalance(pubkey);
  return {
    lamports,
    sol: lamports / LAMPORTS_PER_SOL,
  };
}

/**
 * Request a devnet airdrop (only works on devnet/testnet).
 * Returns the transaction signature.
 */
export async function requestAirdrop(
  publicKeyStr: string,
  solAmount: number = 1,
): Promise<string> {
  const cluster = getCluster();
  if (cluster === "mainnet-beta") {
    throw new Error("Airdrops are not available on mainnet.");
  }

  const connection = getConnection();
  const pubkey = new PublicKey(publicKeyStr);
  const lamports = solAmount * LAMPORTS_PER_SOL;

  const signature = await connection.requestAirdrop(pubkey, lamports);
  await connection.confirmTransaction(signature, "confirmed");

  return signature;
}

/**
 * Get recent blockhash — required for building transactions.
 */
export async function getLatestBlockhash(): Promise<{
  blockhash: string;
  lastValidBlockHeight: number;
}> {
  const connection = getConnection();
  return connection.getLatestBlockhash("confirmed");
}

/**
 * Confirm a transaction by signature.
 * Polls until confirmed or timeout.
 */
export async function confirmTransaction(
  signature: string,
  timeoutMs: number = 30_000,
): Promise<boolean> {
  const connection = getConnection();
  const { blockhash, lastValidBlockHeight } = await getLatestBlockhash();

  const result = await connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    "confirmed",
  );

  return !result.value.err;
}

/**
 * Check if the RPC endpoint is reachable.
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const connection = getConnection();
    await connection.getVersion();
    return true;
  } catch {
    return false;
  }
}
