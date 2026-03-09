/**
 * cli/ui.tsx
 *
 * Rich terminal UI built with ink (React for terminals).
 * Runs when the daemon starts — shows live activity log,
 * account info, connected dApps, agent statuses, and an
 * always-ready command prompt at the bottom.
 *
 * Two views:
 *   Dashboard — live overview of everything happening
 *   Accounts  — account list with balances
 *
 * The bottom command bar replaces the readline REPL.
 * Prompts (password, select, confirm) appear inline.
 */

import React, { useState, useEffect, useRef } from "react";
import { render, Box, Text, useInput, useApp } from "ink";
import chalk from "chalk";
import { getCluster, WalletVault } from "../vault";
import { vaultExists, loadVault, saveVault } from "../vault/keystore";
import { generateMnemonic, mnemonicToSeed } from "../vault/mnemonic";
import { deriveAccount } from "../vault/accounts";
import { createConfig, saveConfig } from "../vault/config";
import { getBalance } from "../solana/rpc";
import { getAllSessions } from "../bridge/session";
import {
  cmdLock,
  cmdAccounts,
  cmdNewAccount,
  cmdUseAccount,
  cmdAirdrop,
  cmdConnect,
  cmdSessions,
  cmdDisconnect,
  cmdSetCluster,
  cmdSend,
} from "./commands";

// ── Types ─────────────────────────────────────────────────────────────────────

interface LogEntry {
  time: string;
  source: string;
  message: string;
  type: "info" | "success" | "error" | "warn";
}

interface AgentStatus {
  id: string;
  name: string;
  running: boolean;
  runCount: number;
  error?: string;
}

interface DashboardProps {
  vault: WalletVault;
  agentStatus: AgentStatus[];
  onExit: () => void;
}

// Inline prompt state machine
type PromptState =
  | null
  | { type: "password"; question: string }
  | { type: "select"; message: string; choices: { name: string; value: any }[] }
  | { type: "confirm"; message: string; defaultYes: boolean };

// ── Utilities ─────────────────────────────────────────────────────────────────

function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, "");
}

// ── Log Colors ────────────────────────────────────────────────────────────────

function logColor(type: LogEntry["type"]): string {
  switch (type) {
    case "success":
      return "green";
    case "error":
      return "red";
    case "warn":
      return "yellow";
    default:
      return "gray";
  }
}

// ── Components ────────────────────────────────────────────────────────────────

function Header({ cluster }: { cluster: string }) {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        <Text bold color="cyan">
          ⬡ Agentic Wallet
        </Text>
        <Text color="gray"> {cluster}</Text>
      </Box>
      <Text color="gray">{"─".repeat(60)}</Text>
    </Box>
  );
}

function AccountRow({
  index,
  name,
  publicKey,
  balance,
  isActive,
}: {
  index: number;
  name: string;
  publicKey: string;
  balance: string;
  isActive: boolean;
}) {
  return (
    <Box>
      <Text color={isActive ? "green" : "gray"}>{isActive ? "●" : "○"} </Text>
      <Text color="gray">[{index}] </Text>
      <Text bold={isActive}>{name.padEnd(18)}</Text>
      <Text color="gray">
        {publicKey.slice(0, 6)}...{publicKey.slice(-4)}{" "}
      </Text>
      <Text color={isActive ? "cyan" : "gray"}>{balance}</Text>
    </Box>
  );
}

function SessionRow({
  name,
  url,
  account,
}: {
  name: string;
  url: string;
  account: string;
}) {
  return (
    <Box>
      <Text color="green">◉ </Text>
      <Text bold>{name.padEnd(20)}</Text>
      <Text color="gray">{url.slice(0, 30).padEnd(32)}</Text>
      <Text color="gray">
        {account.slice(0, 6)}...{account.slice(-4)}
      </Text>
    </Box>
  );
}

function AgentRow({ agent }: { agent: AgentStatus }) {
  return (
    <Box>
      <Text color={agent.running ? "green" : "gray"}>
        {agent.running ? "▶" : "■"}{" "}
      </Text>
      <Text bold={agent.running}>{agent.id.padEnd(22)}</Text>
      <Text color={agent.running ? "cyan" : "gray"}>
        {agent.running ? "RUNNING" : "STOPPED"}
        {"  "}
      </Text>
      <Text color="gray">runs: {agent.runCount}</Text>
      {agent.error && <Text color="red"> ⚠ {agent.error.slice(0, 30)}</Text>}
    </Box>
  );
}

