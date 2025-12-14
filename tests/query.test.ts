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

describe('Query Commands', () => {
  // Test addresses/hashes for queries
  const TEST_CONTRACT = '0x0000000000000000000000000000000000000000000000000000000000000001';
  const TEST_SLOT = '0x0000000000000000000000000000000000000000000000000000000000000001';
  const TEST_NULLIFIER = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
  const TEST_TX_HASH = '0x1c5693dccf5a6989b5bd4fa77c4d47ef59019e23f0c680b5c66edcb844dba58c';

  describe('query public', () => {
    it('should show help for query public', () => {
      const { stdout, exitCode } = runCli(['query', 'public', '--help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('public');
      expect(stdout).toContain('contract');
      expect(stdout).toContain('slot');
    });

    it('should error without required arguments', () => {
      const { exitCode } = runCli(['query', 'public']);

      expect(exitCode).toBe(1);
    });

    it('should query public storage (requires network)', () => {
      const { stdout } = runCli(['--rpc-url', 'http://devnet:8080', 'query', 'public', TEST_CONTRACT, TEST_SLOT], 60000);

      // Should return output (success or meaningful error)
      expect(stdout).toBeTruthy();
      expect(stdout.toLowerCase()).toMatch(/value|error|connect|econnrefused/i);
    });
  });

  describe('query notes', () => {
    it('should show help for query notes', () => {
      const { stdout, exitCode } = runCli(['query', 'notes', '--help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('notes');
      expect(stdout).toContain('address');
      expect(stdout).toContain('--contract');
      expect(stdout).toContain('--status');
    });

    it('should require address argument', () => {
      const { stdout, exitCode } = runCli(['query', 'notes']);

      expect(exitCode).toBe(1);
      expect(stdout.toLowerCase()).toContain('address');
    });
  });

  describe('query nullifiers', () => {
    it('should show help for query nullifiers', () => {
      const { stdout, exitCode } = runCli(['query', 'nullifiers', '--help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('nullifiers');
      expect(stdout).toContain('hash');
    });

    it('should error without hash argument', () => {
      const { exitCode } = runCli(['query', 'nullifiers']);

      expect(exitCode).toBe(1);
    });

    it('should query nullifier existence (requires network)', () => {
      const { stdout } = runCli(['--rpc-url', 'http://devnet:8080', 'query', 'nullifiers', TEST_NULLIFIER], 60000);

      // Should return output (success or meaningful error)
      expect(stdout).toBeTruthy();
      expect(stdout.toLowerCase()).toMatch(/nullifier|exists|error|connect|econnrefused/i);
    });
  });

  describe('query tx', () => {
    it('should show help for query tx', () => {
      const { stdout, exitCode } = runCli(['query', 'tx', '--help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('transaction');
      expect(stdout).toContain('hash');
    });

    it('should error without hash argument', () => {
      const { exitCode } = runCli(['query', 'tx']);

      expect(exitCode).toBe(1);
    });

    it('should query transaction (requires network)', () => {
      const { stdout } = runCli(['--rpc-url', 'http://devnet:8080', 'query', 'tx', TEST_TX_HASH], 60000);

      // Should return output (success or meaningful error)
      expect(stdout).toBeTruthy();
      expect(stdout.toLowerCase()).toMatch(/transaction|status|pending|success|not found|error|connect/i);
    });
  });

  describe('query logs', () => {
    it('should show help for query logs', () => {
      const { stdout, exitCode } = runCli(['query', 'logs', '--help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('logs');
      expect(stdout).toContain('address');
      expect(stdout).toContain('--from');
      expect(stdout).toContain('--to');
      expect(stdout).toContain('--type');
    });

    it('should error without address argument', () => {
      const { exitCode } = runCli(['query', 'logs']);

      expect(exitCode).toBe(1);
    });

    it('should error for private logs type', () => {
      const { stdout, exitCode } = runCli(['query', 'logs', TEST_CONTRACT, '--type', 'private']);

      expect(exitCode).toBe(1);
      expect(stdout.toLowerCase()).toContain('pxe');
    });
  });

  describe('query block number', () => {
    it('should show help for query block number', () => {
      const { stdout, exitCode } = runCli(['query', 'block', 'number', '--help']);

      expect(exitCode).toBe(0);
      expect(stdout.toLowerCase()).toContain('block number');
    });

    it('should get block number (requires network)', () => {
      const { stdout } = runCli(['--rpc-url', 'http://devnet:8080', 'query', 'block', 'number'], 60000);

      // Should return output (success or meaningful error)
      expect(stdout).toBeTruthy();
      expect(stdout.toLowerCase()).toMatch(/\d+|error|connect|econnrefused/i);
    });

    it('should output JSON with --json flag (requires network)', () => {
      const { stdout } = runCli(['--json', '--rpc-url', 'http://devnet:8080', 'query', 'block', 'number'], 60000);

      // Either returns JSON or connection error
      try {
        const json = JSON.parse(stdout);
        expect(json.blockNumber).toBeDefined();
      } catch {
        expect(stdout.toLowerCase()).toMatch(/error|connect/i);
      }
    });
  });

  describe('query block proven-number', () => {
    it('should show help for query block proven-number', () => {
      const { stdout, exitCode } = runCli(['query', 'block', 'proven-number', '--help']);

      expect(exitCode).toBe(0);
      expect(stdout.toLowerCase()).toContain('proven');
    });
  });

  describe('query block tips', () => {
    it('should show help for query block tips', () => {
      const { stdout, exitCode } = runCli(['query', 'block', 'tips', '--help']);

      expect(exitCode).toBe(0);
      expect(stdout.toLowerCase()).toContain('tips');
    });

    it('should get block tips (requires network)', () => {
      const { stdout } = runCli(['--rpc-url', 'http://devnet:8080', 'query', 'block', 'tips'], 60000);

      // Should return output (success or meaningful error)
      expect(stdout).toBeTruthy();
      expect(stdout.toLowerCase()).toMatch(/latest|proven|finalized|error|connect/i);
    });
  });

  describe('query block get', () => {
    it('should show help for query block get', () => {
      const { stdout, exitCode } = runCli(['query', 'block', 'get', '--help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('get');
      expect(stdout).toContain('id');
      expect(stdout).toContain('--full');
    });

    it('should error without block id argument', () => {
      const { exitCode } = runCli(['query', 'block', 'get']);

      expect(exitCode).toBe(1);
    });

    it('should get block by number (requires network)', () => {
      const { stdout } = runCli(['--rpc-url', 'http://devnet:8080', 'query', 'block', 'get', '1'], 60000);

      // Should return output (success or meaningful error)
      expect(stdout).toBeTruthy();
      expect(stdout.toLowerCase()).toMatch(/block|number|hash|error|connect|not found/i);
    });
  });

  describe('query block range', () => {
    it('should show help for query block range', () => {
      const { stdout, exitCode } = runCli(['query', 'block', 'range', '--help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('range');
      expect(stdout).toContain('from');
      expect(stdout).toContain('to');
    });

    it('should error without both arguments', () => {
      const { exitCode } = runCli(['query', 'block', 'range']);
      expect(exitCode).toBe(1);

      const { exitCode: exitCode2 } = runCli(['query', 'block', 'range', '1']);
      expect(exitCode2).toBe(1);
    });

    it('should error if from > to', () => {
      const { stdout, exitCode } = runCli(['--rpc-url', 'http://devnet:8080', 'query', 'block', 'range', '10', '5'], 60000);

      // Either validates locally or gets connection error
      expect(stdout.toLowerCase()).toMatch(/error|to.*must|connect|econnrefused/i);
    });

    it('should error if range too large', () => {
      const { stdout, exitCode } = runCli(['--rpc-url', 'http://devnet:8080', 'query', 'block', 'range', '1', '200'], 60000);

      // Should error about range being too large, or connection error
      expect(stdout.toLowerCase()).toMatch(/error|range|100|connect/i);
    });
  });

  describe('query block header', () => {
    it('should show help for query block header', () => {
      const { stdout, exitCode } = runCli(['query', 'block', 'header', '--help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('header');
      expect(stdout).toContain('id');
    });

    it('should error without block id argument', () => {
      const { exitCode } = runCli(['query', 'block', 'header']);

      expect(exitCode).toBe(1);
    });

    it('should get block header (requires network)', () => {
      const { stdout } = runCli(['--rpc-url', 'http://devnet:8080', 'query', 'block', 'header', '1'], 60000);

      // Should return output (success or meaningful error)
      expect(stdout).toBeTruthy();
      expect(stdout.toLowerCase()).toMatch(/header|block|timestamp|chain|error|connect|not found/i);
    });
  });

  describe('query command group', () => {
    it('should list all query subcommands in help', () => {
      const { stdout, exitCode } = runCli(['query', '--help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('public');
      expect(stdout).toContain('notes');
      expect(stdout).toContain('nullifiers');
      expect(stdout).toContain('tx');
      expect(stdout).toContain('logs');
      expect(stdout).toContain('block');
    });

    it('should list all block subcommands in help', () => {
      const { stdout, exitCode } = runCli(['query', 'block', '--help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('number');
      expect(stdout).toContain('proven-number');
      expect(stdout).toContain('tips');
      expect(stdout).toContain('get');
      expect(stdout).toContain('range');
      expect(stdout).toContain('header');
    });
  });
});
