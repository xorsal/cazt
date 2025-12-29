import { Fr } from '@aztec/foundation/fields';
import { AztecAddress } from '@aztec/aztec.js/addresses';

/**
 * Helper utilities used across multiple utility modules
 */
export class Helpers {
  /**
   * Validate hex string has even number of digits (byte-aligned)
   * Throws error if odd number of digits, matching keccak behavior
   */
  static validateHexString(value: string): void {
    if (value.startsWith('0x')) {
      const hexPart = value.slice(2);
      if (hexPart.length % 2 !== 0) {
        throw new Error('odd number of digits');
      }
    }
  }

  /**
   * Convert string to Fr field
   * - If it's a hex string (starts with 0x), parse as hex (auto-pads odd digits)
   * - If it's all digits, parse as decimal number
   * - Otherwise, treat as UTF-8 string
   *
   * Uses fromBufferReduce to safely handle values that exceed the field modulus.
   */
  static stringToFr(value: string): Fr {
    // If it's a hex string (starts with 0x), parse as hex
    if (value.startsWith('0x')) {
      // Pad to even length if odd number of hex digits
      let hexPart = value.slice(2);
      if (hexPart.length % 2 !== 0) {
        hexPart = '0' + hexPart;
      }
      // Pad to 32 bytes for Fr
      hexPart = hexPart.padStart(64, '0');
      const buffer = Buffer.from(hexPart, 'hex');
      return Fr.fromBufferReduce(buffer);
    }

    // If it's all digits, treat as decimal number
    if (/^\d+$/.test(value)) {
      return new Fr(BigInt(value));
    }

    // Otherwise, treat as UTF-8 string
    const buffer = Buffer.from(value, 'utf8');
    const padded = Buffer.alloc(32);
    buffer.copy(padded, 0, 0, Math.min(buffer.length, 32));
    return Fr.fromBufferReduce(padded);
  }

  /**
   * Normalize address (pad to 32 bytes if needed)
   */
  static normalizeAddress(address: string): string {
    if (address.startsWith('0x')) {
      const hex = address.slice(2);
      // Pad to 64 hex chars (32 bytes)
      return `0x${hex.padStart(64, '0')}`;
    }
    // If no 0x prefix, assume it's already hex and pad
    return `0x${address.padStart(64, '0')}`;
  }
}

