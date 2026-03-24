# @execra/mcp

Execra MCP server — gives Claude (or any MCP client) a Solana wallet.

Claude can list accounts, check balances, transfer SOL, send SPL tokens, sign messages, and simulate transactions — all via natural language, no browser popups required.

## Usage with Claude Desktop

Add to `~/.claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "execra": {
      "command": "npx",
      "args": ["-y", "@execra/mcp"],
      "env": {
        "WALLET_PASSWORD": "your-vault-password"
      }
    }
  }
}
```

Restart Claude Desktop. You can now say things like:

- "Check my wallet balance"
- "Send 0.1 SOL to `<address>`"
- "What accounts do I have?"
- "Sign this message for me"

## Usage with Claude Code

Add to your project's `.mcp.json` or run:

```bash
claude mcp add execra -- npx -y @execra/mcp
```

Then set `WALLET_PASSWORD` in your environment.

## Setup

Run the daemon once to create your encrypted vault:

```bash
npx @execra/daemon init
```

This generates a BIP-39 mnemonic and saves it encrypted to `~/.wallet/`. You only do this once — all accounts are derived from the same vault.

## Environment variables

| Variable | Description |
|---|---|
| `WALLET_PASSWORD` | Password to decrypt the vault (required) |
| `SOLANA_CLUSTER` | Cluster to use: `mainnet-beta`, `devnet`, `testnet`, or a custom RPC URL (default: `devnet`) |

## Available MCP tools

| Tool | Description |
|---|---|
| `list_accounts` | List all wallet accounts with names and balances |
| `get_balance` | Get SOL balance for an account |
| `transfer_sol` | Send SOL to an address |
| `transfer_token` | Send an SPL token to an address |
| `sign_message` | Sign an off-chain message |
| `simulate_transaction` | Simulate a transaction and return fee + logs |
| `get_recent_transactions` | Get recent transaction signatures |

## How it works

Every tool call goes through the same pipeline:

1. Load the named account from the encrypted vault
2. Simulate the transaction (for transfers) — reject if it would fail
3. Sign with the derived keypair
4. Broadcast to Solana

The vault password never leaves your machine.

## License

MIT
