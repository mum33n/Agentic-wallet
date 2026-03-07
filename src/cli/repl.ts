import * as readline from "readline";
import chalk from "chalk";
import {
  cmdInit,
  cmdUnlock,
  cmdLock,
  cmdAccounts,
  cmdNewAccount,
  cmdUseAccount,
  cmdAirdrop,
  cmdConnect,
  cmdSessions,
  cmdDisconnect,
  cmdSetCluster,
} from "./commands";
import { setReadline } from "./prompts";

const HELP = `
${chalk.bold("Commands")}

  ${chalk.cyan("init")}                        Create a new wallet
  ${chalk.cyan("unlock")}                      Unlock vault
  ${chalk.cyan("lock")}                        Lock wallet
  ${chalk.cyan("accounts")}                    List accounts
  ${chalk.cyan("accounts new <name>")}         Create account
  ${chalk.cyan("accounts use <name|index>")}   Switch account
  ${chalk.cyan("airdrop [sol]")}               Request devnet airdrop
  ${chalk.cyan("connect <wc:uri>")}            Connect dApp via WalletConnect
  ${chalk.cyan("sessions")}                    List connected dApps
  ${chalk.cyan("disconnect <dapp>")}           Disconnect dApp
  ${chalk.cyan("cluster <name>")}              Set cluster (devnet/mainnet-beta)
  ${chalk.cyan("help")}                        Show this message
  ${chalk.cyan("exit")}                        Quit
`;

/**
 * Start the interactive REPL.
 *
 * Accepts an existing readline interface so the caller can reuse
 * the one created at process start — never create a second readline.
 * Creating or closing a readline mid-process corrupts stdin echo state.
 */
export function startRepl(existingRl?: readline.Interface): void {
  const rl =
    existingRl ??
    readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: chalk.green("wallet") + chalk.dim(" › "),
    });

  // Keep prompt module in sync with whichever rl we're using
  setReadline(rl);

  rl.setPrompt(chalk.green("wallet") + chalk.dim(" › "));

  rl.on("line", async (line) => {
    const parts = line.trim().split(/\s+/);
    const cmd = parts[0];

    try {
      switch (cmd) {
        case "":
          break;
        case "help":
          console.log(HELP);
          break;
        case "exit":
        case "quit":
          process.exit(0);

        case "init":
          await cmdInit();
          break;
        case "unlock":
          await cmdUnlock();
          break;
        case "lock":
          cmdLock();
          break;
        case "airdrop":
          await cmdAirdrop(Number(parts[1]) || 1);
          break;
        case "connect":
          await cmdConnect(parts[1]);
          break;
        case "sessions":
          cmdSessions();
          break;
        case "disconnect":
          await cmdDisconnect(parts.slice(1).join(" "));
          break;
        case "cluster":
          cmdSetCluster(parts[1]);
          break;

        case "accounts":
          if (parts[1] === "new") await cmdNewAccount(parts.slice(2).join(" "));
          else if (parts[1] === "use") await cmdUseAccount(parts[2]);
          else await cmdAccounts();
          break;

        default:
          console.log(chalk.red(`Unknown: ${cmd}. Type "help".`));
      }
    } catch (err: any) {
      console.error(chalk.red(`Error: ${err.message}`));
    }

    rl.prompt();
  });

  rl.on("close", () => {
    console.log(chalk.dim("\nGoodbye."));
    process.exit(0);
  });
}
