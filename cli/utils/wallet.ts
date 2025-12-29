/**
 * Wallet utility functions for key management
 */

import { Fr } from '@aztec/foundation/fields';
import { randomBytes } from '@aztec/foundation/crypto';
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
}
