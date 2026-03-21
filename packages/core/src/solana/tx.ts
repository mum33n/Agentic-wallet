/**
 *
 * Transaction signing and broadcasting.
 *
 * Two methods:
 *   signTransaction        → sign only, return signed tx bytes (dApp broadcasts)
 *   signAndSendTransaction → sign + broadcast, return tx hash
 *
 * Both are supported so any dApp works regardless of which method it uses.
 *
 * Dependencies: @solana/web3.js, tweetnacl, bs58
 */

import {
  Connection,
  Transaction,
  VersionedTransaction,
  SendOptions,
  Keypair,
} from "@solana/web3.js";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { getConnection } from "./rpc";
import { AccountKeypair } from "../vault/accounts";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SignedTransaction {
  serialized: string; // base64 encoded signed transaction
  signature: string; // base58 encoded signature (first signature)
}

export interface SendResult {
  txHash: string; // transaction signature / hash
  confirmed: boolean;
}

// ── Sign Only ─────────────────────────────────────────────────────────────────

/**
 * Sign a transaction without broadcasting.
 * Returns the signed transaction for the dApp to broadcast.
 * Used for: solana_signTransaction
 */
export async function signTransaction(
  serializedTx: string,
  keypair: AccountKeypair,
): Promise<SignedTransaction> {
  const txBuffer = Buffer.from(serializedTx, "base64");
  const solanaKeypair = toSolanaKeypair(keypair);

  try {
    // Try versioned transaction first
    const versionedTx = VersionedTransaction.deserialize(txBuffer);
    versionedTx.sign([solanaKeypair]);

    const serialized = Buffer.from(versionedTx.serialize()).toString("base64");
    const signature = bs58.encode(versionedTx.signatures[0]);

    return { serialized, signature };
  } catch {
    // Fall back to legacy transaction
    const legacyTx = Transaction.from(txBuffer);
    legacyTx.partialSign(solanaKeypair);

    const serialized = legacyTx
      .serialize({ requireAllSignatures: false })
      .toString("base64");
    const signature = bs58.encode(legacyTx.signature!);

    return { serialized, signature };
  }
}

/**
 * Sign multiple transactions in a batch.
 * Used for: solana_signAllTransactions
 */
export async function signAllTransactions(
  serializedTxs: string[],
  keypair: AccountKeypair,
): Promise<SignedTransaction[]> {
  return Promise.all(serializedTxs.map((tx) => signTransaction(tx, keypair)));
}

// ── Sign and Send ─────────────────────────────────────────────────────────────

/**
 * Sign a transaction and broadcast it to Solana.
 * Returns the transaction hash after confirmation.
 * Used for: solana_signAndSendTransaction
 */
export async function signAndSendTransaction(
  serializedTx: string,
  keypair: AccountKeypair,
  options: SendOptions = {},
  conn?: Connection,
): Promise<SendResult> {
  const { serialized } = await signTransaction(serializedTx, keypair);
  return sendSignedTransaction(serialized, options, conn);
}

/**
 * Broadcast an already-signed transaction.
 * Used when the wallet has already signed and just needs to broadcast.
 */
export async function sendSignedTransaction(
  serializedSignedTx: string,
  options: SendOptions = {},
  conn?: Connection,
): Promise<SendResult> {
  const connection = conn ?? getConnection();
  const txBuffer = Buffer.from(serializedSignedTx, "base64");

  const sendOptions: SendOptions = {
    skipPreflight: false, // run preflight checks
    preflightCommitment: "confirmed",
    ...options,
  };

  let txHash: string;

  try {
    // Try versioned first
    const versionedTx = VersionedTransaction.deserialize(txBuffer);
    txHash = await connection.sendTransaction(versionedTx, sendOptions);
  } catch {
    // Fall back to legacy
    const legacyTx = Transaction.from(txBuffer);
    txHash = await connection.sendRawTransaction(
      legacyTx.serialize(),
      sendOptions,
    );
  }

  // Wait for confirmation
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash();
  const confirmResult = await connection.confirmTransaction(
    { signature: txHash, blockhash, lastValidBlockHeight },
    "confirmed",
  );

  return {
    txHash,
    confirmed: !confirmResult.value.err,
  };
}

// ── Message Signing ───────────────────────────────────────────────────────────

/**
 * Sign an off-chain message (for authentication / proof of ownership).
 * Used for: solana_signMessage
 * Returns base58 encoded signature.
 */
export function signOffchainMessage(
  message: Uint8Array,
  keypair: AccountKeypair,
): string {
  const signature = nacl.sign.detached(message, keypair.secretKey);
  return bs58.encode(Buffer.from(signature));
}

// ── Internal ──────────────────────────────────────────────────────────────────

/**
 * Convert our AccountKeypair to a @solana/web3.js Keypair.
 * The secretKey is already in the correct 64-byte format.
 */
function toSolanaKeypair(keypair: AccountKeypair): Keypair {
  return Keypair.fromSecretKey(keypair.secretKey);
}
