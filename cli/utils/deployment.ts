import { AztecAddress } from '@aztec/aztec.js/addresses';
import { Fr } from '@aztec/foundation/fields';
import { Contract } from '@aztec/aztec.js/contracts';
import { loadContractArtifact } from '@aztec/stdlib/abi';
import { getDefaultNodeUrl } from '../config/index.js';
import { createPersistentPXE, getOrCreateAccount, type PXEContext } from './pxe.js';

/**
 * Deployment utility functions
 */
export class DeploymentUtils {
  /**
   * Deploy a contract using persistent PXE
   */
  static async deployContract(params: string): Promise<any> {
    const p = JSON.parse(params);
    const {
      nodeUrl = getDefaultNodeUrl(),
      artifact: artifactInput,
      secretKey,
      salt,
      deployer,
      contractAddressSalt,
      universalDeploy,
      constructorArgs = [],
      constructorName,
      skipClassPublication,
      skipInstancePublication,
      skipInitialization,
      skipRegistration,
      wait = true,
      debug = false,
    } = p;

    const debugLog = (msg: string, data?: any) => {
      if (debug) {
        console.error(`[DEBUG] ${msg}`, data ? JSON.stringify(data, null, 2) : '');
      }
    };

    if (!artifactInput) {
      throw new Error('Artifact is required');
    }

    // Load artifact (supports aztec:, standards:, file paths, or JSON)
    debugLog(`Loading artifact: ${typeof artifactInput === 'string' ? artifactInput : 'object'}`);
    let artifactJson: any;
    if (typeof artifactInput === 'string') {
      // Use parseJsonOrFile from rpc.ts logic
      const { parseJsonOrFile } = await import('./rpc.js');
      artifactJson = parseJsonOrFile(artifactInput);
    } else {
      artifactJson = artifactInput;
    }
    const contractArtifact = loadContractArtifact(artifactJson as any);
    debugLog(`Artifact loaded:`, { name: contractArtifact.name });

    // Create persistent PXE context
    debugLog(`Creating persistent PXE for: ${nodeUrl}`);
    const pxeContext = await createPersistentPXE(nodeUrl, { debug });
    debugLog(`PXE ready, data directory: ${pxeContext.dataDirectory}`);

    const { wallet, paymentMethod } = pxeContext;

    // Create account if secret key is provided
    let accountManager: any = null;
    if (secretKey) {
      let saltToUse: Fr;
      if (salt) {
        if (salt === 'random' || salt.toLowerCase() === 'random') {
          saltToUse = Fr.random();
          debugLog(`Generated random account salt: ${saltToUse.toString()}`);
        } else {
          saltToUse = Fr.fromString(salt);
        }
      } else {
        saltToUse = Fr.ZERO;
      }

      debugLog(`Creating/loading account with secret key...`);
      accountManager = await getOrCreateAccount(pxeContext, secretKey, saltToUse, {
        debug,
        deployIfNeeded: true,
      });
      debugLog(`Account ready:`, { address: accountManager.address.toString() });
    }

    // Prepare deployment options
    const deployOptions: any = {};

    if (contractAddressSalt !== undefined) {
      if (contractAddressSalt === 'random' || contractAddressSalt.toLowerCase() === 'random') {
        deployOptions.contractAddressSalt = Fr.random();
        debugLog(`Generated random contract salt: ${deployOptions.contractAddressSalt.toString()}`);
      } else {
        deployOptions.contractAddressSalt = Fr.fromString(contractAddressSalt);
      }
    }

    if (deployer !== undefined) {
      deployOptions.deployer = AztecAddress.fromString(deployer);
    }

    if (universalDeploy !== undefined) {
      deployOptions.universalDeploy = universalDeploy;
    }

    if (skipClassPublication !== undefined) {
      deployOptions.skipClassPublication = skipClassPublication;
    }

    if (skipInstancePublication !== undefined) {
      deployOptions.skipInstancePublication = skipInstancePublication;
    }

    if (skipInitialization !== undefined) {
      deployOptions.skipInitialization = skipInitialization;
    }

    if (skipRegistration !== undefined) {
      deployOptions.skipRegistration = skipRegistration;
    }

    // Parse constructor args if provided as string
    let parsedConstructorArgs = constructorArgs;
    if (typeof constructorArgs === 'string') {
      try {
        parsedConstructorArgs = JSON.parse(constructorArgs);
      } catch {
        // If not JSON, treat as comma-separated values
        parsedConstructorArgs = constructorArgs.split(',').map((arg: string) => arg.trim());
      }
    }

    debugLog(`Deploying contract with options:`, {
      constructorArgs: parsedConstructorArgs,
      constructorName,
      ...deployOptions,
    });

    // Deploy the contract
    const deployMethod = Contract.deploy(
      wallet,
      contractArtifact,
      parsedConstructorArgs,
      constructorName,
    );

    // Get instance to show address before deployment
    const instance = await deployMethod.getInstance(deployOptions);
    debugLog(`Contract instance computed:`, {
      address: instance.address.toString(),
      contractClassId: instance.currentContractClassId.toString(),
    });

    // Add sponsored fee payment to deploy options
    deployOptions.fee = { paymentMethod };
    // Set the 'from' address - use account address if available, otherwise AztecAddress.ZERO for sponsored
    if (accountManager) {
      deployOptions.from = accountManager.address;
    } else {
      deployOptions.from = AztecAddress.ZERO;
    }
    debugLog(`Using from address: ${deployOptions.from.toString()}`);

    // Send deployment transaction
    debugLog(`Sending deployment transaction...`);
    const deployTx = deployMethod.send(deployOptions);
    const txHash = await deployTx.getTxHash();
    debugLog(`Deployment transaction sent:`, { txHash: txHash.toString() });

    let receipt: any = null;
    let contract: any = null;

    if (wait) {
      debugLog(`Waiting for deployment to complete...`);
      const deployReceipt = await deployTx.wait();
      debugLog(`Receipt received:`, {
        txHash: deployReceipt.txHash?.toString(),
        status: deployReceipt.status,
        blockNumber: deployReceipt.blockNumber,
      });
      receipt = {
        txHash: deployReceipt.txHash.toString(),
        status: deployReceipt.status,
        blockNumber: deployReceipt.blockNumber,
      };
      // Access instance from receipt or fall back to computed instance
      const receiptInstance = (deployReceipt as any).instance || instance;
      const contractAddress = deployReceipt.contract?.address || receiptInstance?.address || instance.address;
      contract = {
        address: contractAddress.toString(),
        instance: {
          address: (receiptInstance?.address || instance.address).toString(),
          contractClassId: (receiptInstance?.currentContractClassId || instance.currentContractClassId).toString(),
          initializationHash: (receiptInstance?.initializationHash || instance.initializationHash).toString(),
          salt: (receiptInstance?.salt || instance.salt).toString(),
        },
      };
      debugLog(`Deployment completed:`, contract);
    } else {
      // Return instance info even if not waiting
      contract = {
        address: instance.address.toString(),
        instance: {
          address: instance.address.toString(),
          contractClassId: instance.currentContractClassId.toString(),
          initializationHash: instance.initializationHash.toString(),
          salt: instance.salt.toString(),
        },
      };
    }

    return {
      txHash: txHash.toString(),
      contract,
      receipt,
      account: accountManager ? {
        address: accountManager.address.toString(),
      } : null,
      pxeDataDirectory: pxeContext.dataDirectory,
    };
  }
}
