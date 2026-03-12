/**
 *
 * BIP-39 mnemonic generation, validation, and seed derivation.
 * Supports 12-word (128-bit) and 24-word (256-bit) mnemonics.
 *
 * Dependencies: bip39
 */

import * as bip39 from "bip39";

export type MnemonicStrength = 12 | 24; // 128 = 12 words, 256 = 24 words

export interface MnemonicResult {
  mnemonic: string;
  wordCount: 12 | 24;
}

/**
 * Generate a new cryptographically random BIP-39 mnemonic.
 * @param strength 128 for 12-word, 256 for 24-word (default: 128)
 */
export function generateMnemonic(
  strength: MnemonicStrength = 12,
): MnemonicResult {
  const mnemonic = bip39.generateMnemonic(strength == 12 ? 128 : 256);
  const wordCount = strength;
  return { mnemonic, wordCount };
}

/**
 * Validate a BIP-39 mnemonic phrase.
 * Checks both wordlist membership and BIP-39 checksum.
 */
export function validateMnemonic(mnemonic: string): boolean {
  const cleaned = cleanMnemonic(mnemonic);
  return bip39.validateMnemonic(cleaned);
}

/**
 * Derive a 64-byte seed buffer from a mnemonic.
 * Optional passphrase adds extra security per BIP-39 spec.
 * This seed is the root of ALL derived accounts.
 */
export async function mnemonicToSeed(
  mnemonic: string,
  passphrase: string = "",
): Promise<Buffer> {
  const cleaned = cleanMnemonic(mnemonic);

  if (!validateMnemonic(cleaned)) {
    throw new Error("Invalid mnemonic: failed wordlist or checksum validation");
  }

  return bip39.mnemonicToSeed(cleaned, passphrase);
}

/**
 * Split mnemonic into a numbered word array.
 * Used for backup verification display in the terminal UI.
 *
 * Example output:
 * [ "1. witch", "2. collapse", "3. practice", ... ]
 */
export function mnemonicToNumberedWords(mnemonic: string): string[] {
  return cleanMnemonic(mnemonic)
    .split(" ")
    .map((word, i) => `${i + 1}. ${word}`);
}

/**
 * Reconstruct mnemonic from a word array.
 * Used when user inputs words one by one during restore flow.
 */
export function wordsToMnemonic(words: string[]): string {
  return words.map((w) => w.trim().toLowerCase()).join(" ");
}

// ── Internal ──────────────────────────────────────────────────────────────────

function cleanMnemonic(mnemonic: string): string {
  return mnemonic.trim().toLowerCase().replace(/\s+/g, " ");
}
