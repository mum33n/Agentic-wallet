# Agentic Wallet — Skills & Usage Reference

A Solana wallet daemon designed for autonomous agents, dApp integration, and AI-assisted operations.

---

## Quick Start

```bash
pnpm install
pnpm build

# First-time setup
pnpm start        # prompts wallet init if no vault exists

# Development (auto-rebuild on changes)
pnpm dev

# Run demo agents (requires daemon running)
pnpm demo
```

---

## Environment Variables

Create a `.env` file in the project root:

```env
HELIUS_API_KEY=your_helius_api_key       # Enhanced RPC (optional, falls back to public RPC)
WALLET_PASSWORD=your_password            # Auto-unlock on start (optional)
WS_PORT=3000                             # WebSocket server port (default: 3000)
WALLETCONNECT_PROJECT_ID=your_project_id # WalletConnect v2 (optional)
```

---

## CLI Dashboard

Start the daemon to open the interactive terminal UI:

```bash
pnpm start
```

The dashboard shows live account balances, connected agents, dApp sessions, and recent activity.

**Keyboard shortcuts:**
- `[1]` — View Dashboard
- `[2]` — View Accounts
- `[q]` — Quit

---

## CLI Commands

All commands are entered at the `>` prompt in the dashboard.

### Wallet Lifecycle

| Command | Description |
|---------|-------------|
| `init` | Create a new wallet. Generates BIP-39 mnemonic, encrypts vault with password. |
| `unlock` | Unlock the vault with password. Required before most operations. |
| `lock` | Clear keys from memory. Vault remains encrypted on disk. |

### Account Management

| Command | Description | Example |
|---------|-------------|---------|
| `accounts` | List all accounts with balances and addresses | `accounts` |
| `accounts new [name]` | Create a named account (BIP-44 derived) | `accounts new "Trading Bot"` |
| `accounts use <name\|index>` | Switch active account | `accounts use 0` or `accounts use "Main"` |

### Transactions

| Command | Description | Example |
|---------|-------------|---------|
| `send <address> <sol>` | Send SOL to recipient | `send 9xQeWvG816bUx9EP...b7h 0.5` |
| `airdrop [amount]` | Request devnet airdrop (default: 1, max: 2 SOL) | `airdrop 2` |

### Network

| Command | Description | Example |
|---------|-------------|---------|
| `cluster <name>` | Switch Solana cluster | `cluster devnet` |
| | Valid values: `mainnet-beta`, `devnet`, `testnet` | `cluster mainnet-beta` |

### dApp Connections (WalletConnect)

| Command | Description | Example |
|---------|-------------|---------|
| `connect <wc:uri>` | Pair with a dApp via WalletConnect URI | `connect wc:a1b2c3...` |
| `sessions` | List all connected dApps | `sessions` |
| `disconnect <dapp>` | Disconnect a dApp by name (partial match) | `disconnect Magic Eden` |

### Other

| Command | Description |
|---------|-------------|
| `help` | Show all available commands |
| `exit` / `quit` | Exit the wallet daemon |

---

## MCP Server (Claude AI Integration)

The wallet exposes a Model Context Protocol server so Claude can operate the wallet directly.

### Configuring MCP in Claude Code

Add to your Claude MCP configuration:

```json
{
  "mcpServers": {
    "agentic-wallet": {
      "command": "node",
      "args": ["dist/client/mcp.js"]
    }
  }
}
```

### Available MCP Tools

#### `list_accounts`
List all wallet accounts.
```
No parameters required.
Returns: account names, indices, addresses, active status
```

#### `get_balance`
Get SOL balance for a named account.
```
account_name: string   — e.g. "Main" or "Trading Bot"
Returns: address, balance in SOL
```

#### `create_account`
Create a new named account derived from the vault seed.
```
account_name: string   — e.g. "DCA Bot"
Returns: new address, BIP-44 derivation index
```

#### `request_airdrop`
Fund an account on devnet/testnet.
```
account_name: string
amount_sol:   number (0.1 – 2.0, default: 1)
Returns: transaction signature
```

#### `transfer_sol`
Send SOL with pre-flight simulation.
```
from_account:     string    — sender account name
to_address:       string    — recipient Solana address
amount_sol:       number    — positive value
skip_simulation:  boolean   — default: false
Returns: signature, confirmation, explorer URL
```

#### `simulate_transaction`
Preview a transaction's effects without signing.
```
account_name:     string    — signer account name
transaction_b64:  string    — base64-encoded transaction bytes
Returns: success, error message, compute units, fee, program IDs, logs
```

#### `sign_message`
Sign a message to prove account ownership.
```
account_name: string
message:      string
Returns: message, address, base58 signature
```

