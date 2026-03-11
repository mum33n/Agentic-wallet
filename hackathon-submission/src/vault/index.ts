/**
 * vault/index.ts
 *
 * Public API for the vault module.
 * All other modules import from here — not directly from sub-files.
 *
 * Usage:
 *   import { WalletVault } from "../vault"
 *
 *   const vault = new WalletVault()
 *   await vault.init("my password")
 *   const account = vault.getActiveKeypair()
 */

import {
  generateMnemonic,
  validateMnemonic,
  mnemonicToSeed,
  mnemonicToNumberedWords,
} from "./mnemonic";
import { saveVault, loadVault, vaultExists, VaultData } from "./keystore";
import {
  deriveAccount,
  deriveAccounts,
  addAccount,
  setActiveAccount,
  getActiveAccount,
  renameAccount,
  formatAccount,
  signMessage,
  AccountKeypair,
  AccountStore,
} from "./accounts";
import {
  loadConfig,
  saveConfig,
  createConfig,
  updateAccountStore,
  configExists,
  WalletConfig,
  ClusterType,
} from "./config";

export * from "./mnemonic";
export * from "./keystore";
export * from "./accounts";
export * from "./config";

// ── WalletVault ───────────────────────────────────────────────────────────────

/**
 * WalletVault is the in-memory session state of the wallet.
 * It is populated on `unlock()` and holds derived keypairs
 * for the duration of the daemon session.
 *
 * Private keys exist ONLY in this object — never on disk.
 */
export class WalletVault {
  private _keypairs: AccountKeypair[] = [];
  private _seed: Buffer | null = null; // cached for agent account derivation
  private _config: WalletConfig | null = null;
  private _unlocked: boolean = false;
  private _mnemonic: string | null = null;

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  /**
   * Initialize a brand new wallet.
   * Generates a mnemonic, encrypts it, writes config.
   * Returns the mnemonic for the user to write down — shown ONCE.
   */
  async init(
    password: string,
    options: {
      strength?: 12 | 24;
      cluster?: ClusterType;
      walletConnectProjectId?: string;
      firstAccountName?: string;
    } = {},
  ): Promise<string> {
    if (vaultExists()) {
      throw new Error(
        "Wallet already exists. Use `wallet unlock` to access it.",
      );
    }

    const { mnemonic } = generateMnemonic(options.strength ?? 12);

    const vaultData: VaultData = {
      mnemonic,
      createdAt: new Date().toISOString(),
      version: 1,
    };

    // Save encrypted vault
    await saveVault(vaultData, password);

    // Create and save config
    const config = createConfig(
      options.walletConnectProjectId ?? "",
      options.cluster ?? "devnet",
    );

    if (options.firstAccountName) {
      config.accountStore.accounts[0].name = options.firstAccountName;
    }

    // Derive and store the first account's public key in config
    const seed = await mnemonicToSeed(mnemonic);
    const firstKeypair = deriveAccount(
      seed,
      0,
      config.accountStore.accounts[0].name,
    );
    config.accountStore.accounts[0].publicKey = firstKeypair.publicKey;
    saveConfig(config);

    return mnemonic; // shown once to user, never stored in plaintext again
  }

  /**
   * Unlock the wallet for a session.
   * Decrypts the vault, derives all account keypairs into memory.
   */
  async unlock(password: string): Promise<void> {
    const vaultData = await loadVault(password); // throws on wrong password
    const config = loadConfig();

    const seed = await mnemonicToSeed(vaultData.mnemonic);
    this._seed = seed;
    this._mnemonic = vaultData.mnemonic;
    this._keypairs = deriveAccounts(seed, config.accountStore);
    this._config = config;
    this._unlocked = true;
  }

  /**
   * Restore wallet from an existing mnemonic (import flow).
   */
  async restore(
    mnemonic: string,
    password: string,
    options: { cluster?: ClusterType } = {},
  ): Promise<void> {
    if (!validateMnemonic(mnemonic)) {
      throw new Error("Invalid mnemonic phrase.");
    }

    const vaultData: VaultData = {
      mnemonic,
      createdAt: new Date().toISOString(),
      version: 1,
    };

    await saveVault(vaultData, password);
    const config = createConfig("", options.cluster ?? "devnet");
    const seed = await mnemonicToSeed(mnemonic);
    const firstKeypair = deriveAccount(seed, 0, "Account 1");
    config.accountStore.accounts[0].publicKey = firstKeypair.publicKey;
    saveConfig(config);
  }

  lock(): void {
    this._keypairs = [];
    this._mnemonic = null;
    this._seed = null;
    this._config = null;
    this._unlocked = false;
  }

  // ── Account Management ─────────────────────────────────────────────────────

  /**
   * Get the currently active keypair (used for signing + dApp connections).
   */
  getActiveKeypair(): AccountKeypair {
    this.assertUnlocked();
    const active = getActiveAccount(this._config!.accountStore);
    const keypair = this._keypairs.find((k) => k.index === active.index);
    if (!keypair) throw new Error("Active keypair not found in session.");
    return keypair;
  }

