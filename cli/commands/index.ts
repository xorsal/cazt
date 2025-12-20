/**
 * CAZT CLI Command Structure
 *
 * This file defines the new hierarchical command structure for CAZT.
 * Commands are organized into logical groups for better discoverability.
 */

import { Command } from 'commander';
import { WalletUtils } from '../utils/wallet.js';
import { KeyStorage } from '../utils/key-storage.js';
import { AccountUtils } from '../utils/account.js';
import { HashUtils } from '../utils/hash.js';
import { AddressUtils } from '../utils/address.js';
import { EthAddressUtils } from '../utils/eth-address.js';
import { FieldUtils } from '../utils/field.js';
import { SelectorUtils } from '../utils/selector.js';
import { AbiUtils } from '../utils/abi.js';
import { Fr } from '@aztec/foundation/fields';

// Import command modules
import { registerTxCommands } from './tx.js';
import { registerKeyCommands } from './key.js';

// Import shared helpers
import { getGlobalOpts, resolveNodeUrl, notImplemented } from './helpers.js';

/**
 * Register all command groups on the main program
 */
export function registerCommands(program: Command): void {
  registerTxCommands(program);
  registerKeyCommands(program);
  registerWalletCommands(program);
  registerContractCommands(program);
  registerMonitorCommands(program);
  registerQueryCommands(program);
  registerCastCommands(program);
  registerNodeCommands(program);
  registerBridgeCommands(program);
}

// =============================================================================
// WALLET Commands - Account/wallet operations
// =============================================================================

