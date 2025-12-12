import { spawnSync } from 'child_process';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLI_PATH = path.resolve(__dirname, '../bin/cazt');

/**
 * Helper function to execute CLI command and return output
 * Uses spawnSync to avoid shell interpretation issues with special characters
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

// Test values
const ZERO_FIELD = '0x0000000000000000000000000000000000000000000000000000000000000000';
const TEST_FIELD = '0x0000000000000000000000000000000000000000000000000000000000000001';
const TEST_FIELD_2 = '0x0000000000000000000000000000000000000000000000000000000000000002';
const TEST_ADDRESS = '0x0000000000000000000000000000000000000000000000000000000000000001';
const TEST_ETH_ADDRESS = '0x0000000000000000000000000000000000000001';

describe('Cast Commands', () => {
  // ===========================================================================
  // Hash Commands
  // ===========================================================================
  describe('cast hash', () => {
    describe('zero', () => {
      it('should return zero hash', () => {
        const { stdout, exitCode } = runCli(['cast', 'hash', 'zero']);
        expect(exitCode).toBe(0);
        expect(stdout).toBe(ZERO_FIELD);
      });

      it('should output JSON with --json flag', () => {
        const { stdout, exitCode } = runCli(['--json', 'cast', 'hash', 'zero']);
        expect(exitCode).toBe(0);
        const json = JSON.parse(stdout);
        expect(json.hash).toBe(ZERO_FIELD);
      });
    });

    describe('keccak', () => {
      it('should hash UTF-8 string', () => {
        const { stdout, exitCode } = runCli(['cast', 'hash', 'keccak', 'hello']);
        expect(exitCode).toBe(0);
        expect(stdout).toMatch(/^0x[0-9a-f]{64}$/i);
      });

      it('should hash hex data', () => {
        const { stdout, exitCode } = runCli(['cast', 'hash', 'keccak', '0x1234']);
        expect(exitCode).toBe(0);
        expect(stdout).toMatch(/^0x[0-9a-f]{64}$/i);
      });

      it('should error on odd hex digits', () => {
        const { stdout, exitCode } = runCli(['cast', 'hash', 'keccak', '0x123']);
        expect(exitCode).toBe(1);
        expect(stdout).toContain('odd number of digits');
      });

      it('should produce deterministic output', () => {
        const result1 = runCli(['cast', 'hash', 'keccak', 'hello']);
        const result2 = runCli(['cast', 'hash', 'keccak', 'hello']);
        expect(result1.stdout).toBe(result2.stdout);
      });
    });

    describe('sha256', () => {
      it('should hash UTF-8 string', () => {
        const { stdout, exitCode } = runCli(['cast', 'hash', 'sha256', 'hello']);
        expect(exitCode).toBe(0);
        expect(stdout).toMatch(/^0x[0-9a-f]{64}$/i);
      });

      it('should hash hex data', () => {
        const { stdout, exitCode } = runCli(['cast', 'hash', 'sha256', '0x1234']);
        expect(exitCode).toBe(0);
        expect(stdout).toMatch(/^0x[0-9a-f]{64}$/i);
      });
    });

    describe('poseidon2', () => {
      it('should hash field array', () => {
        const { stdout, exitCode } = runCli(['cast', 'hash', 'poseidon2', `["${TEST_FIELD}"]`]);
        expect(exitCode).toBe(0);
        expect(stdout).toMatch(/^0x[0-9a-f]{64}$/i);
      });

      it('should hash multiple fields', () => {
        const { stdout, exitCode } = runCli(['cast', 'hash', 'poseidon2', `["${TEST_FIELD}","${TEST_FIELD_2}"]`]);
        expect(exitCode).toBe(0);
        expect(stdout).toMatch(/^0x[0-9a-f]{64}$/i);
      });
    });

    describe('pedersen', () => {
      it('should hash field array', () => {
        const { stdout, exitCode } = runCli(['cast', 'hash', 'pedersen', `["${TEST_FIELD}"]`]);
        expect(exitCode).toBe(0);
        expect(stdout).toMatch(/^0x[0-9a-f]{64}$/i);
      });

      it('should accept --index option', () => {
        const { stdout, exitCode } = runCli(['cast', 'hash', 'pedersen', `["${TEST_FIELD}"]`, '--index', '1']);
        expect(exitCode).toBe(0);
        expect(stdout).toMatch(/^0x[0-9a-f]{64}$/i);
      });

      it('should produce different results with different indices', () => {
        const result1 = runCli(['cast', 'hash', 'pedersen', `["${TEST_FIELD}"]`, '--index', '0']);
        const result2 = runCli(['cast', 'hash', 'pedersen', `["${TEST_FIELD}"]`, '--index', '1']);
        expect(result1.stdout).not.toBe(result2.stdout);
      });
    });

    describe('secret', () => {
      it('should compute secret hash', () => {
        const { stdout, exitCode } = runCli(['cast', 'hash', 'secret', TEST_FIELD]);
        expect(exitCode).toBe(0);
        expect(stdout).toMatch(/^0x[0-9a-f]{64}$/i);
      });
    });
  });

  // ===========================================================================
  // Address Commands
  // ===========================================================================
  describe('cast address', () => {
    describe('zero', () => {
      it('should return zero address', () => {
        const { stdout, exitCode } = runCli(['cast', 'address', 'zero']);
        expect(exitCode).toBe(0);
        expect(stdout).toBe(ZERO_FIELD);
      });
    });

    describe('random', () => {
      it('should generate random address', () => {
        const { stdout, exitCode } = runCli(['cast', 'address', 'random']);
        expect(exitCode).toBe(0);
        expect(stdout).toMatch(/^0x[0-9a-f]{64}$/i);
      });

      it('should generate different addresses', () => {
        const result1 = runCli(['cast', 'address', 'random']);
        const result2 = runCli(['cast', 'address', 'random']);
        expect(result1.stdout).not.toBe(result2.stdout);
      });
    });

    describe('validate', () => {
      it('should validate correct address', () => {
        const { stdout, exitCode } = runCli(['cast', 'address', 'validate', TEST_ADDRESS]);
        expect(exitCode).toBe(0);
        expect(stdout).toContain('Valid');
      });
    });

    describe('from-field', () => {
      it('should create address from field', () => {
        const { stdout, exitCode } = runCli(['cast', 'address', 'from-field', TEST_FIELD]);
        expect(exitCode).toBe(0);
        expect(stdout).toMatch(/^0x[0-9a-f]{64}$/i);
      });
    });

    describe('from-bigint', () => {
      it('should create address from bigint', () => {
        const { stdout, exitCode } = runCli(['cast', 'address', 'from-bigint', '12345']);
        expect(exitCode).toBe(0);
        expect(stdout).toMatch(/^0x[0-9a-f]{64}$/i);
      });
    });

    describe('from-number', () => {
      it('should create address from number', () => {
        const { stdout, exitCode } = runCli(['cast', 'address', 'from-number', '12345']);
        expect(exitCode).toBe(0);
        expect(stdout).toMatch(/^0x[0-9a-f]{64}$/i);
      });
    });
  });

  // ===========================================================================
  // Eth Address Commands
  // ===========================================================================
  describe('cast eth', () => {
    describe('zero', () => {
      it('should return zero ETH address', () => {
        const { stdout, exitCode } = runCli(['cast', 'eth', 'zero']);
        expect(exitCode).toBe(0);
        expect(stdout).toMatch(/^0x0{40}$/i);
      });
    });

    describe('random', () => {
      it('should generate random ETH address', () => {
        const { stdout, exitCode } = runCli(['cast', 'eth', 'random']);
        expect(exitCode).toBe(0);
        expect(stdout).toMatch(/^0x[0-9a-f]{40}$/i);
      });
    });

    describe('validate', () => {
      it('should validate correct ETH address', () => {
        const { stdout, exitCode } = runCli(['cast', 'eth', 'validate', TEST_ETH_ADDRESS]);
        expect(exitCode).toBe(0);
        expect(stdout).toContain('Valid');
      });
    });

    describe('is-zero', () => {
      it('should return true for zero address', () => {
        const zeroEth = '0x0000000000000000000000000000000000000000';
        const { stdout, exitCode } = runCli(['cast', 'eth', 'is-zero', zeroEth]);
        expect(exitCode).toBe(0);
        expect(stdout).toBe('true');
      });

      it('should return false for non-zero address', () => {
        const { stdout, exitCode } = runCli(['cast', 'eth', 'is-zero', TEST_ETH_ADDRESS]);
        expect(exitCode).toBe(0);
        expect(stdout).toBe('false');
      });
    });

    describe('to-field', () => {
      it('should convert ETH address to field', () => {
        const { stdout, exitCode } = runCli(['cast', 'eth', 'to-field', TEST_ETH_ADDRESS]);
        expect(exitCode).toBe(0);
        expect(stdout).toMatch(/^0x[0-9a-f]{64}$/i);
      });
    });
  });

  // ===========================================================================
  // Field Commands
  // ===========================================================================
  describe('cast field', () => {
    describe('random', () => {
      it('should generate random field', () => {
        const { stdout, exitCode } = runCli(['cast', 'field', 'random']);
        expect(exitCode).toBe(0);
        expect(stdout).toMatch(/^0x[0-9a-f]{64}$/i);
      });

      it('should generate different fields', () => {
        const result1 = runCli(['cast', 'field', 'random']);
        const result2 = runCli(['cast', 'field', 'random']);
        expect(result1.stdout).not.toBe(result2.stdout);
      });
    });

    describe('from-string', () => {
      it('should convert hex string to field', () => {
        const { stdout, exitCode } = runCli(['cast', 'field', 'from-string', TEST_FIELD]);
        expect(exitCode).toBe(0);
        expect(stdout).toBe(TEST_FIELD);
      });
    });

    describe('from-bigint', () => {
      it('should convert bigint to field', () => {
        const { stdout, exitCode } = runCli(['cast', 'field', 'from-bigint', '12345']);
        expect(exitCode).toBe(0);
        expect(stdout).toMatch(/^0x[0-9a-f]{64}$/i);
      });
    });

    describe('to-bigint', () => {
      it('should convert field to bigint', () => {
        const { stdout, exitCode } = runCli(['cast', 'field', 'to-bigint', TEST_FIELD]);
        expect(exitCode).toBe(0);
        expect(stdout).toBe('1');
      });
    });

    describe('is-zero', () => {
      it('should return true for zero field', () => {
        const { stdout, exitCode } = runCli(['cast', 'field', 'is-zero', ZERO_FIELD]);
        expect(exitCode).toBe(0);
        expect(stdout).toBe('true');
      });

      it('should return false for non-zero field', () => {
        const { stdout, exitCode } = runCli(['cast', 'field', 'is-zero', TEST_FIELD]);
        expect(exitCode).toBe(0);
        expect(stdout).toBe('false');
      });
    });

    describe('equals', () => {
      it('should return true for equal fields', () => {
        const { stdout, exitCode } = runCli(['cast', 'field', 'equals', TEST_FIELD, TEST_FIELD]);
        expect(exitCode).toBe(0);
        expect(stdout).toBe('true');
      });

      it('should return false for different fields', () => {
        const { stdout, exitCode } = runCli(['cast', 'field', 'equals', TEST_FIELD, TEST_FIELD_2]);
        expect(exitCode).toBe(0);
        expect(stdout).toBe('false');
      });

      it('should output JSON with --json flag', () => {
        const { stdout, exitCode } = runCli(['--json', 'cast', 'field', 'equals', TEST_FIELD, TEST_FIELD]);
        expect(exitCode).toBe(0);
        const json = JSON.parse(stdout);
        expect(json.equals).toBe(true);
      });
    });
  });

  // ===========================================================================
  // Selector Commands
  // ===========================================================================
  describe('cast selector', () => {
    describe('compute', () => {
      it('should compute function selector', () => {
        const { stdout, exitCode } = runCli(['cast', 'selector', 'compute', 'transfer(address,uint256)']);
        expect(exitCode).toBe(0);
        expect(stdout).toMatch(/^0x[0-9a-f]{8}$/i);
      });

      it('should produce deterministic output', () => {
        const result1 = runCli(['cast', 'selector', 'compute', 'transfer(address,uint256)']);
        const result2 = runCli(['cast', 'selector', 'compute', 'transfer(address,uint256)']);
        expect(result1.stdout).toBe(result2.stdout);
      });
    });

    describe('event', () => {
      it('should compute event selector', () => {
        const { stdout, exitCode } = runCli(['cast', 'selector', 'event', 'Transfer(address,address,uint256)']);
        expect(exitCode).toBe(0);
        expect(stdout).toMatch(/^0x[0-9a-f]+$/i);
      });
    });

    describe('empty', () => {
      it('should return empty selector', () => {
        const { stdout, exitCode } = runCli(['cast', 'selector', 'empty']);
        expect(exitCode).toBe(0);
        expect(stdout).toBe('0x00000000');
      });
    });

    describe('from-field', () => {
      it('should create selector from field', () => {
        const { stdout, exitCode } = runCli(['cast', 'selector', 'from-field', TEST_FIELD]);
        expect(exitCode).toBe(0);
        expect(stdout).toMatch(/^0x[0-9a-f]{8}$/i);
      });
    });
  });

  // ===========================================================================
  // Nullifier Commands
  // ===========================================================================
  describe('cast nullifier', () => {
    describe('silo', () => {
      it('should silo nullifier with contract', () => {
        const { stdout, exitCode } = runCli([
          'cast', 'nullifier', 'silo',
          '--contract', TEST_ADDRESS,
          '--nullifier', TEST_FIELD,
        ]);
        expect(exitCode).toBe(0);
        expect(stdout).toMatch(/^0x[0-9a-f]{64}$/i);
      });

      it('should output JSON with --json flag', () => {
        const { stdout, exitCode } = runCli([
          '--json', 'cast', 'nullifier', 'silo',
          '--contract', TEST_ADDRESS,
          '--nullifier', TEST_FIELD,
        ]);
        expect(exitCode).toBe(0);
        const json = JSON.parse(stdout);
        expect(json.siloed).toMatch(/^0x[0-9a-f]{64}$/i);
      });
    });
  });

  // ===========================================================================
  // Note Commands
  // ===========================================================================
  describe('cast note', () => {
    describe('silo-hash', () => {
      it('should silo note hash with contract', () => {
        const { stdout, exitCode } = runCli([
          'cast', 'note', 'silo-hash',
          '--contract', TEST_ADDRESS,
          '--note-hash', TEST_FIELD,
        ]);
        expect(exitCode).toBe(0);
        expect(stdout).toMatch(/^0x[0-9a-f]{64}$/i);
      });
    });
  });

  // ===========================================================================
  // Misc Commands
  // ===========================================================================
  describe('cast misc', () => {
    describe('calldata-hash', () => {
      it('should hash calldata', () => {
        const { stdout, exitCode } = runCli(['cast', 'calldata-hash', `["${TEST_FIELD}"]`]);
        expect(exitCode).toBe(0);
        expect(stdout).toMatch(/^0x[0-9a-f]{64}$/i);
      });
    });

    describe('var-args-hash', () => {
      it('should hash var args', () => {
        const { stdout, exitCode } = runCli(['cast', 'var-args-hash', `["${TEST_FIELD}"]`]);
        expect(exitCode).toBe(0);
        expect(stdout).toMatch(/^0x[0-9a-f]{64}$/i);
      });
    });

    describe('public-data-slot', () => {
      it('should compute public data slot', () => {
        const { stdout, exitCode } = runCli([
          'cast', 'public-data-slot',
          '--contract', TEST_ADDRESS,
          '--slot', TEST_FIELD,
        ]);
        expect(exitCode).toBe(0);
        expect(stdout).toMatch(/^0x[0-9a-f]{64}$/i);
      });
    });

    describe('hash-vk', () => {
      it('should hash verification key', () => {
        const { stdout, exitCode } = runCli(['cast', 'hash-vk', `["${TEST_FIELD}"]`]);
        expect(exitCode).toBe(0);
        expect(stdout).toMatch(/^0x[0-9a-f]{64}$/i);
      });
    });
  });
});