#### `get_recent_transactions`
Fetch recent transaction history.
```
account_name: string
limit:        number (1 – 20, default: 5)
Returns: signatures with Solana Explorer links
```

#### `send_token`
Send SPL tokens (handles Associated Token Account creation automatically).
```
to_address:    string    — recipient address
mint_address:  string    — token mint address
amount:        number    — amount in token units
account_name:  string    — sender (optional, defaults to active account)
Returns: signature, explorer URL, transaction details
```

---

## Which integration to use

```
Are you writing TypeScript/JavaScript and can import from this project?
  └─ Yes → AgentWallet SDK  (direct vault access, no daemon needed)

Are you writing in another language, or a separate process that can't import?
  └─ Yes → WebSocket protocol  (daemon must be running)

Are you using Claude Desktop or Claude Code?
  └─ Yes → MCP server  (tools handle everything, no raw protocol needed)

Does your agent control a browser and needs to interact with a Solana dApp?
  └─ Yes → Chrome Extension  (registers window.solana, daemon must be running)
```

---

## AgentWallet — Programmatic Client

`AgentWallet` is a self-contained wallet client for autonomous agents. It connects **directly to the vault** (no daemon required) and can also be copied into any external project — as long as the vault files exist at `~/.wallet/`, it works identically.

### Connection modes

**With password (direct vault access, no daemon):**
```typescript
import { AgentWallet } from "./src/client/wallet";

const wallet = await AgentWallet.connect("Trading Bot", {
  password: process.env.WALLET_PASSWORD,
});
```

**Without password (falls back to daemon over WebSocket):**
```typescript
const wallet = await AgentWallet.connect("Trading Bot");
// connects to ws://localhost:3000/ws/agent automatically
```

If the account name doesn't exist yet, it is created and persisted automatically on first connect.

### API

```typescript
// Balance
const sol: number = await wallet.getBalance();
const lamports: number = await wallet.getBalanceLamports();

// Airdrop (devnet only, max 2 SOL)
const sig: string = await wallet.requestAirdrop(1);

// Simulate without signing
const result = await wallet.simulate(transaction);
// result.success, result.error, result.computeUnits, result.fee, result.logs

// Sign only (returns Buffer)
const signed: Buffer = await wallet.signTransaction(transaction);
const signedAll: Buffer[] = await wallet.signAllTransactions([tx1, tx2]);

// Sign and broadcast (simulates first by default)
const { signature, confirmed, explorerUrl } = await wallet.signAndSendTransaction(
  transaction,
  "devnet",          // cluster for explorer link
  false,             // skipSimulation (default: false)
);

// Sign message (authentication / proof of ownership)
const sig: string = wallet.signMessage("authenticate me");
// returns base58-encoded signature

// Transaction history
const sigs: string[] = await wallet.getRecentTransactions(10);

// Helpers for building transactions
const { blockhash, lastValidBlockHeight } = await wallet.getLatestBlockhash();
const connection = wallet.getConnection(); // raw @solana/web3.js Connection

// Identity
wallet.publicKey        // base58 address string
wallet.solanaPublicKey  // PublicKey object for @solana/web3.js
wallet.name             // account name
wallet.accountIndex     // BIP-44 derivation index
```

### Transaction input types

All signing/simulation methods accept any of:
- `Transaction` — legacy `@solana/web3.js` transaction
- `VersionedTransaction` — versioned transaction
- `Buffer` / `Uint8Array` — raw serialized bytes
- `string` — base64-encoded transaction

### Using in an external project

Copy [src/client/wallet.ts](src/client/wallet.ts) and its dependencies into your project. Requires:
- `~/.wallet/vault.enc` and `~/.wallet/config.json` present (created by `wallet init`)
- `WALLET_PASSWORD` env var or pass `opts.password`
- `@solana/web3.js` as a peer dependency

---

## WebSocket Protocol (raw, language-agnostic)

Use this when your agent is in a separate process or written in a language that can't import the TypeScript SDK. The daemon must be running (`pnpm start`).

### Endpoints

| Endpoint | For |
|----------|-----|
| `ws://localhost:3000/ws/agent` | Agent programs — full access including keypair retrieval |
| `ws://localhost:3000/ws/dapp` | Browser dApps — signing only, no keypair exposure |

All messages are JSON. All responses echo the request `id`.

### Step 1 — Register your agent

Before signing anything, call `agent_connect` to find or create your named account. This does **not** switch the active account — it only registers the name and returns the public key.

```json
// Request
{ "id": 1, "method": "agent_connect", "params": { "accountName": "My Bot" } }

// Response
{ "id": 1, "result": { "publicKey": "9xQeWvG...", "name": "My Bot", "index": 2 } }
```

If the account name doesn't exist yet it is created automatically and persisted.

### Step 2 — Signing methods

