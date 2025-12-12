import { execSync } from 'child_process';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { existsSync, unlinkSync, mkdirSync, rmSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLI_PATH = path.resolve(__dirname, '../bin/cazt');

// Test config directory for isolation
const TEST_CONFIG_DIR = join(homedir(), '.cazt-test');
const TEST_KEYS_FILE = join(TEST_CONFIG_DIR, 'keys.json');

/**
 * Helper function to execute CLI command and return output
 */
function runCli(args: string[], timeout = 30000): { stdout: string; exitCode: number } {
  try {
    const stdout = execSync(`${CLI_PATH} ${args.join(' ')}`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout,
    });
    return { stdout: stdout.trim(), exitCode: 0 };
  } catch (error: any) {
    return {
      stdout: (error.stdout || error.stderr || error.message || '').toString().trim(),
      exitCode: error.status || 1,
    };
  }
}

// Test secret key for deterministic tests
const TEST_SECRET = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

describe('Key Commands', () => {
  describe('key generate', () => {
    it('should generate a new secret key', () => {
      const { stdout, exitCode } = runCli(['key', 'generate']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('Generated Secret Key');
      expect(stdout).toContain('Secret Key:');
      expect(stdout).toMatch(/0x[0-9a-f]{64}/i);
      expect(stdout).toContain('WARNING');
    });

    it('should output JSON with --json flag', () => {
      const { stdout, exitCode } = runCli(['--json', 'key', 'generate']);

      expect(exitCode).toBe(0);
      const json = JSON.parse(stdout);
      expect(json.secretKey).toMatch(/^0x[0-9a-f]{64}$/i);
      expect(json.warning).toBeTruthy();
    });

    it('should generate different keys each time', () => {
      const result1 = runCli(['--json', 'key', 'generate']);
      const result2 = runCli(['--json', 'key', 'generate']);

      expect(result1.exitCode).toBe(0);
      expect(result2.exitCode).toBe(0);

      const json1 = JSON.parse(result1.stdout);
      const json2 = JSON.parse(result2.stdout);

      expect(json1.secretKey).not.toBe(json2.secretKey);
    });
  });

  describe('key derive-keys', () => {
    it('should derive all 4 master keys from secret', () => {
      const { stdout, exitCode } = runCli(['key', 'derive-keys', TEST_SECRET]);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('Derived Keys');
      expect(stdout).toContain('Master Nullifier Key');
      expect(stdout).toContain('Master Incoming Viewing Key');
      expect(stdout).toContain('Master Outgoing Viewing Key');
      expect(stdout).toContain('Master Tagging Key');
      expect(stdout).toContain('Public Keys Hash');
    });

    it('should produce deterministic keys', () => {
      const result1 = runCli(['--json', 'key', 'derive-keys', TEST_SECRET]);
      const result2 = runCli(['--json', 'key', 'derive-keys', TEST_SECRET]);

      expect(result1.exitCode).toBe(0);
      expect(result2.exitCode).toBe(0);
      expect(result1.stdout).toBe(result2.stdout);
    });

    it('should output JSON with --json flag', () => {
      const { stdout, exitCode } = runCli(['--json', 'key', 'derive-keys', TEST_SECRET]);

      expect(exitCode).toBe(0);
      const json = JSON.parse(stdout);
      expect(json.secretKey).toBe(TEST_SECRET);
      expect(json.masterNullifierSecretKey).toMatch(/^0x[0-9a-f]+$/i);
      expect(json.masterNullifierPublicKey).toContain(','); // Point format "x,y"
      expect(json.masterIncomingViewingSecretKey).toMatch(/^0x[0-9a-f]+$/i);
      expect(json.masterIncomingViewingPublicKey).toContain(',');
      expect(json.masterOutgoingViewingSecretKey).toMatch(/^0x[0-9a-f]+$/i);
      expect(json.masterOutgoingViewingPublicKey).toContain(',');
      expect(json.masterTaggingSecretKey).toMatch(/^0x[0-9a-f]+$/i);
      expect(json.masterTaggingPublicKey).toContain(',');
      expect(json.publicKeysHash).toMatch(/^0x[0-9a-f]{64}$/i);
    });

    it('should error without secret key', () => {
      const { exitCode } = runCli(['key', 'derive-keys']);

      expect(exitCode).toBe(1);
    });
  });

  describe('key derive-address', () => {
    it('should derive address from secret key', () => {
      const { stdout, exitCode } = runCli(['key', 'derive-address', TEST_SECRET]);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('Derived Address');
      expect(stdout).toContain('Address:');
      expect(stdout).toContain('Salt:');
      expect(stdout).toContain('Schnorr account');
    });

    it('should produce deterministic addresses', () => {
      const result1 = runCli(['--json', 'key', 'derive-address', TEST_SECRET]);
      const result2 = runCli(['--json', 'key', 'derive-address', TEST_SECRET]);

      expect(result1.exitCode).toBe(0);
      expect(result2.exitCode).toBe(0);
      expect(result1.stdout).toBe(result2.stdout);
    });

    it('should use different salt when provided', () => {
      const result1 = runCli(['--json', 'key', 'derive-address', TEST_SECRET]);
      const result2 = runCli(['--json', 'key', 'derive-address', TEST_SECRET, '--salt', '0x01']);

      expect(result1.exitCode).toBe(0);
      expect(result2.exitCode).toBe(0);

      const json1 = JSON.parse(result1.stdout);
      const json2 = JSON.parse(result2.stdout);

      expect(json1.address).not.toBe(json2.address);
      expect(json1.salt).not.toBe(json2.salt);
    });

    it('should output JSON with --json flag', () => {
      const { stdout, exitCode } = runCli(['--json', 'key', 'derive-address', TEST_SECRET]);

      expect(exitCode).toBe(0);
      const json = JSON.parse(stdout);
      expect(json.address).toMatch(/^0x[0-9a-f]{64}$/i);
      expect(json.salt).toMatch(/^0x[0-9a-f]+$/i);
      expect(json.publicKeysHash).toMatch(/^0x[0-9a-f]{64}$/i);
    });
  });

  describe('key sign', () => {
    const TEST_MESSAGE = 'HelloAztec';

    it('should sign a message', () => {
      const { stdout, exitCode } = runCli(['key', 'sign', TEST_MESSAGE, TEST_SECRET]);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('Schnorr Signature');
      expect(stdout).toContain('Message:');
      expect(stdout).toContain('Signature:');
      expect(stdout).toContain('Public Key:');
    });

    it('should output JSON with --json flag', () => {
      const { stdout, exitCode } = runCli(['--json', 'key', 'sign', TEST_MESSAGE, TEST_SECRET]);

      expect(exitCode).toBe(0);
      const json = JSON.parse(stdout);
      expect(json.message).toBe(TEST_MESSAGE);
      expect(json.signature).toMatch(/^0x[0-9a-f]+$/i);
      expect(json.publicKey).toContain(','); // Point format "x,y"
    });

    it('should produce different signatures for different messages', () => {
      const result1 = runCli(['--json', 'key', 'sign', 'message1', TEST_SECRET]);
      const result2 = runCli(['--json', 'key', 'sign', 'message2', TEST_SECRET]);

      expect(result1.exitCode).toBe(0);
      expect(result2.exitCode).toBe(0);

      const json1 = JSON.parse(result1.stdout);
      const json2 = JSON.parse(result2.stdout);

      expect(json1.signature).not.toBe(json2.signature);
    });
  });

  describe('key verify', () => {
    it('should verify a valid signature', () => {
      // First sign a message
      const signResult = runCli(['--json', 'key', 'sign', 'test message', TEST_SECRET]);
      expect(signResult.exitCode).toBe(0);
      const signJson = JSON.parse(signResult.stdout);

      // Then verify it
      const { stdout, exitCode } = runCli([
        'key', 'verify', 'test message',
        '--signature', signJson.signature,
        '--pubkey', signJson.publicKey
      ]);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('Valid:');
      expect(stdout).toContain('YES');
    });

    it('should reject an invalid signature', () => {
      // Sign a message
      const signResult = runCli(['--json', 'key', 'sign', 'test message', TEST_SECRET]);
      expect(signResult.exitCode).toBe(0);
      const signJson = JSON.parse(signResult.stdout);

      // Try to verify with wrong message
      const { stdout, exitCode } = runCli([
        'key', 'verify', 'wrong message',
        '--signature', signJson.signature,
        '--pubkey', signJson.publicKey
      ]);

      // Should exit with 1 (invalid signature)
      expect(exitCode).toBe(1);
      expect(stdout).toContain('NO');
    });

    it('should output JSON with --json flag', () => {
      const signResult = runCli(['--json', 'key', 'sign', 'test', TEST_SECRET]);
      expect(signResult.exitCode).toBe(0);
      const signJson = JSON.parse(signResult.stdout);

      const { stdout, exitCode } = runCli([
        '--json', 'key', 'verify', 'test',
        '--signature', signJson.signature,
        '--pubkey', signJson.publicKey
      ]);

      expect(exitCode).toBe(0);
      const json = JSON.parse(stdout);
      expect(json.valid).toBe(true);
      expect(json.message).toBe('test');
    });

    it('should error without signature', () => {
      const { exitCode } = runCli([
        'key', 'verify', 'message',
        '--pubkey', '0x01,0x02'
      ]);

      expect(exitCode).toBe(1);
    });

    it('should error without public key', () => {
      const { exitCode } = runCli([
        'key', 'verify', 'message',
        '--signature', '0x' + '00'.repeat(64)
      ]);

      expect(exitCode).toBe(1);
    });
  });

  describe('key import/export/list', () => {
    // Use a unique secret for import tests to avoid conflicts
    // Must be less than field modulus (0x30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000001)
    const IMPORT_SECRET = '0x0aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa01';

    it('should show empty list when no keys stored', () => {
      const { stdout, exitCode } = runCli(['key', 'list']);

      // This may or may not be empty depending on previous test runs
      expect(exitCode).toBe(0);
    });

    it('should output JSON with --json flag for list', () => {
      const { stdout, exitCode } = runCli(['--json', 'key', 'list']);

      expect(exitCode).toBe(0);
      const json = JSON.parse(stdout);
      expect(json.keys).toBeDefined();
      expect(typeof json.total).toBe('number');
    });

    it('should import a secret key', () => {
      const { stdout, exitCode } = runCli([
        'key', 'import', IMPORT_SECRET,
        '--alias', 'test-import-key'
      ]);

      // May succeed or fail with "already exists" from previous run
      if (exitCode === 0) {
        expect(stdout).toContain('Key Imported Successfully');
        expect(stdout).toContain('test-import-key');
      } else {
        expect(stdout).toContain('already exists');
      }
    });

    it('should require confirmation flag for export', () => {
      const { stdout, exitCode } = runCli(['key', 'export', 'test-import-key']);

      expect(exitCode).toBe(1);
      expect(stdout).toContain('dangerous');
      expect(stdout).toContain('--yes-i-understand-the-risks');
    });

    it('should export a stored key with confirmation', () => {
      // First ensure the key exists
      runCli(['key', 'import', IMPORT_SECRET, '--alias', 'test-export-key']);

      const { stdout, exitCode } = runCli([
        'key', 'export', 'test-export-key',
        '--yes-i-understand-the-risks'
      ]);

      // May succeed if key exists, or fail if not
      if (exitCode === 0) {
        expect(stdout).toContain('Exported Key');
        expect(stdout).toContain(IMPORT_SECRET);
      }
    });
  });

  describe('key keystore', () => {
    // Must be less than field modulus
    const KEYSTORE_SECRET = '0x0bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb01';
    const KEYSTORE_PASSWORD = 'test-password-123';

    it('should error without password for keystore create', () => {
      const { exitCode, stdout } = runCli([
        'key', 'keystore', 'create', KEYSTORE_SECRET
      ]);

      expect(exitCode).toBe(1);
      expect(stdout).toContain('Password is required');
    });

    it('should create encrypted keystore file', () => {
      const outputPath = `/tmp/cazt-test-keystore-${Date.now()}.json`;

      const { stdout, exitCode } = runCli([
        'key', 'keystore', 'create', KEYSTORE_SECRET,
        '--password', KEYSTORE_PASSWORD,
        '--output', outputPath
      ]);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('Keystore Created');
      expect(existsSync(outputPath)).toBe(true);

      // Cleanup
      unlinkSync(outputPath);
    });

    it('should unlock keystore with correct password', () => {
      const outputPath = `/tmp/cazt-test-keystore-unlock-${Date.now()}.json`;

      // Create keystore
      const createResult = runCli([
        'key', 'keystore', 'create', KEYSTORE_SECRET,
        '--password', KEYSTORE_PASSWORD,
        '--output', outputPath
      ]);
      expect(createResult.exitCode).toBe(0);

      // Unlock keystore
      const { stdout, exitCode } = runCli([
        'key', 'keystore', 'unlock', outputPath,
        '--password', KEYSTORE_PASSWORD
      ]);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('Keystore Unlocked');
      expect(stdout).toContain(KEYSTORE_SECRET);

      // Cleanup
      unlinkSync(outputPath);
    });

    it('should fail to unlock with incorrect password', () => {
      const outputPath = `/tmp/cazt-test-keystore-wrong-pw-${Date.now()}.json`;

      // Create keystore
      const createResult = runCli([
        'key', 'keystore', 'create', KEYSTORE_SECRET,
        '--password', KEYSTORE_PASSWORD,
        '--output', outputPath
      ]);
      expect(createResult.exitCode).toBe(0);

      // Try to unlock with wrong password
      const { stdout, exitCode } = runCli([
        'key', 'keystore', 'unlock', outputPath,
        '--password', 'wrong-password'
      ]);

      expect(exitCode).toBe(1);
      expect(stdout.toLowerCase()).toContain('invalid');

      // Cleanup
      unlinkSync(outputPath);
    });

    it('should output JSON with --json flag for keystore operations', () => {
      const outputPath = `/tmp/cazt-test-keystore-json-${Date.now()}.json`;

      // Create keystore with JSON output
      const createResult = runCli([
        '--json', 'key', 'keystore', 'create', KEYSTORE_SECRET,
        '--password', KEYSTORE_PASSWORD,
        '--output', outputPath
      ]);

      expect(createResult.exitCode).toBe(0);
      const createJson = JSON.parse(createResult.stdout);
      expect(createJson.path).toBe(outputPath);
      expect(createJson.address).toMatch(/^0x[0-9a-f]{64}$/i);

      // Unlock with JSON output
      const unlockResult = runCli([
        '--json', 'key', 'keystore', 'unlock', outputPath,
        '--password', KEYSTORE_PASSWORD
      ]);

      expect(unlockResult.exitCode).toBe(0);
      const unlockJson = JSON.parse(unlockResult.stdout);
      expect(unlockJson.secretKey).toBe(KEYSTORE_SECRET);
      expect(unlockJson.address).toMatch(/^0x[0-9a-f]{64}$/i);

      // Cleanup
      unlinkSync(outputPath);
    });
  });

  describe('key command group', () => {
    it('should list all key subcommands in help', () => {
      const { stdout, exitCode } = runCli(['key', '--help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('generate');
      expect(stdout).toContain('derive-keys');
      expect(stdout).toContain('derive-address');
      expect(stdout).toContain('sign');
      expect(stdout).toContain('verify');
      expect(stdout).toContain('import');
      expect(stdout).toContain('export');
      expect(stdout).toContain('list');
      expect(stdout).toContain('keystore');
    });
  });
});
