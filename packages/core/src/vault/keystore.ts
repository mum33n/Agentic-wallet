/**
 *
 * AES-256-GCM encrypted keystore.
 * The mnemonic (seed phrase) is encrypted at rest in ~/.wallet/vault.enc
 * Private keys NEVER touch disk — they are derived in memory at runtime.
 *
 * Encryption scheme:
 *   - Key derivation: PBKDF2 (SHA-512, 210,000 iterations) — OWASP recommended
 *   - Cipher: AES-256-GCM (authenticated encryption — detects tampering)
 *   - Salt: 32 random bytes (unique per vault)
 *   - IV: 16 random bytes (unique per encryption)
 *
 * Dependencies: Node.js built-in `crypto`, `fs`, `os`, `path`
 */

import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface VaultData {
  mnemonic: string;
  createdAt: string;
  version: number;
}

interface EncryptedVault {
  version: number; // format version for future migrations
  salt: string; // hex — used for PBKDF2 key derivation
  iv: string; // hex — AES-GCM initialisation vector
  authTag: string; // hex — GCM authentication tag (detects tampering)
  ciphertext: string; // hex — encrypted vault data
}

// ── Constants ─────────────────────────────────────────────────────────────────

const VAULT_VERSION = 1;
const PBKDF2_ITERATIONS = 210_000; // OWASP 2024 recommendation for PBKDF2-SHA512
const PBKDF2_DIGEST = "sha512";
const KEY_LENGTH = 32; // 256 bits for AES-256
const SALT_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits for AES-GCM
const CIPHER = "aes-256-gcm";

// ── Vault Path ────────────────────────────────────────────────────────────────

export function getWalletDir(): string {
  // return path.join(__dirname, ".wallet");
  return path.join(os.homedir(), ".wallet");
}

export function getVaultPath(): string {
  return path.join(getWalletDir(), "vault.enc");
}

export function getConfigPath(): string {
  return path.join(getWalletDir(), "config.json");
}

export function getSessionsPath(): string {
  return path.join(getWalletDir(), "sessions.json");
}

export const SESSIONS_FILE = getSessionsPath();

export function ensureWalletDir(): void {
  const dir = getWalletDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 }); // owner-only access
  }
}

export function vaultExists(): boolean {
  return fs.existsSync(getVaultPath());
}

// ── Encryption ────────────────────────────────────────────────────────────────

/**
 * Encrypt and save the vault to disk.
 * @param data   - vault contents (mnemonic + metadata)
 * @param password - user's wallet password
 */
export async function saveVault(
  data: VaultData,
  password: string,
): Promise<void> {
  ensureWalletDir();

  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = await deriveKey(password, salt);

  const plaintext = JSON.stringify(data);
  const cipher = crypto.createCipheriv(CIPHER, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  const vault: EncryptedVault = {
    version: VAULT_VERSION,
    salt: salt.toString("hex"),
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
    ciphertext: encrypted.toString("hex"),
  };

  fs.writeFileSync(getVaultPath(), JSON.stringify(vault, null, 2), {
    mode: 0o600, // owner read/write only
  });
}

/**
 * Load and decrypt the vault from disk.
 * Throws if the password is wrong or the file has been tampered with.
 */
export async function loadVault(password: string): Promise<VaultData> {
  if (!vaultExists()) {
    throw new Error("No vault found. Run `wallet init` to create one.");
  }

  const raw = fs.readFileSync(getVaultPath(), "utf8");
  const vault: EncryptedVault = JSON.parse(raw);

  if (vault.version !== VAULT_VERSION) {
    throw new Error(`Unsupported vault version: ${vault.version}`);
  }

  const salt = Buffer.from(vault.salt, "hex");
  const iv = Buffer.from(vault.iv, "hex");
  const authTag = Buffer.from(vault.authTag, "hex");
  const ciphertext = Buffer.from(vault.ciphertext, "hex");

  const key = await deriveKey(password, salt);

  try {
    const decipher = crypto.createDecipheriv(CIPHER, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    return JSON.parse(decrypted.toString("utf8")) as VaultData;
  } catch {
    // GCM auth tag failure means wrong password OR tampered file
    throw new Error("Decryption failed: wrong password or vault is corrupted.");
  }
}

/**
 * Change the vault password.
 * Decrypts with old password, re-encrypts with new password.
 */
export async function changePassword(
  oldPassword: string,
  newPassword: string,
): Promise<void> {
  const data = await loadVault(oldPassword);
  await saveVault(data, newPassword);
}

// ── Internal ──────────────────────────────────────────────────────────────────

/**
 * Derive a 256-bit AES key from a password using PBKDF2-SHA512.
 */
function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(
      password,
      salt,
      PBKDF2_ITERATIONS,
      KEY_LENGTH,
      PBKDF2_DIGEST,
      (err, key) => {
        if (err) reject(err);
        else resolve(key);
      },
    );
  });
}