Signing methods always use the **active account** (set via `accounts use` in the CLI). They do not accept `accountName`. Every signing request runs pre-flight simulation first — if simulation fails the request is rejected before any signing happens.

All signing methods require `topic` and `dapp` fields in addition to `id`, `method`, and `params`:

```json
{
  "id": 2,
  "method": "solana_signAndSendTransaction",
  "topic": "my-agent-session",
  "dapp": { "name": "My Bot", "url": "http://localhost" },
  "params": {
    "transaction": "<base64-encoded transaction bytes>"
  }
}
```

#### `solana_signTransaction`
Sign without broadcasting. Returns signed transaction bytes as base64.
```json
// Request
{
  "id": 2, "method": "solana_signTransaction",
  "topic": "session-id", "dapp": { "name": "Bot", "url": "http://localhost" },
  "params": { "transaction": "<base64>" }
}

// Response
{ "id": 2, "result": { "signedTransaction": "<base64>" } }
```

#### `solana_signAndSendTransaction`
Sign and broadcast to Solana. Returns the transaction signature.
```json
// Request
{
  "id": 3, "method": "solana_signAndSendTransaction",
  "topic": "session-id", "dapp": { "name": "Bot", "url": "http://localhost" },
  "params": { "transaction": "<base64>" }
}

// Response
{ "id": 3, "result": { "signature": "5KtPn1...", "confirmed": true } }
```

#### `solana_signAllTransactions`
Sign a batch of transactions. All are simulated before any are signed.
```json
// Request
{
  "id": 4, "method": "solana_signAllTransactions",
  "topic": "session-id", "dapp": { "name": "Bot", "url": "http://localhost" },
  "params": { "transactions": ["<base64>", "<base64>"] }
}

// Response
{ "id": 4, "result": { "signedTransactions": ["<base64>", "<base64>"] } }
```

#### `solana_signMessage`
Sign an off-chain message for authentication. The message must be **base64-encoded** before sending (the handler also accepts base58, then falls back to raw UTF-8).
```json
// Request — encode your message as base64 first
{
  "id": 5, "method": "solana_signMessage",
  "topic": "session-id", "dapp": { "name": "Bot", "url": "http://localhost" },
  "params": { "message": "<base64-encoded message bytes>" }
}

// Response
{ "id": 5, "result": { "signature": "<base58 signature>", "publicKey": "9xQeWvG..." } }
```

#### `solana_connect`
Get the active account's public key.
```json
// Request
{ "id": 6, "method": "solana_connect", "topic": "s", "dapp": { "name": "Bot", "url": "" }, "params": {} }

// Response
{ "id": 6, "result": { "publicKey": "9xQeWvG..." } }
```

### Read-only methods (no `topic`/`dapp` required)

These methods do not sign anything and bypass the main handler.

#### `solana_getBalance`
```json
// Request
{ "id": 7, "method": "solana_getBalance", "params": { "publicKey": "9xQeWvG..." } }

// Response
{ "id": 7, "result": { "sol": 1.5, "lamports": 1500000000 } }
```

#### `solana_requestAirdrop`
```json
// Request
{ "id": 8, "method": "solana_requestAirdrop", "params": { "publicKey": "9xQeWvG...", "sol": 1 } }

// Response
{ "id": 8, "result": { "signature": "5KtPn1..." } }
```

#### `solana_getTransactions`
```json
// Request
{ "id": 9, "method": "solana_getTransactions", "params": { "publicKey": "9xQeWvG...", "limit": 5 } }

// Response
{ "id": 9, "result": { "signatures": ["5KtPn1...", "3xFqLm..."] } }
```

#### `solana_simulateTransaction`
Simulates against the active account's public key.
```json
// Request
{ "id": 10, "method": "solana_simulateTransaction", "params": { "transaction": "<base64>" } }

// Response
{ "id": 10, "result": { "success": true, "computeUnits": 450, "fee": 5000, "logs": [...] } }
```

#### `agent_getKeypair` (`/ws/agent` only)
Returns the raw secret key for a named account. Only available on `/ws/agent`, blocked on `/ws/dapp`.
```json
// Request
{ "id": 11, "method": "agent_getKeypair", "params": { "accountName": "My Bot" } }

// Response
{ "id": 11, "result": { "publicKey": "9xQeWvG...", "secretKey": "<base64>", "name": "My Bot", "index": 2 } }
```

### Error response format

All errors follow the same shape:
```json
{ "id": 1, "error": { "code": 4001, "message": "agent_getKeypair only available on /ws/agent" } }
```

| Code | Meaning |
|------|---------|
| `4001` | Unauthorized (e.g. keypair access on wrong endpoint) |
| `4100` | Unauthorized (WalletConnect standard) |
| `4200` | Method not supported |
| `4900` | Disconnected |
| `4000` | General error (simulation failed, missing params, etc.) |
| `-32700` | Parse error (malformed JSON) |

