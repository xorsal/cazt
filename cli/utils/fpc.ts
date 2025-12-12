/**
 * Sponsored Fee Payment Contract (FPC) utilities
 *
 * The SponsoredFPC allows transactions to be sponsored (no user balance needed).
 * This must be registered with the wallet before use.
 */

import { AztecAddress } from '@aztec/aztec.js/addresses';
import { Fr } from '@aztec/foundation/fields';
import { getContractInstanceFromInstantiationParams } from '@aztec/aztec.js/contracts';
import { SponsoredFeePaymentMethod } from '@aztec/aztec.js/fee';
import { SponsoredFPCContractArtifact } from '@aztec/noir-contracts.js/SponsoredFPC';
import { SPONSORED_FPC_SALT } from '@aztec/constants';
import type { TestWallet } from '@aztec/test-wallet/server';

/**
 * Get the canonical SponsoredFPC contract instance.
 * Uses the canonical salt to derive the same address as deployed on devnet/testnet.
 */
export async function getSponsoredFPCInstance() {
  return await getContractInstanceFromInstantiationParams(
    SponsoredFPCContractArtifact,
    { salt: new Fr(SPONSORED_FPC_SALT) }
  );
}

/**
 * Register the SponsoredFPC contract with a TestWallet.
 * This must be done before using sponsored fee payments.
 *
 * @param wallet - The TestWallet to register the FPC with
 * @returns The FPC contract address
 */
export async function registerSponsoredFPC(
  wallet: TestWallet
): Promise<AztecAddress> {
  const instance = await getSponsoredFPCInstance();

  // Check if already registered
  try {
    const metadata = await wallet.getContractMetadata(instance.address);
    if (metadata?.isContractInitialized) {
      return instance.address;
    }
  } catch {
    // Not registered yet, continue
  }

  // Register the contract with the wallet
  await wallet.registerContract({
    instance,
    artifact: SponsoredFPCContractArtifact,
  });

  return instance.address;
}

/**
 * Get a sponsored fee payment method.
 * Registers the FPC first if needed.
 *
 * @param wallet - The TestWallet
 * @returns A SponsoredFeePaymentMethod instance
 */
export async function getSponsoredPaymentMethod(
  wallet: TestWallet
): Promise<SponsoredFeePaymentMethod> {
  const fpcAddress = await registerSponsoredFPC(wallet);
  return new SponsoredFeePaymentMethod(fpcAddress);
}

/**
 * FPC utility class for CLI commands
 */
export class FPCUtils {
  /**
   * Get the canonical SponsoredFPC address
   */
  static async getFPCAddress(): Promise<string> {
    const instance = await getSponsoredFPCInstance();
    return instance.address.toString();
  }

  /**
   * Register the SponsoredFPC and return info
   */
  static async registerFPC(params: string): Promise<any> {
    const { nodeUrl } = JSON.parse(params);
    const { createAztecNodeClient, waitForNode } = await import('@aztec/aztec.js/node');
    const { TestWallet } = await import('@aztec/test-wallet/server');

    const node = createAztecNodeClient(nodeUrl);
    await waitForNode(node);

    const wallet = await TestWallet.create(node, { proverEnabled: false });
    const fpcAddress = await registerSponsoredFPC(wallet);

    return {
      fpcAddress: fpcAddress.toString(),
      registered: true,
    };
  }
}
