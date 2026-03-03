import chalk from "chalk";
import { prompt } from "./cli/repl.js";

const main = async () => {
  const [, , ...args] = process.argv;
  const cmd = args[0];

  if (!cmd || cmd === "help") {
    console.log(`
      ${chalk.bold("  ╔═══════════════════════════════╗")}
      ${chalk.bold(`  ║        ${chalk.green(" AGENTIC WALLET")}        ║`)}
      ${chalk.bold("  ║      Solana · Autonomous      ║")}
      ${chalk.bold("  ╚═══════════════════════════════╝")}
      `);
  }
};
main();

prompt();
