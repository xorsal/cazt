/**
 * Persistent PXE utilities
 *
 * Creates a PXE/Wallet instance with persistent storage so that registered
 * contracts and accounts persist across CLI invocations.
 */

import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { Fr } from '@aztec/foundation/fields';
import { AztecAddress } from '@aztec/aztec.js/addresses';
import { createAztecNodeClient, waitForNode, type AztecNode } from '@aztec/aztec.js/node';
import { TestWallet } from '@aztec/test-wallet/server';
import { getContractInstanceFromInstantiationParams } from '@aztec/aztec.js/contracts';
import { SponsoredFeePaymentMethod } from '@aztec/aztec.js/fee';
import { SponsoredFPCContractArtifact } from '@aztec/noir-contracts.js/SponsoredFPC';
import { SPONSORED_FPC_SALT } from '@aztec/constants';
import type { AccountManager } from '@aztec/aztec.js/wallet';

// Default data directory for CAZT
const DEFAULT_DATA_DIR = path.join(os.homedir(), '.cazt');

/**
 * Get the data directory for a specific network
 */
export function getDataDirectory(nodeUrl: string): string {
  try {
    const url = new URL(nodeUrl);
    const suffix = `${url.hostname}-${url.port || 'default'}`.replace(/[^a-z0-9-]/gi, '-');
    return path.join(DEFAULT_DATA_DIR, `pxe-${suffix}`);
  } catch {
    return path.join(DEFAULT_DATA_DIR, 'pxe-default');
  }
}

/**
 * Ensure the data directory exists
 */
function ensureDataDir(dataDir: string): void {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

/**
 * PXE context with all necessary components
 */
export interface PXEContext {
  node: AztecNode;
  wallet: TestWallet;
  paymentMethod: SponsoredFeePaymentMethod;
  dataDirectory: string;
}

/**
 * Get the canonical SponsoredFPC contract instance
 */
async function getSponsoredFPCInstance() {
  return await getContractInstanceFromInstantiationParams(
    SponsoredFPCContractArtifact,
    { salt: new Fr(SPONSORED_FPC_SALT) }
  );
}

/**
 * Create a persistent PXE/Wallet context for a given node URL
 * Uses TestWallet with a persistent data directory
 */
export async function createPersistentPXE(
  nodeUrl: string,
  options: {
    debug?: boolean;
    proverEnabled?: boolean;
  } = {}
): Promise<PXEContext> {
  const { debug = false, proverEnabled = false } = options;

  const debugLog = (msg: string, data?: any) => {
    if (debug) {
      console.error(`[PXE] ${msg}`, data ? JSON.stringify(data, null, 2) : '');
    }
  };

  // Get data directory for this network
  const dataDirectory = getDataDirectory(nodeUrl);
  ensureDataDir(dataDirectory);
  debugLog(`Using data directory: ${dataDirectory}`);

  // Connect to node
  debugLog(`Connecting to node: ${nodeUrl}`);
  const node = createAztecNodeClient(nodeUrl);
  await waitForNode(node);
  debugLog('Node ready');

  // Create TestWallet with persistent storage
  // Note: TestWallet internally creates a PXE - we set the data directory via env
  process.env.PXE_DATA_DIRECTORY = dataDirectory;

  debugLog('Creating TestWallet with persistent storage...');
  const wallet = await TestWallet.create(node, {
    proverEnabled,
  });
  debugLog('Wallet created');

  // Register SponsoredFPC
  debugLog('Registering SponsoredFPC...');
  const fpcInstance = await getSponsoredFPCInstance();
  try {
    await wallet.registerContract({
      instance: fpcInstance,
      artifact: SponsoredFPCContractArtifact,
    });
    debugLog(`SponsoredFPC registered at: ${fpcInstance.address.toString()}`);
  } catch (e: any) {
    // Already registered
    debugLog('SponsoredFPC already registered');
  }

  // Create payment method
  const paymentMethod = new SponsoredFeePaymentMethod(fpcInstance.address);

  return {
    node,
    wallet,
    paymentMethod,
    dataDirectory,
  };
}

/**
 * Create or get an account manager for a secret key
 */
export async function getOrCreateAccount(
  pxeContext: PXEContext,
  secretKey: string,
  salt: Fr = Fr.ZERO,
  options: {
    debug?: boolean;
    deployIfNeeded?: boolean;
  } = {}
): Promise<AccountManager> {
  const { debug = false, deployIfNeeded = true } = options;
  const { wallet, node, paymentMethod } = pxeContext;

  const debugLog = (msg: string, data?: any) => {
    if (debug) {
      console.error(`[Account] ${msg}`, data ? JSON.stringify(data, null, 2) : '');
    }
  };

  // Create account using TestWallet (handles key derivation internally)
  debugLog('Creating account manager...');
  // Use fromBufferReduce to safely handle keys that might exceed field modulus
  const secretKeyBuffer = Buffer.from(secretKey.replace('0x', ''), 'hex');
  const secretKeyFr = Fr.fromBufferReduce(secretKeyBuffer);
  debugLog(`Secret key (reduced): ${secretKeyFr.toString()}`);
  const accountManager = await wallet.createSchnorrAccount(secretKeyFr, salt);
  debugLog(`Account address: ${accountManager.address.toString()}`);

  // Check if deployed on-chain
  const onChainContract = await node.getContract(accountManager.address);
  const isDeployedOnChain = !!onChainContract;
  debugLog(`Account deployed on-chain: ${isDeployedOnChain}`);

  if (!isDeployedOnChain && deployIfNeeded) {
    debugLog('Deploying account...');
    try {
      const deployMethod = await accountManager.getDeployMethod();
      const deployTx = deployMethod.send({
        from: AztecAddress.ZERO,
        fee: { paymentMethod },
      });
      const receipt = await deployTx.wait();
      debugLog(`Account deployed:`, {
        txHash: receipt.txHash.toString(),
        blockNumber: receipt.blockNumber,
      });
    } catch (deployError: any) {
      const errorMsg = deployError?.message || String(deployError);
      if (errorMsg.includes('nullifier') || errorMsg.includes('already exists')) {
        debugLog('Account already deployed (nullifier exists), registering locally...');
        // Just register the account contract locally
        const accountInstance = accountManager.getInstance();
        const accountArtifact = await accountManager.getAccountContract().getContractArtifact();
        await wallet.registerContract({
          instance: accountInstance,
          artifact: accountArtifact,
        });
        debugLog('Account registered locally');
      } else {
        throw deployError;
      }
    }
  }

  return accountManager;
}

/**
 * Clear the PXE data directory for a network
 */
export function clearPXEData(nodeUrl: string): void {
  const dataDirectory = getDataDirectory(nodeUrl);
  if (fs.existsSync(dataDirectory)) {
    fs.rmSync(dataDirectory, { recursive: true, force: true });
  }
}

/**
 * Get PXE info
 */
export function getPXEInfo(nodeUrl: string): { dataDirectory: string; exists: boolean } {
  const dataDirectory = getDataDirectory(nodeUrl);
  return {
    dataDirectory,
    exists: fs.existsSync(dataDirectory),
  };
}
