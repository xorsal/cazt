/**
 * KEY Commands - Key management
 */

import { Command } from 'commander';
import { WalletUtils } from '../utils/wallet.js';
import { KeyStorage } from '../utils/key-storage.js';
import { getGlobalOpts } from './helpers.js';

export function registerKeyCommands(program: Command): void {
  const keyCmd = program.command('key').description('Key management');

  // key generate
  keyCmd
    .command('generate')
    .description('Generate new secret key')
    .action(async function(this: Command) {
      const globalOpts = getGlobalOpts(this);
      try {
        const result = await WalletUtils.generateKey('{}');
        if (globalOpts.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log('Generated Secret Key');
          console.log('='.repeat(50));
          console.log('');
          console.log(`Secret Key: ${result.secretKey}`);
          console.log('');
          console.log(`WARNING: ${result.warning}`);
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  // key from-passphrase
  keyCmd
    .command('from-passphrase')
    .description('Derive secret key from passphrase (for testing)')
    .argument('<passphrase>', 'Passphrase to derive key from')
    .action(async function(this: Command, passphrase: string) {
      const globalOpts = getGlobalOpts(this);
      try {
        const result = await WalletUtils.deriveKeyFromPassphrase(
          JSON.stringify({ passphrase })
        );

        if (globalOpts.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log('Secret Key from Passphrase');
          console.log('══════════════════════════');
          console.log(`Passphrase: ${result.passphrase}`);
          console.log(`Secret Key: ${result.secretKey}`);
          console.log(`Address:    ${result.address}`);
          console.log('');
          console.log('⚠️  WARNING: This uses simple hashing without key stretching.');
          console.log('   NOT SECURE for production use - for testing only!');
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  // key derive-keys
  keyCmd
    .command('derive-keys')
    .description('Derive all 4 master keys from secret')
    .argument('<secret>', 'Secret key (hex)')
    .action(async function(this: Command, secret: string) {
      const globalOpts = getGlobalOpts(this);
      try {
        const result = await WalletUtils.deriveKeys(JSON.stringify({ secretKey: secret }));
        if (globalOpts.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(WalletUtils.formatDerivedKeysHumanReadable(result));
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  // key derive-address
  keyCmd
    .command('derive-address')
    .description('Compute address without deploying')
    .argument('<secret>', 'Secret key (hex)')
    .option('--salt <salt>', 'Salt for address derivation')
    .action(async function(this: Command, secret: string, options: { salt?: string }) {
      const globalOpts = getGlobalOpts(this);
      try {
        const result = await WalletUtils.deriveAddress(JSON.stringify({
          secretKey: secret,
          salt: options.salt,
        }));
        if (globalOpts.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(WalletUtils.formatDerivedAddressHumanReadable(result));
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  // key import
  keyCmd
    .command('import')
    .description('Import secret key to local storage')
    .argument('<secret>', 'Secret key (hex)')
    .option('--type <type>', 'Account type: schnorr, ecdsa-k, ecdsa-r', 'schnorr')
    .option('--alias <name>', 'Alias for the key')
    .action(async function(this: Command, secret: string, options: { type?: string; alias?: string }) {
      const globalOpts = getGlobalOpts(this);
      try {
        const result = await KeyStorage.importKey({
          secretKey: secret,
          alias: options.alias,
          type: options.type as 'schnorr' | 'ecdsa-k' | 'ecdsa-r',
        });
        if (globalOpts.json) {
          console.log(JSON.stringify({
            alias: result.alias,
            address: result.address,
            type: result.type,
            createdAt: result.createdAt,
          }, null, 2));
        } else {
          console.log('Key Imported Successfully');
          console.log('='.repeat(50));
          console.log('');
          console.log(`Alias:   ${result.alias}`);
          console.log(`Address: ${result.address}`);
          console.log(`Type:    ${result.type}`);
          console.log('');
          console.log('WARNING: The secret key is stored unencrypted.');
          console.log('Use "cazt key keystore create" for encrypted storage.');
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  // key export
  keyCmd
    .command('export')
    .description('Export secret key (requires confirmation)')
    .argument('<alias>', 'Key alias or address')
    .option('--yes-i-understand-the-risks', 'Confirm export')
    .action(async function(this: Command, alias: string, options: { yesIUnderstandTheRisks?: boolean }) {
      const globalOpts = getGlobalOpts(this);
      try {
        if (!options.yesIUnderstandTheRisks) {
          console.error('Error: Exporting a secret key is dangerous!');
          console.error('');
          console.error('Anyone with access to this key can control your account and funds.');
          console.error('');
          console.error('To confirm, re-run with --yes-i-understand-the-risks');
          process.exit(1);
        }

        const key = KeyStorage.exportKey(alias);
        if (!key) {
          console.error(`Error: Key not found: ${alias}`);
          process.exit(1);
        }

        if (globalOpts.json) {
          console.log(JSON.stringify(key, null, 2));
        } else {
          console.log('Exported Key');
          console.log('='.repeat(50));
          console.log('');
          console.log(`Alias:      ${key.alias}`);
          console.log(`Secret Key: ${key.secretKey}`);
          console.log(`Address:    ${key.address}`);
          console.log(`Type:       ${key.type}`);
          console.log('');
          console.log('WARNING: Keep this secret key secure!');
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  // key list
  keyCmd
    .command('list')
    .description('List stored keys')
    .action(async function(this: Command) {
      const globalOpts = getGlobalOpts(this);
      try {
        const keys = KeyStorage.listKeys();
        if (globalOpts.json) {
          console.log(JSON.stringify({ keys, total: keys.length }, null, 2));
        } else {
          console.log(KeyStorage.formatKeysHumanReadable(keys));
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  // key sign
  keyCmd
    .command('sign')
    .description('Sign message with Schnorr')
    .argument('<message>', 'Message to sign')
    .argument('<secret>', 'Secret key (hex)')
    .action(async function(this: Command, message: string, secret: string) {
      const globalOpts = getGlobalOpts(this);
      try {
        const result = await WalletUtils.signMessage(JSON.stringify({
          message,
          secretKey: secret,
        }));
        if (globalOpts.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log('Schnorr Signature');
          console.log('='.repeat(50));
          console.log('');
          console.log(`Message:    ${result.message}`);
          console.log(`Signature:  ${result.signature}`);
          console.log(`Public Key: ${result.publicKey}`);
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  // key verify
  keyCmd
    .command('verify')
    .description('Verify signature against public key')
    .argument('<message>', 'Original message')
    .requiredOption('--signature <sig>', 'Signature (hex)')
    .requiredOption('--pubkey <key>', 'Public key (x,y format)')
    .action(async function(this: Command, message: string, options: { signature: string; pubkey: string }) {
      const globalOpts = getGlobalOpts(this);
      try {
        const result = await WalletUtils.verifySignature(JSON.stringify({
          message,
          signature: options.signature,
          publicKey: options.pubkey,
        }));
        if (globalOpts.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log('Signature Verification');
          console.log('='.repeat(50));
          console.log('');
          console.log(`Message:    ${result.message}`);
          console.log(`Public Key: ${result.publicKey}`);
          console.log(`Valid:      ${result.valid ? 'YES' : 'NO'}`);
        }
        if (!result.valid) {
          process.exit(1);
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  // Keystore subcommands
  const keystoreCmd = keyCmd.command('keystore').description('Encrypted keystore operations');

  // key keystore create
  keystoreCmd
    .command('create')
    .description('Create password-encrypted keystore')
    .argument('<secret>', 'Secret key to encrypt')
    .option('--output <path>', 'Output file path')
    .option('--password <password>', 'Password for encryption')
    .action(async function(this: Command, secret: string, options: { output?: string; password?: string }) {
      const globalOpts = getGlobalOpts(this);
      try {
        // Get password from option or prompt
        let password = options.password;
        if (!password) {
          // For now, require password as option. In future, could add interactive prompt.
          console.error('Error: Password is required. Use --password <password>');
          process.exit(1);
        }

        // Compute address for the keystore metadata
        const derived = await WalletUtils.deriveAddress(JSON.stringify({ secretKey: secret }));

        const filePath = KeyStorage.createKeystore({
          secretKey: secret,
          password,
          address: derived.address,
          outputPath: options.output,
        });

        if (globalOpts.json) {
          console.log(JSON.stringify({
            path: filePath,
            address: derived.address,
          }, null, 2));
        } else {
          console.log('Keystore Created');
          console.log('='.repeat(50));
          console.log('');
          console.log(`File:    ${filePath}`);
          console.log(`Address: ${derived.address}`);
          console.log('');
          console.log('Keep your password safe! It cannot be recovered.');
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  // key keystore unlock
  keystoreCmd
    .command('unlock')
    .description('Unlock keystore for session')
    .argument('<file>', 'Keystore file path')
    .option('--password <password>', 'Password for decryption')
    .action(async function(this: Command, file: string, options: { password?: string }) {
      const globalOpts = getGlobalOpts(this);
      try {
        // Get password from option or prompt
        let password = options.password;
        if (!password) {
          console.error('Error: Password is required. Use --password <password>');
          process.exit(1);
        }

        const result = KeyStorage.unlockKeystore({
          filePath: file,
          password,
        });

        if (globalOpts.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log('Keystore Unlocked');
          console.log('='.repeat(50));
          console.log('');
          console.log(`Secret Key: ${result.secretKey}`);
          console.log(`Address:    ${result.address}`);
          console.log(`Type:       ${result.type}`);
          console.log('');
          console.log('WARNING: Keep this secret key secure!');
        }
      } catch (error: any) {
        if (error.message.includes('bad decrypt')) {
          console.error('Error: Invalid password');
        } else {
          console.error(`Error: ${error.message}`);
        }
        process.exit(1);
      }
    });
}
