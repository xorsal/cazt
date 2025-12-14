import { Fr, Fq, GrumpkinScalar, Point } from '@aztec/foundation/fields';
import { Grumpkin, Schnorr, SchnorrSignature, sha256 } from '@aztec/foundation/crypto';
import { AztecAddress } from '@aztec/aztec.js/addresses';
import { randomBytes } from '@aztec/foundation/crypto';
import {
  deriveKeys,
  deriveMasterNullifierSecretKey,
  deriveMasterIncomingViewingSecretKey,
  deriveMasterOutgoingViewingSecretKey,
  computeAppNullifierSecretKey,
  deriveSigningKey,
} from '@aztec/stdlib/keys';
import { getSchnorrAccountContractAddress } from '@aztec/accounts/schnorr';
import { Helpers } from './helpers.js';

/**
 * Result types for wallet operations
 */
export interface GeneratedKey {
  secretKey: string;
  warning: string;
}

export interface DerivedKeys {
  secretKey: string;
  masterNullifierSecretKey: string;
  masterNullifierPublicKey: string;
  masterIncomingViewingSecretKey: string;
  masterIncomingViewingPublicKey: string;
  masterOutgoingViewingSecretKey: string;
  masterOutgoingViewingPublicKey: string;
  masterTaggingSecretKey: string;
  masterTaggingPublicKey: string;
  publicKeysHash: string;
}

export interface DerivedAddress {
  secretKey: string;
  salt: string;
  address: string;
  partialAddress: string;
  publicKeysHash: string;
}

export interface AppSiloedKeys {
  contractAddress: string;
  appNullifierSecretKey: string;
}

export interface SignatureResult {
  message: string;
  signature: string; // Full 64-byte hex signature
  publicKey: string;
}

export interface VerifyResult {
  valid: boolean;
  message: string;
  publicKey: string;
}

export interface PassphraseKey {
  passphrase: string;
  secretKey: string;
  address: string;
  warning: string;
}

/**
 * Wallet utility functions for key management
 */
export class WalletUtils {
  /**
   * Generate a new random secret key
   * @param params JSON with: (no params required)
   */
  static async generateKey(params: string): Promise<GeneratedKey> {
    // Generate 32 random bytes for the secret key
    const secretKeyBuffer = randomBytes(32);
    const secretKey = Fr.fromBuffer(secretKeyBuffer);

    return {
      secretKey: secretKey.toString(),
      warning: 'SECURITY WARNING: Store this secret key securely. Anyone with access to it can control your account and funds.',
    };
  }

  /**
   * Derive secret key from a passphrase using SHA256
   * WARNING: This is for testing only! Uses simple hashing without key stretching.
   * @param params JSON with: passphrase
   */
  static async deriveKeyFromPassphrase(params: string): Promise<PassphraseKey> {
    const p = JSON.parse(params);
    const { passphrase } = p;

    if (!passphrase) {
      throw new Error('passphrase is required');
    }

    // Simple SHA256 hash of passphrase (for testing only - NOT SECURE)
    const hash = sha256(Buffer.from(passphrase, 'utf-8'));
    const secretKeyFr = Fr.fromBuffer(hash);
    const secretKey = secretKeyFr.toString();

    // Derive address using Schnorr account
    const addressResult = await this.deriveAddress(JSON.stringify({
      secretKey,
      type: 'schnorr'
    }));

    return {
      passphrase,
      secretKey,
      address: addressResult.address,
      warning: 'Insecure derivation - for testing only',
    };
  }

