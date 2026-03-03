import readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "wallet> ",
  terminal: process.stdin.isTTY,
});

export function prompt() {
  rl.prompt();
}

rl.on("line", (line) => {
  const cmd = line.trim();
  console.log(cmd);
  if (!cmd) {
    prompt();
    return;
  }
  if (cmd === "exit" || cmd === "quit") {
    console.clear();
    console.log("Bye!");
    process.exit(0);
  }
  //TODO: handle prompts
  prompt();
});

rl.on("close", () => process.exit(0));
