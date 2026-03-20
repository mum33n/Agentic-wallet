/**
 *
 * Agentic Wallet MCP Server
 *
 * Exposes wallet operations as MCP tools so Claude (or any MCP client)
 * can control the wallet using natural language.
 *
 * Usage:
 *   npx ts-node src/mcp-server.ts
 *
 * Then add to Claude Desktop config (~/.claude/claude_desktop_config.json):
 *   {
 *     "mcpServers": {
 *       "agentic-wallet": {
 *         "command": "node",
 *         "args": ["/path/to/agentic-wallet/dist/mcp-server.js"],
 *         "env": { "WALLET_PASSWORD": "your-password" }
 *       }
 *     }
 *   }
 *
 * Claude can then say things like:
 *   "Check my Trading Bot balance"
 *   "Send 0.01 SOL from Trader to Reporter"
 *   "Sign this message to prove I own the account"
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import {
  Transaction,
  SystemProgram,
  PublicKey,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { loadConfig } from '@execra/core';
import { AgentWallet } from '@execra/sdk';

// ── Wallet cache — reuse connections across tool calls ────────────────────────

const walletCache = new Map<string, AgentWallet>();

async function getWallet(accountName: string): Promise<AgentWallet> {
  const key = accountName.toLowerCase();
  if (!walletCache.has(key)) {
    const wallet = await AgentWallet.connect(accountName);
    walletCache.set(key, wallet);
  }
  return walletCache.get(key)!;
}

// ── Server ────────────────────────────────────────────────────────────────────

const server = new McpServer({
  name: 'agentic-wallet',
  version: '1.0.0',
});

// ── Tool: list_accounts ───────────────────────────────────────────────────────

server.tool(
  'list_accounts',
  'List all accounts in the wallet with their addresses and indices.',
  {},
  async () => {
    const config = loadConfig();
    const accounts = config.accountStore.accounts;

    if (accounts.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'No accounts found. Use create_account to create one.',
          },
        ],
      };
    }

    const lines = accounts.map((a) => {
      const active =
        a.index === config.accountStore.activeIndex ? ' (active)' : '';
      return `[${a.index}] ${a.name}${active}\n    Address: ${a.publicKey}`;
    });

    return {
      content: [{ type: 'text', text: `Accounts:\n\n${lines.join('\n\n')}` }],
    };
  },
);

// ── Tool: get_balance ─────────────────────────────────────────────────────────

server.tool(
  'get_balance',
  'Get the SOL balance of a named wallet account.',
  {
    account_name: z.string().describe('Name of the account e.g. "Trading Bot"'),
  },
  async ({ account_name }) => {
    const wallet = await getWallet(account_name);
    const balance = await wallet.getBalance();

    return {
      content: [
        {
          type: 'text',
          text: `${account_name} (${wallet.publicKey})\nBalance: ${balance.toFixed(6)} SOL`,
        },
      ],
    };
  },
);

// ── Tool: create_account ──────────────────────────────────────────────────────

server.tool(
  'create_account',
  'Create a new named wallet account derived from the vault seed.',
  {
    account_name: z
      .string()
      .describe('Name for the new account e.g. "DCA Bot"'),
  },
  async ({ account_name }) => {
    const wallet = await getWallet(account_name);
    return {
      content: [
        {
          type: 'text',
          text: `Account ready: "${account_name}"\nAddress: ${wallet.publicKey}\nIndex: ${wallet.accountIndex}`,
        },
      ],
    };
  },
);

// ── Tool: request_airdrop ─────────────────────────────────────────────────────

server.tool(
  'request_airdrop',
  'Request a devnet SOL airdrop for an account. Max 2 SOL per request.',
  {
    account_name: z.string().describe('Name of the account to airdrop to'),
    amount_sol: z
      .number()
      .min(0.1)
      .max(2)
      .default(1)
      .describe('Amount of SOL to airdrop'),
  },
  async ({ account_name, amount_sol }) => {
    const wallet = await getWallet(account_name);
    const sig = await wallet.requestAirdrop(amount_sol);
    return {
      content: [
        {
          type: 'text',
          text: `Airdrop of ${amount_sol} SOL sent to ${account_name}.\nSignature: ${sig}`,
        },
      ],
    };
  },
);

// ── Tool: transfer_sol ────────────────────────────────────────────────────────

server.tool(
  'transfer_sol',
  'Transfer SOL from one named account to another address. Simulates before sending.',
  {
    from_account: z.string().describe('Name of the sending account'),
    to_address: z.string().describe('Recipient Solana address (base58)'),
    amount_sol: z.number().positive().describe('Amount of SOL to send'),
    skip_simulation: z
      .boolean()
      .default(false)
      .describe('Skip simulation (not recommended)'),
  },
  async ({ from_account, to_address, amount_sol, skip_simulation }) => {
    const wallet = await getWallet(from_account);
    const balance = await wallet.getBalance();

    if (balance < amount_sol + 0.001) {
      return {
        content: [
          {
            type: 'text',
            text: `Insufficient balance. ${from_account} has ${balance.toFixed(4)} SOL, need ${amount_sol + 0.001} SOL (including fees).`,
          },
        ],
      };
    }

    const { blockhash } = await wallet.getLatestBlockhash();

    const tx = new Transaction({
      recentBlockhash: blockhash,
      feePayer: wallet.solanaPublicKey,
    }).add(
      SystemProgram.transfer({
        fromPubkey: wallet.solanaPublicKey,
        toPubkey: new PublicKey(to_address),
        lamports: Math.floor(amount_sol * LAMPORTS_PER_SOL),
      }),
    );

    const result = await wallet.signAndSendTransaction(
      tx,
      'devnet',
      skip_simulation,
    );

    return {
      content: [
        {
          type: 'text',
          text: [
            `Transfer complete.`,
            `From    : ${from_account} (${wallet.publicKey})`,
            `To      : ${to_address}`,
            `Amount  : ${amount_sol} SOL`,
            `Signature: ${result.signature}`,
            `Explorer: ${result.explorerUrl}`,
          ].join('\n'),
        },
      ],
    };
  },
);

// ── Tool: simulate_transaction ────────────────────────────────────────────────

server.tool(
  'simulate_transaction',
  'Simulate a base64-encoded transaction to preview its effects without signing or sending.',
  {
    account_name: z.string().describe('Account that would sign'),
    transaction_b64: z
      .string()
      .describe('Base64-encoded serialized transaction'),
  },
  async ({ account_name, transaction_b64 }) => {
    const wallet = await getWallet(account_name);
    const sim = await wallet.simulate(transaction_b64);

    const lines = [
      `Simulation: ${sim.success ? '✓ would succeed' : '✗ would fail'}`,
    ];
    if (sim.error) lines.push(`Error   : ${sim.error}`);
    if (sim.computeUnitsConsumed)
      lines.push(`Compute : ${sim.computeUnitsConsumed} units`);
    if (sim.fee) lines.push(`Fee     : ${sim.fee} lamports`);
    if (sim.programIds.length)
      lines.push(`Programs: ${sim.programIds.join(', ')}`);
    if (sim.logs.length) {
      lines.push(`\nLogs:`);
      sim.logs.slice(0, 10).forEach((l) => lines.push(`  ${l}`));
    }

    return { content: [{ type: 'text', text: lines.join('\n') }] };
  },
);

// ── Tool: sign_message ────────────────────────────────────────────────────────

server.tool(
  'sign_message',
  'Sign an arbitrary message with a named account to prove ownership.',
  {
    account_name: z.string().describe('Account to sign with'),
    message: z.string().describe('Message to sign'),
  },
  async ({ account_name, message }) => {
    const wallet = await getWallet(account_name);
    const signature = wallet.signMessage(message);

    return {
      content: [
        {
          type: 'text',
          text: [
            `Message signed.`,
            `Account  : ${account_name} (${wallet.publicKey})`,
            `Message  : ${message}`,
            `Signature: ${signature}`,
          ].join('\n'),
        },
      ],
    };
  },
);

// ── Tool: get_recent_transactions ─────────────────────────────────────────────

server.tool(
  'get_recent_transactions',
  'Get recent transaction signatures for a named account.',
  {
    account_name: z.string().describe('Name of the account'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(20)
      .default(5)
      .describe('Number of transactions'),
  },
  async ({ account_name, limit }) => {
    const wallet = await getWallet(account_name);
    const txs = await wallet.getRecentTransactions(limit);

    if (txs.length === 0) {
      return {
        content: [
          { type: 'text', text: `No transactions found for ${account_name}.` },
        ],
      };
    }

    const lines = txs.map(
      (sig, i) =>
        `${i + 1}. ${sig}\n   https://explorer.solana.com/tx/${sig}?cluster=devnet`,
    );

    return {
      content: [
        {
          type: 'text',
          text: `Recent transactions for ${account_name}:\n\n${lines.join('\n\n')}`,
        },
      ],
    };
  },
);

// ── Tool: send_token ──────────────────────────────────────────────────────────

server.tool(
  'send_token',
  'Send SPL tokens from the active wallet account to any address. Handles associated token accounts automatically.',
  {
    to_address: z.string().describe('Recipient Solana address (base58)'),
    mint_address: z.string().describe('SPL token mint address (base58)'),
    amount: z
      .number()
      .positive()
      .describe('Token amount to send (in token units, not lamports)'),
    account_name: z
      .string()
      .optional()
      .describe('Sender account name — defaults to the active account'),
  },
  async ({ to_address, mint_address, amount, account_name }) => {
    const {
      getOrCreateAssociatedTokenAccount,
      createTransferInstruction,
      getMint,
    } = await import('@solana/spl-token');

    const config = loadConfig();

    // Resolve sender account
    let senderEntry = account_name
      ? config.accountStore.accounts.find(
          (a) => a.name.toLowerCase() === account_name.toLowerCase(),
        )
      : config.accountStore.accounts.find(
          (a) => a.index === config.accountStore.activeIndex,
        );

    if (!senderEntry) {
      return {
        content: [
          {
            type: 'text',
            text: 'Sender account not found. Use list_accounts to see available accounts.',
          },
        ],
      };
    }

    const wallet = await getWallet(senderEntry.name);
    const connection = wallet.getConnection();
    const mintPubkey = new PublicKey(mint_address);
    const toPubkey = new PublicKey(to_address);

    // Fetch mint decimals
    const mintInfo = await getMint(connection, mintPubkey);
    const rawAmount = BigInt(Math.floor(amount * 10 ** mintInfo.decimals));

    // Get or create sender ATA
    const fromAta = await getOrCreateAssociatedTokenAccount(
      connection,
      // payer — use the AgentWallet's keypair via a thin shim
      {
        publicKey: wallet.solanaPublicKey,
        secretKey: (wallet as any).keypair?.secretKey,
      } as any,
      mintPubkey,
      wallet.solanaPublicKey,
    );

    // Get or create recipient ATA
    const toAta = await getOrCreateAssociatedTokenAccount(
      connection,
      {
        publicKey: wallet.solanaPublicKey,
        secretKey: (wallet as any).keypair?.secretKey,
      } as any,
      mintPubkey,
      toPubkey,
    );

    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash('confirmed');

    const tx = new Transaction({
      recentBlockhash: blockhash,
      feePayer: wallet.solanaPublicKey,
    }).add(
      createTransferInstruction(
        fromAta.address,
        toAta.address,
        wallet.solanaPublicKey,
        rawAmount,
      ),
    );

    const result = await wallet.signAndSendTransaction(tx, 'devnet', true);

    return {
      content: [
        {
          type: 'text',
          text: [
            `Token transfer complete.`,
            `From     : ${senderEntry.name} (${wallet.publicKey})`,
            `To       : ${to_address}`,
            `Mint     : ${mint_address}`,
            `Amount   : ${amount} (decimals: ${mintInfo.decimals})`,
            `Signature: ${result.signature}`,
            `Explorer : ${result.explorerUrl}`,
          ].join('\n'),
        },
      ],
    };
  },
);

// ── Boot ──────────────────────────────────────────────────────────────────────

export async function startMCP() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
  } catch (err: any) {
    process.stderr.write(`MCP server error: ${err.message}\n`);
    process.exit(1);
  }
  // MCP servers communicate over stdio — no console.log here
}
