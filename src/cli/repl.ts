import * as readline from "readline";
import chalk from "chalk";
import {
  cmdInit,
  cmdUnlock,
  cmdAccounts,
  cmdNewAccount,
  cmdUseAccount,
  cmdAirdrop,
  cmdConnect,
  cmdSessions,
  cmdDisconnect,
  isUnlocked,
} from "./commands";
import inquirer from "inquirer";
import { setReadline } from "./prompts";

const HELP = `
${chalk.bold("Agentic Wallet — Commands")}

  ${chalk.cyan("wallet init")}                     Create a new wallet
  ${chalk.cyan("wallet unlock")}                   Unlock vault for session
  ${chalk.cyan("wallet accounts")}                 List all accounts
  ${chalk.cyan("wallet accounts new <name>")}      Create a new account
  ${chalk.cyan("wallet accounts use <name>")}      Switch active account
  ${chalk.cyan("wallet airdrop [sol]")}            Request devnet airdrop
  ${chalk.cyan("wallet connect <wc:uri>")}         Connect to a dApp via WalletConnect
  ${chalk.cyan("wallet sessions")}                 List connected dApps
  ${chalk.cyan("wallet disconnect <dapp>")}        Disconnect from a dApp
  ${chalk.cyan("wallet config rpc <cluster>")}     Set cluster (devnet/mainnet-beta)
  ${chalk.cyan("wallet help")}                     Show this message
  ${chalk.cyan("exit")}                            Quit
`;

export function startRepl(): void {
  console.log(chalk.bold("\n⬡  Agentic Wallet"));
  console.log(chalk.dim('   Type "help" for commands\n'));

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.green("wallet") + chalk.dim(" › "),
  });

  setReadline(rl);

  rl.prompt();

  rl.on("line", async (line) => {
    const parts = line.trim().split(/\s+/);
    const cmd = parts[0];

    try {
      switch (cmd) {
        case "":
          break;
        case "help":
          console.log(HELP);
          //   rl.prompt();
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

        case "accounts":
          if (parts[1] === "new") await cmdNewAccount(parts.slice(2).join(" "));
          else if (parts[1] === "use") await cmdUseAccount(parts[2]);
          else await cmdAccounts();
          break;

        // case 'config':
        //   if (parts[1] === 'rpc') await cmdSetRpc(parts[2])
        //   break

        default:
          console.log(
            chalk.red(`Unknown command: ${cmd}. Type "help" for usage.`),
          );
      }
    } catch (err: any) {
      console.error(chalk.red(`Error: ${err.message}`));
    }

    rl.prompt();
    rl.on("close", () => {
      console.log(chalk.dim("\nGoodbye."));
      process.exit(0);
    });
  });
}