function LogRow({ entry }: { entry: LogEntry }) {
  return (
    <Box>
      <Text color="gray">{entry.time} </Text>
      <Text color="cyan">{entry.source.padEnd(20)}</Text>
      <Text color={logColor(entry.type)}>{entry.message}</Text>
    </Box>
  );
}

// ── Prompt Display ─────────────────────────────────────────────────────────────

function PromptRow({
  prompt,
  maskLen,
  cursor,
}: {
  prompt: Exclude<PromptState, null>;
  maskLen: number;
  cursor: number;
}) {
  if (prompt.type === "password") {
    return (
      <Box>
        <Text bold color="cyan">
          {prompt.question}{" "}
        </Text>
        <Text color="gray">{"*".repeat(maskLen)}</Text>
        <Text color="green">█</Text>
      </Box>
    );
  }

  if (prompt.type === "select") {
    return (
      <Box flexDirection="column">
        <Text bold>{prompt.message}</Text>
        {prompt.choices.map((c, i) => (
          <Box key={i}>
            <Text color={i === cursor ? "cyan" : "gray"}>
              {i === cursor ? "❯ " : "  "}
              {c.name}
            </Text>
          </Box>
        ))}
      </Box>
    );
  }

  if (prompt.type === "confirm") {
    const hint = prompt.defaultYes ? "Y/n" : "y/N";
    return (
      <Box>
        <Text bold>{prompt.message} </Text>
        <Text color="gray">[{hint}]</Text>
      </Box>
    );
  }

  return null;
}

// ── Command Bar ────────────────────────────────────────────────────────────────

