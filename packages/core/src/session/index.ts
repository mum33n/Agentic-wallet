import * as fs from "fs";
import { SESSIONS_FILE, ensureWalletDir } from "../vault/keystore";

export interface DappSession {
  topic: string;
  dappName: string;
  dappUrl: string;
  dappIcon?: string;
  connectedAccount: string;
  connectedAt: string;
  lastActivity: string;
  permissions: string[];
  chainId: string;
  active: boolean;
}

interface SessionStore {
  sessions: DappSession[];
}

function read(): SessionStore {
  ensureWalletDir();
  if (!fs.existsSync(SESSIONS_FILE)) return { sessions: [] };
  return JSON.parse(fs.readFileSync(SESSIONS_FILE, "utf8"));
}

function write(store: SessionStore): void {
  ensureWalletDir();
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(store, null, 2));
}

export function saveSession(session: DappSession): void {
  const store = read();
  const idx = store.sessions.findIndex((s) => s.topic === session.topic);
  if (idx >= 0) {
    store.sessions[idx] = session;
  } else {
    store.sessions.push(session);
  }
  write(store);
}

export function removeSession(topic: string): void {
  const store = read();
  store.sessions = store.sessions.filter((s) => s.topic !== topic);
  write(store);
}

export function getSession(topic: string): DappSession | undefined {
  return read().sessions.find((s) => s.topic === topic);
}

export function getAllSessions(): DappSession[] {
  return read().sessions.filter((s) => s.active);
}

export function updateActivity(topic: string): void {
  const store = read();
  const sess = store.sessions.find((s) => s.topic === topic);
  if (sess) {
    sess.lastActivity = new Date().toISOString();
    write(store);
  }
}

export function markInactive(topic: string): void {
  const store = read();
  const sess = store.sessions.find((s) => s.topic === topic);
  if (sess) {
    sess.active = false;
    write(store);
  }
}
