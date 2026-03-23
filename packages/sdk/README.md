# @execra/sdk

The AgentWallet SDK — a self-contained Solana wallet for autonomous AI agents.

Agents connect by name. If the account doesn't exist yet, it's created automatically from the encrypted vault. No browser popups, no password prompts, no private keys in config files.

## Installation

```bash
npm install @execra/sdk
```

## Quick start

```typescript
import { AgentWallet } from "@execra/sdk";

const wallet = await AgentWallet.connect("Trading Bot");

const balance = await wallet.getBalance();
console.log(`Balance: ${balance} SOL`);

const { signature } = await wallet.signAndSendTransaction(tx);
console.log(`Sent: ${signature}`);
```

## Requirements

Set `WALLET_PASSWORD` in your environment (or pass it via options). The wallet reads the encrypted vault at `~/.wallet/`.

Run `npx @execra/daemon init` first to create the vault if you haven't already.

```bash
export WALLET_PASSWORD=your-password
```

## API

### `AgentWallet.connect(name, options?)`

Connects to an existing account or creates a new one.

```typescript
const wallet = await AgentWallet.connect("My Agent");

// With options
const wallet = await AgentWallet.connect("My Agent", {
  password: "vault-password",       // falls back to WALLET_PASSWORD env var
  cluster: "mainnet-beta",          // or "devnet", "testnet", custom RPC URL
  daemonUrl: "ws://localhost:3000", // custom daemon WebSocket URL
});
```

### `wallet.getBalance()`

Returns the SOL balance in lamports.

```typescript
const lamports = await wallet.getBalance();
const sol = lamports / 1e9;
```

### `wallet.signAndSendTransaction(transaction, skipSimulation?)`

Signs and broadcasts a transaction. Simulates first by default — throws if simulation fails.

```typescript
const { signature, confirmed, explorerUrl } = await wallet.signAndSendTransaction(tx);

// Skip simulation (not recommended)
const result = await wallet.signAndSendTransaction(tx, true);
```

Accepts `Transaction`, `VersionedTransaction`, `Buffer`, `Uint8Array`, or a base64 string.

### `wallet.signMessage(message)`

Signs an off-chain message for authentication or proof of ownership.

```typescript
const signature = wallet.signMessage("hello world");
// returns base58-encoded signature
```

### `wallet.getRecentTransactions(limit?)`

Returns recent transaction signatures for this account.

```typescript
const signatures = await wallet.getRecentTransactions(10);
```

### `wallet.simulateTransaction(transaction)`

Simulates a transaction without broadcasting. Returns fee estimate, logs, and program IDs.

```typescript
const { success, fee, logs, error } = await wallet.simulateTransaction(tx);
```

### Properties

```typescript
wallet.publicKey        // base58 public key string
wallet.solanaPublicKey  // @solana/web3.js PublicKey object
```

## How it works

When you call `AgentWallet.connect("name")`, Execra:

1. Looks up the account by name in the vault
2. If not found, derives a new BIP-44 keypair from the vault mnemonic and saves it
3. Returns a wallet instance ready to sign and send transactions

If the Execra daemon is running, the SDK connects over WebSocket and the daemon handles all signing. If not, it reads directly from the encrypted vault using `WALLET_PASSWORD`. Either way, your agent code doesn't change.

## Clusters

```typescript
// Named clusters
await AgentWallet.connect("Bot", { cluster: "mainnet-beta" });
await AgentWallet.connect("Bot", { cluster: "devnet" });
await AgentWallet.connect("Bot", { cluster: "testnet" });

// Custom RPC
await AgentWallet.connect("Bot", { cluster: "https://mainnet.helius-rpc.com/?api-key=..." });
```

Falls back to the cluster saved in `~/.wallet/config.json` if not specified.

## License

MIT