  /**
   * Derive all master keys from a secret key
   * @param params JSON with: secretKey
   */
  static async deriveKeys(params: string): Promise<DerivedKeys> {
    const p = JSON.parse(params);
    const { secretKey } = p;

    if (!secretKey) {
      throw new Error('secretKey is required');
    }

    const secretKeyFr = Helpers.stringToFr(secretKey);

    // Derive all keys using the official Aztec derivation
    const keys = await deriveKeys(secretKeyFr);

    // Get individual secret keys
    const nsk = keys.masterNullifierSecretKey;
    const ivsk = keys.masterIncomingViewingSecretKey;
    const ovsk = keys.masterOutgoingViewingSecretKey;
    const tsk = keys.masterTaggingSecretKey;

    // Get public keys
    const publicKeys = keys.publicKeys;
    const npk = publicKeys.masterNullifierPublicKey;
    const ivpk = publicKeys.masterIncomingViewingPublicKey;
    const ovpk = publicKeys.masterOutgoingViewingPublicKey;
    const tpk = publicKeys.masterTaggingPublicKey;

    // Compute public keys hash
    const publicKeysHash = await publicKeys.hash();

    return {
      secretKey: secretKeyFr.toString(),
      masterNullifierSecretKey: nsk.toString(),
      masterNullifierPublicKey: WalletUtils.pointToString(npk),
      masterIncomingViewingSecretKey: ivsk.toString(),
      masterIncomingViewingPublicKey: WalletUtils.pointToString(ivpk),
      masterOutgoingViewingSecretKey: ovsk.toString(),
      masterOutgoingViewingPublicKey: WalletUtils.pointToString(ovpk),
      masterTaggingSecretKey: tsk.toString(),
      masterTaggingPublicKey: WalletUtils.pointToString(tpk),
      publicKeysHash: publicKeysHash.toString(),
    };
  }

  /**
   * Derive address from secret key and salt
   * @param params JSON with: secretKey, salt (optional, defaults to 0)
   */
  static async deriveAddress(params: string): Promise<DerivedAddress> {
    const p = JSON.parse(params);
    const { secretKey, salt: saltInput } = p;

    if (!secretKey) {
      throw new Error('secretKey is required');
    }

    const secretKeyFr = Helpers.stringToFr(secretKey);
    const salt = saltInput ? Helpers.stringToFr(saltInput) : Fr.ZERO;

    // Derive keys
    const keys = await deriveKeys(secretKeyFr);
    const publicKeys = keys.publicKeys;
    const publicKeysHash = await publicKeys.hash();

    // Compute Schnorr account address
    const address = await getSchnorrAccountContractAddress(secretKeyFr, salt);

    return {
      secretKey: secretKeyFr.toString(),
      salt: salt.toString(),
      address: address.toString(),
      partialAddress: 'N/A (use full address)',
      publicKeysHash: publicKeysHash.toString(),
    };
  }

  /**
   * Derive app-siloed keys for a specific contract
   * @param params JSON with: secretKey, contractAddress
   */
  static async deriveAppKeys(params: string): Promise<AppSiloedKeys> {
    const p = JSON.parse(params);
    const { secretKey, contractAddress } = p;

    if (!secretKey) {
      throw new Error('secretKey is required');
    }
    if (!contractAddress) {
      throw new Error('contractAddress is required');
    }

    const secretKeyFr = Helpers.stringToFr(secretKey);
    const contract = AztecAddress.fromString(contractAddress);

    // Derive master nullifier secret key
    const nsk = deriveMasterNullifierSecretKey(secretKeyFr);

    // Compute app-specific nullifier secret key
    const appNsk = await computeAppNullifierSecretKey(nsk, contract);

    return {
      contractAddress: contract.toString(),
      appNullifierSecretKey: appNsk.toString(),
    };
  }

  /**
   * Sign a message using Schnorr signature
   * @param params JSON with: message, secretKey
   */
  static async signMessage(params: string): Promise<SignatureResult> {
    const p = JSON.parse(params);
    const { message, secretKey } = p;

    if (!message) {
      throw new Error('message is required');
    }
    if (!secretKey) {
      throw new Error('secretKey is required');
    }

    const secretKeyFr = Helpers.stringToFr(secretKey);

    // Derive the signing key (uses IVSK_M as basis for Schnorr accounts)
    const signingKey = deriveSigningKey(secretKeyFr);

    // Convert message to buffer
    const messageBuffer = Buffer.from(message, 'utf-8');

    // Sign using Schnorr
    const schnorr = new Schnorr();
    const signature = await schnorr.constructSignature(messageBuffer, signingKey);
    const publicKey = await schnorr.computePublicKey(signingKey);

    return {
      message,
      signature: signature.toString(),
      publicKey: WalletUtils.pointToString(publicKey),
    };
  }