function registerWalletCommands(program: Command): void {
  const walletCmd = program.command('wallet').description('Account/wallet operations');

  walletCmd
    .command('create')
    .description('Create new account (schnorr/ecdsa)')
    .option('--type <type>', 'Account type: schnorr, ecdsa-k, ecdsa-r', 'schnorr')
    .option('--deploy', 'Deploy account contract immediately')
    .option('--alias <name>', 'Alias for the account')
    .option('--salt <salt>', 'Salt for address derivation')
    .action(async function(this: Command, options: { type?: string; deploy?: boolean; alias?: string; salt?: string }) {
      const globalOpts = getGlobalOpts(this);
      try {
        const result = await AccountUtils.createAccount(JSON.stringify({
          type: options.type,
          deploy: options.deploy,
          salt: options.salt,
        }));
        if (globalOpts.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(AccountUtils.formatAccountCreateHumanReadable(result));
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  walletCmd
    .command('deploy')
    .description('Deploy account contract')
    .argument('<secret>', 'Secret key (hex)')
    .option('--type <type>', 'Account type: schnorr, ecdsa-k, ecdsa-r', 'schnorr')
    .option('--salt <salt>', 'Salt for address derivation')
    .action(async function(this: Command, secret: string, options: { type?: string; salt?: string }) {
      const globalOpts = getGlobalOpts(this);
      try {
        const result = await AccountUtils.deployAccount(JSON.stringify({
          secretKey: secret,
          type: options.type,
          salt: options.salt,
        }));
        if (globalOpts.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(AccountUtils.formatDeployHumanReadable(result));
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  walletCmd
    .command('info')
    .description('Show account details')
    .argument('<address>', 'Account address')
    .action(async function(this: Command, address: string) {
      const globalOpts = getGlobalOpts(this);
      try {
        const result = await AccountUtils.getAccountInfo(JSON.stringify({ address }));
        if (globalOpts.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(AccountUtils.formatAccountInfoHumanReadable(result));
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  walletCmd
    .command('address')
    .description('Compute address from secret')
    .argument('<secret>', 'Secret key (hex)')
    .option('--type <type>', 'Account type: schnorr, ecdsa-k, ecdsa-r', 'schnorr')
    .option('--salt <salt>', 'Salt for address derivation')
    .action(async function(this: Command, secret: string, options: { type?: string; salt?: string }) {
      const globalOpts = getGlobalOpts(this);
      try {
        const result = await AccountUtils.computeAddress(JSON.stringify({
          secretKey: secret,
          type: options.type,
          salt: options.salt,
        }));
        if (globalOpts.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log('Computed Address');
          console.log('='.repeat(50));
          console.log('');
          console.log(`Type:    ${result.type}`);
          console.log(`Address: ${result.address}`);
          console.log(`Salt:    ${result.salt}`);
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  walletCmd
    .command('register')
    .description('Register account with PXE')
    .argument('<address>', 'Account address')
    .requiredOption('--secret <secret>', 'Secret key for note decryption')
    .option('--partial-address <addr>', 'Partial address (if known)')
    .action(async function(this: Command, address: string, options: { secret: string; partialAddress?: string }) {
      const globalOpts = getGlobalOpts(this);
      try {
        const { createAztecNodeClient, waitForNode } = await import('@aztec/aztec.js/node');
        const { AztecAddress } = await import('@aztec/aztec.js/addresses');
        const { deriveKeys } = await import('@aztec/stdlib/keys');
        const { getSchnorrAccountContractAddress } = await import('@aztec/accounts/schnorr');
        const { Helpers } = await import('../utils/helpers.js');

        const nodeUrl = resolveNodeUrl(globalOpts);
        const node = createAztecNodeClient(nodeUrl);
        await waitForNode(node);

        const secretKeyFr = Helpers.stringToFr(options.secret);
        const targetAddress = AztecAddress.fromString(address);

        // Derive the account to register
        const keys = await deriveKeys(secretKeyFr);
        const computedAddress = await getSchnorrAccountContractAddress(secretKeyFr, Fr.ZERO);

        // Verify the address matches
        if (!computedAddress.equals(targetAddress)) {
          throw new Error(`Computed address ${computedAddress.toString()} does not match provided address ${address}`);
        }

        // For registration, we need to use the PXE's registerAccount method
        // The node client doesn't have this - we'd need a PXE client
        // For now, show what would be registered
        const result = {
          address: targetAddress.toString(),
          publicKeysHash: (await keys.publicKeys.hash()).toString(),
          registered: false,
          note: 'Account registration requires a PXE client. Use aztec wallet register for full PXE integration.',
        };

        if (globalOpts.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log('Account Registration');
          console.log('='.repeat(50));
          console.log('');
          console.log(`Address:          ${result.address}`);
          console.log(`Public Keys Hash: ${result.publicKeysHash}`);
          console.log('');
          console.log('Note: Full registration requires a PXE client.');
          console.log('The account keys have been derived and verified.');
          console.log('Use `aztec wallet register` for full PXE integration.');
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  walletCmd
    .command('list')
    .description('List known accounts')
    .option('--local', 'List locally stored keys only (no network)')
    .action(async function(this: Command, options: { local?: boolean }) {
      const globalOpts = getGlobalOpts(this);
      try {
        if (options.local) {
          // List locally stored keys
          const storedKeys = await KeyStorage.listKeys();
          if (globalOpts.json) {
            console.log(JSON.stringify({ accounts: storedKeys, source: 'local' }, null, 2));
          } else {
            console.log('Local Stored Accounts');
            console.log('='.repeat(50));
            console.log('');
            if (storedKeys.length === 0) {
              console.log('No accounts stored locally.');
              console.log('Use `cazt key import` to add accounts.');
            } else {
              for (const key of storedKeys) {
                console.log(`Alias:   ${key.alias}`);
                console.log(`Address: ${key.address}`);
                console.log(`Type:    ${key.type}`);
                console.log('');
              }
            }
          }
          return;
        }

        // Network mode - query PXE for registered accounts
        // Note: The node client doesn't expose registered accounts
        // This would require a PXE client with getRegisteredAccounts()
        console.error('Error: Listing PXE accounts requires a PXE client.');
        console.error('');
        console.error('Use --local to list locally stored keys,');
        console.error('or use `aztec wallet list` for full PXE account listing.');
        process.exit(1);
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  walletCmd
    .command('balance')
    .description('Show token balances')
    .argument('<address>', 'Account address')
    .requiredOption('--token <contract>', 'Token contract address')
    .option('--private', 'Query private balance (default)')
    .option('--public', 'Query public balance')
    .action(async function(this: Command, address: string, options: { token: string; private?: boolean; public?: boolean }) {
      const globalOpts = getGlobalOpts(this);
      try {
        const { createAztecNodeClient, waitForNode } = await import('@aztec/aztec.js/node');
        const { AztecAddress } = await import('@aztec/aztec.js/addresses');

        const nodeUrl = resolveNodeUrl(globalOpts);
        const node = createAztecNodeClient(nodeUrl);
        await waitForNode(node);

        const ownerAddress = AztecAddress.fromString(address);
        const tokenAddress = AztecAddress.fromString(options.token);

        // For public balance, we can read from public storage
        // Slot 1 is typically the public balances map in token contracts
        if (options.public) {
          // Compute storage slot for public balance
          // public_balances is typically at slot 1, with mapping key = owner address
          const { deriveStorageSlotInMap } = await import('@aztec/stdlib/hash');
          const baseSlot = Fr.fromString('1');
          const balanceSlot = await deriveStorageSlotInMap(baseSlot, { toField: () => ownerAddress.toField() });

          const balance = await node.getPublicStorageAt('latest', tokenAddress, balanceSlot);

          const result = {
            address: ownerAddress.toString(),
            tokenContract: tokenAddress.toString(),
            balance: balance?.toString() || '0',
            type: 'public',
          };

          if (globalOpts.json) {
            console.log(JSON.stringify(result, null, 2));
          } else {
            console.log('Token Balance');
            console.log('='.repeat(50));
            console.log('');
            console.log(`Address:  ${result.address}`);
            console.log(`Token:    ${result.tokenContract}`);
            console.log(`Balance:  ${result.balance}`);
            console.log(`Type:     ${result.type}`);
          }
          return;
        }

        // Private balance requires PXE with note decryption
        console.error('Error: Private balance queries require a PXE client with note decryption.');
        console.error('');
        console.error('Use --public to query public balance via node,');
        console.error('or use the full Aztec SDK for private balance queries.');
        console.error('');
        console.error('Example: cazt --sandbox wallet balance <address> --token <token> --public');
        process.exit(1);
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  walletCmd
    .command('vanity')
    .description('Generate vanity address with prefix')
    .argument('<prefix>', 'Address prefix to match (hex, without 0x)')
    .option('--suffix <suffix>', 'Address suffix to match')
    .option('--type <type>', 'Account type: schnorr, ecdsa-k, ecdsa-r', 'schnorr')
    .option('--max-attempts <n>', 'Maximum attempts before giving up', '1000000')
    .action(async function(this: Command, prefix: string, options: { suffix?: string; type?: string; maxAttempts?: string }) {
      const globalOpts = getGlobalOpts(this);
      const { getSchnorrAccountContractAddress } = await import('@aztec/accounts/schnorr');
      const { Fr } = await import('@aztec/foundation/fields');

      // Normalize prefix (remove 0x if present)
      const normalizedPrefix = prefix.toLowerCase().replace(/^0x/, '');
      const normalizedSuffix = options.suffix?.toLowerCase().replace(/^0x/, '');
      const maxAttempts = parseInt(options.maxAttempts || '1000000', 10);

      if (options.type !== 'schnorr' && options.type !== undefined) {
        console.error(`Error: Only 'schnorr' account type is currently supported for vanity generation.`);
        process.exit(1);
      }

      console.error(`Searching for address starting with "0x${normalizedPrefix}"${normalizedSuffix ? ` and ending with "${normalizedSuffix}"` : ''}...`);
      console.error('This may take a while depending on the prefix length.');
      console.error('');

      let attempts = 0;
      const startTime = Date.now();

      while (attempts < maxAttempts) {
        attempts++;
        const secretKey = Fr.random();
        const address = await getSchnorrAccountContractAddress(secretKey, Fr.ZERO);
        const addrHex = address.toString().toLowerCase().slice(2); // Remove 0x

        const prefixMatch = addrHex.startsWith(normalizedPrefix);
        const suffixMatch = !normalizedSuffix || addrHex.endsWith(normalizedSuffix);

        if (prefixMatch && suffixMatch) {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

          if (globalOpts.json) {
            console.log(JSON.stringify({
              secretKey: secretKey.toString(),
              address: address.toString(),
              salt: Fr.ZERO.toString(),
              type: 'schnorr',
              attempts,
              timeSeconds: parseFloat(elapsed),
            }, null, 2));
          } else {
            console.log('Vanity Address Found!');
            console.log('='.repeat(50));
            console.log('');
            console.log(`Address:    ${address.toString()}`);
            console.log(`Secret Key: ${secretKey.toString()}`);
            console.log(`Salt:       ${Fr.ZERO.toString()}`);
            console.log(`Type:       schnorr`);
            console.log('');
            console.log(`Found after ${attempts.toLocaleString()} attempts in ${elapsed}s`);
            console.log('');
            console.log('WARNING: Store the secret key securely!');
          }
          return;
        }

        // Progress update every 10000 attempts
        if (attempts % 10000 === 0) {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
          const rate = Math.round(attempts / parseFloat(elapsed));
          console.error(`Checked ${attempts.toLocaleString()} addresses (${rate}/s)...`);
        }
      }

      console.error(`Error: Could not find matching address after ${maxAttempts.toLocaleString()} attempts.`);
      console.error('Try a shorter prefix or increase --max-attempts.');
      process.exit(1);
    });

  // Authwit subcommands
  const authwitCmd = walletCmd.command('authwit').description('Authorization witnesses');

  authwitCmd
    .command('create')
    .description('Create authwit for delegation')
    .argument('<messageHash>', 'Message hash (Fr) to sign')
    .requiredOption('--secret <secret>', 'Secret key to sign with')
    .action(async function(this: Command, messageHash: string, options: { secret: string }) {
      const globalOpts = getGlobalOpts(this);
      try {
        const { createPersistentPXE, getOrCreateAccount } = await import('../utils/pxe.js');

        const nodeUrl = resolveNodeUrl(globalOpts);

        // Create PXE context and account
        const pxeContext = await createPersistentPXE(nodeUrl);
        const accountManager = await getOrCreateAccount(pxeContext, options.secret);
        const wallet = pxeContext.wallet;

        // Parse message hash as Fr
        const messageHashFr = Fr.fromString(messageHash);

        // Create the auth witness
        const authWit = await wallet.createAuthWit(accountManager.address, messageHashFr);

        if (globalOpts.json) {
          console.log(JSON.stringify({
            witness: authWit.toString(),
            messageHash: messageHashFr.toString(),
            signer: accountManager.address.toString(),
          }, null, 2));
        } else {
          console.log('Authorization Witness Created');
          console.log(`  Witness:  ${authWit.toString()}`);
          console.log(`  Message:  ${messageHashFr.toString()}`);
          console.log(`  Signer:   ${accountManager.address.toString()}`);
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });
}

// =============================================================================
// CONTRACT Commands - Contract interaction
// =============================================================================

function registerContractCommands(program: Command): void {
  const contractCmd = program.command('contract').description('Contract interaction');

  contractCmd
    .command('view')
    .description('Call view function (no state change)')
    .argument('<address>', 'Contract address')
    .argument('<function>', 'Function name')
    .argument('[args...]', 'Function arguments')
    .option('--artifact <path>', 'Contract artifact for ABI')
    .option('--secret <key>', 'Secret key for account')
    .action(async function(this: Command, address: string, fn: string, args: string[], options: { artifact?: string; secret?: string }) {
      const globalOpts = getGlobalOpts(this);
      try {
        const { createPersistentPXE, getOrCreateAccount } = await import('../utils/pxe.js');
        const { ArtifactUtils } = await import('../utils/artifact.js');
        const { readFileSync } = await import('fs');
        const { Contract } = await import('@aztec/aztec.js/contracts');
        const { AztecAddress } = await import('@aztec/aztec.js/addresses');

        const nodeUrl = resolveNodeUrl(globalOpts);
        const contractAddress = AztecAddress.fromString(address);

        // Load artifact
        if (!options.artifact) {
          console.error('Error: --artifact is required for contract calls');
          process.exit(1);
        }
        const artifactPath = ArtifactUtils.resolveArtifact(options.artifact);
        const content = readFileSync(artifactPath, 'utf-8');
        const artifact = AbiUtils.loadContractArtifact(content);

        // Create PXE context
        const pxeContext = await createPersistentPXE(nodeUrl);

        // Get or create account
        const secretKey = options.secret || '0x0000000000000000000000000000000000000000000000000000000000000001';
        const accountManager = await getOrCreateAccount(pxeContext, secretKey);
        const wallet = pxeContext.wallet;

        // Register the contract
        await wallet.registerContract({ artifact, instance: { address: contractAddress } as any });

        // Get the contract interface
        const contract = await Contract.at(contractAddress, artifact, wallet);

        // Find the function
        const fnAbi = artifact.functions.find((f: any) => f.name === fn);
        if (!fnAbi) {
          console.error(`Error: Function '${fn}' not found in artifact`);
          console.error('Available functions: ' + artifact.functions.map((f: any) => f.name).join(', '));
          process.exit(1);
        }

        // Parse arguments
        const parsedArgs = args.map((arg, i) => {
          // Simple argument parsing - treat as hex/number/string
          if (arg.startsWith('0x')) {
            // Could be address or field
            if (arg.length === 66) {
              return Fr.fromString(arg);
            } else if (arg.length === 42) {
              return AztecAddress.fromString(arg);
            }
            return arg;
          }
          if (/^\d+$/.test(arg)) {
            return BigInt(arg);
          }
          return arg;
        });

        // Call the view function
        const result = await contract.methods[fn](...parsedArgs).simulate({ from: accountManager.address });

        if (globalOpts.json) {
          console.log(JSON.stringify({ result: result?.toString?.() ?? result }, null, 2));
        } else {
          console.log('Result:', result?.toString?.() ?? result);
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  contractCmd
    .command('send')
    .description('Send state-changing transaction')
    .argument('<address>', 'Contract address')
    .argument('<function>', 'Function name')
    .argument('[args...]', 'Function arguments')
    .option('--artifact <path>', 'Contract artifact for ABI')
    .option('--secret <key>', 'Secret key for account')
    .option('--wait', 'Wait for transaction to be mined', true)
    .action(async function(this: Command, address: string, fn: string, args: string[], options: { artifact?: string; secret?: string; wait?: boolean }) {
      const globalOpts = getGlobalOpts(this);
      try {
        const { createPersistentPXE, getOrCreateAccount } = await import('../utils/pxe.js');
        const { ArtifactUtils } = await import('../utils/artifact.js');
        const { readFileSync } = await import('fs');
        const { Contract } = await import('@aztec/aztec.js/contracts');
        const { AztecAddress } = await import('@aztec/aztec.js/addresses');

        const nodeUrl = resolveNodeUrl(globalOpts);
        const contractAddress = AztecAddress.fromString(address);

        // Load artifact
        if (!options.artifact) {
          console.error('Error: --artifact is required for contract calls');
          process.exit(1);
        }
        const artifactPath = ArtifactUtils.resolveArtifact(options.artifact);
        const content = readFileSync(artifactPath, 'utf-8');
        const artifact = AbiUtils.loadContractArtifact(content);

        // Create PXE context
        const pxeContext = await createPersistentPXE(nodeUrl);

        // Get or create account
        const secretKey = options.secret || '0x0000000000000000000000000000000000000000000000000000000000000001';
        const accountManager = await getOrCreateAccount(pxeContext, secretKey);
        const wallet = pxeContext.wallet;

        // Register the contract
        await wallet.registerContract({ artifact, instance: { address: contractAddress } as any });

        // Get the contract interface
        const contract = await Contract.at(contractAddress, artifact, wallet);

        // Find the function
        const fnAbi = artifact.functions.find((f: any) => f.name === fn);
        if (!fnAbi) {
          console.error(`Error: Function '${fn}' not found in artifact`);
          console.error('Available functions: ' + artifact.functions.map((f: any) => f.name).join(', '));
          process.exit(1);
        }

        // Parse arguments
        const parsedArgs = args.map((arg, i) => {
          if (arg.startsWith('0x')) {
            if (arg.length === 66) {
              return Fr.fromString(arg);
            } else if (arg.length === 42) {
              return AztecAddress.fromString(arg);
            }
            return arg;
          }
          if (/^\d+$/.test(arg)) {
            return BigInt(arg);
          }
          return arg;
        });

        // Send the transaction with sponsored fee
        console.log(`Sending transaction: ${fn}(${args.join(', ')})`);
        const txRequest = contract.methods[fn](...parsedArgs);
        const sentTx = txRequest.send({ from: accountManager.address, fee: { paymentMethod: pxeContext.paymentMethod } });

        if (options.wait !== false) {
          console.log('Waiting for transaction...');
          const receipt = await sentTx.wait();

          if (globalOpts.json) {
            console.log(JSON.stringify({
              txHash: receipt.txHash.toString(),
              blockNumber: receipt.blockNumber,
              status: receipt.status,
            }, null, 2));
          } else {
            console.log(`Transaction mined!`);
            console.log(`  Hash: ${receipt.txHash.toString()}`);
            console.log(`  Block: ${receipt.blockNumber}`);
            console.log(`  Status: ${receipt.status}`);
          }
        } else {
          const txHash = await sentTx.getTxHash();
          if (globalOpts.json) {
            console.log(JSON.stringify({ txHash: txHash.toString() }));
          } else {
            console.log(`Transaction submitted: ${txHash.toString()}`);
          }
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  contractCmd
    .command('simulate')
    .description('Simulate without sending')
    .argument('<address>', 'Contract address')
    .argument('<function>', 'Function name')
    .argument('[args...]', 'Function arguments')
    .option('--artifact <path>', 'Contract artifact for ABI')
    .option('--secret <key>', 'Secret key for account')
    .action(async function(this: Command, address: string, fn: string, args: string[], options: { artifact?: string; secret?: string }) {
      const globalOpts = getGlobalOpts(this);
      try {
        const { createPersistentPXE, getOrCreateAccount } = await import('../utils/pxe.js');
        const { ArtifactUtils } = await import('../utils/artifact.js');
        const { readFileSync } = await import('fs');
        const { Contract } = await import('@aztec/aztec.js/contracts');
        const { AztecAddress } = await import('@aztec/aztec.js/addresses');

        const nodeUrl = resolveNodeUrl(globalOpts);
        const contractAddress = AztecAddress.fromString(address);

        // Load artifact
        if (!options.artifact) {
          console.error('Error: --artifact is required for contract calls');
          process.exit(1);
        }
        const artifactPath = ArtifactUtils.resolveArtifact(options.artifact);
        const content = readFileSync(artifactPath, 'utf-8');
        const artifact = AbiUtils.loadContractArtifact(content);

        // Create PXE context
        const pxeContext = await createPersistentPXE(nodeUrl);

        // Get or create account
        const secretKey = options.secret || '0x0000000000000000000000000000000000000000000000000000000000000001';
        const accountManager = await getOrCreateAccount(pxeContext, secretKey);
        const wallet = pxeContext.wallet;

        // Register the contract
        await wallet.registerContract({ artifact, instance: { address: contractAddress } as any });

        // Get the contract interface
        const contract = await Contract.at(contractAddress, artifact, wallet);

        // Find the function
        const fnAbi = artifact.functions.find((f: any) => f.name === fn);
        if (!fnAbi) {
          console.error(`Error: Function '${fn}' not found in artifact`);
          console.error('Available functions: ' + artifact.functions.map((f: any) => f.name).join(', '));
          process.exit(1);
        }

        // Parse arguments
        const parsedArgs = args.map((arg, i) => {
          if (arg.startsWith('0x')) {
            if (arg.length === 66) {
              return Fr.fromString(arg);
            } else if (arg.length === 42) {
              return AztecAddress.fromString(arg);
            }
            return arg;
          }
          if (/^\d+$/.test(arg)) {
            return BigInt(arg);
          }
          return arg;
        });

        // Simulate the transaction
        console.log(`Simulating: ${fn}(${args.join(', ')})`);
        const result = await contract.methods[fn](...parsedArgs).simulate({ from: accountManager.address });

        if (globalOpts.json) {
          console.log(JSON.stringify({
            result: result?.toString?.() ?? result,
            functionName: fn,
            arguments: args,
          }, null, 2));
        } else {
          console.log('Simulation Result:', result?.toString?.() ?? result);
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  contractCmd
    .command('info')
    .description('Show contract instance details')
    .argument('<address>', 'Contract address')
    .action(async function(this: Command, address: string) {
      const globalOpts = getGlobalOpts(this);
      try {
        const { RpcClient } = await import('../utils/rpc.js');
        const nodeUrl = resolveNodeUrl(globalOpts);
        const rpcClient = new RpcClient({ rpcUrl: nodeUrl, adminUrl: nodeUrl, pretty: true });

        const result = await rpcClient.call('node_getContractInstance', [address]);

        if (!result) {
          console.error(`Error: Contract instance not found at ${address}`);
          process.exit(1);
        }

        if (globalOpts.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log('Contract Instance');
          console.log('='.repeat(40));
          console.log(`Address:         ${result.address ?? address}`);
          console.log(`Class ID:        ${result.contractClassId ?? 'N/A'}`);
          console.log(`Deployer:        ${result.deployer ?? 'N/A'}`);
          console.log(`Initialization:  ${result.initializationHash ?? 'N/A'}`);
          console.log(`Public Keys:     ${result.publicKeys ? 'Present' : 'N/A'}`);
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  contractCmd
    .command('class')
    .description('Show contract class details')
    .argument('<id>', 'Contract class ID')
    .action(async function(this: Command, id: string) {
      const globalOpts = getGlobalOpts(this);
      try {
        const { RpcClient } = await import('../utils/rpc.js');
        const nodeUrl = resolveNodeUrl(globalOpts);
        const rpcClient = new RpcClient({ rpcUrl: nodeUrl, adminUrl: nodeUrl, pretty: true });

        const result = await rpcClient.call('node_getContractClass', [id]);

        if (!result) {
          console.error(`Error: Contract class not found: ${id}`);
          process.exit(1);
        }

        if (globalOpts.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log('Contract Class');
          console.log('='.repeat(40));
          console.log(`Class ID:        ${id}`);
          console.log(`Artifact Hash:   ${result.artifactHash ?? 'N/A'}`);
          console.log(`Functions:       ${result.publicFunctions?.length ?? 0} public, ${result.privateFunctions?.length ?? 0} private`);
          console.log(`Version:         ${result.version ?? 'N/A'}`);
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  contractCmd
    .command('abi')
    .description('Pretty-print ABI')
    .argument('<artifact>', 'Contract artifact path or shortcut')
    .action(async function(this: Command, artifact: string) {
      const globalOpts = getGlobalOpts(this);
      try {
        const { parseJsonOrFile } = await import('../utils/rpc.js');

        const abi = parseJsonOrFile(artifact);

        if (globalOpts.json) {
          console.log(JSON.stringify(abi, null, 2));
        } else {
          console.log('Contract ABI');
          console.log('='.repeat(40));
          console.log(`Name:      ${abi.name ?? 'Unknown'}`);
          console.log(`Functions: ${abi.functions?.length ?? 0}`);
          console.log(`Events:    ${abi.events?.length ?? 0}`);
          console.log('');

          if (abi.functions && abi.functions.length > 0) {
            console.log('Functions:');
            for (const fn of abi.functions) {
              const params = fn.parameters?.map((p: any) => `${p.name}: ${p.type?.kind ?? 'field'}`).join(', ') || '';
              const returnType = fn.returnTypes?.length > 0 ? ` -> ${fn.returnTypes.map((r: any) => r.kind || 'field').join(', ')}` : '';
              const visibility = fn.functionType || 'public';
              console.log(`  [${visibility}] ${fn.name}(${params})${returnType}`);
            }
          }

          if (abi.events && abi.events.length > 0) {
            console.log('');
            console.log('Events:');
            for (const event of abi.events) {
              console.log(`  ${event.name}`);
            }
          }
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  contractCmd
    .command('storage')
    .description('Read public storage')
    .argument('<address>', 'Contract address')
    .argument('[slot]', 'Storage slot (optional, dumps all if omitted)')
    .option('--artifact <path>', 'Contract artifact for slot names')
    .action(async function(this: Command, address: string, slot?: string, options?: { artifact?: string }) {
      const globalOpts = getGlobalOpts(this);
      try {
        const { RpcClient } = await import('../utils/rpc.js');
        const nodeUrl = resolveNodeUrl(globalOpts);
        const rpcClient = new RpcClient({ rpcUrl: nodeUrl, adminUrl: nodeUrl, pretty: true });

        if (slot) {
          // Query single slot
          const result = await rpcClient.call('node_getPublicStorageAt', ['latest', address, slot]);

          if (globalOpts.json) {
            console.log(JSON.stringify({
              address,
              slot,
              value: result?.toString() ?? null,
            }, null, 2));
          } else {
            console.log(`Storage[${slot}] = ${result?.toString() ?? '(empty)'}`);
          }
        } else {
          // Without specific slot, just show guidance
          console.log('Public Storage Query');
          console.log('='.repeat(40));
          console.log(`Contract: ${address}`);
          console.log('');
          console.log('Provide a specific slot to query, e.g.:');
          console.log(`  cazt contract storage ${address} 0x01`);
          console.log('');
          console.log('Common slots for token contracts:');
          console.log('  0x01 - Total supply');
          console.log('  0x02 - Admin address');
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  contractCmd
    .command('events')
    .description('Query historical events')
    .argument('<address>', 'Contract address')
    .option('--from <block>', 'From block', '0')
    .option('--to <block>', 'To block')
    .option('--event <name>', 'Event name filter')
    .option('--artifact <path>', 'Contract artifact for decoding')
    .action(async function(this: Command, address: string, options: { from: string; to?: string; event?: string; artifact?: string }) {
      const globalOpts = getGlobalOpts(this);
      try {
        const { RpcClient } = await import('../utils/rpc.js');
        const nodeUrl = resolveNodeUrl(globalOpts);
        const rpcClient = new RpcClient({ rpcUrl: nodeUrl, adminUrl: nodeUrl, pretty: true });

        const filter: any = {
          contractAddress: address,
          fromBlock: parseInt(options.from, 10),
        };
        if (options.to) {
          filter.toBlock = parseInt(options.to, 10);
        }

        const result = await rpcClient.call('node_getPublicLogs', [filter]);
        const logs = result?.logs || [];

        if (globalOpts.json) {
          console.log(JSON.stringify({
            address,
            fromBlock: filter.fromBlock,
            toBlock: filter.toBlock ?? 'latest',
            count: logs.length,
            logs,
          }, null, 2));
        } else {
          console.log('Contract Events');
          console.log('='.repeat(40));
          console.log(`Contract:    ${address}`);
          console.log(`From Block:  ${filter.fromBlock}`);
          console.log(`To Block:    ${filter.toBlock ?? 'latest'}`);
          console.log(`Found:       ${logs.length} events`);
          console.log('');

          for (let i = 0; i < Math.min(logs.length, 20); i++) {
            const log = logs[i];
            console.log(`[${i + 1}] Block ${log.id?.blockNumber ?? '?'}`);
            console.log(`    TX: ${log.id?.txHash ?? 'unknown'}`);
            console.log(`    Fields: ${log.fields?.length ?? 0}`);
          }

          if (logs.length > 20) {
            console.log(`... and ${logs.length - 20} more`);
          }
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  contractCmd
    .command('logs')
    .description('Query contract logs')
    .argument('<address>', 'Contract address')
    .option('--from <block>', 'From block', '0')
    .option('--to <block>', 'To block')
    .option('--artifact <path>', 'Contract artifact for decoding')
    .action(async function(this: Command, address: string, options: { from: string; to?: string; artifact?: string }) {
      const globalOpts = getGlobalOpts(this);
      try {
        const { RpcClient } = await import('../utils/rpc.js');
        const nodeUrl = resolveNodeUrl(globalOpts);
        const rpcClient = new RpcClient({ rpcUrl: nodeUrl, adminUrl: nodeUrl, pretty: true });

        const filter: any = {
          contractAddress: address,
          fromBlock: parseInt(options.from, 10),
        };
        if (options.to) {
          filter.toBlock = parseInt(options.to, 10);
        }

        const result = await rpcClient.call('node_getPublicLogs', [filter]);
        const logs = result?.logs || [];

        if (globalOpts.json) {
          console.log(JSON.stringify({
            address,
            fromBlock: filter.fromBlock,
            toBlock: filter.toBlock ?? 'latest',
            count: logs.length,
            logs,
          }, null, 2));
        } else {
          console.log('Contract Logs');
          console.log('='.repeat(40));
          console.log(`Contract:    ${address}`);
          console.log(`From Block:  ${filter.fromBlock}`);
          console.log(`To Block:    ${filter.toBlock ?? 'latest'}`);
          console.log(`Found:       ${logs.length} logs`);
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  contractCmd
    .command('deploy')
    .description('Deploy a contract')
    .argument('<artifact>', 'Contract artifact path or shortcut (aztec:Token, standards:Token)')
    .option('--args <args>', 'Constructor arguments (JSON array)')
    .option('--salt <salt>', 'Contract address salt (hex or "random")')
    .option('--from <secret>', 'Deployer secret key')
    .option('--account-salt <salt>', 'Account salt for deployer (hex or "random")')
    .option('--constructor <name>', 'Constructor function name (default: constructor)')
    .option('--no-wait', 'Do not wait for deployment to complete')
    .option('--debug', 'Enable debug output')
    .action(async function(this: Command, artifact: string, options: {
      args?: string;
      salt?: string;
      from?: string;
      accountSalt?: string;
      constructor?: string;
      wait?: boolean;
      debug?: boolean;
    }) {
      const globalOpts = getGlobalOpts(this);
      try {
        const { DeploymentUtils } = await import('../utils/deployment.js');
        const nodeUrl = resolveNodeUrl(globalOpts);

        // Build deployment params
        const deployParams: any = {
          nodeUrl,
          artifact,
          debug: options.debug,
          wait: options.wait !== false,
        };

        if (options.from) {
          deployParams.secretKey = options.from;
        }

        if (options.args) {
          try {
            deployParams.constructorArgs = JSON.parse(options.args);
          } catch {
            // Try comma-separated if not valid JSON
            deployParams.constructorArgs = options.args.split(',').map((s: string) => s.trim());
          }
        }

        if (options.salt) {
          deployParams.contractAddressSalt = options.salt;
        }

        if (options.accountSalt) {
          deployParams.salt = options.accountSalt;
        }

        if (options.constructor) {
          deployParams.constructorName = options.constructor;
        }

        const result = await DeploymentUtils.deployContract(JSON.stringify(deployParams));

        if (globalOpts.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log('Contract Deployed');
          console.log('='.repeat(40));
          console.log(`Address:       ${result.contract?.address ?? 'N/A'}`);
          console.log(`TX Hash:       ${result.txHash}`);
          console.log(`Class ID:      ${result.contract?.instance?.contractClassId ?? 'N/A'}`);
          if (result.receipt) {
            console.log(`Block:         ${result.receipt.blockNumber}`);
            console.log(`Status:        ${result.receipt.status}`);
          }
          if (result.account) {
            console.log('');
            console.log('Deployer Account:');
            console.log(`  Address:     ${result.account.address}`);
          }
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  // Artifact subcommands
  const artifactCmd = contractCmd.command('artifact').description('Artifact operations');

  artifactCmd
    .command('info')
    .description('Show artifact info')
    .argument('<path>', 'Artifact path or shortcut (aztec:Token, standards:Token)')
    .action(async function(this: Command, path: string) {
      const globalOpts = getGlobalOpts(this);
      try {
        const { parseJsonOrFile } = await import('../utils/rpc.js');

        const artifact = parseJsonOrFile(path);

        if (globalOpts.json) {
          console.log(JSON.stringify({
            name: artifact.name,
            functions: artifact.functions?.length ?? 0,
            events: artifact.events?.length ?? 0,
            notes: artifact.notes?.length ?? 0,
          }, null, 2));
        } else {
          console.log('Artifact Info');
          console.log('='.repeat(40));
          console.log(`Name:       ${artifact.name ?? 'Unknown'}`);
          console.log(`Functions:  ${artifact.functions?.length ?? 0}`);
          console.log(`Events:     ${artifact.events?.length ?? 0}`);
          console.log(`Notes:      ${artifact.notes?.length ?? 0}`);

          if (artifact.functions && artifact.functions.length > 0) {
            console.log('');
            console.log('Functions:');
            for (const fn of artifact.functions.slice(0, 10)) {
              console.log(`  - ${fn.name} (${fn.functionType || 'public'})`);
            }
            if (artifact.functions.length > 10) {
              console.log(`  ... and ${artifact.functions.length - 10} more`);
            }
          }
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  // Registry subcommands (devnet.aztec-registry.xyz)
  const registryCmd = contractCmd.command('registry').description('Artifact registry (devnet.aztec-registry.xyz)');

  registryCmd
    .command('list')
    .description('List all artifacts in registry')
    .action(async function(this: Command) {
      const globalOpts = getGlobalOpts(this);
      try {
        const fetch = (await import('node-fetch')).default;
        const response = await fetch('https://devnet.aztec-registry.xyz/api/v1/artifacts');

        if (!response.ok) {
          throw new Error(`Registry returned ${response.status}: ${response.statusText}`);
        }

        const data = await response.json() as any;
        const artifacts = data.artifacts || data || [];

        if (globalOpts.json) {
          console.log(JSON.stringify(artifacts, null, 2));
        } else {
          console.log('Artifact Registry');
          console.log('='.repeat(40));
          console.log(`Found: ${artifacts.length} artifacts`);
          console.log('');

          for (const artifact of artifacts.slice(0, 20)) {
            console.log(`  ${artifact.name || artifact.contractClassId || 'Unknown'}`);
            if (artifact.contractClassId) {
              console.log(`    Class ID: ${artifact.contractClassId.slice(0, 20)}...`);
            }
          }

          if (artifacts.length > 20) {
            console.log(`... and ${artifacts.length - 20} more`);
          }
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  registryCmd
    .command('get')
    .description('Download artifact by class ID')
    .argument('<classId>', 'Contract class ID')
    .option('-o, --output <path>', 'Output file path')
    .action(async function(this: Command, classId: string, options: { output?: string }) {
      const globalOpts = getGlobalOpts(this);
      try {
        const fetch = (await import('node-fetch')).default;
        const { writeFileSync } = await import('fs');

        const response = await fetch(`https://devnet.aztec-registry.xyz/api/v1/artifacts/${classId}`);

        if (!response.ok) {
          throw new Error(`Registry returned ${response.status}: ${response.statusText}`);
        }

        const artifact = await response.json() as any;

        if (options.output) {
          writeFileSync(options.output, JSON.stringify(artifact, null, 2));
          console.log(`Artifact saved to ${options.output}`);
        } else if (globalOpts.json) {
          console.log(JSON.stringify(artifact, null, 2));
        } else {
          console.log('Artifact Retrieved');
          console.log('='.repeat(40));
          console.log(`Name:      ${artifact.name || 'Unknown'}`);
          console.log(`Class ID:  ${classId}`);
          console.log(`Functions: ${artifact.functions?.length ?? 0}`);
          console.log('');
          console.log('Use -o <path> to save to file');
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  registryCmd
    .command('upload')
    .description('Upload artifact to registry')
    .argument('<artifact>', 'Artifact JSON file path or shortcut (e.g., aztec:Token)')
    .option('--api-key <key>', 'API key for authentication (or set AZTEC_REGISTRY_API_KEY env var)')
    .action(async function(this: Command, artifact: string, options: { apiKey?: string }) {
      const globalOpts = getGlobalOpts(this);
      try {
        const { ArtifactUtils } = await import('../utils/artifact.js');
        const { readFileSync } = await import('fs');
        const fetch = (await import('node-fetch')).default;

        // Resolve API key
        const apiKey = options.apiKey || process.env.AZTEC_REGISTRY_API_KEY;
        if (!apiKey) {
          console.error('Error: API key required for upload');
          console.error('Set AZTEC_REGISTRY_API_KEY environment variable or use --api-key option');
          process.exit(1);
        }

        // Resolve and load artifact
        const artifactPath = ArtifactUtils.resolveArtifact(artifact);
        const content = readFileSync(artifactPath, 'utf-8');
        const artifactJson = JSON.parse(content);

        // Upload to registry
        const response = await fetch('https://devnet.aztec-registry.xyz/api/v1/artifacts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: content,
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Registry returned ${response.status}: ${errorText}`);
        }

        const result = await response.json() as any;

        if (globalOpts.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log('Artifact uploaded successfully!');
          console.log(`  Name: ${artifactJson.name || 'unknown'}`);
          if (result.classId) {
            console.log(`  Class ID: ${result.classId}`);
          }
          if (result.id) {
            console.log(`  Registry ID: ${result.id}`);
          }
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  registryCmd
    .command('search')
    .description('Search artifacts by name')
    .argument('<query>', 'Search query')
    .action(async function(this: Command, query: string) {
      const globalOpts = getGlobalOpts(this);
      try {
        const fetch = (await import('node-fetch')).default;

        const response = await fetch(`https://devnet.aztec-registry.xyz/api/v1/artifacts?search=${encodeURIComponent(query)}`);

        if (!response.ok) {
          throw new Error(`Registry returned ${response.status}: ${response.statusText}`);
        }

        const data = await response.json() as any;
        const artifacts = data.artifacts || data || [];

        if (globalOpts.json) {
          console.log(JSON.stringify(artifacts, null, 2));
        } else {
          console.log(`Search Results for "${query}"`);
          console.log('='.repeat(40));
          console.log(`Found: ${artifacts.length} matches`);
          console.log('');

          for (const artifact of artifacts.slice(0, 20)) {
            console.log(`  ${artifact.name || 'Unknown'}`);
            if (artifact.contractClassId) {
              console.log(`    Class ID: ${artifact.contractClassId}`);
            }
          }
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

}

// =============================================================================
// MONITOR Commands - Real-time monitoring
// =============================================================================

function registerMonitorCommands(program: Command): void {
  const monitorCmd = program.command('monitor').description('Real-time monitoring');

  monitorCmd
    .command('blocks')
    .description('Stream new blocks')
    .option('--proven', 'Only show proven blocks')
    .option('--interval <ms>', 'Polling interval in ms', '2000')
    .action(async function(this: Command, options: { proven?: boolean; interval: string }) {
      const globalOpts = getGlobalOpts(this);
      try {
        const { RpcClient } = await import('../utils/rpc.js');
        const nodeUrl = resolveNodeUrl(globalOpts);
        const rpcClient = new RpcClient({ rpcUrl: nodeUrl, adminUrl: nodeUrl, pretty: true });

        console.log(`Monitoring ${options.proven ? 'proven ' : ''}blocks (Ctrl+C to stop)...`);
        console.log('');

        const pollInterval = parseInt(options.interval, 10);
        let lastBlock = options.proven
          ? await rpcClient.call('node_getProvenBlockNumber', [])
          : await rpcClient.call('node_getBlockNumber', []);

        const poll = async () => {
          const currentBlock = options.proven
            ? await rpcClient.call('node_getProvenBlockNumber', [])
            : await rpcClient.call('node_getBlockNumber', []);

          if (currentBlock > lastBlock) {
            for (let i = lastBlock + 1; i <= currentBlock; i++) {
              const block = await rpcClient.call('node_getBlock', [i, false]);
              const txCount = block?.body?.txEffects?.length ?? 0;
              const timestamp = block?.header?.globalVariables?.timestamp ?? 'N/A';

              if (globalOpts.json) {
                console.log(JSON.stringify({
                  blockNumber: i,
                  txCount,
                  timestamp,
                  proven: options.proven ?? false,
                }));
              } else {
                console.log(`Block ${i}: ${txCount} txs`);
              }
            }
            lastBlock = currentBlock;
          }
        };

        // Initial poll
        await poll();

        // Set up interval
        const interval = setInterval(poll, pollInterval);

        // Handle Ctrl+C
        process.on('SIGINT', () => {
          clearInterval(interval);
          console.log('\nStopped monitoring');
          process.exit(0);
        });
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  monitorCmd
    .command('nullifiers')
    .description('Stream nullifier insertions')
    .option('--contract <address>', 'Filter by contract')
    .action(async function(this: Command, options: { contract?: string }) {
      const globalOpts = getGlobalOpts(this);
      // Nullifier streaming requires node subscription or PXE integration
      console.error('Error: Real-time nullifier monitoring requires node subscription support (not yet implemented).');
      console.error('Hint: Use query nullifiers <hash> to check specific nullifiers.');
      process.exit(1);
    });

  monitorCmd
    .command('notes')
    .description('Watch note creation (requires PXE)')
    .argument('<contract>', 'Contract address')
    .option('--slot <slot>', 'Storage slot filter')
    .option('--artifact <path>', 'Contract artifact')
    .option('--secret <key>', 'Secret key for account')
    .option('--interval <ms>', 'Polling interval in ms', '5000')
    .action(async function(this: Command, contract: string, options: { slot?: string; artifact?: string; secret?: string; interval: string }) {
      const globalOpts = getGlobalOpts(this);
      try {
        const { NoteUtils } = await import('../utils/note.js');
        const { ArtifactUtils } = await import('../utils/artifact.js');
        const { readFileSync } = await import('fs');

        const nodeUrl = resolveNodeUrl(globalOpts);
        const pollInterval = parseInt(options.interval, 10);

        // Build params for note queries
        const params: any = {
          nodeUrl,
          contractAddress: contract,
          status: 'ACTIVE',
        };

        if (options.artifact) {
          const artifactPath = ArtifactUtils.resolveArtifact(options.artifact);
          const content = readFileSync(artifactPath, 'utf-8');
          params.artifact = JSON.parse(content);
        }

        if (options.slot) {
          if (options.slot.startsWith('0x')) {
            params.storageSlot = options.slot;
          } else {
            params.storageSlotName = options.slot;
          }
        }

        if (options.secret) {
          params.secretKey = options.secret;
        }

        console.log(`Monitoring notes for ${contract.slice(0, 10)}... (Ctrl+C to stop)`);
        console.log('');

        let previousNoteCount = 0;

        const poll = async () => {
          try {
            const result = await NoteUtils.fetchNotes(JSON.stringify(params));
            const notes = result.notes || [];

            if (notes.length !== previousNoteCount) {
              if (globalOpts.json) {
                console.log(JSON.stringify({ timestamp: new Date().toISOString(), notesCount: notes.length, newNotes: notes.length - previousNoteCount }));
              } else {
                console.log(`[${new Date().toISOString()}] Notes: ${notes.length} (${notes.length > previousNoteCount ? '+' : ''}${notes.length - previousNoteCount})`);
              }
              previousNoteCount = notes.length;
            }
          } catch {
            // Silently continue on errors
          }
        };

        await poll();
        const interval = setInterval(poll, pollInterval);

        process.on('SIGINT', () => {
          clearInterval(interval);
          console.log('\nStopped monitoring');
          process.exit(0);
        });
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  monitorCmd
    .command('address')
    .description('Watch all activity for address')
    .argument('<address>', 'Address to monitor')
    .option('--interval <ms>', 'Polling interval in ms', '2000')
    .action(async function(this: Command, address: string, options: { interval: string }) {
      const globalOpts = getGlobalOpts(this);
      try {
        const { RpcClient } = await import('../utils/rpc.js');
        const nodeUrl = resolveNodeUrl(globalOpts);
        const rpcClient = new RpcClient({ rpcUrl: nodeUrl, adminUrl: nodeUrl, pretty: true });

        console.log(`Monitoring address ${address.slice(0, 10)}... (Ctrl+C to stop)`);
        console.log('');

        const pollInterval = parseInt(options.interval, 10);
        let lastBlock = await rpcClient.call('node_getBlockNumber', []);

        const poll = async () => {
          const currentBlock = await rpcClient.call('node_getBlockNumber', []);

          if (currentBlock > lastBlock) {
            // Query logs for address in new blocks
            const filter = {
              contractAddress: address,
              fromBlock: lastBlock + 1,
              toBlock: currentBlock,
            };

            const result = await rpcClient.call('node_getPublicLogs', [filter]);
            const logs = result?.logs || [];

            for (const log of logs) {
              if (globalOpts.json) {
                console.log(JSON.stringify(log));
              } else {
                console.log(`Block ${log.id?.blockNumber ?? '?'}: Log with ${log.fields?.length ?? 0} fields`);
              }
            }

            lastBlock = currentBlock;
          }
        };

        // Initial poll
        await poll();

        // Set up interval
        const interval = setInterval(poll, pollInterval);

        // Handle Ctrl+C
        process.on('SIGINT', () => {
          clearInterval(interval);
          console.log('\nStopped monitoring');
          process.exit(0);
        });
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  monitorCmd
    .command('messages')
    .description('Watch L1<->L2 messages')
    .option('--direction <dir>', 'l1-to-l2, l2-to-l1, or all', 'all')
    .option('--l1-rpc-url <url>', 'L1 RPC URL')
    .option('--interval <ms>', 'Polling interval in ms', '5000')
    .action(async function(this: Command, options: { direction: string; l1RpcUrl?: string; interval: string }) {
      const globalOpts = getGlobalOpts(this);
      try {
        const { RpcClient } = await import('../utils/rpc.js');
        const { getPendingL1ToL2Messages, getL2ToL1Messages } = await import('../utils/l1.js');

        const nodeUrl = resolveNodeUrl(globalOpts);
        const rpcClient = new RpcClient({ rpcUrl: nodeUrl, adminUrl: nodeUrl, pretty: true });
        const pollInterval = parseInt(options.interval, 10);

        // Get L1 addresses from node
        const l1Addresses = await rpcClient.call('node_getL1ContractAddresses', []);
        if (!l1Addresses?.inboxAddress) {
          throw new Error('Could not get L1 contract addresses from node');
        }

        const l1RpcUrl = options.l1RpcUrl || (globalOpts.sandbox ? 'http://localhost:8545' : undefined);
        if (!l1RpcUrl) {
          throw new Error('L1 RPC URL required. Use --l1-rpc-url or --sandbox for localhost:8545');
        }

        const ctx = {
          l1RpcUrl,
          l1Addresses: {
            rollupAddress: l1Addresses.rollupAddress,
            inboxAddress: l1Addresses.inboxAddress,
            outboxAddress: l1Addresses.outboxAddress,
            registryAddress: l1Addresses.registryAddress,
          },
        };

        console.log(`Monitoring cross-chain messages (${options.direction}) (Ctrl+C to stop)`);
        console.log('');

        let lastL1ToL2Count = 0;
        let lastL2ToL1Count = 0;

        const poll = async () => {
          try {
            if (options.direction === 'all' || options.direction === 'l1-to-l2') {
              const l1ToL2 = await getPendingL1ToL2Messages(ctx, {});
              if (l1ToL2.length !== lastL1ToL2Count) {
                if (globalOpts.json) {
                  console.log(JSON.stringify({ direction: 'l1-to-l2', count: l1ToL2.length, delta: l1ToL2.length - lastL1ToL2Count, timestamp: new Date().toISOString() }));
                } else {
                  console.log(`[${new Date().toISOString()}] L1→L2: ${l1ToL2.length} messages (${l1ToL2.length > lastL1ToL2Count ? '+' : ''}${l1ToL2.length - lastL1ToL2Count})`);
                }
                lastL1ToL2Count = l1ToL2.length;
              }
            }

            if (options.direction === 'all' || options.direction === 'l2-to-l1') {
              const l2ToL1 = await getL2ToL1Messages(ctx, {});
              if (l2ToL1.length !== lastL2ToL1Count) {
                if (globalOpts.json) {
                  console.log(JSON.stringify({ direction: 'l2-to-l1', count: l2ToL1.length, delta: l2ToL1.length - lastL2ToL1Count, timestamp: new Date().toISOString() }));
                } else {
                  console.log(`[${new Date().toISOString()}] L2→L1: ${l2ToL1.length} message roots (${l2ToL1.length > lastL2ToL1Count ? '+' : ''}${l2ToL1.length - lastL2ToL1Count})`);
                }
                lastL2ToL1Count = l2ToL1.length;
              }
            }
          } catch {
            // Silently continue on errors
          }
        };

        await poll();
        const interval = setInterval(poll, pollInterval);

        process.on('SIGINT', () => {
          clearInterval(interval);
          console.log('\nStopped monitoring');
          process.exit(0);
        });
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  monitorCmd
    .command('events')
    .description('Watch contract events')
    .argument('<contract>', 'Contract address')
    .option('--event <name>', 'Event name filter')
    .option('--artifact <path>', 'Contract artifact for decoding')
    .option('--interval <ms>', 'Polling interval in ms', '2000')
    .action(async function(this: Command, contract: string, options: { event?: string; artifact?: string; interval: string }) {
      const globalOpts = getGlobalOpts(this);
      try {
        const { RpcClient } = await import('../utils/rpc.js');
        const nodeUrl = resolveNodeUrl(globalOpts);
        const rpcClient = new RpcClient({ rpcUrl: nodeUrl, adminUrl: nodeUrl, pretty: true });

        console.log(`Monitoring events for ${contract.slice(0, 10)}... (Ctrl+C to stop)`);
        console.log('');

        const pollInterval = parseInt(options.interval, 10);
        let lastBlock = await rpcClient.call('node_getBlockNumber', []);

        const poll = async () => {
          const currentBlock = await rpcClient.call('node_getBlockNumber', []);

          if (currentBlock > lastBlock) {
            const filter = {
              contractAddress: contract,
              fromBlock: lastBlock + 1,
              toBlock: currentBlock,
            };

            const result = await rpcClient.call('node_getPublicLogs', [filter]);
            const logs = result?.logs || [];

            for (const log of logs) {
              if (globalOpts.json) {
                console.log(JSON.stringify(log));
              } else {
                console.log(`Block ${log.id?.blockNumber ?? '?'}: Event with ${log.fields?.length ?? 0} fields`);
              }
            }

            lastBlock = currentBlock;
          }
        };

        // Initial poll
        await poll();

        // Set up interval
        const interval = setInterval(poll, pollInterval);

        // Handle Ctrl+C
        process.on('SIGINT', () => {
          clearInterval(interval);
          console.log('\nStopped monitoring');
          process.exit(0);
        });
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  monitorCmd
    .command('logs')
    .description('Stream public logs')
    .option('--contract <address>', 'Filter by contract')
    .option('--interval <ms>', 'Polling interval in ms', '2000')
    .action(async function(this: Command, options: { contract?: string; interval: string }) {
      const globalOpts = getGlobalOpts(this);
      try {
        const { RpcClient } = await import('../utils/rpc.js');
        const nodeUrl = resolveNodeUrl(globalOpts);
        const rpcClient = new RpcClient({ rpcUrl: nodeUrl, adminUrl: nodeUrl, pretty: true });

        console.log('Monitoring public logs (Ctrl+C to stop)...');
        if (options.contract) {
          console.log(`Filtered by contract: ${options.contract}`);
        }
        console.log('');

        const pollInterval = parseInt(options.interval, 10);
        let lastBlock = await rpcClient.call('node_getBlockNumber', []);

        const poll = async () => {
          const currentBlock = await rpcClient.call('node_getBlockNumber', []);

          if (currentBlock > lastBlock) {
            const filter: any = {
              fromBlock: lastBlock + 1,
              toBlock: currentBlock,
            };

            if (options.contract) {
              filter.contractAddress = options.contract;
            }

            const result = await rpcClient.call('node_getPublicLogs', [filter]);
            const logs = result?.logs || [];

            for (const log of logs) {
              if (globalOpts.json) {
                console.log(JSON.stringify(log));
              } else {
                const addr = log.contractAddress?.slice(0, 10) ?? '?';
                console.log(`Block ${log.id?.blockNumber ?? '?'} - Contract ${addr}...: ${log.fields?.length ?? 0} fields`);
              }
            }

            lastBlock = currentBlock;
          }
        };

        // Initial poll
        await poll();

        // Set up interval
        const interval = setInterval(poll, pollInterval);

        // Handle Ctrl+C
        process.on('SIGINT', () => {
          clearInterval(interval);
          console.log('\nStopped monitoring');
          process.exit(0);
        });
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  monitorCmd
    .command('pending')
    .description('Watch pending transaction pool')
    .option('--from <address>', 'Filter by sender')
    .option('--interval <ms>', 'Polling interval in ms', '2000')
    .action(async function(this: Command, options: { from?: string; interval: string }) {
      const globalOpts = getGlobalOpts(this);
      try {
        const { RpcClient } = await import('../utils/rpc.js');

        const nodeUrl = resolveNodeUrl(globalOpts);
        const rpcClient = new RpcClient({ rpcUrl: nodeUrl, adminUrl: nodeUrl, pretty: true });
        const pollInterval = parseInt(options.interval, 10);

        console.log('Monitoring pending transactions (Ctrl+C to stop)');
        console.log('');

        let lastPendingCount = 0;
        let seenTxHashes = new Set<string>();

        const poll = async () => {
          try {
            // Try to get pending txs - may not be supported by all nodes
            const result = await rpcClient.call('node_getPendingTxs', []);
            const pendingTxs = result || [];

            // Filter by sender if specified
            const filteredTxs = options.from
              ? pendingTxs.filter((tx: any) => tx.origin?.toLowerCase() === options.from?.toLowerCase())
              : pendingTxs;

            // Find new transactions
            const newTxs = filteredTxs.filter((tx: any) => {
              const hash = tx.txHash || tx.hash;
              if (hash && !seenTxHashes.has(hash)) {
                seenTxHashes.add(hash);
                return true;
              }
              return false;
            });

            if (newTxs.length > 0) {
              for (const tx of newTxs) {
                const hash = tx.txHash || tx.hash || 'unknown';
                if (globalOpts.json) {
                  console.log(JSON.stringify({
                    txHash: hash,
                    origin: tx.origin,
                    timestamp: new Date().toISOString(),
                  }));
                } else {
                  console.log(`[${new Date().toISOString()}] New pending: ${hash.slice(0, 18)}...`);
                }
              }
            }

            if (filteredTxs.length !== lastPendingCount) {
              if (!globalOpts.json) {
                console.log(`[${new Date().toISOString()}] Pending pool: ${filteredTxs.length} txs`);
              }
              lastPendingCount = filteredTxs.length;
            }
          } catch (error: any) {
            // If method not supported, show message once
            if (error.message?.includes('not found') || error.message?.includes('not supported')) {
              console.error('Note: node_getPendingTxs not supported by this node');
              console.error('Try monitoring new blocks instead: cazt monitor blocks');
              process.exit(1);
            }
          }
        };

        await poll();
        const interval = setInterval(poll, pollInterval);

        process.on('SIGINT', () => {
          clearInterval(interval);
          console.log('\nStopped monitoring');
          process.exit(0);
        });
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });
}

// =============================================================================
// QUERY Commands - State queries
// =============================================================================

function registerQueryCommands(program: Command): void {
  const queryCmd = program.command('query').description('State queries');

  queryCmd
    .command('public')
    .description('Read public storage value')
    .argument('<contract>', 'Contract address')
    .argument('<slot>', 'Storage slot')
    .option('--block <number>', 'Block number (default: latest)')
    .action(async function(this: Command, contract: string, slot: string, options: { block?: string }) {
      const globalOpts = getGlobalOpts(this);
      try {
        const { RpcClient } = await import('../utils/rpc.js');
        const nodeUrl = resolveNodeUrl(globalOpts);
        const rpcClient = new RpcClient({ rpcUrl: nodeUrl, adminUrl: nodeUrl, pretty: true });

        const blockNumber = options.block || 'latest';
        const result = await rpcClient.call('node_getPublicStorageAt', [blockNumber, contract, slot]);

        if (globalOpts.json) {
          console.log(JSON.stringify({
            contract,
            slot,
            blockNumber,
            value: result?.toString() ?? null,
          }, null, 2));
        } else {
          console.log('Public Storage Query');
          console.log('='.repeat(40));
          console.log(`Contract:    ${contract}`);
          console.log(`Slot:        ${slot}`);
          console.log(`Block:       ${blockNumber}`);
          console.log(`Value:       ${result?.toString() ?? '(empty)'}`);
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  queryCmd
    .command('notes')
    .description('Query notes for address (requires PXE)')
    .argument('<address>', 'Owner address')
    .option('--contract <address>', 'Filter by contract')
    .option('--artifact <path>', 'Contract artifact (required for note decoding)')
    .option('--secret <key>', 'Secret key for account')
    .option('--slot <slot>', 'Storage slot (name or hex)')
    .option('--status <status>', 'active or spent', 'active')
    .action(async function(this: Command, address: string, options: { contract?: string; artifact?: string; secret?: string; slot?: string; status: string }) {
      const globalOpts = getGlobalOpts(this);
      try {
        const { NoteUtils } = await import('../utils/note.js');
        const { ArtifactUtils } = await import('../utils/artifact.js');
        const { readFileSync } = await import('fs');

        const nodeUrl = resolveNodeUrl(globalOpts);

        // Build params for NoteUtils.fetchNotes
        const params: any = {
          nodeUrl,
          sender: address,
          status: options.status?.toUpperCase() || 'ACTIVE',
        };

        if (options.contract) {
          params.contractAddress = options.contract;
        }

        if (options.secret) {
          params.secretKey = options.secret;
        }

        if (options.artifact) {
          const artifactPath = ArtifactUtils.resolveArtifact(options.artifact);
          const content = readFileSync(artifactPath, 'utf-8');
          params.artifact = JSON.parse(content);

          if (!options.contract) {
            console.error('Error: --contract is required when using --artifact');
            process.exit(1);
          }
        }

        if (options.slot) {
          // Check if it's a name or hex value
          if (options.slot.startsWith('0x')) {
            params.storageSlot = options.slot;
          } else {
            params.storageSlotName = options.slot;
          }
        }

        // Fetch notes
        const result = await NoteUtils.fetchNotes(JSON.stringify(params));

        if (globalOpts.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          const notes = result.notes || [];
          console.log(`Notes for ${address.slice(0, 10)}... (${notes.length} found)`);
          console.log('');

          if (notes.length === 0) {
            console.log('  No notes found');
          } else {
            for (const note of notes) {
              console.log(`  Note:`);
              console.log(`    Contract: ${note.contractAddress || 'unknown'}`);
              console.log(`    Storage Slot: ${note.storageSlot || 'unknown'}`);
              console.log(`    Content: ${JSON.stringify(note.content || note.note || {})}`);
              console.log('');
            }
          }
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  queryCmd
    .command('nullifiers')
    .description('Check if nullifier exists')
    .argument('<hash>', 'Nullifier hash')
    .option('--block <number>', 'Block number (default: latest)')
    .action(async function(this: Command, hash: string, options: { block?: string }) {
      const globalOpts = getGlobalOpts(this);
      try {
        const { RpcClient } = await import('../utils/rpc.js');
        const nodeUrl = resolveNodeUrl(globalOpts);
        const rpcClient = new RpcClient({ rpcUrl: nodeUrl, adminUrl: nodeUrl, pretty: true });

        // Use nullifier membership check
        const blockNumber = options.block ? parseInt(options.block, 10) : 'latest';
        const result = await rpcClient.call('node_findNullifiersIndexesWithBlock', [blockNumber, [hash]]);

        const exists = result && result.length > 0 && result[0] !== null;

        if (globalOpts.json) {
          console.log(JSON.stringify({
            nullifier: hash,
            exists,
            blockNumber,
            index: exists ? result[0] : null,
          }, null, 2));
        } else {
          console.log('Nullifier Query');
          console.log('='.repeat(40));
          console.log(`Nullifier:   ${hash}`);
          console.log(`Exists:      ${exists ? 'Yes' : 'No'}`);
          if (exists && result[0]) {
            console.log(`Index:       ${result[0]}`);
          }
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  queryCmd
    .command('tx')
    .description('Get transaction by hash')
    .argument('<hash>', 'Transaction hash')
    .action(async function(this: Command, hash: string) {
      const globalOpts = getGlobalOpts(this);
      try {
        const { TxUtils } = await import('../utils/tx.js');
        const nodeUrl = resolveNodeUrl(globalOpts);

        const result = await TxUtils.analyzeTx(JSON.stringify({
          txHash: hash,
          nodeUrl,
          showEffects: true,
        }));

        if (globalOpts.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(TxUtils.formatHumanReadable(result));
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  queryCmd
    .command('logs')
    .description('Query historical logs')
    .argument('<address>', 'Contract or account address')
    .option('--from <block>', 'From block', '0')
    .option('--to <block>', 'To block')
    .option('--type <type>', 'Log type: public, private, all', 'public')
    .action(async function(this: Command, address: string, options: { from: string; to?: string; type: string }) {
      const globalOpts = getGlobalOpts(this);
      try {
        const { RpcClient } = await import('../utils/rpc.js');
        const nodeUrl = resolveNodeUrl(globalOpts);
        const rpcClient = new RpcClient({ rpcUrl: nodeUrl, adminUrl: nodeUrl, pretty: true });

        if (options.type === 'private') {
          console.error('Error: Private logs require PXE connection. Use --type public instead.');
          process.exit(1);
        }

        const filter: any = {
          contractAddress: address,
          fromBlock: parseInt(options.from, 10),
        };
        if (options.to) {
          filter.toBlock = parseInt(options.to, 10);
        }

        const result = await rpcClient.call('node_getPublicLogs', [filter]);
        const logs = result?.logs || [];

        if (globalOpts.json) {
          console.log(JSON.stringify({
            address,
            fromBlock: filter.fromBlock,
            toBlock: filter.toBlock ?? 'latest',
            type: options.type,
            count: logs.length,
            logs,
          }, null, 2));
        } else {
          console.log('Public Logs Query');
          console.log('='.repeat(40));
          console.log(`Contract:    ${address}`);
          console.log(`From Block:  ${filter.fromBlock}`);
          console.log(`To Block:    ${filter.toBlock ?? 'latest'}`);
          console.log(`Found:       ${logs.length} logs`);
          console.log('');
          if (logs.length > 0) {
            for (let i = 0; i < Math.min(logs.length, 10); i++) {
              const log = logs[i];
              console.log(`[${i + 1}] Block ${log.id?.blockNumber ?? '?'}, TX ${log.id?.txHash?.slice(0, 10) ?? '?'}...`);
              console.log(`    Fields: ${log.fields?.length ?? 0}`);
            }
            if (logs.length > 10) {
              console.log(`... and ${logs.length - 10} more`);
            }
          }
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  // Block subcommands
  const blockCmd = queryCmd.command('block').description('Block queries');

  blockCmd
    .command('number')
    .description('Get current block number')
    .action(async function(this: Command) {
      const globalOpts = getGlobalOpts(this);
      try {
        const { RpcClient } = await import('../utils/rpc.js');
        const nodeUrl = resolveNodeUrl(globalOpts);
        const rpcClient = new RpcClient({ rpcUrl: nodeUrl, adminUrl: nodeUrl, pretty: true });

        const result = await rpcClient.call('node_getBlockNumber', []);

        if (globalOpts.json) {
          console.log(JSON.stringify({ blockNumber: result }, null, 2));
        } else {
          console.log(result);
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  blockCmd
    .command('proven-number')
    .description('Get latest proven block number')
    .action(async function(this: Command) {
      const globalOpts = getGlobalOpts(this);
      try {
        const { RpcClient } = await import('../utils/rpc.js');
        const nodeUrl = resolveNodeUrl(globalOpts);
        const rpcClient = new RpcClient({ rpcUrl: nodeUrl, adminUrl: nodeUrl, pretty: true });

        const result = await rpcClient.call('node_getProvenBlockNumber', []);

        if (globalOpts.json) {
          console.log(JSON.stringify({ provenBlockNumber: result }, null, 2));
        } else {
          console.log(result);
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  blockCmd
    .command('tips')
    .description('Get block tips (latest, proven, finalized)')
    .action(async function(this: Command) {
      const globalOpts = getGlobalOpts(this);
      try {
        const { RpcClient } = await import('../utils/rpc.js');
        const nodeUrl = resolveNodeUrl(globalOpts);
        const rpcClient = new RpcClient({ rpcUrl: nodeUrl, adminUrl: nodeUrl, pretty: true });

        // Get all block numbers in parallel
        const [latest, proven] = await Promise.all([
          rpcClient.call('node_getBlockNumber', []),
          rpcClient.call('node_getProvenBlockNumber', []),
        ]);

        if (globalOpts.json) {
          console.log(JSON.stringify({
            latest,
            proven,
            finalized: proven, // Finalized is same as proven in Aztec
          }, null, 2));
        } else {
          console.log('Block Tips');
          console.log('='.repeat(40));
          console.log(`Latest:     ${latest}`);
          console.log(`Proven:     ${proven}`);
          console.log(`Finalized:  ${proven}`);
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  blockCmd
    .command('get')
    .description('Get block by number or hash')
    .argument('<id>', 'Block number or hash')
    .option('--full', 'Include full transaction data')
    .action(async function(this: Command, id: string, options: { full?: boolean }) {
      const globalOpts = getGlobalOpts(this);
      try {
        const { RpcClient } = await import('../utils/rpc.js');
        const nodeUrl = resolveNodeUrl(globalOpts);
        const rpcClient = new RpcClient({ rpcUrl: nodeUrl, adminUrl: nodeUrl, pretty: true });

        // Determine if id is a number or hash
        const blockId = id.startsWith('0x') ? id : parseInt(id, 10);
        const result = await rpcClient.call('node_getBlock', [blockId, options.full ?? false]);

        if (!result) {
          console.error(`Error: Block ${id} not found`);
          process.exit(1);
        }

        if (globalOpts.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log('Block');
          console.log('='.repeat(40));
          console.log(`Number:      ${result.header?.globalVariables?.blockNumber ?? result.number ?? id}`);
          console.log(`Hash:        ${result.hash ?? '(computing...)'}`);
          console.log(`Timestamp:   ${result.header?.globalVariables?.timestamp ?? 'N/A'}`);
          console.log(`TXs:         ${result.body?.txEffects?.length ?? 0}`);
          if (result.header) {
            console.log(`State Root:  ${result.header.state?.partial?.noteHashTree?.root ?? 'N/A'}`);
          }
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  blockCmd
    .command('range')
    .description('Get range of blocks')
    .argument('<from>', 'Start block number')
    .argument('<to>', 'End block number')
    .option('--full', 'Include full transaction data')
    .action(async function(this: Command, from: string, to: string, options: { full?: boolean }) {
      const globalOpts = getGlobalOpts(this);
      try {
        const { RpcClient } = await import('../utils/rpc.js');
        const nodeUrl = resolveNodeUrl(globalOpts);
        const rpcClient = new RpcClient({ rpcUrl: nodeUrl, adminUrl: nodeUrl, pretty: true });

        const fromNum = parseInt(from, 10);
        const toNum = parseInt(to, 10);

        if (toNum < fromNum) {
          console.error('Error: "to" must be greater than or equal to "from"');
          process.exit(1);
        }

        if (toNum - fromNum > 100) {
          console.error('Error: Range too large (max 100 blocks)');
          process.exit(1);
        }

        const result = await rpcClient.call('node_getBlocks', [fromNum, toNum - fromNum + 1, options.full ?? false]);
        const blocks = result || [];

        if (globalOpts.json) {
          console.log(JSON.stringify({
            from: fromNum,
            to: toNum,
            count: blocks.length,
            blocks,
          }, null, 2));
        } else {
          console.log(`Blocks ${fromNum} to ${toNum}`);
          console.log('='.repeat(40));
          console.log(`Retrieved: ${blocks.length} blocks`);
          console.log('');
          for (const block of blocks) {
            const num = block.header?.globalVariables?.blockNumber ?? '?';
            const txCount = block.body?.txEffects?.length ?? 0;
            console.log(`Block ${num}: ${txCount} txs`);
          }
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  blockCmd
    .command('header')
    .description('Get block header')
    .argument('<id>', 'Block number or hash')
    .action(async function(this: Command, id: string) {
      const globalOpts = getGlobalOpts(this);
      try {
        const { RpcClient } = await import('../utils/rpc.js');
        const nodeUrl = resolveNodeUrl(globalOpts);
        const rpcClient = new RpcClient({ rpcUrl: nodeUrl, adminUrl: nodeUrl, pretty: true });

        // Get block without full tx data to get header
        const blockId = id.startsWith('0x') ? id : parseInt(id, 10);
        const result = await rpcClient.call('node_getBlock', [blockId, false]);

        if (!result || !result.header) {
          console.error(`Error: Block ${id} not found`);
          process.exit(1);
        }

        const header = result.header;

        if (globalOpts.json) {
          console.log(JSON.stringify(header, null, 2));
        } else {
          console.log('Block Header');
          console.log('='.repeat(40));
          console.log(`Block Number:    ${header.globalVariables?.blockNumber ?? id}`);
          console.log(`Timestamp:       ${header.globalVariables?.timestamp ?? 'N/A'}`);
          console.log(`Chain ID:        ${header.globalVariables?.chainId ?? 'N/A'}`);
          console.log(`Version:         ${header.globalVariables?.version ?? 'N/A'}`);
          console.log(`Coinbase:        ${header.globalVariables?.coinbase ?? 'N/A'}`);
          console.log(`Fee Recipient:   ${header.globalVariables?.feeRecipient ?? 'N/A'}`);
          if (header.state?.partial) {
            console.log('');
            console.log('State:');
            console.log(`  Note Hash Root:     ${header.state.partial.noteHashTree?.root ?? 'N/A'}`);
            console.log(`  Nullifier Root:     ${header.state.partial.nullifierTree?.root ?? 'N/A'}`);
            console.log(`  Public Data Root:   ${header.state.partial.publicDataTree?.root ?? 'N/A'}`);
          }
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });
}

// =============================================================================
// CAST Commands - Utility/conversion commands
// =============================================================================

function registerCastCommands(program: Command): void {
  const castCmd = program.command('cast').description('Utility/conversion commands');

  // ---------------------------------------------------------------------------
  // Hash functions
  // ---------------------------------------------------------------------------
  const hashCmd = castCmd.command('hash').description('Hash functions');

  hashCmd
    .command('zero')
    .description('Print zero hash')
    .action(async function(this: Command) {
      const globalOpts = getGlobalOpts(this);
      const result = Fr.ZERO.toString();
      if (globalOpts.json) {
        console.log(JSON.stringify({ hash: result }, null, 2));
      } else {
        console.log(result);
      }
    });

  hashCmd
    .command('keccak')
    .description('Keccak-256 hash')
    .argument('<data>', 'Data to hash (hex with 0x prefix or UTF-8 string)')
    .action(async function(this: Command, data: string) {
      const globalOpts = getGlobalOpts(this);
      try {
        const result = await HashUtils.keccak(data);
        if (globalOpts.json) {
          console.log(JSON.stringify({ input: data, hash: `0x${result}` }, null, 2));
        } else {
          console.log(`0x${result}`);
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  hashCmd
    .command('sha256')
    .description('SHA-256 hash')
    .argument('<data>', 'Data to hash (hex with 0x prefix or UTF-8 string)')
    .action(async function(this: Command, data: string) {
      const globalOpts = getGlobalOpts(this);
      try {
        const result = await HashUtils.sha256(data);
        if (globalOpts.json) {
          console.log(JSON.stringify({ input: data, hash: result }, null, 2));
        } else {
          console.log(result);
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  hashCmd
    .command('poseidon2')
    .description('Poseidon2 hash')
    .argument('<fields>', 'JSON array of field values')
    .action(async function(this: Command, fields: string) {
      const globalOpts = getGlobalOpts(this);
      try {
        const result = await HashUtils.poseidon2(fields);
        if (globalOpts.json) {
          console.log(JSON.stringify({ inputs: JSON.parse(fields), hash: result }, null, 2));
        } else {
          console.log(result);
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  hashCmd
    .command('pedersen')
    .description('Pedersen hash')
    .argument('<fields>', 'JSON array of field values')
    .option('--index <n>', 'Generator index', '0')
    .action(async function(this: Command, fields: string, options: { index: string }) {
      const globalOpts = getGlobalOpts(this);
      try {
        const params = JSON.stringify({
          inputs: JSON.parse(fields),
          index: parseInt(options.index, 10),
        });
        const result = await HashUtils.computePedersenHash(params);
        if (globalOpts.json) {
          console.log(JSON.stringify({ inputs: JSON.parse(fields), index: parseInt(options.index, 10), hash: result }, null, 2));
        } else {
          console.log(result);
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  hashCmd
    .command('secret')
    .description('Compute secret hash')
    .argument('<secret>', 'Secret value (hex with 0x prefix)')
    .action(async function(this: Command, secret: string) {
      const globalOpts = getGlobalOpts(this);
      try {
        const result = await HashUtils.secretHash(secret);
        if (globalOpts.json) {
          console.log(JSON.stringify({ secret, hash: result }, null, 2));
        } else {
          console.log(result);
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  // ---------------------------------------------------------------------------
  // Address utilities
  // ---------------------------------------------------------------------------
  const addrCmd = castCmd.command('address').description('Address utilities');

  addrCmd
    .command('zero')
    .description('Print zero address')
    .action(async function(this: Command) {
      const globalOpts = getGlobalOpts(this);
      const result = AddressUtils.addressZero();
      if (globalOpts.json) {
        console.log(JSON.stringify({ address: result }, null, 2));
      } else {
        console.log(result);
      }
    });

  addrCmd
    .command('random')
    .description('Generate random address')
    .action(async function(this: Command) {
      const globalOpts = getGlobalOpts(this);
      try {
        const result = await AddressUtils.addressRandom();
        if (globalOpts.json) {
          console.log(JSON.stringify({ address: result }, null, 2));
        } else {
          console.log(result);
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  addrCmd
    .command('validate')
    .description('Validate address format')
    .argument('<address>', 'Address')
    .action(async function(this: Command, address: string) {
      const globalOpts = getGlobalOpts(this);
      const result = AddressUtils.addressValidate(address);
      if (globalOpts.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        if (result.valid) {
          console.log(`Valid: ${result.address}`);
        } else {
          console.log(`Invalid: ${result.error}`);
          process.exit(1);
        }
      }
    });

  addrCmd
    .command('is-valid')
    .description('Check if address is valid (format + on curve)')
    .argument('<address>', 'Address')
    .action(async function(this: Command, address: string) {
      const globalOpts = getGlobalOpts(this);
      try {
        const result = await AddressUtils.addressIsValid(address);
        if (globalOpts.json) {
          console.log(JSON.stringify({ address, valid: result }, null, 2));
        } else {
          console.log(result ? 'true' : 'false');
        }
        if (!result) {
          process.exit(1);
        }
      } catch (error: any) {
        if (globalOpts.json) {
          console.log(JSON.stringify({ address, valid: false, error: error.message }, null, 2));
        } else {
          console.log('false');
        }
        process.exit(1);
      }
    });

  addrCmd
    .command('from-field')
    .description('Create address from field')
    .argument('<field>', 'Field value')
    .action(async function(this: Command, field: string) {
      const globalOpts = getGlobalOpts(this);
      try {
        const result = AddressUtils.addressFromField(field);
        if (globalOpts.json) {
          console.log(JSON.stringify({ field, address: result }, null, 2));
        } else {
          console.log(result);
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  addrCmd
    .command('from-bigint')
    .description('Create address from bigint')
    .argument('<value>', 'BigInt value')
    .action(async function(this: Command, value: string) {
      const globalOpts = getGlobalOpts(this);
      try {
        const result = AddressUtils.addressFromBigInt(value);
        if (globalOpts.json) {
          console.log(JSON.stringify({ value, address: result }, null, 2));
        } else {
          console.log(result);
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  addrCmd
    .command('from-number')
    .description('Create address from number')
    .argument('<value>', 'Number')
    .action(async function(this: Command, value: string) {
      const globalOpts = getGlobalOpts(this);
      try {
        const result = AddressUtils.addressFromNumber(parseInt(value, 10));
        if (globalOpts.json) {
          console.log(JSON.stringify({ value: parseInt(value, 10), address: result }, null, 2));
        } else {
          console.log(result);
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  addrCmd
    .command('to-point')
    .description('Convert address to Grumpkin point')
    .argument('<address>', 'Address')
    .action(async function(this: Command, address: string) {
      const globalOpts = getGlobalOpts(this);
      try {
        const result = await AddressUtils.addressToPoint(address);
        if (globalOpts.json) {
          console.log(JSON.stringify({ address, point: result }, null, 2));
        } else {
          console.log(`x: ${result.x}`);
          console.log(`y: ${result.y}`);
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  // ---------------------------------------------------------------------------
  // Ethereum address utilities
  // ---------------------------------------------------------------------------
  const ethCmd = castCmd.command('eth').description('Ethereum address utilities');

  ethCmd
    .command('zero')
    .description('Print zero ETH address')
    .action(async function(this: Command) {
      const globalOpts = getGlobalOpts(this);
      const result = EthAddressUtils.ethAddressZero();
      if (globalOpts.json) {
        console.log(JSON.stringify({ address: result }, null, 2));
      } else {
        console.log(result);
      }
    });

  ethCmd
    .command('random')
    .description('Generate random ETH address')
    .action(async function(this: Command) {
      const globalOpts = getGlobalOpts(this);
      try {
        const result = await EthAddressUtils.ethAddressRandom();
        if (globalOpts.json) {
          console.log(JSON.stringify({ address: result }, null, 2));
        } else {
          console.log(result);
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  ethCmd
    .command('validate')
    .description('Validate ETH address format')
    .argument('<address>', 'Address')
    .action(async function(this: Command, address: string) {
      const globalOpts = getGlobalOpts(this);
      const result = EthAddressUtils.ethAddressValidate(address);
      if (globalOpts.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        if (result.valid) {
          console.log(`Valid: ${result.address}`);
        } else {
          console.log(`Invalid: ${result.error}`);
          process.exit(1);
        }
      }
    });

  ethCmd
    .command('is-zero')
    .description('Check if ETH address is zero')
    .argument('<address>', 'Address')
    .action(async function(this: Command, address: string) {
      const globalOpts = getGlobalOpts(this);
      try {
        const result = EthAddressUtils.ethAddressIsZero(address);
        if (globalOpts.json) {
          console.log(JSON.stringify({ address, isZero: result }, null, 2));
        } else {
          console.log(result ? 'true' : 'false');
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  ethCmd
    .command('from-field')
    .description('Create ETH address from field')
    .argument('<field>', 'Field')
    .action(async function(this: Command, field: string) {
      const globalOpts = getGlobalOpts(this);
      try {
        const result = EthAddressUtils.ethAddressFromField(field);
        if (globalOpts.json) {
          console.log(JSON.stringify({ field, address: result }, null, 2));
        } else {
          console.log(result);
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  ethCmd
    .command('to-field')
    .description('Convert ETH address to field')
    .argument('<address>', 'Address')
    .action(async function(this: Command, address: string) {
      const globalOpts = getGlobalOpts(this);
      try {
        const result = EthAddressUtils.ethAddressToField(address);
        if (globalOpts.json) {
          console.log(JSON.stringify({ address, field: result }, null, 2));
        } else {
          console.log(result);
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  // ---------------------------------------------------------------------------
  // Field utilities
  // ---------------------------------------------------------------------------
  const fieldCmd = castCmd.command('field').description('Field element utilities');

  fieldCmd
    .command('random')
    .description('Generate random field')
    .action(async function(this: Command) {
      const globalOpts = getGlobalOpts(this);
      const result = FieldUtils.fieldRandom();
      if (globalOpts.json) {
        console.log(JSON.stringify({ field: result }, null, 2));
      } else {
        console.log(result);
      }
    });

  fieldCmd
    .command('from-string')
    .description('Convert string to field')
    .argument('<value>', 'String (hex with 0x prefix or UTF-8)')
    .action(async function(this: Command, value: string) {
      const globalOpts = getGlobalOpts(this);
      try {
        const result = FieldUtils.fieldFromString(value);
        if (globalOpts.json) {
          console.log(JSON.stringify({ input: value, field: result }, null, 2));
        } else {
          console.log(result);
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  fieldCmd
    .command('to-string')
    .description('Convert field to string')
    .argument('<field>', 'Field')
    .action(async function(this: Command, field: string) {
      const globalOpts = getGlobalOpts(this);
      try {
        const result = FieldUtils.fieldToString(field);
        if (globalOpts.json) {
          console.log(JSON.stringify({ field, string: result }, null, 2));
        } else {
          console.log(result);
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  fieldCmd
    .command('from-buffer')
    .description('Create field from buffer')
    .argument('<buffer>', 'Hex buffer (without 0x prefix)')
    .action(async function(this: Command, buffer: string) {
      const globalOpts = getGlobalOpts(this);
      try {
        // Remove 0x prefix if present for buffer conversion
        const bufferClean = buffer.startsWith('0x') ? buffer.slice(2) : buffer;
        const result = FieldUtils.fieldFromBuffer(bufferClean);
        if (globalOpts.json) {
          console.log(JSON.stringify({ buffer, field: result }, null, 2));
        } else {
          console.log(result);
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  fieldCmd
    .command('to-buffer')
    .description('Convert field to buffer')
    .argument('<field>', 'Field')
    .action(async function(this: Command, field: string) {
      const globalOpts = getGlobalOpts(this);
      try {
        const result = FieldUtils.fieldToBuffer(field);
        if (globalOpts.json) {
          console.log(JSON.stringify({ field, buffer: result }, null, 2));
        } else {
          console.log(result);
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  fieldCmd
    .command('from-bigint')
    .description('Create field from bigint')
    .argument('<value>', 'BigInt value')
    .action(async function(this: Command, value: string) {
      const globalOpts = getGlobalOpts(this);
      try {
        const result = FieldUtils.fieldFromBigInt(value);
        if (globalOpts.json) {
          console.log(JSON.stringify({ value, field: result }, null, 2));
        } else {
          console.log(result);
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  fieldCmd
    .command('to-bigint')
    .description('Convert field to bigint')
    .argument('<field>', 'Field')
    .action(async function(this: Command, field: string) {
      const globalOpts = getGlobalOpts(this);
      try {
        const result = FieldUtils.fieldToBigInt(field);
        if (globalOpts.json) {
          console.log(JSON.stringify({ field, bigint: result }, null, 2));
        } else {
          console.log(result);
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  fieldCmd
    .command('is-zero')
    .description('Check if field is zero')
    .argument('<field>', 'Field')
    .action(async function(this: Command, field: string) {
      const globalOpts = getGlobalOpts(this);
      try {
        const result = FieldUtils.fieldIsZero(field);
        if (globalOpts.json) {
          console.log(JSON.stringify({ field, isZero: result }, null, 2));
        } else {
          console.log(result ? 'true' : 'false');
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  fieldCmd
    .command('equals')
    .description('Compare two fields')
    .argument('<a>', 'First field')
    .argument('<b>', 'Second field')
    .action(async function(this: Command, a: string, b: string) {
      const globalOpts = getGlobalOpts(this);
      try {
        const result = FieldUtils.fieldEquals(a, b);
        if (globalOpts.json) {
          console.log(JSON.stringify({ a, b, equals: result }, null, 2));
        } else {
          console.log(result ? 'true' : 'false');
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  // ---------------------------------------------------------------------------
  // Selector utilities
  // ---------------------------------------------------------------------------
  const selectorCmd = castCmd.command('selector').description('Selector utilities');

  selectorCmd
    .command('compute')
    .description('Compute function selector')
    .argument('<sig>', 'Function signature (e.g., "transfer(address,uint256)")')
    .action(async function(this: Command, sig: string) {
      const globalOpts = getGlobalOpts(this);
      try {
        const result = await SelectorUtils.selectorFromSignature(sig);
        if (globalOpts.json) {
          console.log(JSON.stringify({ signature: sig, selector: result }, null, 2));
        } else {
          console.log(result);
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  selectorCmd
    .command('event')
    .description('Compute event selector')
    .argument('<sig>', 'Event signature')
    .action(async function(this: Command, sig: string) {
      const globalOpts = getGlobalOpts(this);
      try {
        const result = await SelectorUtils.eventSelector(sig);
        if (globalOpts.json) {
          console.log(JSON.stringify({ signature: sig, selector: result }, null, 2));
        } else {
          console.log(result);
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  selectorCmd
    .command('note')
    .description('Compute note selector')
    .argument('<sig>', 'Note signature')
    .action(async function(this: Command, sig: string) {
      const globalOpts = getGlobalOpts(this);
      try {
        const result = await SelectorUtils.noteSelector(sig);
        if (globalOpts.json) {
          console.log(JSON.stringify({ signature: sig, selector: result }, null, 2));
        } else {
          console.log(result);
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  selectorCmd
    .command('from-field')
    .description('Create selector from field')
    .argument('<field>', 'Field')
    .action(async function(this: Command, field: string) {
      const globalOpts = getGlobalOpts(this);
      try {
        const result = SelectorUtils.selectorFromField(field);
        if (globalOpts.json) {
          console.log(JSON.stringify({ field, selector: result }, null, 2));
        } else {
          console.log(result);
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  selectorCmd
    .command('from-string')
    .description('Create selector from hex string')
    .argument('<hex>', 'Hex string')
    .action(async function(this: Command, hex: string) {
      const globalOpts = getGlobalOpts(this);
      try {
        const result = SelectorUtils.selectorFromString(hex);
        if (globalOpts.json) {
          console.log(JSON.stringify({ hex, selector: result }, null, 2));
        } else {
          console.log(result);
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  selectorCmd
    .command('empty')
    .description('Get empty selector')
    .action(async function(this: Command) {
      const globalOpts = getGlobalOpts(this);
      const result = SelectorUtils.selectorEmpty();
      if (globalOpts.json) {
        console.log(JSON.stringify({ selector: result }, null, 2));
      } else {
        console.log(result);
      }
    });

  // ---------------------------------------------------------------------------
  // ABI encoding/decoding
  // ---------------------------------------------------------------------------
  const abiCmd = castCmd.command('abi').description('ABI encoding/decoding');

  abiCmd
    .command('encode')
    .description('ABI encode arguments')
    .argument('<params>', 'JSON with abi and args')
    .action(async function(this: Command, params: string) {
      const globalOpts = getGlobalOpts(this);
      try {
        const result = AbiUtils.abiEncode(params);
        if (globalOpts.json) {
          console.log(JSON.stringify({ encoded: result.map((f: any) => f.toString()) }, null, 2));
        } else {
          result.forEach((f: any) => console.log(f.toString()));
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  abiCmd
    .command('decode')
    .description('ABI decode fields')
    .argument('<params>', 'JSON with types and fields')
    .action(async function(this: Command, params: string) {
      const globalOpts = getGlobalOpts(this);
      try {
        const result = AbiUtils.abiDecode(params);
        if (globalOpts.json) {
          console.log(JSON.stringify({ decoded: result }, null, 2));
        } else {
          console.log(JSON.stringify(result, null, 2));
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  abiCmd
    .command('decode-sig')
    .description('Decode function signature')
    .argument('<params>', 'JSON with name and parameters')
    .action(async function(this: Command, params: string) {
      const globalOpts = getGlobalOpts(this);
      try {
        const result = AbiUtils.decodeFunctionSignature(params);
        if (globalOpts.json) {
          console.log(JSON.stringify({ signature: result }, null, 2));
        } else {
          console.log(result);
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  // ---------------------------------------------------------------------------
  // Nullifier utilities
  // ---------------------------------------------------------------------------
  const nullifierCmd = castCmd.command('nullifier').description('Nullifier utilities');

  nullifierCmd
    .command('silo')
    .description('Silo nullifier with contract')
    .requiredOption('--contract <addr>', 'Contract address')
    .requiredOption('--nullifier <val>', 'Nullifier')
    .action(async function(this: Command, options: { contract: string; nullifier: string }) {
      const globalOpts = getGlobalOpts(this);
      try {
        const result = await HashUtils.siloNullifier(options.contract, options.nullifier);
        if (globalOpts.json) {
          console.log(JSON.stringify({
            contract: options.contract,
            nullifier: options.nullifier,
            siloed: result,
          }, null, 2));
        } else {
          console.log(result);
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  nullifierCmd
    .command('l1-to-l2')
    .description('Compute L1->L2 message nullifier')
    .requiredOption('--contract <addr>', 'Contract')
    .requiredOption('--message-hash <hash>', 'Message hash')
    .requiredOption('--secret <secret>', 'Secret')
    .action(async function(this: Command, options: { contract: string; messageHash: string; secret: string }) {
      const globalOpts = getGlobalOpts(this);
      try {
        const result = await HashUtils.l1ToL2MessageNullifier(
          options.contract,
          options.messageHash,
          options.secret
        );
        if (globalOpts.json) {
          console.log(JSON.stringify({
            contract: options.contract,
            messageHash: options.messageHash,
            nullifier: result,
          }, null, 2));
        } else {
          console.log(result);
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  // ---------------------------------------------------------------------------
  // Note utilities
  // ---------------------------------------------------------------------------
  const noteCmd = castCmd.command('note').description('Note utilities');

  noteCmd
    .command('hash-nonce')
    .description('Compute note hash nonce')
    .requiredOption('--nullifier-zero <val>', 'Nullifier zero')
    .requiredOption('--index <n>', 'Note hash index')
    .action(async function(this: Command, options: { nullifierZero: string; index: string }) {
      const globalOpts = getGlobalOpts(this);
      try {
        const result = await HashUtils.noteHashNonce(options.nullifierZero, parseInt(options.index, 10));
        if (globalOpts.json) {
          console.log(JSON.stringify({
            nullifierZero: options.nullifierZero,
            index: parseInt(options.index, 10),
            nonce: result,
          }, null, 2));
        } else {
          console.log(result);
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  noteCmd
    .command('silo-hash')
    .description('Silo note hash to contract')
    .requiredOption('--contract <addr>', 'Contract')
    .requiredOption('--note-hash <hash>', 'Note hash')
    .action(async function(this: Command, options: { contract: string; noteHash: string }) {
      const globalOpts = getGlobalOpts(this);
      try {
        const result = await HashUtils.siloNoteHash(options.contract, options.noteHash);
        if (globalOpts.json) {
          console.log(JSON.stringify({
            contract: options.contract,
            noteHash: options.noteHash,
            siloed: result,
          }, null, 2));
        } else {
          console.log(result);
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  noteCmd
    .command('unique-hash')
    .description('Compute unique note hash')
    .requiredOption('--nonce <nonce>', 'Note nonce')
    .requiredOption('--siloed-note-hash <hash>', 'Siloed note hash')
    .action(async function(this: Command, options: { nonce: string; siloedNoteHash: string }) {
      const globalOpts = getGlobalOpts(this);
      try {
        const result = await HashUtils.uniqueNoteHash(options.nonce, options.siloedNoteHash);
        if (globalOpts.json) {
          console.log(JSON.stringify({
            nonce: options.nonce,
            siloedNoteHash: options.siloedNoteHash,
            unique: result,
          }, null, 2));
        } else {
          console.log(result);
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  // ---------------------------------------------------------------------------
  // Artifact utilities
  // ---------------------------------------------------------------------------
  const artifactCmd = castCmd.command('artifact').description('Artifact utilities');

  artifactCmd
    .command('hash')
    .description('Compute artifact hash')
    .argument('<artifact>', 'Artifact path or name (e.g., aztec:Token)')
    .action(async function(this: Command, artifact: string) {
      const globalOpts = getGlobalOpts(this);
      try {
        const { ArtifactUtils } = await import('../utils/artifact.js');
        const { readFileSync } = await import('fs');
        const { computeArtifactHash } = await import('@aztec/stdlib/contract');

        // Resolve and load artifact
        const artifactPath = ArtifactUtils.resolveArtifact(artifact);
        const content = readFileSync(artifactPath, 'utf-8');
        const loaded = AbiUtils.loadContractArtifact(content);

        // Compute hash
        const hash = await computeArtifactHash(loaded);

        if (globalOpts.json) {
          console.log(JSON.stringify({ hash: hash.toString() }));
        } else {
          console.log(hash.toString());
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  artifactCmd
    .command('hash-preimage')
    .description('Compute artifact hash preimage')
    .argument('<artifact>', 'Artifact path or name (e.g., aztec:Token)')
    .action(async function(this: Command, artifact: string) {
      const globalOpts = getGlobalOpts(this);
      try {
        const { ArtifactUtils } = await import('../utils/artifact.js');
        const { readFileSync } = await import('fs');
        const { computeArtifactHashPreimage } = await import('@aztec/stdlib/contract');

        // Resolve and load artifact
        const artifactPath = ArtifactUtils.resolveArtifact(artifact);
        const content = readFileSync(artifactPath, 'utf-8');
        const loaded = AbiUtils.loadContractArtifact(content);

        // Compute preimage
        const preimage = await computeArtifactHashPreimage(loaded);

        if (globalOpts.json) {
          console.log(JSON.stringify({
            privateFunctionRoot: preimage.privateFunctionRoot.toString(),
            utilityFunctionRoot: preimage.utilityFunctionRoot.toString(),
            metadataHash: preimage.metadataHash.toString(),
          }));
        } else {
          console.log('Artifact Hash Preimage:');
          console.log(`  Private Function Root: ${preimage.privateFunctionRoot.toString()}`);
          console.log(`  Utility Function Root: ${preimage.utilityFunctionRoot.toString()}`);
          console.log(`  Metadata Hash:         ${preimage.metadataHash.toString()}`);
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  artifactCmd
    .command('metadata-hash')
    .description('Compute metadata hash')
    .argument('<artifact>', 'Artifact path or name (e.g., aztec:Token)')
    .action(async function(this: Command, artifact: string) {
      const globalOpts = getGlobalOpts(this);
      try {
        const { ArtifactUtils } = await import('../utils/artifact.js');
        const { readFileSync } = await import('fs');
        const { computeArtifactMetadataHash } = await import('@aztec/stdlib/contract');

        // Resolve and load artifact
        const artifactPath = ArtifactUtils.resolveArtifact(artifact);
        const content = readFileSync(artifactPath, 'utf-8');
        const loaded = AbiUtils.loadContractArtifact(content);

        // Compute metadata hash
        const hash = computeArtifactMetadataHash(loaded);

        if (globalOpts.json) {
          console.log(JSON.stringify({ metadataHash: hash.toString() }));
        } else {
          console.log(hash.toString());
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  artifactCmd
    .command('function-hash')
    .description('Compute function artifact hash')
    .argument('<artifact>', 'Artifact path or name (e.g., aztec:Token)')
    .argument('<function>', 'Function name')
    .action(async function(this: Command, artifact: string, functionName: string) {
      const globalOpts = getGlobalOpts(this);
      try {
        const { ArtifactUtils } = await import('../utils/artifact.js');
        const { readFileSync } = await import('fs');
        const { computeFunctionArtifactHash } = await import('@aztec/stdlib/contract');

        // Resolve and load artifact
        const artifactPath = ArtifactUtils.resolveArtifact(artifact);
        const content = readFileSync(artifactPath, 'utf-8');
        const loaded = AbiUtils.loadContractArtifact(content);

        // Find the function
        const fn = loaded.functions.find((f: any) => f.name === functionName);
        if (!fn) {
          console.error(`Error: Function '${functionName}' not found in artifact`);
          console.error('Available functions: ' + loaded.functions.map((f: any) => f.name).join(', '));
          process.exit(1);
        }

        // Compute function hash
        const hash = await computeFunctionArtifactHash(fn);

        if (globalOpts.json) {
          console.log(JSON.stringify({ functionHash: hash.toString() }));
        } else {
          console.log(hash.toString());
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  artifactCmd
    .command('load')
    .description('Load contract artifact')
    .argument('<artifact>', 'Noir compiled contract path or name (e.g., aztec:Token)')
    .action(async function(this: Command, artifact: string) {
      const globalOpts = getGlobalOpts(this);
      try {
        const { ArtifactUtils } = await import('../utils/artifact.js');
        const { readFileSync } = await import('fs');

        // Resolve artifact path
        const artifactPath = ArtifactUtils.resolveArtifact(artifact);
        const content = readFileSync(artifactPath, 'utf-8');
        const loaded = AbiUtils.loadContractArtifact(content);

        if (globalOpts.json) {
          console.log(JSON.stringify({
            name: loaded.name,
            functions: loaded.functions.map((f: any) => ({
              name: f.name,
              functionType: f.functionType,
              isInternal: f.isInternal,
              parameters: f.parameters,
            })),
          }, null, 2));
        } else {
          console.log(`Contract: ${loaded.name}`);
          console.log('Functions:');
          for (const fn of loaded.functions) {
            const params = fn.parameters.map((p: any) => p.name).join(', ');
            console.log(`  ${fn.functionType} ${fn.name}(${params})`);
          }
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  artifactCmd
    .command('to-buffer')
    .description('Serialize artifact to buffer')
    .argument('<artifact>', 'Artifact JSON')
    .action(async function(this: Command, artifact: string) {
      const globalOpts = getGlobalOpts(this);
      try {
        const result = AbiUtils.contractArtifactToBuffer(artifact);
        if (globalOpts.json) {
          console.log(JSON.stringify({ buffer: result }, null, 2));
        } else {
          console.log(result);
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  artifactCmd
    .command('from-buffer')
    .description('Deserialize artifact from buffer')
    .argument('<buffer>', 'Hex buffer')
    .action(async function(this: Command, buffer: string) {
      const globalOpts = getGlobalOpts(this);
      try {
        const result = AbiUtils.contractArtifactFromBuffer(buffer);
        if (globalOpts.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(JSON.stringify(result, null, 2));
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  // ---------------------------------------------------------------------------
  // Message utilities
  // ---------------------------------------------------------------------------
  const msgCmd = castCmd.command('message').description('Message utilities');

  msgCmd
    .command('l2-to-l1-hash')
    .description('Compute L2->L1 message hash')
    .argument('<params>', 'JSON with l2Sender, l1Recipient, content, rollupVersion, chainId')
    .action(async function(this: Command, params: string) {
      const globalOpts = getGlobalOpts(this);
      try {
        const result = await HashUtils.l2ToL1MessageHash(params);
        if (globalOpts.json) {
          console.log(JSON.stringify({ ...JSON.parse(params), hash: result }, null, 2));
        } else {
          console.log(result);
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  // ---------------------------------------------------------------------------
  // Log utilities
  // ---------------------------------------------------------------------------
  const logCmd = castCmd.command('log').description('Log utilities');

  logCmd
    .command('silo-private')
    .description('Silo private log tag')
    .requiredOption('--contract <addr>', 'Contract')
    .requiredOption('--tag <tag>', 'Tag')
    .action(async function(this: Command, options: { contract: string; tag: string }) {
      const globalOpts = getGlobalOpts(this);
      try {
        const result = await HashUtils.siloPrivateLog(options.contract, options.tag);
        if (globalOpts.json) {
          console.log(JSON.stringify({
            contract: options.contract,
            tag: options.tag,
            siloed: result,
          }, null, 2));
        } else {
          console.log(result);
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  logCmd
    .command('decrypt-private')
    .description('Decrypt private log')
    .requiredOption('--ciphertext <data>', 'Ciphertext (JSON array of fields)')
    .requiredOption('--recipient-address <addr>', 'Recipient complete address')
    .requiredOption('--recipient-secret-key <key>', 'Recipient secret key')
    .action(async function(this: Command, options: { ciphertext: string; recipientAddress: string; recipientSecretKey: string }) {
      const globalOpts = getGlobalOpts(this);
      try {
        const { LogUtils } = await import('../utils/log.js');
        const result = await LogUtils.decryptRawPrivateLog(JSON.stringify({
          ciphertext: JSON.parse(options.ciphertext),
          recipientAddress: options.recipientAddress,
          recipientSecretKey: options.recipientSecretKey,
        }));
        if (globalOpts.json) {
          console.log(JSON.stringify({ plaintext: result }, null, 2));
        } else {
          result.forEach((f: string) => console.log(f));
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  // ---------------------------------------------------------------------------
  // Misc utilities
  // ---------------------------------------------------------------------------
  castCmd
    .command('calldata-hash')
    .description('Hash public function calldata')
    .argument('<calldata>', 'JSON array of fields')
    .action(async function(this: Command, calldata: string) {
      const globalOpts = getGlobalOpts(this);
      try {
        const result = await HashUtils.calldataHash(calldata);
        if (globalOpts.json) {
          console.log(JSON.stringify({ calldata: JSON.parse(calldata), hash: result }, null, 2));
        } else {
          console.log(result);
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  castCmd
    .command('var-args-hash')
    .description('Hash function arguments (authwit)')
    .argument('<fields>', 'JSON array of fields')
    .action(async function(this: Command, fields: string) {
      const globalOpts = getGlobalOpts(this);
      try {
        const result = await HashUtils.varArgsHash(fields);
        if (globalOpts.json) {
          console.log(JSON.stringify({ fields: JSON.parse(fields), hash: result }, null, 2));
        } else {
          console.log(result);
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  castCmd
    .command('public-data-slot')
    .description('Compute public data tree slot')
    .requiredOption('--contract <addr>', 'Contract')
    .requiredOption('--slot <slot>', 'Slot')
    .action(async function(this: Command, options: { contract: string; slot: string }) {
      const globalOpts = getGlobalOpts(this);
      try {
        const result = await HashUtils.publicDataSlot(options.contract, options.slot);
        if (globalOpts.json) {
          console.log(JSON.stringify({
            contract: options.contract,
            slot: options.slot,
            publicDataSlot: result,
          }, null, 2));
        } else {
          console.log(result);
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  castCmd
    .command('hash-vk')
    .description('Hash verification key')
    .argument('<fields>', 'JSON array of fields')
    .action(async function(this: Command, fields: string) {
      const globalOpts = getGlobalOpts(this);
      try {
        const result = await HashUtils.hashVK(fields);
        if (globalOpts.json) {
          console.log(JSON.stringify({ fields: JSON.parse(fields), hash: result }, null, 2));
        } else {
          console.log(result);
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  castCmd
    .command('buffer-as-fields')
    .description('Convert buffer to fields')
    .argument('<params>', 'JSON with buffer (hex) and targetLength')
    .action(async function(this: Command, params: string) {
      const globalOpts = getGlobalOpts(this);
      try {
        const result = AbiUtils.bufferAsFields(params);
        if (globalOpts.json) {
          console.log(JSON.stringify({ ...JSON.parse(params), fields: result }, null, 2));
        } else {
          result.forEach((f: string) => console.log(f));
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });
}

// =============================================================================
// NODE Commands - Node info and administration
// =============================================================================

function registerNodeCommands(program: Command): void {
  const nodeCmd = program.command('node').description('Node info and administration');

  nodeCmd
    .command('ready')
    .description('Check if node is ready')
    .action(async function(this: Command) {
      const globalOpts = getGlobalOpts(this);
      try {
        const { RpcClient } = await import('../utils/rpc.js');
        const nodeUrl = resolveNodeUrl(globalOpts);
        const rpcClient = new RpcClient({ rpcUrl: nodeUrl, adminUrl: nodeUrl, pretty: true });

        // Check by attempting to get block number
        const blockNumber = await rpcClient.call('node_getBlockNumber', []);
        const ready = blockNumber !== null && blockNumber >= 0;

        if (globalOpts.json) {
          console.log(JSON.stringify({
            ready,
            nodeUrl,
            blockNumber: ready ? blockNumber : null,
          }, null, 2));
        } else {
          if (ready) {
            console.log(`Node is ready (block ${blockNumber})`);
          } else {
            console.log('Node is not ready');
          }
        }
      } catch (error: any) {
        if (globalOpts.json) {
          console.log(JSON.stringify({
            ready: false,
            nodeUrl: resolveNodeUrl(globalOpts),
            error: error.message,
          }, null, 2));
        } else {
          console.log(`Node is not ready: ${error.message}`);
        }
        // Note: Don't exit with error code since we successfully determined status
      }
    });

  nodeCmd
    .command('info')
    .description('Get node information')
    .action(async function(this: Command) {
      const globalOpts = getGlobalOpts(this);
      try {
        const { RpcClient } = await import('../utils/rpc.js');
        const nodeUrl = resolveNodeUrl(globalOpts);
        const rpcClient = new RpcClient({ rpcUrl: nodeUrl, adminUrl: nodeUrl, pretty: true });

        const result = await rpcClient.call('node_getNodeInfo', []);

        if (globalOpts.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log('Node Information');
          console.log('='.repeat(40));
          console.log(`Node Version:     ${result?.nodeVersion ?? 'N/A'}`);
          console.log(`Chain ID:         ${result?.l1ChainId ?? 'N/A'}`);
          console.log(`Protocol Version: ${result?.protocolVersion ?? 'N/A'}`);
          console.log(`ENR:              ${result?.enr ? result.enr.slice(0, 50) + '...' : 'N/A'}`);

          if (result?.l1ContractAddresses) {
            console.log('');
            console.log('L1 Contracts:');
            const l1 = result.l1ContractAddresses;
            if (l1.rollupAddress) console.log(`  Rollup:         ${l1.rollupAddress}`);
            if (l1.registryAddress) console.log(`  Registry:       ${l1.registryAddress}`);
            if (l1.inboxAddress) console.log(`  Inbox:          ${l1.inboxAddress}`);
            if (l1.outboxAddress) console.log(`  Outbox:         ${l1.outboxAddress}`);
          }
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  nodeCmd
    .command('version')
    .description('Get node version')
    .action(async function(this: Command) {
      const globalOpts = getGlobalOpts(this);
      try {
        const { RpcClient } = await import('../utils/rpc.js');
        const nodeUrl = resolveNodeUrl(globalOpts);
        const rpcClient = new RpcClient({ rpcUrl: nodeUrl, adminUrl: nodeUrl, pretty: true });

        const result = await rpcClient.call('node_getVersion', []);

        if (globalOpts.json) {
          console.log(JSON.stringify({ version: result }, null, 2));
        } else {
          console.log(result ?? 'Unknown');
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  nodeCmd
    .command('chain-id')
    .description('Get chain ID')
    .action(async function(this: Command) {
      const globalOpts = getGlobalOpts(this);
      try {
        const { RpcClient } = await import('../utils/rpc.js');
        const nodeUrl = resolveNodeUrl(globalOpts);
        const rpcClient = new RpcClient({ rpcUrl: nodeUrl, adminUrl: nodeUrl, pretty: true });

        const result = await rpcClient.call('node_getChainId', []);

        if (globalOpts.json) {
          console.log(JSON.stringify({ chainId: result }, null, 2));
        } else {
          console.log(result ?? 'Unknown');
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  nodeCmd
    .command('l1-addresses')
    .description('Get L1 contract addresses')
    .action(async function(this: Command) {
      const globalOpts = getGlobalOpts(this);
      try {
        const { RpcClient } = await import('../utils/rpc.js');
        const nodeUrl = resolveNodeUrl(globalOpts);
        const rpcClient = new RpcClient({ rpcUrl: nodeUrl, adminUrl: nodeUrl, pretty: true });

        const result = await rpcClient.call('node_getL1ContractAddresses', []);

        if (globalOpts.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log('L1 Contract Addresses');
          console.log('='.repeat(40));
          if (result) {
            for (const [key, value] of Object.entries(result)) {
              const formattedKey = key.replace(/([A-Z])/g, ' $1').trim();
              console.log(`${formattedKey.padEnd(22)} ${value}`);
            }
          } else {
            console.log('No L1 addresses available');
          }
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  nodeCmd
    .command('protocol-addresses')
    .description('Get protocol contract addresses')
    .action(async function(this: Command) {
      const globalOpts = getGlobalOpts(this);
      try {
        const { RpcClient } = await import('../utils/rpc.js');
        const nodeUrl = resolveNodeUrl(globalOpts);
        const rpcClient = new RpcClient({ rpcUrl: nodeUrl, adminUrl: nodeUrl, pretty: true });

        const result = await rpcClient.call('node_getProtocolContractAddresses', []);

        if (globalOpts.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log('Protocol Contract Addresses');
          console.log('='.repeat(40));
          if (result) {
            for (const [key, value] of Object.entries(result)) {
              const formattedKey = key.replace(/([A-Z])/g, ' $1').trim();
              console.log(`${formattedKey.padEnd(22)} ${value}`);
            }
          } else {
            console.log('No protocol addresses available');
          }
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  nodeCmd
    .command('enr')
    .description('Get node ENR')
    .action(async function(this: Command) {
      const globalOpts = getGlobalOpts(this);
      try {
        const { RpcClient } = await import('../utils/rpc.js');
        const nodeUrl = resolveNodeUrl(globalOpts);
        const rpcClient = new RpcClient({ rpcUrl: nodeUrl, adminUrl: nodeUrl, pretty: true });

        const result = await rpcClient.call('node_getEnr', []);

        if (globalOpts.json) {
          console.log(JSON.stringify({ enr: result }, null, 2));
        } else {
          if (result) {
            console.log(result);
          } else {
            console.log('ENR not available');
          }
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  nodeCmd
    .command('base-fees')
    .description('Get current base fees')
    .action(async function(this: Command) {
      const globalOpts = getGlobalOpts(this);
      try {
        const { RpcClient } = await import('../utils/rpc.js');
        const nodeUrl = resolveNodeUrl(globalOpts);
        const rpcClient = new RpcClient({ rpcUrl: nodeUrl, adminUrl: nodeUrl, pretty: true });

        // Base fees come from node info in current Aztec API
        const info = await rpcClient.call('node_getNodeInfo', []);
        const fees = info?.baseFees ?? info?.gasFees ?? null;

        if (globalOpts.json) {
          console.log(JSON.stringify({
            baseFees: fees,
            feePerGas: fees?.feePerGas ?? null,
            feePerDaGas: fees?.feePerDaGas ?? null,
          }, null, 2));
        } else {
          console.log('Base Fees');
          console.log('='.repeat(40));
          if (fees) {
            console.log(`Fee Per Gas:    ${fees.feePerGas ?? 'N/A'}`);
            console.log(`Fee Per DA Gas: ${fees.feePerDaGas ?? 'N/A'}`);
          } else {
            console.log('Fee information not available');
          }
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  nodeCmd
    .command('sync-status')
    .description('Get sync status')
    .action(async function(this: Command) {
      const globalOpts = getGlobalOpts(this);
      try {
        const { RpcClient } = await import('../utils/rpc.js');
        const nodeUrl = resolveNodeUrl(globalOpts);
        const rpcClient = new RpcClient({ rpcUrl: nodeUrl, adminUrl: nodeUrl, pretty: true });

        // Get block numbers to determine sync status
        const [latest, proven] = await Promise.all([
          rpcClient.call('node_getBlockNumber', []),
          rpcClient.call('node_getProvenBlockNumber', []),
        ]);

        const synced = latest !== null && proven !== null;
        const behind = latest !== null && proven !== null ? latest - proven : null;

        if (globalOpts.json) {
          console.log(JSON.stringify({
            synced,
            latestBlock: latest,
            provenBlock: proven,
            blocksBehind: behind,
          }, null, 2));
        } else {
          console.log('Sync Status');
          console.log('='.repeat(40));
          console.log(`Status:        ${synced ? 'Synced' : 'Syncing'}`);
          console.log(`Latest Block:  ${latest ?? 'N/A'}`);
          console.log(`Proven Block:  ${proven ?? 'N/A'}`);
          if (behind !== null && behind > 0) {
            console.log(`Blocks Behind: ${behind}`);
          }
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });
}

// =============================================================================
// BRIDGE Commands - L1<->L2 messaging
// =============================================================================

function registerBridgeCommands(program: Command): void {
  const bridgeCmd = program.command('bridge').description('L1<->L2 messaging');

  bridgeCmd
    .command('l1-to-l2-witness')
    .description('Get L1->L2 message membership witness')
    .argument('<msgHash>', 'Message hash')
    .action(async function(this: Command, msgHash: string) {
      const globalOpts = getGlobalOpts(this);
      try {
        const { RpcClient } = await import('../utils/rpc.js');
        const nodeUrl = resolveNodeUrl(globalOpts);
        const rpcClient = new RpcClient({ rpcUrl: nodeUrl, adminUrl: nodeUrl, pretty: true });

        const result = await rpcClient.call('node_getL1ToL2MessageWitness', [msgHash]);

        if (!result) {
          console.error(`Error: No witness found for message ${msgHash}`);
          process.exit(1);
        }

        if (globalOpts.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log('L1->L2 Message Witness');
          console.log('='.repeat(40));
          console.log(`Message Hash: ${msgHash}`);
          console.log(`Index:        ${result.index ?? 'N/A'}`);
          console.log(`Leaf Value:   ${result.leafValue ?? 'N/A'}`);
          console.log(`Sibling Path: ${result.siblingPath?.length ?? 0} nodes`);
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  bridgeCmd
    .command('l1-to-l2-block')
    .description('Find block containing L1->L2 message')
    .argument('<msgHash>', 'Message hash')
    .action(async function(this: Command, msgHash: string) {
      const globalOpts = getGlobalOpts(this);
      try {
        const { RpcClient } = await import('../utils/rpc.js');
        const nodeUrl = resolveNodeUrl(globalOpts);
        const rpcClient = new RpcClient({ rpcUrl: nodeUrl, adminUrl: nodeUrl, pretty: true });

        const result = await rpcClient.call('node_getL1ToL2MessageBlockNumber', [msgHash]);

        if (globalOpts.json) {
          console.log(JSON.stringify({
            msgHash,
            blockNumber: result ?? null,
          }, null, 2));
        } else {
          if (result !== null && result !== undefined) {
            console.log(`Message found in block ${result}`);
          } else {
            console.log('Message not found in any block');
          }
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  bridgeCmd
    .command('is-l1-to-l2-synced')
    .description('Check if L1->L2 messages are synced')
    .argument('<blockNumber>', 'L1 block number')
    .action(async function(this: Command, blockNumber: string) {
      const globalOpts = getGlobalOpts(this);
      try {
        const { RpcClient } = await import('../utils/rpc.js');
        const nodeUrl = resolveNodeUrl(globalOpts);
        const rpcClient = new RpcClient({ rpcUrl: nodeUrl, adminUrl: nodeUrl, pretty: true });

        const result = await rpcClient.call('node_isL1ToL2MessageSynced', [parseInt(blockNumber, 10)]);

        if (globalOpts.json) {
          console.log(JSON.stringify({
            l1BlockNumber: parseInt(blockNumber, 10),
            synced: result ?? false,
          }, null, 2));
        } else {
          console.log(result ? 'Synced' : 'Not synced');
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  bridgeCmd
    .command('l2-to-l1')
    .description('Get L2->L1 messages')
    .argument('<blockNumber>', 'L2 block number')
    .action(async function(this: Command, blockNumber: string) {
      const globalOpts = getGlobalOpts(this);
      try {
        const { RpcClient } = await import('../utils/rpc.js');
        const nodeUrl = resolveNodeUrl(globalOpts);
        const rpcClient = new RpcClient({ rpcUrl: nodeUrl, adminUrl: nodeUrl, pretty: true });

        // Get block and extract L2->L1 messages from tx effects
        const block = await rpcClient.call('node_getBlock', [parseInt(blockNumber, 10), true]);

        if (!block) {
          console.error(`Error: Block ${blockNumber} not found`);
          process.exit(1);
        }

        const messages: string[] = [];
        if (block.body?.txEffects) {
          for (const effect of block.body.txEffects) {
            if (effect.l2ToL1Msgs) {
              messages.push(...effect.l2ToL1Msgs);
            }
          }
        }

        if (globalOpts.json) {
          console.log(JSON.stringify({
            blockNumber: parseInt(blockNumber, 10),
            count: messages.length,
            messages,
          }, null, 2));
        } else {
          console.log(`L2->L1 Messages in Block ${blockNumber}`);
          console.log('='.repeat(40));
          console.log(`Found: ${messages.length} messages`);
          console.log('');

          for (let i = 0; i < messages.length; i++) {
            console.log(`[${i + 1}] ${messages[i]}`);
          }
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  bridgeCmd
    .command('send-l1-to-l2')
    .description('Send message from L1 to L2')
    .requiredOption('--recipient <address>', 'L2 recipient address')
    .requiredOption('--content <hash>', 'Message content hash (32 bytes)')
    .requiredOption('--secret-hash <hash>', 'Secret hash for consumption (32 bytes)')
    .option('--l1-rpc-url <url>', 'L1 RPC URL (default: localhost:8545 for sandbox)')
    .option('--l1-private-key <key>', 'L1 private key (default: Anvil account 0)')
    .action(async function(this: Command, options: {
      recipient: string;
      content: string;
      secretHash: string;
      l1RpcUrl?: string;
      l1PrivateKey?: string;
    }) {
      const globalOpts = getGlobalOpts(this);
      try {
        const { RpcClient } = await import('../utils/rpc.js');
        const { sendL1ToL2Message, resolveL1RpcUrl, DEFAULT_ANVIL_PRIVATE_KEY } = await import('../utils/l1.js');

        // Get L1 addresses from node
        const nodeUrl = resolveNodeUrl(globalOpts);
        const rpcClient = new RpcClient({ rpcUrl: nodeUrl, adminUrl: nodeUrl, pretty: true });
        const l1Addresses = await rpcClient.call('node_getL1ContractAddresses', []);

        if (!l1Addresses?.inboxAddress) {
          throw new Error('Could not get L1 contract addresses from node');
        }

        // Resolve L1 RPC URL
        const l1RpcUrl = options.l1RpcUrl || (globalOpts.sandbox ? 'http://localhost:8545' : undefined);
        if (!l1RpcUrl) {
          throw new Error('L1 RPC URL required. Use --l1-rpc-url or --sandbox for localhost:8545');
        }

        // Send the message
        const result = await sendL1ToL2Message(
          {
            recipient: options.recipient,
            content: options.content,
            secretHash: options.secretHash,
          },
          {
            l1RpcUrl,
            l1Addresses: {
              rollupAddress: l1Addresses.rollupAddress,
              inboxAddress: l1Addresses.inboxAddress,
              outboxAddress: l1Addresses.outboxAddress,
              registryAddress: l1Addresses.registryAddress,
            },
            privateKey: options.l1PrivateKey || DEFAULT_ANVIL_PRIVATE_KEY,
          }
        );

        if (globalOpts.json) {
          console.log(JSON.stringify({
            success: true,
            txHash: result.txHash,
            msgHash: result.msgHash,
            globalLeafIndex: result.globalLeafIndex.toString(),
          }, null, 2));
        } else {
          console.log('L1→L2 Message Sent');
          console.log('='.repeat(40));
          console.log(`L1 Tx Hash:    ${result.txHash}`);
          console.log(`Message Hash:  ${result.msgHash}`);
          console.log(`Leaf Index:    ${result.globalLeafIndex}`);
          console.log('');
          console.log('Note: Message will be available on L2 after ~2 blocks.');
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  bridgeCmd
    .command('consume-l1-to-l2')
    .description('Info about consuming L1->L2 messages on L2')
    .option('--message-hash <hash>', 'Message hash to check')
    .action(async function(this: Command, options: { messageHash?: string }) {
      const globalOpts = getGlobalOpts(this);

      // L1→L2 message consumption happens inside contracts, not via CLI
      // This command provides guidance and can check if a message exists

      if (options.messageHash) {
        try {
          const { RpcClient } = await import('../utils/rpc.js');
          const nodeUrl = resolveNodeUrl(globalOpts);
          const rpcClient = new RpcClient({ rpcUrl: nodeUrl, adminUrl: nodeUrl, pretty: true });

          const blockNumber = await rpcClient.call('node_getL1ToL2MessageBlockNumber', [options.messageHash]);

          if (globalOpts.json) {
            console.log(JSON.stringify({
              messageHash: options.messageHash,
              available: blockNumber !== null,
              blockNumber: blockNumber ?? null,
            }, null, 2));
          } else {
            console.log('L1→L2 Message Status');
            console.log('='.repeat(40));
            console.log(`Hash:      ${options.messageHash}`);
            if (blockNumber !== null) {
              console.log(`Available: Yes (synced at block ${blockNumber})`);
              console.log('');
              console.log('This message can be consumed by a contract on L2.');
            } else {
              console.log('Available: No (not yet synced or invalid hash)');
              console.log('');
              console.log('Wait for ~2 L2 blocks after sending from L1.');
            }
          }
        } catch (error: any) {
          console.error(`Error: ${error.message}`);
          process.exit(1);
        }
      } else {
        // Show guidance
        console.log('L1→L2 Message Consumption');
        console.log('='.repeat(50));
        console.log('');
        console.log('L1→L2 messages are consumed BY CONTRACTS, not directly via CLI.');
        console.log('');
        console.log('Typical flow:');
        console.log('  1. Send message from L1:');
        console.log('     cazt --sandbox bridge send-l1-to-l2 \\');
        console.log('       --recipient <l2-contract> \\');
        console.log('       --content <data> \\');
        console.log('       --secret-hash <hash>');
        console.log('');
        console.log('  2. Wait ~2 L2 blocks for sync');
        console.log('');
        console.log('  3. Call your L2 contract function that internally calls:');
        console.log('     context.consume_l1_to_l2_message(...)');
        console.log('');
        console.log('To check if a message is available:');
        console.log('  cazt --sandbox bridge consume-l1-to-l2 --message-hash <hash>');
        console.log('');
        console.log('To see pending messages:');
        console.log('  cazt --sandbox bridge pending --direction l1-to-l2');
      }
    });

  bridgeCmd
    .command('status')
    .description('Check cross-chain message status')
    .argument('<msgHash>', 'Message hash')
    .action(async function(this: Command, msgHash: string) {
      const globalOpts = getGlobalOpts(this);
      try {
        const { RpcClient } = await import('../utils/rpc.js');
        const nodeUrl = resolveNodeUrl(globalOpts);
        const rpcClient = new RpcClient({ rpcUrl: nodeUrl, adminUrl: nodeUrl, pretty: true });

        // Try to find message in L1->L2 tree
        const blockNumber = await rpcClient.call('node_getL1ToL2MessageBlockNumber', [msgHash]);

        let status = 'unknown';
        if (blockNumber !== null && blockNumber !== undefined) {
          status = 'delivered';
        }

        if (globalOpts.json) {
          console.log(JSON.stringify({
            msgHash,
            status,
            blockNumber: blockNumber ?? null,
          }, null, 2));
        } else {
          console.log('Message Status');
          console.log('='.repeat(40));
          console.log(`Hash:   ${msgHash}`);
          console.log(`Status: ${status}`);
          if (blockNumber !== null) {
            console.log(`Block:  ${blockNumber}`);
          }
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  bridgeCmd
    .command('pending')
    .description('List pending cross-chain messages')
    .option('--direction <dir>', 'l1-to-l2, l2-to-l1, or all', 'all')
    .option('--l1-rpc-url <url>', 'L1 RPC URL (default: localhost:8545 for sandbox)')
    .option('--from-block <number>', 'Start block for query', '0')
    .option('--limit <number>', 'Maximum messages to return', '100')
    .action(async function(this: Command, options: {
      direction: string;
      l1RpcUrl?: string;
      fromBlock?: string;
      limit?: string;
    }) {
      const globalOpts = getGlobalOpts(this);
      try {
        const { RpcClient } = await import('../utils/rpc.js');
        const { getPendingL1ToL2Messages, getL2ToL1Messages } = await import('../utils/l1.js');

        // Get L1 addresses from node
        const nodeUrl = resolveNodeUrl(globalOpts);
        const rpcClient = new RpcClient({ rpcUrl: nodeUrl, adminUrl: nodeUrl, pretty: true });
        const l1Addresses = await rpcClient.call('node_getL1ContractAddresses', []);

        if (!l1Addresses?.inboxAddress) {
          throw new Error('Could not get L1 contract addresses from node');
        }

        // Resolve L1 RPC URL
        const l1RpcUrl = options.l1RpcUrl || (globalOpts.sandbox ? 'http://localhost:8545' : undefined);
        if (!l1RpcUrl) {
          throw new Error('L1 RPC URL required. Use --l1-rpc-url or --sandbox for localhost:8545');
        }

        const fromBlock = BigInt(options.fromBlock || '0');
        const limit = parseInt(options.limit || '100', 10);

        const results: {
          l1ToL2: Array<any>;
          l2ToL1: Array<any>;
        } = { l1ToL2: [], l2ToL1: [] };

        const ctx = {
          l1RpcUrl,
          l1Addresses: {
            rollupAddress: l1Addresses.rollupAddress,
            inboxAddress: l1Addresses.inboxAddress,
            outboxAddress: l1Addresses.outboxAddress,
            registryAddress: l1Addresses.registryAddress,
          },
        };

        // Query L1→L2 messages
        if (options.direction === 'all' || options.direction === 'l1-to-l2') {
          const l1ToL2Messages = await getPendingL1ToL2Messages(ctx, { fromBlock });
          results.l1ToL2 = l1ToL2Messages.slice(0, limit);
        }

        // Query L2→L1 messages
        if (options.direction === 'all' || options.direction === 'l2-to-l1') {
          const l2ToL1Messages = await getL2ToL1Messages(ctx, { fromBlock });
          results.l2ToL1 = l2ToL1Messages.slice(0, limit);
        }

        if (globalOpts.json) {
          console.log(JSON.stringify(results, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2));
        } else {
          console.log('Pending Cross-Chain Messages');
          console.log('='.repeat(60));

          if (options.direction === 'all' || options.direction === 'l1-to-l2') {
            console.log(`\nL1→L2 Messages (${results.l1ToL2.length} found):`);
            if (results.l1ToL2.length === 0) {
              console.log('  No pending messages');
            } else {
              for (const msg of results.l1ToL2) {
                console.log(`  Hash:        ${msg.msgHash}`);
                console.log(`  Index:       ${msg.index}`);
                console.log(`  L2 Block:    ${msg.l2BlockNumber}`);
                console.log(`  L1 Block:    ${msg.l1BlockNumber}`);
                console.log(`  L1 Tx:       ${msg.txHash}`);
                console.log('');
              }
            }
          }

          if (options.direction === 'all' || options.direction === 'l2-to-l1') {
            console.log(`\nL2→L1 Message Roots (${results.l2ToL1.length} found):`);
            if (results.l2ToL1.length === 0) {
              console.log('  No message roots');
            } else {
              for (const msg of results.l2ToL1) {
                console.log(`  Root:        ${msg.root}`);
                console.log(`  L2 Block:    ${msg.l2BlockNumber}`);
                console.log(`  L1 Block:    ${msg.l1BlockNumber}`);
                console.log(`  L1 Tx:       ${msg.txHash}`);
                console.log('');
              }
            }
          }
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });
}

