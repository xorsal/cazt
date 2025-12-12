import { Fr, GrumpkinScalar } from '@aztec/foundation/fields';
import { AztecAddress } from '@aztec/aztec.js/addresses';
import { createAztecNodeClient, waitForNode } from '@aztec/aztec.js/node';
import { TestWallet } from '@aztec/test-wallet/server';
import { deriveKeys } from '@aztec/stdlib/keys';
import { getSchnorrAccountContractAddress } from '@aztec/accounts/schnorr';
import { Helpers } from './helpers.js';
import { getDefaultNodeUrl } from '../config/index.js';
import { registerSponsoredFPC, getSponsoredPaymentMethod } from './fpc.js';

/**
 * Result types for account operations
 */
export interface AccountCreateResult {
  secretKey: string;
  salt: string;
  address: string;
  type: string;
  deployed: boolean;
  txHash?: string;
  warning: string;
}

export interface AccountInfoResult {
  address: string;
  deployed: boolean;
  contractClassId?: string;
  initializationHash?: string;
  salt?: string;
  deployer?: string;
  publicKeys?: {
    masterNullifierPublicKey: string;
    masterIncomingViewingPublicKey: string;
    masterOutgoingViewingPublicKey: string;
    masterTaggingPublicKey: string;
  };
}

export interface AccountDeployResult {
  address: string;
  txHash: string;
  blockNumber?: number;
  status: string;
}

export interface AccountBalanceResult {
  address: string;
  tokenContract: string;
  balance: string;
}

/**
 * Account utility functions
 */
export class AccountUtils {
  /**
   * Create a new account (generate keys, optionally deploy)
   * @param params JSON with: type (schnorr|ecdsa-k|ecdsa-r), salt, deploy, nodeUrl
   */
  static async createAccount(params: string): Promise<AccountCreateResult> {
    const p = JSON.parse(params);
    const {
      type = 'schnorr',
      salt: saltInput,
      deploy = false,
      nodeUrl = getDefaultNodeUrl(),
    } = p;

    // Generate random secret key
    const secretKey = Fr.random();

    // Determine salt
    const salt = saltInput ? Helpers.stringToFr(saltInput) : Fr.ZERO;

    // Compute address based on type
    let address: AztecAddress;
    if (type === 'schnorr') {
      address = await getSchnorrAccountContractAddress(secretKey, salt);
    } else {
      // For now, only Schnorr is fully supported
      throw new Error(`Account type '${type}' not yet implemented. Use 'schnorr'.`);
    }

    let deployed = false;
    let txHash: string | undefined;

    if (deploy) {
      // Deploy the account contract
      const node = createAztecNodeClient(nodeUrl);
      await waitForNode(node);

      const wallet = await TestWallet.create(node, { proverEnabled: false });

      // Register the SponsoredFPC for fee payments
      await registerSponsoredFPC(wallet);
      const paymentMethod = await getSponsoredPaymentMethod(wallet);

      const accountManager = await wallet.createSchnorrAccount(secretKey, salt);

      // Deploy the account using getDeployMethod with sponsored fees
      const deployMethod = await accountManager.getDeployMethod();
      const deployTx = deployMethod.send({
        from: AztecAddress.ZERO,
        fee: { paymentMethod },
      });
      const receipt = await deployTx.wait();

      deployed = true;
      txHash = receipt.txHash.toString();
    }

    return {
      secretKey: secretKey.toString(),
      salt: salt.toString(),
      address: address.toString(),
      type,
      deployed,
      txHash,
      warning: 'SECURITY WARNING: Store the secret key securely. Anyone with access can control this account.',
    };
  }

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
   * Get account info from the network
   * @param params JSON with: address, nodeUrl
   */
  static async getAccountInfo(params: string): Promise<AccountInfoResult> {
    const p = JSON.parse(params);
    const { address, nodeUrl = getDefaultNodeUrl() } = p;

    if (!address) {
      throw new Error('address is required');
    }

    const node = createAztecNodeClient(nodeUrl);
    await waitForNode(node);

    // Query the contract instance at the address
    const contractInstance = await node.getContract(AztecAddress.fromString(address));

    if (!contractInstance) {
      // Not deployed yet - return minimal info
      return {
        address,
        deployed: false,
      };
    }

    return {
      address,
      deployed: true,
      contractClassId: contractInstance.currentContractClassId.toString(),
      initializationHash: contractInstance.initializationHash.toString(),
      salt: contractInstance.salt.toString(),
      deployer: contractInstance.deployer.toString(),
      publicKeys: contractInstance.publicKeys ? {
        masterNullifierPublicKey: `${contractInstance.publicKeys.masterNullifierPublicKey.x.toString()},${contractInstance.publicKeys.masterNullifierPublicKey.y.toString()}`,
        masterIncomingViewingPublicKey: `${contractInstance.publicKeys.masterIncomingViewingPublicKey.x.toString()},${contractInstance.publicKeys.masterIncomingViewingPublicKey.y.toString()}`,
        masterOutgoingViewingPublicKey: `${contractInstance.publicKeys.masterOutgoingViewingPublicKey.x.toString()},${contractInstance.publicKeys.masterOutgoingViewingPublicKey.y.toString()}`,
        masterTaggingPublicKey: `${contractInstance.publicKeys.masterTaggingPublicKey.x.toString()},${contractInstance.publicKeys.masterTaggingPublicKey.y.toString()}`,
      } : undefined,
    };
  }

