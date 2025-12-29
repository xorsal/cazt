/**
 * Wallet utility functions for key management
 */

import { Fr } from '@aztec/foundation/fields';
import { randomBytes, Schnorr } from '@aztec/foundation/crypto';
import { deriveKeys, deriveSigningKey } from '@aztec/stdlib/keys';
import { getSchnorrAccountContractAddress } from '@aztec/accounts/schnorr';
import { Helpers } from './helpers.js';

/**
 * Result type for key generation
 */
export interface GeneratedKey {
  secretKey: string;
  warning: string;
}

/**
 * Result type for derived keys
 */
export interface DerivedKeys {
  secretKey: string;
  address: string;
  salt: string;
  publicKeys: {
    masterNullifierPublicKey: string;
    masterIncomingViewingPublicKey: string;
    masterOutgoingViewingPublicKey: string;
    masterTaggingPublicKey: string;
  };
}

/**
 * Wallet utilities for key operations
 */
export class WalletUtils {
  /**
   * Generate a new random secret key
   */
  static async generateKey(_params: string): Promise<GeneratedKey> {
    const secretKeyBuffer = randomBytes(32);
    const secretKey = Fr.fromBuffer(secretKeyBuffer);

    return {
      secretKey: secretKey.toString(),
      warning: 'SECURITY WARNING: Store this secret key securely. Anyone with access can control associated accounts.',
    };
  }

  /**
   * Derive all keys from a secret key
   * @param params JSON with: secretKey, salt
   */
  static async deriveAllKeys(params: string): Promise<DerivedKeys> {
    const p = JSON.parse(params);
    const { secretKey, salt: saltInput } = p;

    if (!secretKey) {
      throw new Error('secretKey is required');
    }

    const secretKeyFr = Helpers.stringToFr(secretKey);
    const salt = saltInput ? Helpers.stringToFr(saltInput) : Fr.ZERO;

    // Derive public keys
    const keys = await deriveKeys(secretKeyFr);

    // Compute address
    const address = await getSchnorrAccountContractAddress(secretKeyFr, salt);

    return {
      secretKey: secretKeyFr.toString(),
      address: address.toString(),
      salt: salt.toString(),
      publicKeys: {
        masterNullifierPublicKey: `${keys.publicKeys.masterNullifierPublicKey.x.toString()},${keys.publicKeys.masterNullifierPublicKey.y.toString()}`,
        masterIncomingViewingPublicKey: `${keys.publicKeys.masterIncomingViewingPublicKey.x.toString()},${keys.publicKeys.masterIncomingViewingPublicKey.y.toString()}`,
        masterOutgoingViewingPublicKey: `${keys.publicKeys.masterOutgoingViewingPublicKey.x.toString()},${keys.publicKeys.masterOutgoingViewingPublicKey.y.toString()}`,
        masterTaggingPublicKey: `${keys.publicKeys.masterTaggingPublicKey.x.toString()},${keys.publicKeys.masterTaggingPublicKey.y.toString()}`,
      },
    };
  }

  /**
   * Sign a message with Schnorr signature
   * @param params JSON with: secretKey, message
   */
  static async signMessage(params: string): Promise<{ signature: string; publicKey: string }> {
    const p = JSON.parse(params);
    const { secretKey, message } = p;

    if (!secretKey) {
      throw new Error('secretKey is required');
    }
    if (!message) {
      throw new Error('message is required');
    }

    const secretKeyFr = Helpers.stringToFr(secretKey);

    // Derive the signing key from the secret key
    const signingKey = deriveSigningKey(secretKeyFr);

    // Convert message to buffer
    let messageBuffer: Buffer;
    if (message.startsWith('0x')) {
      messageBuffer = Buffer.from(message.slice(2), 'hex');
    } else {
      messageBuffer = Buffer.from(message, 'utf8');
    }

    // Sign the message
    const schnorr = new Schnorr();
    const signature = await schnorr.constructSignature(messageBuffer, signingKey);
    const publicKey = await schnorr.computePublicKey(signingKey);

    return {
      signature: signature.toBuffer().toString('hex'),
      publicKey: publicKey.toString(),
    };
  }

  /**
   * Verify a Schnorr signature
   * @param params JSON with: publicKey, message, signature
   */
  static async verifySignature(params: string): Promise<{ valid: boolean }> {
    const p = JSON.parse(params);
    const { publicKey, message, signature } = p;

    if (!publicKey) {
      throw new Error('publicKey is required');
    }
    if (!message) {
      throw new Error('message is required');
    }
    if (!signature) {
      throw new Error('signature is required');
    }

    // Convert message to buffer
    let messageBuffer: Buffer;
    if (message.startsWith('0x')) {
      messageBuffer = Buffer.from(message.slice(2), 'hex');
    } else {
      messageBuffer = Buffer.from(message, 'utf8');
    }

    // Parse signature
    const signatureBuffer = Buffer.from(signature.replace('0x', ''), 'hex');

    // Parse public key (format: "x,y" or just the point)
    const { Point } = await import('@aztec/foundation/fields');
    const { SchnorrSignature } = await import('@aztec/foundation/crypto');

    let pubKeyPoint;
    if (publicKey.includes(',')) {
      const [x, y] = publicKey.split(',');
      pubKeyPoint = new Point(
        Fr.fromString(x.trim()),
        Fr.fromString(y.trim()),
        false
      );
    } else {
      pubKeyPoint = Point.fromString(publicKey);
    }

    // Verify the signature
    const schnorr = new Schnorr();
    const sig = SchnorrSignature.fromBuffer(signatureBuffer);
    const valid = await schnorr.verifySignature(messageBuffer, pubKeyPoint, sig);

    return { valid };
  }
}