---

## Browser Companion (Chrome Extension)

The extension lives in [src/extensions/](src/extensions/) and is a Manifest V3 Chrome extension. It registers the wallet as `window.solana` on every page so any Solana dApp in the browser can use it — no separate browser wallet needed.

It connects to the daemon at `ws://localhost:3000/ws/dapp` and proxies all wallet calls through it.

### Installation (Load Unpacked)

1. Start the daemon first:
   ```bash
   pnpm start
   ```

2. Open Chrome and go to `chrome://extensions`

3. Enable **Developer mode** (toggle in the top-right corner)

4. Click **Load unpacked** and select the `src/extensions/` folder from this project

5. The Agentic Wallet extension will appear in your extensions list and toolbar

**The daemon must be running** (`pnpm start`) before visiting any dApp — the extension connects to `localhost:3000`.

### Extension structure

| File | Role |
|------|------|
| `manifest.json` | Manifest V3 config — permissions, content scripts, popup |
| `injected.js` | Runs in page `MAIN` world — registers `window.solana` |
| `content-script.js` | Runs in `ISOLATED` world — bridges page ↔ background |
| `background.js` | Service worker — manages WebSocket connection to daemon |
| `popup.html` / `popup.js` | Extension toolbar popup UI |
| `assets/icons/` | Extension icons (16px, 48px, 128px) |

### What it exposes

The provider is registered on `window.solana` and implements the standard Solana wallet interface:

| Method | Description |
|--------|-------------|
| `connect()` | Connect wallet, returns `{ publicKey }` |
| `disconnect()` | Disconnect from dApp |
| `signTransaction(tx)` | Sign a transaction, returns signed bytes |
| `signAllTransactions(txs)` | Sign multiple transactions in batch |
| `signAndSendTransaction(tx, options)` | Sign and broadcast, returns `{ signature }` |
| `signMessage(message)` | Sign a message, returns `{ signature, publicKey }` |

- `window.solana.isAgenticWallet` is `true`
- `window.solana.isPhantom` is `false` (does not masquerade as Phantom)
- Also registers with [Wallet Standard](https://github.com/wallet-standard/wallet-standard) if the event is available
- Auto-reconnects every 3s if the daemon disconnects

---

## Vault & Key Management

- **Storage**: `~/.wallet/vault.enc` (AES-256-GCM)
- **Key derivation**: PBKDF2-SHA512, 210,000 iterations
- **Mnemonic**: BIP-39 (12 or 24 words)
- **Account derivation**: BIP-44 path `m/44'/501'/{index}'/0'`
- **Compatible with**: Phantom, Backpack, Solflare (same derivation standard)
- **Private keys** are never written to disk — only exist in memory while unlocked

---

## Configuration File

Located at `~/.wallet/config.json`:

```json
{
  "version": 1,
  "cluster": "devnet",
  "rpcUrl": "https://api.devnet.solana.com",
  "walletConnectProjectId": "",
  "accountStore": {
    "accounts": [
      {
        "index": 0,
        "name": "Main",
        "publicKey": "...",
        "derivationPath": "m/44'/501'/0'/0'",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "activeIndex": 0
  }
}
```

---

## Demo Agents

Run the built-in demo to see autonomous agents in action:

```bash
# Terminal 1 — start the daemon
pnpm start

# Terminal 2 — run demo agents
pnpm demo
```

The demo includes:
- **Balance Watcher** — polls and reports balance every 30s
- **Periodic Sender** — sends micro-transactions on a schedule
- **Reporter** — aggregates and logs wallet activity

---

## Architecture Overview

```
CLI Dashboard (Ink/React)
        │
        ▼
   Wallet Daemon
   ┌────────────────────────────────┐
   │  Bridge / Request Handler      │
   │  ┌──────────┐ ┌─────────────┐ │
   │  │ WebSocket│ │WalletConnect│ │
   │  │  :3000   │ │    v2       │ │
   │  └────┬─────┘ └──────┬──────┘ │
   │       └──────┬────────┘        │
   │         Vault (AES-GCM)        │
   │         Solana RPC Client      │
   └────────────────────────────────┘
        │
   MCP Server ──── Claude AI
        │
   Autonomous Agents
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 18+ (ESM) |
| Language | TypeScript 5.9 |
| Build | tsup (esbuild) |
| Terminal UI | Ink 6.8 + React 19 |
| Cryptography | Node.js `crypto`, ed25519-hd-key, TweetNaCl |
| Blockchain | @solana/web3.js 1.98 |
| WalletConnect | @walletconnect/sign-client 2.23 |
| AI Integration | @modelcontextprotocol/sdk 1.27 |
