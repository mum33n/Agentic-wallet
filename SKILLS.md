# SKILLS.md — Execra Reference

Full reference for the CLI daemon, AgentWallet SDK, MCP server, WebSocket protocol, and Chrome extension.

---

## Table of contents

1. [Installation](#installation)
2. [Environment](#environment)
3. [CLI daemon](#cli-daemon)
4. [Dashboard commands](#dashboard-commands)
5. [AgentWallet SDK](#agentwallet-sdk)
6. [MCP server](#mcp-server)
7. [WebSocket protocol](#websocket-protocol)
8. [Chrome extension](#chrome-extension)
9. [Vault & key management](#vault--key-management)

---

## Installation

### Daemon (CLI)

```bash
npm install -g @execra/daemon
# or
pnpm add -g @execra/daemon
```

Then run from anywhere:

```bash
execra init   # start the daemon
execra mcp    # start the MCP server
```

### AgentWallet SDK

For Node.js agents that need to sign transactions programmatically:

```bash
npm install @execra/sdk
# or
pnpm add @execra/sdk
```

### MCP server (standalone)

For use with Claude Desktop or Claude Code without installing the full daemon:

```bash
npm install -g @execra/mcp
# or
pnpm add -g @execra/mcp
```

Or use directly via `npx` without installing — see the [MCP server](#mcp-server) section.

---

## Environment

Create a `.env` file in the repo root (or export these variables in your shell):

```env
# Required to skip the password prompt on daemon startup
WALLET_PASSWORD=your-vault-password

# WebSocket port (default: 3000)
WS_PORT=3000

# Enhanced RPC (optional, falls back to public RPC)
HELIUS_API_KEY=your-helius-api-key

# Required to enable WalletConnect v2 pairing
WALLETCONNECT_PROJECT_ID=your-project-id
```

---

## CLI daemon

The daemon is the central process. It unlocks the vault, starts the WebSocket server, and runs the interactive Ink dashboard.

### Build and start

```bash
pnpm install
pnpm build

# Start daemon (all packages)
pnpm dev

# Or run the compiled binary directly
node packages/cli/dist/index.js init
```

### Binary commands

```bash
execra init    # unlock vault (or create one on first run), start daemon
execra mcp     # start the MCP server in stdio mode (for Claude Desktop / Code)
```

On first run with `execra init`, if no vault exists you will be prompted to:
1. Choose mnemonic length (12 or 24 words)
2. Write down and confirm your seed phrase
3. Set a vault password

**Keyboard shortcuts in the dashboard:**
- `[1]` — View Dashboard
- `[2]` — View Accounts
- `[q]` — Quit

---

## Dashboard commands

Once the daemon is running, the Ink dashboard accepts these commands at the `>` prompt:

### Wallet lifecycle

| Command | Description |
|---|---|
| `init` | Create a new wallet — generates BIP-39 mnemonic, encrypts vault |
| `unlock` | Unlock the vault with password |
| `lock` | Clear keys from memory (vault stays encrypted on disk) |

### Account management

| Command | Description | Example |
|---|---|---|
| `accounts` | List all accounts with addresses and balances | `accounts` |
| `accounts new <name>` | Create a new named account (BIP-44 derived) | `accounts new "Trading Bot"` |
| `accounts use <name\|index>` | Switch the active account | `accounts use 0` |

### Transactions

| Command | Description | Example |
|---|---|---|
| `send <address> <sol>` | Send SOL from the active account | `send 9xQeWvG... 0.5` |
| `airdrop [sol]` | Request a devnet airdrop (default: 1 SOL, max: 2 SOL) | `airdrop 2` |

### Network

| Command | Description | Example |
|---|---|---|
| `cluster <name>` | Switch Solana cluster | `cluster devnet` |

Valid cluster values: `mainnet-beta`, `devnet`, `testnet`

### dApp connections (WalletConnect)

| Command | Description | Example |
|---|---|---|
| `connect <wc:uri>` | Pair with a dApp via WalletConnect v2 | `connect wc:a1b2c3...` |
| `sessions` | List all connected dApps | `sessions` |
| `disconnect <dapp>` | Disconnect a dApp by name (partial match) | `disconnect Magic Eden` |

### Other

| Command | Description |
|---|---|
| `help` | Show all available commands |
| `exit` / `quit` | Exit the wallet daemon |

---

## AgentWallet SDK

Package: `@execra/sdk`

```bash
npm install @execra/sdk
```

```typescript
import { AgentWallet } from "@execra/sdk";
```

### Which integration to use

```
Are you writing TypeScript/JavaScript?
  └─ Yes → AgentWallet SDK  (direct vault access, no daemon needed)

Are you writing in another language or a separate process?
  └─ Yes → WebSocket protocol  (daemon must be running)

Are you using Claude Desktop or Claude Code?
  └─ Yes → MCP server  (tools handle everything, no raw protocol needed)

Does your agent control a browser and need window.solana?
  └─ Yes → Chrome Extension  (daemon must be running)
```

### Connect

```typescript
const wallet = await AgentWallet.connect("Trading Bot");
// If "Trading Bot" doesn't exist, a new BIP-44 account is created automatically.
// Tries daemon WebSocket first; falls back to vault directly if daemon isn't running.
```

With explicit password (skips daemon, reads vault directly):

```typescript
const wallet = await AgentWallet.connect("Trading Bot", {
  password: process.env.WALLET_PASSWORD,
});
```

### Properties

```typescript
wallet.name             // "Trading Bot"
wallet.publicKey        // base58 Solana address (string)
wallet.solanaPublicKey  // PublicKey object (@solana/web3.js)
wallet.accountIndex     // BIP-44 derivation index
```

### Balance

```typescript
const sol = await wallet.getBalance();              // number (SOL)
const lamports = await wallet.getBalanceLamports(); // number
```

### Airdrop (devnet only)

```typescript
const sig = await wallet.requestAirdrop(1); // max 2 SOL
```

### Simulate

Preview a transaction without signing or broadcasting:

```typescript
const result = await wallet.simulate(tx);
// tx accepts: Transaction | VersionedTransaction | Buffer | Uint8Array | base64 string

result.success               // boolean
result.error                 // string | undefined
result.computeUnitsConsumed  // number | undefined
result.fee                   // number | undefined (lamports)
result.programIds            // string[]
result.logs                  // string[]
```

### Sign only

```typescript
const signedBuffer  = await wallet.signTransaction(tx);
const signedBuffers = await wallet.signAllTransactions([tx1, tx2]);
```

### Sign and send

Simulates first — throws if simulation fails:

```typescript
const result = await wallet.signAndSendTransaction(tx);

// Skip simulation (not recommended):
const result = await wallet.signAndSendTransaction(tx, "devnet", true);

result.signature    // base58 tx signature
result.confirmed    // boolean
result.explorerUrl  // Solana Explorer link
```

Accepted cluster values: `"devnet"` (default), `"mainnet-beta"`, `"testnet"`.

### Sign message

Prove ownership of an account without sending a transaction:

```typescript
const signature = wallet.signMessage("hello");                   // base58 signature
const signature = wallet.signMessage(new Uint8Array([1, 2, 3]));
```

### Transaction history

```typescript
const signatures = await wallet.getRecentTransactions(10); // string[]
```

### Helpers

```typescript
const { blockhash, lastValidBlockHeight } = await wallet.getLatestBlockhash();
const connection = wallet.getConnection(); // @solana/web3.js Connection
```

### Full example

```typescript
import { AgentWallet } from "@execra/sdk";
import { Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

const wallet = await AgentWallet.connect("DCA Bot");

const { blockhash } = await wallet.getLatestBlockhash();

const tx = new Transaction({
  recentBlockhash: blockhash,
  feePayer: wallet.solanaPublicKey,
}).add(
  SystemProgram.transfer({
    fromPubkey: wallet.solanaPublicKey,
    toPubkey: new PublicKey("RecipientAddressHere"),
    lamports: 0.01 * LAMPORTS_PER_SOL,
  })
);

const { signature, explorerUrl } = await wallet.signAndSendTransaction(tx);
console.log("Sent:", explorerUrl);
```

---

## MCP server

Package: `@execra/mcp`

The MCP server exposes wallet operations as tools so Claude (or any MCP client) can control the wallet via natural language. It reads the vault directly using `WALLET_PASSWORD` — **no daemon required**.

### Add to Claude Desktop

#### From npm (recommended)

Edit `~/.claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "execra": {
      "command": "npx",
      "args": ["@execra/mcp"],
      "env": {
        "WALLET_PASSWORD": "your-password"
      }
    }
  }
}
```

If you installed globally (`npm install -g @execra/mcp`):

```json
{
  "mcpServers": {
    "execra": {
      "command": "execra-mcp",
      "env": {
        "WALLET_PASSWORD": "your-password"
      }
    }
  }
}
```

#### From source

```json
{
  "mcpServers": {
    "execra": {
      "command": "node",
      "args": ["/path/to/agentic-wallet/packages/mcp/dist/index.js"],
      "env": {
        "WALLET_PASSWORD": "your-password"
      }
    }
  }
}
```

### Add to Claude Code

#### From npm (recommended)

```bash
claude mcp add execra -- npx @execra/mcp
```

Pass the vault password via `-e`:

```bash
claude mcp add execra -e WALLET_PASSWORD=your-password -- npx @execra/mcp
```

#### From the daemon binary

```bash
execra mcp
```

#### From source

```bash
claude mcp add execra \
  -- node /path/to/agentic-wallet/packages/mcp/dist/index.js
```

### Available tools

| Tool | Description | Parameters |
|---|---|---|
| `list_accounts` | List all accounts with addresses and indices | — |
| `create_account` | Create a new named account | `account_name` |
| `get_balance` | Get SOL balance for a named account | `account_name` |
| `request_airdrop` | Request devnet airdrop | `account_name`, `amount_sol` (0.1–2, default 1) |
| `transfer_sol` | Transfer SOL (simulates first) | `from_account`, `to_address`, `amount_sol`, `skip_simulation` |
| `send_token` | Send SPL tokens (handles ATAs automatically) | `to_address`, `mint_address`, `amount`, `account_name?` |
| `simulate_transaction` | Preview a base64 transaction | `account_name`, `transaction_b64` |
| `sign_message` | Sign a message for proof of ownership | `account_name`, `message` |
| `get_recent_transactions` | Get recent tx signatures | `account_name`, `limit` (1–20, default 5) |

### Example Claude prompts

```
Check the balance of my "Trading Bot" account
Send 0.05 SOL from "Trading Bot" to <address>
List all my wallet accounts
Sign the message "I own this wallet" with my "Main" account
Show me the last 10 transactions for "DCA Bot"
```

---

## WebSocket protocol

Use this when your agent is in a separate process or written in a language that can't import the TypeScript SDK. The daemon must be running (`execra init`).

### Endpoints

| Endpoint | For |
|---|---|
| `ws://localhost:3000/ws/agent` | Agent programs — full access including keypair retrieval |
| `ws://localhost:3000/ws/dapp` | Browser dApps — signing only, no keypair exposure |

All messages are JSON. All responses echo the request `id`.

---

### Step 1 — Register your agent

Before signing anything, call `agent_connect` to find or create your named account. This does **not** switch the active account — it only registers the name and returns the public key.

```json
// Request
{ "id": 1, "method": "agent_connect", "params": { "accountName": "My Bot" } }

// Response
{ "id": 1, "result": { "publicKey": "9xQeWvG...", "name": "My Bot", "index": 2 } }
```

If the account name doesn't exist it is created automatically and persisted to the vault config.

---

### Step 2 — Signing methods

Signing methods always use the **active account** (set via `accounts use` in the CLI). Every signing request runs pre-flight simulation first — if simulation fails the request is rejected before signing.

Signing requests require `topic` and `dapp` fields in addition to `id`, `method`, and `params`:

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
Sign an off-chain message for authentication. Encode the message as **base64** before sending (also accepts base58, then falls back to raw UTF-8).

```json
// Request — encode message as base64 first
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

---

### Read-only methods

These methods do not sign anything and do not require `topic` or `dapp`.

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
{ "id": 10, "result": { "success": true, "computeUnits": 450, "fee": 5000, "logs": ["..."] } }
```

#### `agent_getKeypair` (`/ws/agent` only)
Returns the raw secret key for a named account. Blocked on `/ws/dapp`.

```json
// Request
{ "id": 11, "method": "agent_getKeypair", "params": { "accountName": "My Bot" } }

// Response
{ "id": 11, "result": { "publicKey": "9xQeWvG...", "secretKey": "<base64>", "name": "My Bot", "index": 2 } }
```

---

### Error codes

All errors follow the same shape:

```json
{ "id": 1, "error": { "code": 4001, "message": "agent_getKeypair only available on /ws/agent" } }
```

| Code | Meaning |
|---|---|
| `-32700` | Parse error (malformed JSON) |
| `4000` | General error (simulation failed, missing params, etc.) |
| `4001` | Unauthorized (keypair access on `/ws/dapp`) |
| `4100` | Unauthorized (WalletConnect standard) |
| `4200` | Method not supported |
| `4900` | Disconnected |

---

## Chrome extension

The extension lives in `apps/extension/` and registers `window.solana` so any browser dApp works without installing a separate wallet. It connects to the daemon at `ws://localhost:3000/ws/dapp`.

### Load in Chrome

1. Start the daemon: `execra init`
2. Open `chrome://extensions`
3. Enable **Developer mode**
4. Click **Load unpacked** and select the `apps/extension/` directory

The daemon must be running before visiting any dApp — the extension connects to `localhost:3000`.

### Extension files

| File | Role |
|---|---|
| `manifest.json` | Manifest V3 config — permissions, content scripts, popup |
| `injected.js` | Runs in page `MAIN` world — registers `window.solana` |
| `content-script.js` | Runs in `ISOLATED` world — bridges page ↔ background |
| `background.js` | Service worker — manages WebSocket connection to daemon |
| `popup.html` / `popup.js` | Extension toolbar popup UI |

### `window.solana` API

| Method | Description |
|---|---|
| `connect()` | Connect wallet, returns `{ publicKey }` |
| `disconnect()` | Disconnect from dApp |
| `signTransaction(tx)` | Sign a transaction, returns signed bytes |
| `signAllTransactions(txs)` | Sign multiple transactions in batch |
| `signAndSendTransaction(tx, options)` | Sign and broadcast, returns `{ signature }` |
| `signMessage(message)` | Sign a message, returns `{ signature, publicKey }` |

- `window.solana.isExecra` is `true`
- Also registers with [Wallet Standard](https://github.com/wallet-standard/wallet-standard) if the event is available
- Auto-reconnects every 3s if the daemon disconnects

---

## Vault & key management

- **Storage**: `~/.wallet/vault.enc` (AES-256-GCM)
- **Key derivation**: PBKDF2-SHA512, 210,000 iterations
- **Mnemonic**: BIP-39 (12 or 24 words)
- **Account derivation**: BIP-44 path `m/44'/501'/{index}'/0'`
- **Compatible with**: Phantom, Backpack, Solflare (same derivation standard)
- **Private keys** are never written to disk — only exist in memory while the daemon is unlocked

Config file location: `~/.wallet/config.json`

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
