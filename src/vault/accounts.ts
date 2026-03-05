/**
 * vault/accounts.ts
 *
 * BIP-44 HD key derivation for Solana accounts.
 *
 * Derivation path: m/44'/501'/index'/0'
 *   44'  = BIP-44 purpose
 *   501' = Solana's registered coin type (SLIP-44)
 *   n'   = account index (0 = first account, 1 = second, etc.)
 *   0'   = change (always 0 for Solana)
 *
 * This is the exact path Phantom, Backpack, and Solflare use.
 * Same seed → same addresses as those wallets.
 *
 * Dependencies: ed25519-hd-key, tweetnacl, bs58
 */

import { derivePath } from "ed25519-hd-key";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { mnemonicToSeed } from "./mnemonic";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Account {
  index: number; // derivation index
  name: string; // user-defined label
  publicKey: string; // Base58 encoded — this is the Solana address
  derivationPath: string; // m/44'/501'/index'/0'
  createdAt: string;
}

/**
 * In-memory keypair — private key NEVER persisted to disk.
 * Lives only for the duration of the daemon session.
 */
export interface AccountKeypair extends Account {
  secretKey: Uint8Array; // 64-byte Ed25519 secret key (seed + public key)
}

export interface AccountStore {
  accounts: Account[];
  activeIndex: number;
}

// ── Derivation ────────────────────────────────────────────────────────────────

/**
 * Derive an Ed25519 keypair at a specific BIP-44 index.
 * This is the core operation — called once per session after vault unlock.
 *
 * @param seed  - 64-byte seed from BIP-39 mnemonic
 * @param index - account index (0-based)
 * @param name  - label for this account
 */
export function deriveAccount(
  seed: Buffer,
  index: number,
  name: string = `Account ${index + 1}`,
): AccountKeypair {
  const path = derivationPath(index);

  // SLIP-0010 Ed25519 derivation
  const { key: privateKeyBytes } = derivePath(path, seed.toString("hex"));

  // nacl keypair from 32-byte seed
  const keypair = nacl.sign.keyPair.fromSeed(privateKeyBytes);

  const publicKey = bs58.encode(Buffer.from(keypair.publicKey));

  return {
    index,
    name,
    publicKey,
    secretKey: keypair.secretKey, // 64 bytes: seed + public key
    derivationPath: path,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Derive multiple accounts at once.
 * Used on wallet startup to load all known accounts into memory.
 */
export function deriveAccounts(
  seed: Buffer,
  accountStore: AccountStore,
): AccountKeypair[] {
  return accountStore.accounts.map((account) =>
    deriveAccount(seed, account.index, account.name),
  );
}

/**
 * Derive a single account directly from mnemonic.
 * Convenience wrapper used in tests and programmatic access.
 */
export async function deriveAccountFromMnemonic(
  mnemonic: string,
  index: number,
  name?: string,
  passphrase?: string,
): Promise<AccountKeypair> {
  const seed = await mnemonicToSeed(mnemonic, passphrase);
  return deriveAccount(seed, index, name);
}

// ── Account Store ─────────────────────────────────────────────────────────────

/**
 * Create a fresh account store with the first account.
 */
export function createAccountStore(
  firstAccountName: string = "Account 1",
): AccountStore {
  return {
    accounts: [
      {
        index: 0,
        name: firstAccountName,
        publicKey: "", // filled in after derivation
        derivationPath: derivationPath(0),
        createdAt: new Date().toISOString(),
      },
    ],
    activeIndex: 0,
  };
}

/**
 * Add a new account to the store.
 * The next index is always max(existing indices) + 1.
 */
export function addAccount(
  store: AccountStore,
  seed: Buffer,
  name?: string,
): { store: AccountStore; keypair: AccountKeypair } {
  const nextIndex =
    store.accounts.length > 0
      ? Math.max(...store.accounts.map((a) => a.index)) + 1
      : 0;

  const accountName = name ?? `Account ${nextIndex + 1}`;
  const keypair = deriveAccount(seed, nextIndex, accountName);

  const newAccount: Account = {
    index: nextIndex,
    name: accountName,
    publicKey: keypair.publicKey,
    derivationPath: keypair.derivationPath,
    createdAt: keypair.createdAt,
  };

  const updatedStore: AccountStore = {
    ...store,
    accounts: [...store.accounts, newAccount],
  };

  return { store: updatedStore, keypair };
}

/**
 * Set the active account by index.
 * The active account is used for all dApp connections and signing.
 */
export function setActiveAccount(
  store: AccountStore,
  index: number,
): AccountStore {
  const exists = store.accounts.find((a) => a.index === index);
  if (!exists) {
    throw new Error(`Account index ${index} does not exist.`);
  }
  return { ...store, activeIndex: index };
}

/**
 * Rename an account.
 */
export function renameAccount(
  store: AccountStore,
  index: number,
  newName: string,
): AccountStore {
  return {
    ...store,
    accounts: store.accounts.map((a) =>
      a.index === index ? { ...a, name: newName } : a,
    ),
  };
}

/**
 * Get the active account metadata from the store.
 */
export function getActiveAccount(store: AccountStore): Account {
  const account = store.accounts.find((a) => a.index === store.activeIndex);
  if (!account) throw new Error("No active account found.");
  return account;
}

// ── Utilities ─────────────────────────────────────────────────────────────────

/**
 * Sign a raw message with an account's secret key.
 * Returns a Base58 encoded signature.
 */
export function signMessage(
  message: Uint8Array,
  secretKey: Uint8Array,
): string {
  const signature = nacl.sign.detached(message, secretKey);
  return bs58.encode(Buffer.from(signature));
}

/**
 * Format account for display in terminal.
 */
export function formatAccount(account: Account, isActive: boolean): string {
  const activeMarker = isActive ? "●" : "○";
  const shortKey = `${account.publicKey.slice(0, 4)}...${account.publicKey.slice(-4)}`;
  return `${activeMarker} [${account.index}] ${account.name.padEnd(20)} ${shortKey}`;
}

// ── Internal ──────────────────────────────────────────────────────────────────

function derivationPath(index: number): string {
  return `m/44'/501'/${index}'/0'`;
}
