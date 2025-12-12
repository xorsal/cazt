import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { createCipheriv, createDecipheriv, createHmac, randomBytes, scryptSync } from 'crypto';

/**
 * Stored key entry
 */
export interface StoredKey {
  alias: string;
  secretKey: string;
  address: string;
  type: 'schnorr' | 'ecdsa-k' | 'ecdsa-r';
  createdAt: string;
}

/**
 * Key storage file format
 */
interface KeyStorageFile {
  version: number;
  keys: StoredKey[];
}

/**
 * Keystore file format (encrypted)
 */
interface KeystoreFile {
  version: number;
  crypto: {
    cipher: string;
    ciphertext: string;
    cipherparams: {
      iv: string;
    };
    kdf: string;
    kdfparams: {
      dklen: number;
      n: number;
      r: number;
      p: number;
      salt: string;
    };
    mac: string; // HMAC for password verification
  };
  address: string;
  type: string;
}

/**
 * Key storage utility for managing stored keys
 */
export class KeyStorage {
  private static readonly CONFIG_DIR = join(homedir(), '.cazt');
  private static readonly KEYS_FILE = join(KeyStorage.CONFIG_DIR, 'keys.json');
  private static readonly KEYSTORES_DIR = join(KeyStorage.CONFIG_DIR, 'keystores');

  /**
   * Ensure config directory exists
   */
  private static ensureConfigDir(): void {
    if (!existsSync(KeyStorage.CONFIG_DIR)) {
      mkdirSync(KeyStorage.CONFIG_DIR, { recursive: true });
    }
  }

  /**
   * Ensure keystores directory exists
   */
  private static ensureKeystoresDir(): void {
    KeyStorage.ensureConfigDir();
    if (!existsSync(KeyStorage.KEYSTORES_DIR)) {
      mkdirSync(KeyStorage.KEYSTORES_DIR, { recursive: true });
    }
  }

  /**
   * Load keys from storage
   */
  private static loadKeys(): KeyStorageFile {
    KeyStorage.ensureConfigDir();

    if (!existsSync(KeyStorage.KEYS_FILE)) {
      return { version: 1, keys: [] };
    }

    try {
      const content = readFileSync(KeyStorage.KEYS_FILE, 'utf-8');
      return JSON.parse(content);
    } catch {
      return { version: 1, keys: [] };
    }
  }

  /**
   * Save keys to storage
   */
  private static saveKeys(storage: KeyStorageFile): void {
    KeyStorage.ensureConfigDir();
    writeFileSync(KeyStorage.KEYS_FILE, JSON.stringify(storage, null, 2));
  }

  /**
   * Import a secret key to storage
   */
  static async importKey(params: {
    secretKey: string;
    alias?: string;
    type?: 'schnorr' | 'ecdsa-k' | 'ecdsa-r';
    address?: string;
  }): Promise<StoredKey> {
    const { secretKey, alias, type = 'schnorr', address } = params;

    // Validate secret key format
    if (!secretKey.startsWith('0x') || secretKey.length !== 66) {
      throw new Error('Invalid secret key format. Must be 0x-prefixed 64-character hex string.');
    }

    const storage = KeyStorage.loadKeys();

    // Generate alias if not provided
    const keyAlias = alias || `key-${storage.keys.length + 1}`;

    // Check for duplicate alias
    if (storage.keys.some(k => k.alias === keyAlias)) {
      throw new Error(`Key with alias "${keyAlias}" already exists`);
    }

    // Compute address if not provided
    let keyAddress = address || '';
    if (!keyAddress) {
      // Import WalletUtils dynamically to compute address
      const { WalletUtils } = await import('./wallet.js');
      const derived = await WalletUtils.deriveAddress(JSON.stringify({ secretKey }));
      keyAddress = derived.address;
    }

    const newKey: StoredKey = {
      alias: keyAlias,
      secretKey,
      address: keyAddress,
      type,
      createdAt: new Date().toISOString(),
    };

    storage.keys.push(newKey);
    KeyStorage.saveKeys(storage);

    return newKey;
  }

  /**
   * Export a key by alias or address
   */
  static exportKey(aliasOrAddress: string): StoredKey | null {
    const storage = KeyStorage.loadKeys();

    const key = storage.keys.find(
      k => k.alias === aliasOrAddress || k.address === aliasOrAddress
    );

    return key || null;
  }

  /**
   * List all stored keys (without exposing secret keys)
   */
  static listKeys(): Array<Omit<StoredKey, 'secretKey'> & { secretKey?: string }> {
    const storage = KeyStorage.loadKeys();

    return storage.keys.map(k => ({
      alias: k.alias,
      address: k.address,
      type: k.type,
      createdAt: k.createdAt,
    }));
  }

