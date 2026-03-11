/**
 * bridge/handler.ts
 *
 * The central request handler — every signing request from every source
 * (WalletConnect, WebSocket, direct import) flows through here.
 *
 * Pipeline for every request:
 *   1. Parse intent (what method, what transaction)
 *   2. Simulate the transaction on Solana
 *   3. Sign (and optionally send)
 *   4. Return result to caller
 *
 * No request bypasses this pipeline.
 *
 * Dependencies: ../solana/simulate, ../solana/tx, ../vault
 */

import { simulateTransaction } from "../solana/simulate";
import {
  signTransaction,
  signAllTransactions,
  signAndSendTransaction,
  signOffchainMessage,
} from "../solana/tx";
import { WalletVault } from "../vault";
import { addLog } from "../cli/ui";
import bs58 from "bs58";

export interface DappMetadata {
  name: string;
  url: string;
  icon?: string;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type WalletMethod =
  | "solana_signTransaction"
  | "solana_signAndSendTransaction"
  | "solana_signAllTransactions"
  | "solana_signMessage"
  | "solana_connect"
  | "solana_disconnect";

export interface WalletRequest {
  id: string | number;
  method: WalletMethod;
  params: {
    transaction?: string; // base64 encoded
    transactions?: string[]; // for signAll
    message?: string; // for signMessage
    options?: Record<string, any>;
  };
  topic: string;
  dapp: DappMetadata;
  agentId?: string; // identifies which agent sent this request
}

export interface WalletResponse {
  id: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
  };
}

// ── Error Codes (matching WalletConnect standard) ─────────────────────────────

export const ERROR_CODES = {
  USER_REJECTED: 4001,
  UNAUTHORIZED: 4100,
  UNSUPPORTED_METHOD: 4200,
  DISCONNECTED: 4900,
  CHAIN_DISCONNECTED: 4901,
};

// ── Handler ───────────────────────────────────────────────────────────────────

export class WalletRequestHandler {
  private vault: WalletVault;

  constructor(vault: WalletVault) {
    this.vault = vault;
  }

  /**
   * Handle any incoming wallet request.
   * This is the single entry point — all bridges call this.
   */
  async handle(request: WalletRequest): Promise<WalletResponse> {
    try {
      switch (request.method) {
        case "solana_connect":
          return this.handleConnect(request);

        case "solana_disconnect":
          return this.handleDisconnect(request);

        case "solana_signTransaction":
          return this.handleSignTransaction(request);

        case "solana_signAndSendTransaction":
          return this.handleSignAndSend(request);

        case "solana_signAllTransactions":
          return this.handleSignAll(request);

        case "solana_signMessage":
          return this.handleSignMessage(request);

        default:
          return this.errorResponse(
            request.id,
            ERROR_CODES.UNSUPPORTED_METHOD,
            `Method not supported: ${request.method}`,
          );
      }
    } catch (err) {
      return this.errorResponse(
        request.id,
        4000,
        err instanceof Error ? err.message : "Unknown error",
      );
    }
  }

  // ── Connect / Disconnect ───────────────────────────────────────────────────

  private async handleConnect(request: WalletRequest): Promise<WalletResponse> {
    const keypair = this.vault.getActiveKeypair();
    return {
      id: request.id,
      result: {
        publicKey: keypair.publicKey,
      },
    };
  }

  private async handleDisconnect(
    request: WalletRequest,
  ): Promise<WalletResponse> {
    return { id: request.id, result: { disconnected: true } };
  }

  // ── Sign Transaction ───────────────────────────────────────────────────────

  private async handleSignTransaction(
    request: WalletRequest,
  ): Promise<WalletResponse> {
    const tx = request.params.transaction;
    if (!tx) return this.errorResponse(request.id, 4000, "Missing transaction");

    const keypair = this.vault.getActiveKeypair();

    // 1. Simulate
    const simulation = await simulateTransaction(tx, keypair.publicKey);
    this.log(request, `simulate → ${simulation.success ? "ok" : "fail"}`);

    if (!simulation.success) {
      return this.errorResponse(
        request.id,
        4000,
        `Simulation failed: ${simulation.error}`,
      );
    }

    // 2. Sign — return signed bytes, dApp broadcasts
    const signed = await signTransaction(tx, keypair);
    this.log(request, `signed → ${signed.signature.slice(0, 8)}...`);

    return {
      id: request.id,
      result: { signedTransaction: signed.serialized },
    };
  }

