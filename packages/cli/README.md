# @execra/daemon

The Execra daemon — a Solana wallet daemon built for autonomous AI agents.

Runs a local WebSocket server that agents connect to for signing, and an interactive CLI dashboard to manage accounts and monitor activity. Also includes a built-in MCP server so it can work directly with Claude Desktop.

## Installation

```bash
npm install -g @execra/daemon
```

Or run without installing:

```bash
npx @execra/daemon <command>
```

## Quick start

```bash
execra init
```

If no vault exists, `execra init` will create one first. Otherwise it unlocks your vault and starts the daemon + CLI dashboard.

Set `WALLET_PASSWORD` in your environment to skip the unlock prompt:

```bash
export WALLET_PASSWORD=your-password
execra init
```

## Commands

### `execra init`

Starts the daemon. If no vault exists at `~/.wallet/`, it will create one first — generating a BIP-39 mnemonic and encrypting it with your password using AES-256-GCM.

```bash
execra init
```

The dashboard shows live account balances, connected agents, and incoming transaction requests.

### `execra accounts`

List all accounts in the vault.

```bash
execra accounts
```

### `execra new-account <name>`

Create a new named account derived from the vault mnemonic.

```bash
execra new-account "Trading Bot"
execra new-account "Treasury"
```

### `execra balance <name>`

Check the SOL balance of an account.

```bash
execra balance "Trading Bot"
```

## Daemon WebSocket API

When running, the daemon listens on `ws://localhost:3000`:

- `/ws/agent` — for AI agents using the SDK
- `/ws/dapp` — for the Chrome extension / browser dApps (WalletConnect v2)

Agents using `@execra/sdk` connect automatically. If the daemon isn't running, the SDK falls back to reading directly from the vault.

## Built-in MCP server

The daemon exposes an MCP server on startup. To use it with Claude Desktop without a separate `@execra/mcp` install:

```json
{
  "mcpServers": {
    "execra": {
      "command": "execra",
      "args": ["mcp"],
      "env": {
        "WALLET_PASSWORD": "your-password"
      }
    }
  }
}
```

## Vault location

The encrypted vault is stored at `~/.wallet/`:

```
~/.wallet/
├── vault.json     # AES-256-GCM encrypted mnemonic
└── config.json    # cluster, account index
```

Private keys are never written to disk — only the BIP-39 mnemonic, encrypted.

## License

MIT