  /**
   * Verify a Schnorr signature
   * @param params JSON with: message, signature (hex string), publicKey
   */
  static async verifySignature(params: string): Promise<VerifyResult> {
    const p = JSON.parse(params);
    const { message, signature, publicKey } = p;

    if (!message) {
      throw new Error('message is required');
    }
    if (!signature) {
      throw new Error('signature is required (64-byte hex string)');
    }
    if (!publicKey) {
      throw new Error('publicKey is required');
    }

    // Convert message to buffer
    const messageBuffer = Buffer.from(message, 'utf-8');

    // Parse signature from hex string
    const sig = SchnorrSignature.fromString(signature);

    // Parse public key (format: "x,y" or object with x,y)
    let pubKeyPoint: Point;
    if (typeof publicKey === 'string') {
      const parts = publicKey.split(',');
      if (parts.length === 2) {
        pubKeyPoint = new Point(
          Helpers.stringToFr(parts[0].trim()),
          Helpers.stringToFr(parts[1].trim()),
          false
        );
      } else {
        throw new Error('publicKey must be in format "x,y" or an object with x and y fields');
      }
    } else if (publicKey.x && publicKey.y) {
      pubKeyPoint = new Point(
        Helpers.stringToFr(publicKey.x),
        Helpers.stringToFr(publicKey.y),
        false
      );
    } else {
      throw new Error('publicKey must be in format "x,y" or an object with x and y fields');
    }

    // Verify using Schnorr
    const schnorr = new Schnorr();
    const valid = await schnorr.verifySignature(messageBuffer, pubKeyPoint, sig);

    return {
      valid,
      message,
      publicKey: WalletUtils.pointToString(pubKeyPoint),
    };
  }

  // ==================== Helper Methods ====================

  /**
   * Convert a Point to a string representation
   */
  private static pointToString(point: Point): string {
    return `${point.x.toString()},${point.y.toString()}`;
  }

  /**
   * Format derived keys for human-readable output
   */
  static formatDerivedKeysHumanReadable(keys: DerivedKeys): string {
    const lines: string[] = [];

    lines.push('Derived Keys');
    lines.push('='.repeat(50));
    lines.push('');

    lines.push('Secret Key (input):');
    lines.push(`  ${keys.secretKey}`);
    lines.push('');

    lines.push('Master Nullifier Key (nsk_m):');
    lines.push(`  Secret:  ${keys.masterNullifierSecretKey}`);
    lines.push(`  Public:  ${keys.masterNullifierPublicKey}`);
    lines.push('');

    lines.push('Master Incoming Viewing Key (ivsk_m):');
    lines.push(`  Secret:  ${keys.masterIncomingViewingSecretKey}`);
    lines.push(`  Public:  ${keys.masterIncomingViewingPublicKey}`);
    lines.push('');

    lines.push('Master Outgoing Viewing Key (ovsk_m):');
    lines.push(`  Secret:  ${keys.masterOutgoingViewingSecretKey}`);
    lines.push(`  Public:  ${keys.masterOutgoingViewingPublicKey}`);
    lines.push('');

    lines.push('Master Tagging Key (tsk_m):');
    lines.push(`  Secret:  ${keys.masterTaggingSecretKey}`);
    lines.push(`  Public:  ${keys.masterTaggingPublicKey}`);
    lines.push('');

    lines.push('Public Keys Hash:');
    lines.push(`  ${keys.publicKeysHash}`);

    return lines.join('\n');
  }

  /**
   * Format derived address for human-readable output
   */
  static formatDerivedAddressHumanReadable(addr: DerivedAddress): string {
    const lines: string[] = [];

    lines.push('Derived Address');
    lines.push('='.repeat(50));
    lines.push('');

    lines.push(`Address:          ${addr.address}`);
    lines.push(`Salt:             ${addr.salt}`);
    lines.push(`Partial Address:  ${addr.partialAddress}`);
    lines.push(`Public Keys Hash: ${addr.publicKeysHash}`);
    lines.push('');
    lines.push('Note: This address is for a Schnorr account contract.');
    lines.push('The account must be deployed before it can send transactions.');

    return lines.join('\n');
  }

  /**
   * Truncate a key for display
   */
  private static truncateKey(key: string): string {
    if (key.length <= 40) return key;
    // For point format "x,y", truncate both parts
    if (key.includes(',')) {
      const [x, y] = key.split(',');
      return `${x.slice(0, 18)}...,${y.slice(0, 18)}...`;
    }
    return `${key.slice(0, 20)}...${key.slice(-16)}`;
  }
}