function CommandBar({
  buffer,
  running,
}: {
  buffer: string;
  running: boolean;
}) {
  return (
    <Box>
      <Text color="green" bold>
        wallet
      </Text>
      <Text color="gray"> › </Text>
      {running ? (
        <Text color="yellow" dimColor>
          running…
        </Text>
      ) : (
        <Text>
          {buffer}
          <Text color="green">█</Text>
        </Text>
      )}
    </Box>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

function Dashboard({ vault, agentStatus, onExit }: DashboardProps) {
  const { exit } = useApp();
  const [view, setView] = useState<"dashboard" | "accounts">("dashboard");
  const [accounts, setAccounts] = useState<any[]>([]);
  const [balances, setBalances] = useState<Record<string, string>>({});
  const [sessions, setSessions] = useState<any[]>([]);
  const [cluster, setCluster] = useState("devnet");

  // Command input
  const [cmdBuffer, setCmdBuffer] = useState("");
  const [cmdRunning, setCmdRunning] = useState(false);

  // Inline prompt
  const [promptState, setPromptState] = useState<PromptState>(null);
  const promptResolverRef = useRef<((val: any) => void) | null>(null);
  const passwordValueRef = useRef("");
  const [passwordMaskLen, setPasswordMaskLen] = useState(0);
  const selectCursorRef = useRef(0);
  const [selectCursor, setSelectCursor] = useState(0);

  // Log subscription
  const [uiLogs, setUiLogs] = useState<LogEntry[]>([...logBuffer]);

  // Load data on mount
  useEffect(() => {
    try {
      const keypairs = vault.getAllKeypairs();
      setAccounts(keypairs);
      setCluster(getCluster());
      setSessions(getAllSessions());

      keypairs.forEach(async (kp) => {
        try {
          const { sol } = await getBalance(kp.publicKey);
          setBalances((prev) => ({
            ...prev,
            [kp.publicKey]: sol.toFixed(4) + " SOL",
          }));
        } catch {
          setBalances((prev) => ({ ...prev, [kp.publicKey]: "..." }));
        }
      });
    } catch {}
  }, []);

  // Refresh sessions every 5s
  useEffect(() => {
    const interval = setInterval(() => setSessions(getAllSessions()), 5000);
    return () => clearInterval(interval);
  }, []);

  // Subscribe to logs
  useEffect(() => {
    const fn = (updated: LogEntry[]) => setUiLogs(updated);
    logListeners.push(fn);
    return () => {
      const idx = logListeners.indexOf(fn);
      if (idx >= 0) logListeners.splice(idx, 1);
    };
  }, []);

  // ── Prompt helpers ──────────────────────────────────────────────────────────

  const requestPrompt = <T,>(state: Exclude<PromptState, null>): Promise<T> =>
    new Promise((resolve) => {
      promptResolverRef.current = resolve as (v: any) => void;
      if (state.type === "password") {
        passwordValueRef.current = "";
        setPasswordMaskLen(0);
      }
      if (state.type === "select") {
        selectCursorRef.current = 0;
        setSelectCursor(0);
      }
      setPromptState(state);
    });

  const resolvePrompt = (val: any) => {
    promptResolverRef.current?.(val);
    promptResolverRef.current = null;
    passwordValueRef.current = "";
    setPasswordMaskLen(0);
    selectCursorRef.current = 0;
    setSelectCursor(0);
    setPromptState(null);
  };

  // ── Console capture ─────────────────────────────────────────────────────────

  const withCapture = async (fn: () => Promise<void>) => {
    const origLog = console.log;
    const origError = console.error;

    console.log = (...args: any[]) => {
      const msg = stripAnsi(args.map(String).join(" ")).trim();
      if (msg) addLog("wallet", msg, "info");
    };
    console.error = (...args: any[]) => {
      const msg = stripAnsi(args.map(String).join(" ")).trim();
      if (msg) addLog("wallet", msg, "error");
    };

    try {
      await fn();
    } finally {
      console.log = origLog;
      console.error = origError;
    }
  };

  // ── Inline init ─────────────────────────────────────────────────────────────

  const handleInit = async () => {
    if (vaultExists()) {
      addLog("wallet", "Vault already exists. Use `unlock` to access it.", "warn");
      return;
    }

    const wordCount = await requestPrompt<12 | 24>({
      type: "select",
      message: "Mnemonic length:",
      choices: [
        { name: "12 words (standard)", value: 12 },
        { name: "24 words (extra secure)", value: 24 },
      ],
    });

    const { mnemonic } = generateMnemonic(wordCount);
    addLog("wallet", "⚠  Write down your seed phrase and store it safely.", "warn");
    addLog("wallet", mnemonic, "warn");

    const confirmed = await requestPrompt<boolean>({
      type: "confirm",
      message: "I have written down my seed phrase",
      defaultYes: false,
    });

    if (!confirmed) {
      addLog("wallet", "Aborted.", "error");
      return;
    }

    const password = await requestPrompt<string>({
      type: "password",
      question: "Set vault password:",
    });

    const confirmPw = await requestPrompt<string>({
      type: "password",
      question: "Confirm password:",
    });

    if (password !== confirmPw) {
      addLog("wallet", "Passwords do not match.", "error");
      return;
    }

    const seed = await mnemonicToSeed(mnemonic);
    const firstKp = deriveAccount(seed, 0, "Main");

    await saveVault(
      { mnemonic, createdAt: new Date().toISOString(), version: 1 },
      password,
    );

    const cfg = createConfig("");
    cfg.accountStore.accounts[0] = {
      index: 0,
      name: "Main",
      publicKey: firstKp.publicKey,
      derivationPath: `m/44'/501'/0'/0'`,
      createdAt: new Date().toISOString(),
    };
    saveConfig(cfg);

    addLog("wallet", `✓ Wallet created — ${firstKp.publicKey}`, "success");
  };

  // ── Inline unlock ───────────────────────────────────────────────────────────

  const handleUnlock = async () => {
    if (!vaultExists()) {
      addLog("wallet", "No vault found. Run: init", "error");
      return;
    }

    const password = await requestPrompt<string>({
      type: "password",
      question: "Vault password:",
    });

    try {
      await loadVault(password);
      addLog("wallet", "✓ Wallet unlocked", "success");
    } catch {
      addLog("wallet", "Wrong password.", "error");
    }
  };

  // ── Inline send ─────────────────────────────────────────────────────────────

  const handleSend = async (to: string, amount: number) => {
    if (!to || !amount) {
      addLog("wallet", "Usage: send <address> <sol>", "warn");
      return;
    }

    const confirmed = await requestPrompt<boolean>({
      type: "confirm",
      message: `Send ${amount} SOL to ${to.slice(0, 8)}...${to.slice(-4)}?`,
      defaultYes: false,
    });

    if (!confirmed) {
      addLog("wallet", "Cancelled.", "warn");
      return;
    }

    await withCapture(() => cmdSend(to, amount, vault));
  };

  // ── Command executor ────────────────────────────────────────────────────────

  const executeCommand = async (line: string) => {
    const parts = line.trim().split(/\s+/);
    const cmd = parts[0];

    setCmdRunning(true);
    addLog("wallet", `> ${line}`, "info");

    try {
      switch (cmd) {
        case "":
          break;

        case "help":
          addLog(
            "wallet",
            "init  unlock  lock  accounts [new|use]  send <addr> <sol>  airdrop [sol]  connect <wc:uri>  sessions  disconnect <dapp>  cluster <name>  exit",
            "info",
          );
          break;

        case "exit":
        case "quit":
          onExit();
          exit();
          break;

        case "init":
          await handleInit();
          break;

        case "unlock":
          await handleUnlock();
          break;

        case "lock":
          await withCapture(async () => cmdLock());
          break;

        case "send":
          await handleSend(parts[1], Number(parts[2]));
          break;

        case "airdrop":
          await withCapture(() => cmdAirdrop(Number(parts[1]) || 1));
          break;

        case "connect":
          await withCapture(() => cmdConnect(parts[1]));
          break;

        case "sessions":
          await withCapture(async () => cmdSessions());
          break;

        case "disconnect":
          await withCapture(() => cmdDisconnect(parts.slice(1).join(" ")));
          break;

        case "cluster":
          await withCapture(async () => cmdSetCluster(parts[1]));
          break;

        case "accounts":
          if (parts[1] === "new") {
            await withCapture(() => cmdNewAccount(parts.slice(2).join(" ")));
          } else if (parts[1] === "use") {
            await withCapture(() => cmdUseAccount(parts[2]));
          } else {
            await withCapture(() => cmdAccounts());
          }
          break;

        default:
          addLog("wallet", `Unknown: ${cmd}. Type "help".`, "warn");
      }
    } catch (err: any) {
      addLog("wallet", `Error: ${err.message}`, "error");
    } finally {
      setCmdRunning(false);
    }
  };

  // ── Input handling ──────────────────────────────────────────────────────────

  useInput((input, key) => {
    // Always allow Ctrl+C to quit
    if (key.ctrl && input === "c") {
      onExit();
      exit();
      return;
    }

    // Route input to active prompt
    if (promptState) {
      if (promptState.type === "password") {
        if (key.return) {
          resolvePrompt(passwordValueRef.current);
        } else if (key.backspace || key.delete) {
          if (passwordValueRef.current.length > 0) {
            passwordValueRef.current = passwordValueRef.current.slice(0, -1);
            setPasswordMaskLen(passwordValueRef.current.length);
          }
        } else if (input && !key.ctrl && !key.meta) {
          passwordValueRef.current += input;
          setPasswordMaskLen(passwordValueRef.current.length);
        }
        return;
      }

      if (promptState.type === "select") {
        if (key.upArrow) {
          const n = Math.max(0, selectCursorRef.current - 1);
          selectCursorRef.current = n;
          setSelectCursor(n);
        } else if (key.downArrow) {
          const n = Math.min(
            promptState.choices.length - 1,
            selectCursorRef.current + 1,
          );
          selectCursorRef.current = n;
          setSelectCursor(n);
        } else if (key.return) {
          resolvePrompt(promptState.choices[selectCursorRef.current].value);
        }
        return;
      }

      if (promptState.type === "confirm") {
        if (key.return) {
          resolvePrompt(promptState.defaultYes);
        } else if (input === "y" || input === "Y") {
          resolvePrompt(true);
        } else if (input === "n" || input === "N") {
          resolvePrompt(false);
        }
        return;
      }
    }

    // Navigation shortcuts — only when buffer is empty and not running
    if (!cmdBuffer && !cmdRunning) {
      if (input === "1") { setView("dashboard"); return; }
      if (input === "2") { setView("accounts"); return; }
      if (input === "q") { onExit(); exit(); return; }
    }

    // Don't accept new command input while running
    if (cmdRunning) return;

    // Command input
    if (key.return) {
      const cmd = cmdBuffer.trim();
      setCmdBuffer("");
      if (cmd) executeCommand(cmd);
      return;
    }

    if (key.backspace || key.delete) {
      setCmdBuffer((b) => b.slice(0, -1));
      return;
    }

    if (input && !key.ctrl && !key.meta && !key.escape) {
      setCmdBuffer((b) => b + input);
    }
  });

  const activeKeypair = (() => {
    try {
      return vault.getActiveKeypair();
    } catch {
      return null;
    }
  })();

  const recentLogs = uiLogs.slice(-12);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Box flexDirection="column" padding={1}>
      <Header cluster={cluster} />

      {/* Nav */}
      <Box marginBottom={1}>
        <Text
          color={view === "dashboard" ? "cyan" : "gray"}
          bold={view === "dashboard"}
        >
          [1] Dashboard{"  "}
        </Text>
        <Text
          color={view === "accounts" ? "cyan" : "gray"}
          bold={view === "accounts"}
        >
          [2] Accounts{"  "}
        </Text>
        <Text color="gray"> q: quit</Text>
      </Box>

      {view === "dashboard" && (
        <Box flexDirection="column">
          {/* Active Account */}
          <Box marginBottom={1} flexDirection="column">
            <Text bold color="white">
              Active Account
            </Text>
            <Text color="gray">{"─".repeat(40)}</Text>
            {activeKeypair ? (
              <Box>
                <Text color="green">● </Text>
                <Text bold>{activeKeypair.name.padEnd(18)}</Text>
                <Text color="cyan">{activeKeypair.publicKey}</Text>
                <Text color="gray">
                  {" "}
                  {balances[activeKeypair.publicKey] ?? "..."}
                </Text>
              </Box>
            ) : (
              <Text color="gray">No active account</Text>
            )}
          </Box>

          {/* Connected dApps */}
          <Box marginBottom={1} flexDirection="column">
            <Text bold color="white">
              Connected dApps ({sessions.length})
            </Text>
            <Text color="gray">{"─".repeat(40)}</Text>
            {sessions.length === 0 ? (
              <Text color="gray">None — paste a wc: URI to connect</Text>
            ) : (
              sessions.map((s) => (
                <SessionRow
                  key={s.topic}
                  name={s.dappName}
                  url={s.dappUrl}
                  account={s.connectedAccount}
                />
              ))
            )}
          </Box>

          {/* Agents */}
          {agentStatus.length > 0 && (
            <Box marginBottom={1} flexDirection="column">
              <Text bold color="white">
                Agents ({agentStatus.filter((a) => a.running).length} running)
              </Text>
              <Text color="gray">{"─".repeat(40)}</Text>
              {agentStatus.map((agent) => (
                <AgentRow key={agent.id} agent={agent} />
              ))}
            </Box>
          )}

          {/* Activity Log */}
          <Box flexDirection="column">
            <Text bold color="white">
              Activity
            </Text>
            <Text color="gray">{"─".repeat(40)}</Text>
            {recentLogs.length === 0 ? (
              <Text color="gray">Waiting for activity…</Text>
            ) : (
              recentLogs.map((entry, i) => <LogRow key={i} entry={entry} />)
            )}
          </Box>
        </Box>
      )}

      {view === "accounts" && (
        <Box flexDirection="column">
          <Text bold color="white">
            All Accounts
          </Text>
          <Text color="gray">{"─".repeat(60)}</Text>
          {accounts.length === 0 ? (
            <Text color="gray">No accounts found</Text>
          ) : (
            accounts.map((acc) => (
              <AccountRow
                key={acc.publicKey}
                index={acc.index}
                name={acc.name}
                publicKey={acc.publicKey}
                balance={balances[acc.publicKey] ?? "..."}
                isActive={acc.publicKey === activeKeypair?.publicKey}
              />
            ))
          )}
        </Box>
      )}

      {/* Footer */}
      <Box marginTop={1}>
        <Text color="gray">{"─".repeat(60)}</Text>
      </Box>
      <Box>
        <Text color="gray">WebSocket: </Text>
        <Text color="cyan">ws://localhost:3000</Text>
        <Text color="gray"> │ [1] Dashboard [2] Accounts [q] Quit</Text>
      </Box>

      {/* Command / Prompt area */}
      <Box marginTop={1} flexDirection="column">
        <Text color="gray">{"─".repeat(60)}</Text>
        {promptState ? (
          <PromptRow
            prompt={promptState}
            maskLen={passwordMaskLen}
            cursor={selectCursor}
          />
        ) : (
          <CommandBar buffer={cmdBuffer} running={cmdRunning} />
        )}
      </Box>
    </Box>
  );
}

// ── Log Store ─────────────────────────────────────────────────────────────────

const logBuffer: LogEntry[] = [];
const logListeners: Array<(logs: LogEntry[]) => void> = [];

export function addLog(
  source: string,
  message: string,
  type: LogEntry["type"] = "info",
): void {
  const entry: LogEntry = {
    time: new Date().toTimeString().slice(0, 8),
    source,
    message,
    type,
  };
  logBuffer.push(entry);
  if (logBuffer.length > 200) logBuffer.shift();
  logListeners.forEach((fn) => fn([...logBuffer]));
}

// ── Render ────────────────────────────────────────────────────────────────────

export function startInkUI(
  vault: WalletVault,
  getAgentStatus: () => AgentStatus[],
  onExit: () => void,
): void {
  function App() {
    const [agentStatus, setAgentStatus] = useState<any[]>(getAgentStatus());

    useEffect(() => {
      const interval = setInterval(() => setAgentStatus(getAgentStatus()), 2000);
      return () => clearInterval(interval);
    }, []);

    return (
      <Dashboard
        vault={vault}
        agentStatus={agentStatus}
        onExit={onExit}
      />
    );
  }

  render(<App />);
}
