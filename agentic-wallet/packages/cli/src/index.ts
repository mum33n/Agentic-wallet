import chalk from "chalk";
import { config } from "dotenv";

import { Command } from "commander";
import { startDaemon } from "./commands/startDaemon";
import { startMCP } from "./servers/mcp";

config();

const program = new Command();

program.command("init").action(startDaemon);
program.command("mcp").action(startMCP);

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