  /**
   * Compute address from secret key without deploying
   * This is an alias for wallet derive-address but returns more account-focused info
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

  // ==================== Human-Readable Formatters ====================

  /**
   * Format account creation result for display
   */
  static formatAccountCreateHumanReadable(result: AccountCreateResult): string {
    const lines: string[] = [];

    lines.push('Account Created');
    lines.push('='.repeat(50));
    lines.push('');
    lines.push(`Type:        ${result.type}`);
    lines.push(`Address:     ${result.address}`);
    lines.push(`Salt:        ${result.salt}`);
    lines.push(`Deployed:    ${result.deployed ? 'Yes' : 'No'}`);
    if (result.txHash) {
      lines.push(`Deploy Tx:   ${result.txHash}`);
    }
    lines.push('');
    lines.push(`Secret Key:  ${result.secretKey}`);
    lines.push('');
    lines.push(`WARNING: ${result.warning}`);

    return lines.join('\n');
  }

  /**
   * Format account info for display
   */
  static formatAccountInfoHumanReadable(result: AccountInfoResult): string {
    const lines: string[] = [];

    lines.push('Account Info');
    lines.push('='.repeat(50));
    lines.push('');
    lines.push(`Address:     ${result.address}`);
    lines.push(`Deployed:    ${result.deployed ? 'Yes' : 'No'}`);

    if (result.deployed) {
      lines.push(`Class ID:    ${result.contractClassId}`);
      lines.push(`Salt:        ${result.salt}`);
      lines.push(`Deployer:    ${result.deployer}`);
      if (result.publicKeys) {
        lines.push('');
        lines.push('Public Keys:');
        lines.push(`  Nullifier:        ${AccountUtils.truncateKey(result.publicKeys.masterNullifierPublicKey)}`);
        lines.push(`  Incoming Viewing: ${AccountUtils.truncateKey(result.publicKeys.masterIncomingViewingPublicKey)}`);
        lines.push(`  Outgoing Viewing: ${AccountUtils.truncateKey(result.publicKeys.masterOutgoingViewingPublicKey)}`);
        lines.push(`  Tagging:          ${AccountUtils.truncateKey(result.publicKeys.masterTaggingPublicKey)}`);
      }
    } else {
      lines.push('');
      lines.push('Note: Account contract not deployed yet.');
      lines.push('Use `cazt account deploy` to deploy.');
    }

    return lines.join('\n');
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

  /**
   * Truncate a key for display
   */
  private static truncateKey(key: string): string {
    if (key.length <= 40) return key;
    if (key.includes(',')) {
      const [x, y] = key.split(',');
      return `${x.slice(0, 18)}...,${y.slice(0, 18)}...`;
    }
    return `${key.slice(0, 20)}...${key.slice(-16)}`;
  }
}
