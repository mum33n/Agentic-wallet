import chalk from "chalk";
import { config } from "dotenv";

import { Command } from "commander";
import { startDaemon } from "./commands/startDaemon";

config();

const program = new Command();

program.command("init").action(startDaemon);

program.parse();

// ── Cleanup ───────────────────────────────────────────────────────────────────

process.on("SIGINT", () => {
  console.log(chalk.dim("\nShutting down.\n"));
  process.exit(0);
});

process.on("uncaughtException", (err) => {
  console.error(chalk.red(`\nError: ${err.message}\n`));
  process.exit(1);
});

// main().catch((err) => {
//   console.error(chalk.red(`Fatal: ${err.message}`));
//   process.exit(1);
// });
