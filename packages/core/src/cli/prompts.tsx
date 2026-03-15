/**
 *
 * Ink-based interactive prompts replacing readline/inquirer.
 */

import React, { useState, useRef } from "react";
import { render, Box, Text, useInput, useApp } from "ink";

// ── Password Prompt ────────────────────────────────────────────────────────────

export function inkPassword(question: string): Promise<string> {
  return new Promise((resolve) => {
    let result = "";

    function PasswordPrompt() {
      const { exit } = useApp();
      const valueRef = useRef("");
      const [maskLen, setMaskLen] = useState(0);

      useInput((input, key) => {
        if (key.return) {
          result = valueRef.current;
          exit();
          return;
        }
        if (key.backspace || key.delete) {
          if (valueRef.current.length > 0) {
            valueRef.current = valueRef.current.slice(0, -1);
            setMaskLen(valueRef.current.length);
          }
          return;
        }
        if (input && !key.ctrl && !key.meta) {
          valueRef.current += input;
          setMaskLen(valueRef.current.length);
        }
      });

      return (
        <Box>
          <Text bold>{question} </Text>
          <Text color="gray">{"*".repeat(maskLen)}</Text>
        </Box>
      );
    }

    const { waitUntilExit } = render(<PasswordPrompt />);
    waitUntilExit().then(() => resolve(result));
  });
}

// ── Select Prompt ──────────────────────────────────────────────────────────────

export function inkSelect<T>(
  message: string,
  choices: { name: string; value: T }[],
): Promise<T> {
  return new Promise((resolve) => {
    let result: T = choices[0].value;

    function SelectPrompt() {
      const { exit } = useApp();
      const cursorRef = useRef(0);
      const [cursor, setCursor] = useState(0);

      useInput((_, key) => {
        if (key.upArrow) {
          const n = Math.max(0, cursorRef.current - 1);
          cursorRef.current = n;
          setCursor(n);
        }
        if (key.downArrow) {
          const n = Math.min(choices.length - 1, cursorRef.current + 1);
          cursorRef.current = n;
          setCursor(n);
        }
        if (key.return) {
          result = choices[cursorRef.current].value;
          exit();
        }
      });

      return (
        <Box flexDirection="column">
          <Text bold>{message}</Text>
          {choices.map((choice, i) => (
            <Box key={i}>
              <Text color={i === cursor ? "cyan" : "gray"}>
                {i === cursor ? "❯ " : "  "}
                {choice.name}
              </Text>
            </Box>
          ))}
        </Box>
      );
    }

    const { waitUntilExit } = render(<SelectPrompt />);
    waitUntilExit().then(() => resolve(result));
  });
}

// ── Confirm Prompt ─────────────────────────────────────────────────────────────

export function inkConfirm(
  message: string,
  defaultYes = false,
): Promise<boolean> {
  return new Promise((resolve) => {
    let result = defaultYes;

    function ConfirmPrompt() {
      const { exit } = useApp();

      useInput((input, key) => {
        if (key.return) {
          result = defaultYes;
          exit();
          return;
        }
        const ch = input.toLowerCase();
        if (ch === "y") {
          result = true;
          exit();
        } else if (ch === "n") {
          result = false;
          exit();
        }
      });

      const hint = defaultYes ? "Y/n" : "y/N";
      return (
        <Box>
          <Text bold>{message} </Text>
          <Text color="gray">[{hint}] </Text>
        </Box>
      );
    }

    const { waitUntilExit } = render(<ConfirmPrompt />);
    waitUntilExit().then(() => resolve(result));
  });
}