  /**
   * Lock the wallet — wipe all keypairs from memory.
   */
  /**
   * Returns the mnemonic — only available while unlocked.
   * Used by agent_connect to derive new accounts on demand.
   */

  getMnemonic(): string {
    if (!this._mnemonic) throw new Error("Wallet is locked");
    return this._mnemonic;
  }

  /**
   * Reload config and re-derive keypairs from seed.
   * Call after adding new accounts so the vault picks them up.
   */
  async reload(): Promise<void> {
    if (!this._seed) throw new Error("Wallet is locked");
    this._config = loadConfig();
    this._keypairs = deriveAccounts(this._seed, this._config.accountStore);
  }

  /**
   * Get a keypair by account index.
   */
  getKeypair(index: number): AccountKeypair {
    this.assertUnlocked();
    const keypair = this._keypairs.find((k) => k.index === index);
    if (!keypair) throw new Error(`Account ${index} not found.`);
    return keypair;
  }

  /**
   * Get all loaded keypairs.
   */
  getAllKeypairs(): AccountKeypair[] {
    this.assertUnlocked();
    return [...this._keypairs];
  }

  /**
   * Add a new derived account.
   */
  async addAccount(name?: string, password?: string): Promise<AccountKeypair> {
    this.assertUnlocked();

    // Need the seed to derive the new account
    if (!password) throw new Error("Password required to add a new account.");
    const vaultData = await loadVault(password);
    const seed = await mnemonicToSeed(vaultData.mnemonic);

    const { store, keypair } = addAccount(
      this._config!.accountStore,
      seed,
      name,
    );

    this._config!.accountStore = store;
    this._keypairs.push(keypair);
    updateAccountStore(store);

    return keypair;
  }

  /**
   * Switch the active account.
   */
  setActiveAccount(index: number): void {
    this.assertUnlocked();
    const updated = setActiveAccount(this._config!.accountStore, index);
    this._config!.accountStore = updated;
    updateAccountStore(updated);
  }

  /**
   * Rename an account.
   */
  renameAccount(index: number, newName: string): void {
    this.assertUnlocked();
    const updated = renameAccount(this._config!.accountStore, index, newName);
    this._config!.accountStore = updated;
    this._keypairs = this._keypairs.map((k) =>
      k.index === index ? { ...k, name: newName } : k,
    );
    updateAccountStore(updated);
  }

  // ── Display ────────────────────────────────────────────────────────────────

  /**
   * Format all accounts for terminal display.
   */
  listAccounts(): string[] {
    this.assertUnlocked();
    const activeIndex = this._config!.accountStore.activeIndex;
    return this._keypairs.map((k) => formatAccount(k, k.index === activeIndex));
  }

  /**
   * Sign a message with the active account.
   */
  signMessage(message: Uint8Array): string {
    const keypair = this.getActiveKeypair();
    return signMessage(message, keypair.secretKey);
  }

  // ── State ──────────────────────────────────────────────────────────────────

  get isUnlocked(): boolean {
    return this._unlocked;
  }

  get config(): WalletConfig {
    this.assertUnlocked();
    return this._config!;
  }

  static exists(): boolean {
    return vaultExists() && configExists();
  }

  /**
   * Display mnemonic as numbered words — for backup verification flow.
   */
  static formatMnemonicForDisplay(mnemonic: string): string {
    const words = mnemonicToNumberedWords(mnemonic);
    // Format into 3 columns of 4 (12-word) or 6 columns of 4 (24-word)
    const cols = 3;
    const rows: string[] = [];
    for (let i = 0; i < words.length; i += cols) {
      rows.push(
        words
          .slice(i, i + cols)
          .map((w) => w.padEnd(18))
          .join("  "),
      );
    }
    return rows.join("\n");
  }

  // ── Internal ───────────────────────────────────────────────────────────────

  private assertUnlocked(): void {
    if (!this._unlocked) {
      throw new Error("Wallet is locked. Run `wallet unlock` first.");
    }
  }

  /**
   * Find an account by name or create it if it doesn't exist.
   * Uses the cached seed — no password needed.
   * This is the primary way agents acquire their account.
   */
  async findOrCreate(name: string): Promise<AccountKeypair> {
    this.assertUnlocked();

    // Return existing account with this name
    const existing = this._keypairs.find((k) => k.name === name);
    if (existing) return existing;

    // Derive a new account at the next index
    const nextIndex = this._config!.accountStore.accounts.length;
    const { store, keypair } = addAccount(
      this._config!.accountStore,
      this._seed!,
      name,
    );

    this._config!.accountStore = store;
    this._keypairs.push(keypair);
    updateAccountStore(store);

    console.log(
      `[Vault] Created account "${name}" at index ${nextIndex} (${keypair.publicKey})`,
    );
    return keypair;
  }

  /**
   * Find an account by name. Returns null if not found.
   */
  findByName(name: string): AccountKeypair | null {
    this.assertUnlocked();
    return this._keypairs.find((k) => k.name === name) ?? null;
  }
}