  // ── Sign and Send ──────────────────────────────────────────────────────────

  private async handleSignAndSend(
    request: WalletRequest,
  ): Promise<WalletResponse> {
    const tx = request.params.transaction;
    if (!tx) return this.errorResponse(request.id, 4000, "Missing transaction");

    const keypair = this.vault.getActiveKeypair();

    // 1. Simulate
    const simulation = await simulateTransaction(tx, keypair.publicKey);
    this.log(request, `simulate → ${simulation.success ? "ok" : "fail"}`);

    if (!simulation.success) {
      return this.errorResponse(
        request.id,
        4000,
        `Simulation failed: ${simulation.error}`,
      );
    }

    // 2. Sign + broadcast — wallet returns tx hash to dApp
    const result = await signAndSendTransaction(tx, keypair);
    this.log(request, `sent → ${result.txHash.slice(0, 8)}...`);

    return {
      id: request.id,
      result: {
        signature: result.txHash,
        confirmed: result.confirmed,
      },
    };
  }

  // ── Sign All Transactions ──────────────────────────────────────────────────

  private async handleSignAll(request: WalletRequest): Promise<WalletResponse> {
    const txs = request.params.transactions;
    if (!txs?.length)
      return this.errorResponse(request.id, 4000, "Missing transactions");

    const keypair = this.vault.getActiveKeypair();

    // Simulate each before signing any
    for (const tx of txs) {
      const simulation = await simulateTransaction(tx, keypair.publicKey);
      if (!simulation.success) {
        return this.errorResponse(
          request.id,
          4000,
          `Simulation failed for tx in batch: ${simulation.error}`,
        );
      }
    }

    // All simulations passed — sign all
    const signed = await signAllTransactions(txs, keypair);
    this.log(request, `signed ${signed.length} transactions`);

    return {
      id: request.id,
      result: { signedTransactions: signed.map((s) => s.serialized) },
    };
  }

  // ── Sign Message ───────────────────────────────────────────────────────────

  private async handleSignMessage(
    request: WalletRequest,
  ): Promise<WalletResponse> {
    const message = request.params.message;
    if (!message)
      return this.errorResponse(request.id, 4000, "Missing message");

    const keypair = this.vault.getActiveKeypair();

    // WalletConnect sends message as base58-encoded bytes.
    // WebSocket / inject.js sends it as base64.
    // Decode to raw Uint8Array before signing.
    let messageBytes: Uint8Array;
    try {
      messageBytes = decodeMessage(message);
    } catch {
      return this.errorResponse(
        request.id,
        4000,
        "Could not decode message bytes",
      );
    }

    const signature = signOffchainMessage(messageBytes, keypair);
    this.log(request, "message signed");

    // Return both signature and publicKey — required by Wallet Standard
    return {
      id: request.id,
      result: {
        signature,
        publicKey: keypair.publicKey,
      },
    };
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private errorResponse(
    id: string | number,
    code: number,
    message: string,
  ): WalletResponse {
    return { id, error: { code, message } };
  }

  private log(request: WalletRequest, note: string): void {
    const source = request.agentId ?? request.dapp?.name ?? "unknown";
    addLog("handler", `${request.method} | ${source} | ${note}`, "info");
  }
}

// ── Message Decoding ─────────────────────────────────────────────────────────
// dApps encode messages differently depending on the transport:
//   WalletConnect → base58
//   WebSocket / inject.js → base64
// Try base58 first (more common), fall back to base64, then UTF-8.

function decodeMessage(message: string): Uint8Array {
  // Try base58 first (WalletConnect standard)
  try {
    const decoded = bs58.decode(message);
    if (decoded.length > 0) return decoded;
  } catch {}

  // Try base64 (WebSocket / inject.js)
  try {
    const decoded = Buffer.from(message, "base64");
    if (decoded.length > 0) return decoded;
  } catch {}

  // Fall back to raw UTF-8 string
  return new TextEncoder().encode(message);
}

// ── Functional API ────────────────────────────────────────────────────────────
// Used by websocket.ts and walletconnect.ts so they don't need to
// instantiate the class themselves.

export interface HandlerOptions {
  vault: WalletVault;
}

/**
 * Stateless wrapper around WalletRequestHandler.
 * websocket.ts and walletconnect.ts call this directly.
 */
export async function handleRequest(
  request: WalletRequest,
  options: HandlerOptions,
): Promise<WalletResponse> {
  const handler = new WalletRequestHandler(options.vault);
  return handler.handle(request);
}
