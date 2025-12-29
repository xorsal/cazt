import { execSync } from 'child_process';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLI_PATH = path.resolve(__dirname, '../bin/cazt');

// Test secret key for deterministic tests
const TEST_SECRET = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

/**
 * Helper function to escape shell arguments
 */
function escapeArg(arg: string): string {
  // If arg contains special characters, wrap in single quotes
  // and escape any single quotes within
  if (/[^a-zA-Z0-9_\-=.,:/]/.test(arg)) {
    return `'${arg.replace(/'/g, "'\\''")}'`;
  }
  return arg;
}

/**
 * Helper function to execute CLI command and return output
 */
function runCli(args: string[], timeout = 30000): { stdout: string; exitCode: number } {
  try {
    const escapedArgs = args.map(escapeArg).join(' ');
    const stdout = execSync(`${CLI_PATH} ${escapedArgs}`, {
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

describe('CLI Integration Tests', () => {
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

  describe('key derive', () => {
    it('should derive all keys from secret', () => {
      const { stdout, exitCode } = runCli(['key', 'derive', TEST_SECRET]);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('Derived Keys');
      expect(stdout).toContain('Address:');
      expect(stdout).toContain('Salt:');
      expect(stdout).toContain('Public Keys:');
    });

    it('should produce deterministic results', () => {
      const result1 = runCli(['--json', 'key', 'derive', TEST_SECRET]);
      const result2 = runCli(['--json', 'key', 'derive', TEST_SECRET]);

      expect(result1.exitCode).toBe(0);
      expect(result2.exitCode).toBe(0);
      expect(result1.stdout).toBe(result2.stdout);
    });

    it('should output JSON with --json flag', () => {
      const { stdout, exitCode } = runCli(['--json', 'key', 'derive', TEST_SECRET]);

      expect(exitCode).toBe(0);
      const json = JSON.parse(stdout);
      expect(json.address).toMatch(/^0x[0-9a-f]{64}$/i);
      expect(json.salt).toBeDefined();
      expect(json.publicKeys).toBeDefined();
      expect(json.publicKeys.masterNullifierPublicKey).toBeDefined();
      expect(json.publicKeys.masterIncomingViewingPublicKey).toBeDefined();
      expect(json.publicKeys.masterOutgoingViewingPublicKey).toBeDefined();
      expect(json.publicKeys.masterTaggingPublicKey).toBeDefined();
    });

    it('should use different salt when provided', () => {
      const result1 = runCli(['--json', 'key', 'derive', TEST_SECRET]);
      const result2 = runCli(['--json', 'key', 'derive', TEST_SECRET, '--salt', '0x01']);

      expect(result1.exitCode).toBe(0);
      expect(result2.exitCode).toBe(0);

      const json1 = JSON.parse(result1.stdout);
      const json2 = JSON.parse(result2.stdout);

      expect(json1.address).not.toBe(json2.address);
    });

    it('should error without secret key', () => {
      const { exitCode } = runCli(['key', 'derive']);

      expect(exitCode).toBe(1);
    });
  });

  describe('key sign', () => {
    const TEST_MESSAGE = 'HelloAztec';

    it('should sign a message', () => {
      const { stdout, exitCode } = runCli(['key', 'sign', TEST_SECRET, TEST_MESSAGE]);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('Signature');
      expect(stdout).toContain('Public Key:');
      expect(stdout).toContain('Signature:');
    });

    it('should output JSON with --json flag', () => {
      const { stdout, exitCode } = runCli(['--json', 'key', 'sign', TEST_SECRET, TEST_MESSAGE]);

      expect(exitCode).toBe(0);
      const json = JSON.parse(stdout);
      // Signature may or may not have 0x prefix
      expect(json.signature).toMatch(/^(0x)?[0-9a-f]+$/i);
      expect(json.publicKey).toBeDefined();
    });

    it('should produce different signatures for different messages', () => {
      const result1 = runCli(['--json', 'key', 'sign', TEST_SECRET, 'message1']);
      const result2 = runCli(['--json', 'key', 'sign', TEST_SECRET, 'message2']);

      expect(result1.exitCode).toBe(0);
      expect(result2.exitCode).toBe(0);

      const json1 = JSON.parse(result1.stdout);
      const json2 = JSON.parse(result2.stdout);

      expect(json1.signature).not.toBe(json2.signature);
    });

    // Note: Schnorr signatures are NOT deterministic by design (they use random nonces)
    // So we don't test for determinism here
  });

  describe('key verify', () => {
    it('should verify a valid signature', () => {
      // First sign a message (use simple message without spaces)
      const signResult = runCli(['--json', 'key', 'sign', TEST_SECRET, 'testmessage']);
      expect(signResult.exitCode).toBe(0);
      const signJson = JSON.parse(signResult.stdout);

      // Then verify it
      const { stdout, exitCode } = runCli([
        'key', 'verify',
        signJson.publicKey,
        'testmessage',
        signJson.signature
      ]);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('valid');
    });

    it('should reject an invalid signature', () => {
      // Sign a message
      const signResult = runCli(['--json', 'key', 'sign', TEST_SECRET, 'testmessage']);
      expect(signResult.exitCode).toBe(0);
      const signJson = JSON.parse(signResult.stdout);

      // Try to verify with wrong message
      const { exitCode } = runCli([
        'key', 'verify',
        signJson.publicKey,
        'wrongmessage',
        signJson.signature
      ]);

      // Should exit with 1 (invalid signature)
      expect(exitCode).toBe(1);
    });

    it('should output JSON with --json flag', () => {
      const signResult = runCli(['--json', 'key', 'sign', TEST_SECRET, 'test']);
      expect(signResult.exitCode).toBe(0);
      const signJson = JSON.parse(signResult.stdout);

      const { stdout, exitCode } = runCli([
        '--json', 'key', 'verify',
        signJson.publicKey,
        'test',
        signJson.signature
      ]);

      expect(exitCode).toBe(0);
      const json = JSON.parse(stdout);
      expect(json.valid).toBe(true);
    });
  });

  describe('wallet address', () => {
    it('should compute address from secret key', () => {
      const { stdout, exitCode } = runCli(['wallet', 'address', TEST_SECRET]);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('Account Address');
      expect(stdout).toContain('Address:');
      expect(stdout).toContain('Type:');
      expect(stdout).toContain('Salt:');
    });

    it('should produce deterministic addresses', () => {
      const result1 = runCli(['--json', 'wallet', 'address', TEST_SECRET]);
      const result2 = runCli(['--json', 'wallet', 'address', TEST_SECRET]);

      expect(result1.exitCode).toBe(0);
      expect(result2.exitCode).toBe(0);
      expect(result1.stdout).toBe(result2.stdout);
    });

    it('should output JSON with --json flag', () => {
      const { stdout, exitCode } = runCli(['--json', 'wallet', 'address', TEST_SECRET]);

      expect(exitCode).toBe(0);
      const json = JSON.parse(stdout);
      expect(json.address).toMatch(/^0x[0-9a-f]{64}$/i);
      expect(json.type).toBe('schnorr');
      expect(json.salt).toBeDefined();
    });

    it('should use different salt when provided', () => {
      const result1 = runCli(['--json', 'wallet', 'address', TEST_SECRET]);
      const result2 = runCli(['--json', 'wallet', 'address', TEST_SECRET, '--salt', '0x01']);

      expect(result1.exitCode).toBe(0);
      expect(result2.exitCode).toBe(0);

      const json1 = JSON.parse(result1.stdout);
      const json2 = JSON.parse(result2.stdout);

      expect(json1.address).not.toBe(json2.address);
    });

    it('should default to schnorr account type', () => {
      const result = runCli(['--json', 'wallet', 'address', TEST_SECRET]);

      expect(result.exitCode).toBe(0);
      const json = JSON.parse(result.stdout);
      expect(json.type).toBe('schnorr');
    });
  });

  describe('utility commands', () => {
    describe('address-zero', () => {
      it('should output zero address', () => {
        const { stdout, exitCode } = runCli(['address-zero']);

        expect(exitCode).toBe(0);
        expect(stdout).toContain('0x0000000000000000000000000000000000000000000000000000000000000000');
      });

      it('should work with alias', () => {
        const { stdout, exitCode } = runCli(['az']);

        expect(exitCode).toBe(0);
        expect(stdout).toContain('0x0000000000000000000000000000000000000000000000000000000000000000');
      });
    });

    describe('address-random', () => {
      it('should generate a random address', () => {
        const { stdout, exitCode } = runCli(['address-random']);

        expect(exitCode).toBe(0);
        expect(stdout).toMatch(/^0x[0-9a-f]{64}$/i);
      });

      it('should generate different addresses each time', () => {
        const result1 = runCli(['address-random']);
        const result2 = runCli(['address-random']);

        expect(result1.exitCode).toBe(0);
        expect(result2.exitCode).toBe(0);
        expect(result1.stdout).not.toBe(result2.stdout);
      });
    });

    describe('keccak', () => {
      it('should compute keccak hash for UTF-8 input', () => {
        const { stdout, exitCode } = runCli(['keccak', '1']);

        expect(exitCode).toBe(0);
        expect(stdout).toContain('0xc89efdaa54c0f20c7adf612882df0950f5a951637e0307cdcb4c672f298b8bc6');
      });

      it('should compute keccak hash for hex input', () => {
        const { stdout, exitCode } = runCli(['keccak', '0x01']);

        expect(exitCode).toBe(0);
        expect(stdout).toContain('0x5fe7f977e71dba2ea1a68e21057beebb9be2ac30c6410aa38d4f3fbe41dcffd2');
      });
    });

    describe('poseidon2', () => {
      it('should compute poseidon2 hash', () => {
        const { stdout, exitCode } = runCli(['poseidon2', '0x04,0x08']);

        expect(exitCode).toBe(0);
        expect(stdout).toBe('0x2bcaeb6d58bb38baf753d58c3c96618fea82163345295eb40e88344eeb0ce2a1');
      });
    });

    describe('pedersen', () => {
      it('should compute pedersen hash', () => {
        const { stdout, exitCode } = runCli(['pedersen', '0x01,0x01']);

        expect(exitCode).toBe(0);
        expect(stdout).toBe('0x07ebfbf4df29888c6cd6dca13d4bb9d1a923013ddbbcbdc3378ab8845463297b');
      });

      it('should use index parameter', () => {
        const { stdout, exitCode } = runCli(['pedersen', '0x01,0x01', '--index', '5']);

        expect(exitCode).toBe(0);
        expect(stdout).toBe('0x1c446df60816b897cda124524e6b03f36df0cec333fad87617aab70d7861daa6');
      });
    });

    describe('selector', () => {
      it('should compute function selector', () => {
        const result1 = runCli(['selector', 'transfer(address,uint256)']);
        const result2 = runCli(['sig', 'transfer(address,uint256)']);

        expect(result1.exitCode).toBe(0);
        expect(result2.exitCode).toBe(0);
        expect(result1.stdout).toBe(result2.stdout);
        expect(result1.stdout).toMatch(/^0x[0-9a-f]+$/i);
      });
    });
  });

  describe('help and version', () => {
    it('should show help', () => {
      const { stdout, exitCode } = runCli(['--help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('cazt');
      expect(stdout).toContain('Commands:');
    });

    it('should show version', () => {
      const { stdout, exitCode } = runCli(['--version']);

      expect(exitCode).toBe(0);
      expect(stdout).toMatch(/^\d+\.\d+\.\d+/);
    });

    it('should show key subcommand help', () => {
      const { stdout, exitCode } = runCli(['key', '--help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('generate');
      expect(stdout).toContain('derive');
      expect(stdout).toContain('sign');
      expect(stdout).toContain('verify');
    });

    it('should show wallet subcommand help', () => {
      const { stdout, exitCode } = runCli(['wallet', '--help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('deploy');
      expect(stdout).toContain('address');
      expect(stdout).toContain('info');
    });
  });
});
