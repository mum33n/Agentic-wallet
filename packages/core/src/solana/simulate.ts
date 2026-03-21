import {
  Connection,
  Transaction,
  VersionedTransaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { getConnection } from "./rpc";

//  Types
export interface TokenChange {
  mint: string; // token mint address
  account: string; // token account address
  owner: string; // owner of the token account
  preAmount: number; // balance before tx
  postAmount: number; // balance after tx
  delta: number; // change (positive = received, negative = sent)
  decimals: number;
}

export interface AccountChange {
  address: string;
  preBalance: number; // in lamports
  postBalance: number; // in lamports
  solDelta: number; // in SOL (human readable)
  isWritable: boolean;
  isSigner: boolean;
}

export interface SimulationResult {
  success: boolean;
  error: string | null;
  logs: string[];

  // Account changes
  accountChanges: AccountChange[];
  tokenChanges: TokenChange[];

  // Transaction metadata
  computeUnitsConsumed: number;
  programIds: string[]; // all programs invoked
  fee: number; // estimated fee in lamports

  // Raw simulation data (passed to Claude)
  rawLogs: string[];
}

// Simulate
/**
 * Simulate a transaction and return a parsed result.
 * Accepts both legacy and versioned transactions (base64 encoded).
 *
 * @param serializedTx - base64 encoded serialized transaction
 * @param signerPublicKey - the wallet's public key (used to identify balance changes)
 */
export async function simulateTransaction(
  serializedTx: string,
  signerPublicKey: string,
  conn?: Connection,
): Promise<SimulationResult> {
  const connection = conn ?? getConnection();

  try {
    const txBuffer = Buffer.from(serializedTx, "base64");

    // Try versioned transaction first, fall back to legacy
    let simulation: Awaited<ReturnType<Connection["simulateTransaction"]>>;

    try {
      const versionedTx = VersionedTransaction.deserialize(txBuffer);
      simulation = await connection.simulateTransaction(versionedTx, {
        sigVerify: false, // skip sig verification — wallet hasn't signed yet
        replaceRecentBlockhash: true,
      });
    } catch {
      // Fall back to legacy transaction
      const legacyTx = Transaction.from(txBuffer);
      simulation = await connection.simulateTransaction(legacyTx, []);
    }

    const { value } = simulation;

    return parseSimulationResult(value, signerPublicKey, txBuffer);
  } catch (err) {
    // Simulation itself failed (network error, malformed tx, etc.)
    return {
      success: false,
      error: err instanceof Error ? err.message : "Simulation failed",
      logs: [],
      accountChanges: [],
      tokenChanges: [],
      computeUnitsConsumed: 0,
      programIds: [],
      fee: 0,
      rawLogs: [],
    };
  }
}

// Parsing
function parseSimulationResult(
  value: any,
  signerPublicKey: string,
  txBuffer: Buffer,
): SimulationResult {
  const success = !value.err;
  const logs: string[] = value.logs ?? [];

  // Parse account balance changes
  const accountChanges: AccountChange[] = (value.accounts ?? [])
    .map((account: any, i: number) => {
      if (!account) return null;
      const preBalance = account.lamports ?? 0;
      const postBalance = account.lamports ?? 0;
      return {
        address: signerPublicKey, // simplified — full impl maps account indices
        preBalance,
        postBalance,
        solDelta: (postBalance - preBalance) / LAMPORTS_PER_SOL,
        isWritable: true,
        isSigner: i === 0,
      };
    })
    .filter(Boolean);

  // Extract program IDs from logs
  const programIds = extractProgramIds(logs);

  // Compute units from logs
  const computeUnitsConsumed = extractComputeUnits(logs);

  // Estimate fee (5000 lamports base + 5000 per signature)
  const fee = 5000;

  return {
    success,
    error: value.err ? JSON.stringify(value.err) : null,
    logs: formatLogs(logs),
    accountChanges,
    tokenChanges: [], // full SPL parsing requires additional RPC calls
    computeUnitsConsumed,
    programIds,
    fee,
    rawLogs: logs,
  };
}

function extractProgramIds(logs: string[]): string[] {
  const ids = new Set<string>();
  const invokePattern = /Program (\w+) invoke/;
  for (const log of logs) {
    const match = log.match(invokePattern);
    if (match) ids.add(match[1]);
  }
  return Array.from(ids);
}

function extractComputeUnits(logs: string[]): number {
  for (const log of logs) {
    const match = log.match(/consumed (\d+) of/);
    if (match) return parseInt(match[1], 10);
  }
  return 0;
}

function formatLogs(logs: string[]): string[] {
  return logs.map((log) => {
    // Shorten program addresses for readability
    return log.replace(/\b([1-9A-HJ-NP-Za-km-z]{32,44})\b/g, (addr) => {
      const known = KNOWN_PROGRAMS[addr];
      return known ? known : `${addr.slice(0, 4)}..${addr.slice(-4)}`;
    });
  });
}

// Known Programs
const KNOWN_PROGRAMS: Record<string, string> = {
  "11111111111111111111111111111111": "System Program",
  TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA: "SPL Token",
  JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4: "Jupiter V6",
  "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin": "Serum DEX",
  ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJe1bv: "Associated Token",
  SysvarRent111111111111111111111111111111111: "Sysvar Rent",
  SysvarC1ock11111111111111111111111111111111: "Sysvar Clock",
};

export { KNOWN_PROGRAMS };
