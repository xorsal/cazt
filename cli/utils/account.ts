/**
 * Account utility functions for Aztec accounts
 */

import { Fr } from '@aztec/foundation/fields';
import { AztecAddress } from '@aztec/aztec.js/addresses';
import { createAztecNodeClient, waitForNode } from '@aztec/aztec.js/node';
import { TestWallet } from '@aztec/test-wallet/server';
import { getSchnorrAccountContractAddress } from '@aztec/accounts/schnorr';
import { Helpers } from './helpers.js';
import { getDefaultNodeUrl } from '../config/index.js';
import { registerSponsoredFPC, getSponsoredPaymentMethod } from './fpc.js';

/**
 * Result type for account deployment
 */
export interface AccountDeployResult {
  address: string;
  txHash: string;
  blockNumber?: number;
  status: string;
}

/**
 * Account utility functions
 */
export class AccountUtils {
  /**
   * Deploy an existing account (when secret is known but not deployed)
   * @param params JSON with: secretKey, salt, type, nodeUrl
   */
  static async deployAccount(params: string): Promise<AccountDeployResult> {
    const p = JSON.parse(params);
    const {
      secretKey,
      salt: saltInput,
      type = 'schnorr',
      nodeUrl = getDefaultNodeUrl(),
    } = p;

    if (!secretKey) {
      throw new Error('secretKey is required');
    }

    const secretKeyFr = Helpers.stringToFr(secretKey);
    const salt = saltInput ? Helpers.stringToFr(saltInput) : Fr.ZERO;

    // Compute expected address
    let address: AztecAddress;
    if (type === 'schnorr') {
      address = await getSchnorrAccountContractAddress(secretKeyFr, salt);
    } else {
      throw new Error(`Account type '${type}' not yet implemented. Use 'schnorr'.`);
    }

    // Create node client and wallet
    const node = createAztecNodeClient(nodeUrl);
    await waitForNode(node);

    const wallet = await TestWallet.create(node, { proverEnabled: false });

    // Register the SponsoredFPC for fee payments
    await registerSponsoredFPC(wallet);
    const paymentMethod = await getSponsoredPaymentMethod(wallet);

    const accountManager = await wallet.createSchnorrAccount(secretKeyFr, salt);

    // Deploy the account using getDeployMethod with sponsored fees
    const deployMethod = await accountManager.getDeployMethod();
    const deployTx = deployMethod.send({
      from: AztecAddress.ZERO,
      fee: { paymentMethod },
    });
    const receipt = await deployTx.wait();

    return {
      address: address.toString(),
      txHash: receipt.txHash.toString(),
      blockNumber: receipt.blockNumber,
      status: receipt.status,
    };
  }

  /**
   * Compute address from secret key without deploying
   * @param params JSON with: secretKey, salt, type
   */
  static async computeAddress(params: string): Promise<{ address: string; salt: string; type: string }> {
    const p = JSON.parse(params);
    const { secretKey, salt: saltInput, type = 'schnorr' } = p;

    if (!secretKey) {
      throw new Error('secretKey is required');
    }

    const secretKeyFr = Helpers.stringToFr(secretKey);
    const salt = saltInput ? Helpers.stringToFr(saltInput) : Fr.ZERO;

    let address: AztecAddress;
    if (type === 'schnorr') {
      address = await getSchnorrAccountContractAddress(secretKeyFr, salt);
    } else {
      throw new Error(`Account type '${type}' not yet implemented. Use 'schnorr'.`);
    }

    return {
      address: address.toString(),
      salt: salt.toString(),
      type,
    };
  }

  /**
   * Format deploy result for display
   */
  static formatDeployHumanReadable(result: AccountDeployResult): string {
    const lines: string[] = [];

    lines.push('Account Deployed');
    lines.push('='.repeat(50));
    lines.push('');
    lines.push(`Address:     ${result.address}`);
    lines.push(`Tx Hash:     ${result.txHash}`);
    lines.push(`Status:      ${result.status}`);
    if (result.blockNumber !== undefined) {
      lines.push(`Block:       ${result.blockNumber}`);
    }

    return lines.join('\n');
  }
}
