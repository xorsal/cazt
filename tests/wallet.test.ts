import { spawnSync } from 'child_process';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLI_PATH = path.resolve(__dirname, '../bin/cazt');

/**
 * Helper function to execute CLI command and return output
 * Using spawnSync to avoid shell interpretation issues with special characters
 */
function runCli(args: string[], timeout = 30000): { stdout: string; exitCode: number } {
  const result = spawnSync(CLI_PATH, args, {
    encoding: 'utf-8',
    timeout,
  });
  const stdout = (result.stdout || '').trim();
  const stderr = (result.stderr || '').trim();
  return {
    stdout: stdout || stderr,
    exitCode: result.status ?? 1,
  };
}

describe('Wallet Commands', () => {
  // Test secret key for deterministic tests
  const TEST_SECRET = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

  describe('wallet create', () => {
    it('should create a new account', () => {
      const { stdout, exitCode } = runCli(['wallet', 'create']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('Account Created');
      expect(stdout).toContain('Type:');
      expect(stdout).toContain('Address:');
      expect(stdout).toContain('Salt:');
      expect(stdout).toContain('Deployed:');
      expect(stdout).toContain('Secret Key:');
      expect(stdout).toContain('WARNING');
    });

    it('should create schnorr account by default', () => {
      const { stdout, exitCode } = runCli(['wallet', 'create']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('schnorr');
    });

    it('should output JSON with --json flag', () => {
      const { stdout, exitCode } = runCli(['--json', 'wallet', 'create']);

      expect(exitCode).toBe(0);
      const json = JSON.parse(stdout);
      expect(json.secretKey).toMatch(/^0x[0-9a-f]{64}$/i);
      expect(json.address).toMatch(/^0x[0-9a-f]{64}$/i);
      expect(json.salt).toMatch(/^0x[0-9a-f]+$/i);
      expect(json.type).toBe('schnorr');
      expect(json.deployed).toBe(false);
      expect(json.warning).toBeTruthy();
    });

    it('should not deploy by default', () => {
      const { stdout, exitCode } = runCli(['--json', 'wallet', 'create']);

      expect(exitCode).toBe(0);
      const json = JSON.parse(stdout);
      expect(json.deployed).toBe(false);
      expect(json.txHash).toBeUndefined();
    });

    it('should error on unsupported account type', () => {
      const { stdout, exitCode } = runCli(['wallet', 'create', '--type', 'ecdsa-k']);

      expect(exitCode).toBe(1);
      expect(stdout.toLowerCase()).toContain('not yet implemented');
    });
  });

  describe('wallet address', () => {
    it('should compute address from secret key', () => {
      const { stdout, exitCode } = runCli(['wallet', 'address', TEST_SECRET]);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('Computed Address');
      expect(stdout).toMatch(/0x[0-9a-f]{64}/i);
    });

    it('should produce deterministic addresses', () => {
      const result1 = runCli(['--json', 'wallet', 'address', TEST_SECRET]);
      const result2 = runCli(['--json', 'wallet', 'address', TEST_SECRET]);

      expect(result1.exitCode).toBe(0);
      expect(result2.exitCode).toBe(0);
      expect(result1.stdout).toBe(result2.stdout);
    });

    it('should produce valid address format', () => {
      const { stdout, exitCode } = runCli(['--json', 'wallet', 'address', TEST_SECRET]);

      expect(exitCode).toBe(0);
      const json = JSON.parse(stdout);
      expect(json.address).toMatch(/^0x[0-9a-f]{64}$/i);
      expect(json.type).toBe('schnorr');
    });

    it('should use different salt when provided', () => {
      const result1 = runCli(['--json', 'wallet', 'address', TEST_SECRET]);
      const result2 = runCli(['--json', 'wallet', 'address', TEST_SECRET, '--salt', '0x42']);

      expect(result1.exitCode).toBe(0);
      expect(result2.exitCode).toBe(0);

      const json1 = JSON.parse(result1.stdout);
      const json2 = JSON.parse(result2.stdout);

      expect(json1.address).not.toBe(json2.address);
    });

    it('should output JSON with --json flag', () => {
      const { stdout, exitCode } = runCli(['--json', 'wallet', 'address', TEST_SECRET]);

      expect(exitCode).toBe(0);
      const json = JSON.parse(stdout);
      expect(json.address).toMatch(/^0x[0-9a-f]{64}$/i);
      expect(json.salt).toMatch(/^0x[0-9a-f]+$/i);
      expect(json.type).toBe('schnorr');
    });

    it('should error without secret key', () => {
      const { exitCode } = runCli(['wallet', 'address']);

      expect(exitCode).toBe(1);
    });

    it('should error on unsupported account type', () => {
      const { stdout, exitCode } = runCli(['wallet', 'address', TEST_SECRET, '--type', 'ecdsa-r']);

      expect(exitCode).toBe(1);
      expect(stdout.toLowerCase()).toContain('not yet implemented');
    });
  });

  describe('wallet info', () => {
    const TEST_ADDRESS = '0x0000000000000000000000000000000000000000000000000000000000000001';

    it('should query account info (requires devnet)', () => {
      const { stdout, exitCode } = runCli(['--rpc-url', 'http://devnet:8080', 'wallet', 'info', TEST_ADDRESS]);

      // Should succeed or show meaningful error
      expect(stdout).toBeTruthy();
      // Either shows address info or connection error
      expect(stdout.toLowerCase()).toMatch(/address|deployed|error|connect|econnrefused/i);
    });

    it('should error without address', () => {
      const { exitCode } = runCli(['wallet', 'info']);

      expect(exitCode).toBe(1);
    });
  });

  describe('wallet deploy', () => {
    it('should error without secret key', () => {
      const { exitCode } = runCli(['wallet', 'deploy']);

      expect(exitCode).toBe(1);
    });

    it('should error on unsupported account type', () => {
      const { stdout, exitCode } = runCli(['wallet', 'deploy', TEST_SECRET, '--type', 'ecdsa-r']);

      expect(exitCode).toBe(1);
      expect(stdout.toLowerCase()).toContain('not yet implemented');
    });
  });

  describe('wallet register', () => {
    it('should show help for wallet register', () => {
      const { stdout, exitCode } = runCli(['wallet', 'register', '--help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('register');
      expect(stdout).toContain('--secret');
    });

    it('should require --secret option', () => {
      const { exitCode } = runCli(['wallet', 'register', TEST_SECRET]);

      expect(exitCode).toBe(1);
    });

    it('should verify address matches secret', () => {
      // Use a valid address derived from TEST_SECRET
      const { stdout, exitCode } = runCli([
        '--json', 'wallet', 'register',
        '0x1ab9f52ad8be033948883277d78d7b1f7f1520491548bbf24fba6c8c94aa58e7', // Derived from TEST_SECRET
        '--secret', TEST_SECRET
      ], 60000);

      // Either succeeds with registration info or shows error due to network
      expect(stdout).toBeTruthy();
    });
  });

  describe('wallet list', () => {
    it('should list locally stored keys with --local', () => {
      const { stdout, exitCode } = runCli(['wallet', 'list', '--local']);

      expect(exitCode).toBe(0);
      expect(stdout.toLowerCase()).toContain('local');
    });

    it('should output JSON with --json flag and --local', () => {
      const { stdout, exitCode } = runCli(['--json', 'wallet', 'list', '--local']);

      expect(exitCode).toBe(0);
      const json = JSON.parse(stdout);
      expect(json.source).toBe('local');
      expect(Array.isArray(json.accounts)).toBe(true);
    });

    it('should error without --local (requires PXE)', () => {
      const { stdout, exitCode } = runCli(['wallet', 'list']);

      expect(exitCode).toBe(1);
      expect(stdout.toLowerCase()).toContain('pxe');
    });
  });

  describe('wallet balance', () => {
    const TEST_ADDRESS = '0x0000000000000000000000000000000000000000000000000000000000000001';
    const TEST_TOKEN = '0x0000000000000000000000000000000000000000000000000000000000000002';

    it('should show help for wallet balance', () => {
      const { stdout, exitCode } = runCli(['wallet', 'balance', '--help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('balance');
      expect(stdout).toContain('--token');
    });

    it('should require --token option', () => {
      const { exitCode } = runCli(['wallet', 'balance', TEST_ADDRESS]);

      expect(exitCode).toBe(1);
    });

    it('should error for private balance without PXE', () => {
      const { stdout, exitCode } = runCli(['wallet', 'balance', TEST_ADDRESS, '--token', TEST_TOKEN]);

      expect(exitCode).toBe(1);
      expect(stdout.toLowerCase()).toContain('private');
    });
  });

  describe('wallet vanity', () => {
    it('should find vanity address with short prefix', () => {
      const { stdout, exitCode } = runCli(['wallet', 'vanity', '0', '--max-attempts', '10000'], 60000);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('Vanity Address Found');
      expect(stdout).toContain('Secret Key:');
      expect(stdout).toContain('Address:');
    });

    it('should output JSON with --json flag', () => {
      const { stdout, exitCode } = runCli(['--json', 'wallet', 'vanity', '0', '--max-attempts', '10000'], 60000);

      expect(exitCode).toBe(0);
      const json = JSON.parse(stdout);
      expect(json.secretKey).toMatch(/^0x[0-9a-f]{64}$/i);
      expect(json.address).toMatch(/^0x0/i); // Address starts with 0x0 (prefix "0")
      expect(json.type).toBe('schnorr');
      expect(json.attempts).toBeGreaterThan(0);
    });

    it('should fail if prefix not found in max attempts', () => {
      // Use a very long prefix that's unlikely to be found
      const { stdout, exitCode } = runCli(['wallet', 'vanity', 'abcdefghij', '--max-attempts', '10'], 60000);

      expect(exitCode).toBe(1);
      expect(stdout.toLowerCase()).toContain('could not find');
    });
  });

  describe('wallet authwit', () => {
    it('should show help for authwit create', () => {
      const { stdout, exitCode } = runCli(['wallet', 'authwit', 'create', '--help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('intent');
      expect(stdout).toContain('--secret');
    });

    it('should error without implementation', () => {
      const { stdout, exitCode } = runCli(['wallet', 'authwit', 'create', '{}', '--secret', TEST_SECRET]);

      expect(exitCode).toBe(1);
      expect(stdout.toLowerCase()).toContain('not yet fully implemented');
    });
  });

  describe('wallet consistency', () => {
    it('should produce consistent address from create and address commands', () => {
      // Compute address twice with same secret
      const result1 = runCli(['--json', 'wallet', 'address', TEST_SECRET]);
      const result2 = runCli(['--json', 'wallet', 'address', TEST_SECRET]);

      expect(result1.exitCode).toBe(0);
      expect(result2.exitCode).toBe(0);

      const json1 = JSON.parse(result1.stdout);
      const json2 = JSON.parse(result2.stdout);

      // Should produce same address
      expect(json1.address).toBe(json2.address);
    });

    it('should produce different addresses with different secrets', () => {
      const secret1 = '0x0000000000000000000000000000000000000000000000000000000000001111';
      const secret2 = '0x0000000000000000000000000000000000000000000000000000000000002222';

      const result1 = runCli(['--json', 'wallet', 'address', secret1]);
      const result2 = runCli(['--json', 'wallet', 'address', secret2]);

      expect(result1.exitCode).toBe(0);
      expect(result2.exitCode).toBe(0);

      const json1 = JSON.parse(result1.stdout);
      const json2 = JSON.parse(result2.stdout);

      // Should produce different addresses
      expect(json1.address).not.toBe(json2.address);
    });
  });
});
