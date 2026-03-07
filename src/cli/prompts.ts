/**
 * cli/prompt.ts
 *
 * Lightweight prompt helpers built on Node's readline.
 * Uses a SINGLE shared readline interface so stdin never closes
 * between commands — fixing the inquirer exit bug.
 */

import * as readline from "readline";

let rl: readline.Interface | null = null;

/**
 * Set the shared readline interface.
 * Called once by repl.ts when it creates the interface.
 */
export function setReadline(instance: readline.Interface): void {
  rl = instance;
}

/**
 * Ask a question and return the answer.
 */
export function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    if (!rl) throw new Error("readline not initialised");
    rl.question(question, (answer) => resolve(answer));
  });
}

/**
 * Ask for a password — input is masked with asterisks.
 * Pauses the shared readline interface to take full control
 * of stdin, then resumes it when done.
 */
export function askPassword(question: string): Promise<string> {
  return new Promise((resolve) => {
    // Pause readline so it stops consuming stdin events
    if (rl) rl.pause();

    process.stdout.write(question);

    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.setEncoding("utf8");
    stdin.resume();

    let password = "";

    const onData = (char: string) => {
      switch (char) {
        // case "\u0003": // Ctrl+C
        //   stdin.setRawMode(false);
        //   stdin.removeListener("data", onData);
        //   process.stdout.write("\n");
        //   if (rl) rl.resume();
        //   process.exit(0);
        //   break;

        case "\r": // Enter
        case "\n":
          stdin.setRawMode(false);
          stdin.removeListener("data", onData);
          process.stdout.write("\n");
          // Resume readline so REPL continues working
          if (rl) rl.resume();
          resolve(password);
          break;

        // case "\u007f": // Backspace
        // case "\b":
        // case "\u0008":
        // case "\u007f":
        //   if (password.length > 0) {
        //     password = password.slice(0, -1);
        //     // Erase last asterisk
        //     process.stdout.write("*");
        //   }
        //   break;

        default:
          // Ignore non-printable characters
          if (char >= " ") {
            password += char;
            // process.stdout.clearLine(0);
            process.stdout.write("\b");
            process.stdout.write("*");
            // process.stdout.write(dropped);
          }
      }
    };

    stdin.on("data", onData);
  });
}

/**
 * Ask a yes/no question. Returns true for y/Y.
 */
export async function confirm(
  question: string,
  defaultYes = false,
): Promise<boolean> {
  const hint = defaultYes ? "[Y/n]" : "[y/N]";
  const answer = await ask(`${question} ${hint} `);
  if (answer.trim() === "") return defaultYes;
  return answer.trim().toLowerCase() === "y";
}

/**
 * Ask user to choose from a list of options.
 */
export async function choose<T extends string>(
  question: string,
  options: T[],
): Promise<T> {
  console.log(question);
  options.forEach((opt, i) => console.log(`  ${i + 1}) ${opt}`));

  while (true) {
    const answer = await ask(`Choice (1-${options.length}): `);
    const index = parseInt(answer.trim()) - 1;
    if (index >= 0 && index < options.length) return options[index];
    console.log(`Please enter a number between 1 and ${options.length}`);
  }
}