  /**
   * Delete a key by alias or address
   */
  static deleteKey(aliasOrAddress: string): boolean {
    const storage = KeyStorage.loadKeys();
    const initialLength = storage.keys.length;

    storage.keys = storage.keys.filter(
      k => k.alias !== aliasOrAddress && k.address !== aliasOrAddress
    );

    if (storage.keys.length < initialLength) {
      KeyStorage.saveKeys(storage);
      return true;
    }

    return false;
  }

  /**
   * Create an encrypted keystore file
   */
  static createKeystore(params: {
    secretKey: string;
    password: string;
    address?: string;
    type?: string;
    outputPath?: string;
  }): string {
    const { secretKey, password, address = '', type = 'schnorr', outputPath } = params;

    KeyStorage.ensureKeystoresDir();

    // Generate random salt and IV
    const salt = randomBytes(32);
    const iv = randomBytes(16);

    // Derive key using scrypt (N=16384 for reasonable memory usage)
    const derivedKey = scryptSync(password, salt, 32, {
      N: 16384,
      r: 8,
      p: 1,
    });

    // Encrypt the secret key
    const cipher = createCipheriv('aes-256-ctr', derivedKey, iv);
    const secretKeyBuffer = Buffer.from(secretKey.replace('0x', ''), 'hex');
    const ciphertext = Buffer.concat([
      cipher.update(secretKeyBuffer),
      cipher.final(),
    ]);

    // Create MAC for password verification (HMAC of derivedKey + ciphertext)
    const mac = createHmac('sha256', derivedKey)
      .update(ciphertext)
      .digest('hex');

    const keystore: KeystoreFile = {
      version: 1,
      crypto: {
        cipher: 'aes-256-ctr',
        ciphertext: ciphertext.toString('hex'),
        cipherparams: {
          iv: iv.toString('hex'),
        },
        kdf: 'scrypt',
        kdfparams: {
          dklen: 32,
          n: 16384,
          r: 8,
          p: 1,
          salt: salt.toString('hex'),
        },
        mac,
      },
      address,
      type,
    };

    // Determine output path
    const filename = outputPath || join(
      KeyStorage.KEYSTORES_DIR,
      `keystore-${Date.now()}.json`
    );

    writeFileSync(filename, JSON.stringify(keystore, null, 2));
    return filename;
  }

  /**
   * Unlock (decrypt) a keystore file
   */
  static unlockKeystore(params: {
    filePath: string;
    password: string;
  }): { secretKey: string; address: string; type: string } {
    const { filePath, password } = params;

    if (!existsSync(filePath)) {
      throw new Error(`Keystore file not found: ${filePath}`);
    }

    const content = readFileSync(filePath, 'utf-8');
    const keystore: KeystoreFile = JSON.parse(content);

    if (keystore.version !== 1) {
      throw new Error(`Unsupported keystore version: ${keystore.version}`);
    }

    const { crypto } = keystore;

    // Derive key using scrypt
    const salt = Buffer.from(crypto.kdfparams.salt, 'hex');
    const derivedKey = scryptSync(password, salt, crypto.kdfparams.dklen, {
      N: crypto.kdfparams.n,
      r: crypto.kdfparams.r,
      p: crypto.kdfparams.p,
    });

    const ciphertext = Buffer.from(crypto.ciphertext, 'hex');

    // Verify MAC to check if password is correct
    if (crypto.mac) {
      const expectedMac = createHmac('sha256', derivedKey)
        .update(ciphertext)
        .digest('hex');

      if (expectedMac !== crypto.mac) {
        throw new Error('Invalid password');
      }
    }

    // Decrypt the secret key
    const iv = Buffer.from(crypto.cipherparams.iv, 'hex');

    const decipher = createDecipheriv(crypto.cipher, derivedKey, iv);
    const secretKeyBuffer = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    return {
      secretKey: '0x' + secretKeyBuffer.toString('hex'),
      address: keystore.address,
      type: keystore.type,
    };
  }

  /**
   * Format stored keys for human-readable output
   */
  static formatKeysHumanReadable(keys: Array<Omit<StoredKey, 'secretKey'>>): string {
    if (keys.length === 0) {
      return 'No keys stored.\n\nUse "cazt key import <secret>" to import a key.';
    }

    const lines: string[] = [];
    lines.push('Stored Keys');
    lines.push('='.repeat(70));
    lines.push('');

    for (const key of keys) {
      lines.push(`Alias:    ${key.alias}`);
      lines.push(`Address:  ${key.address}`);
      lines.push(`Type:     ${key.type}`);
      lines.push(`Created:  ${key.createdAt}`);
      lines.push('-'.repeat(70));
    }

    lines.push('');
    lines.push(`Total: ${keys.length} key(s)`);

    return lines.join('\n');
  }
}
