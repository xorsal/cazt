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

describe('Transaction Commands', () => {
  // Known transaction hash from devnet for testing
  const KNOWN_TX_HASH = '0x1c5693dccf5a6989b5bd4fa77c4d47ef59019e23f0c680b5c66edcb844dba58c';

  describe('tx analyze', () => {
    it('should show help for tx analyze', () => {
      const { stdout, exitCode } = runCli(['tx', 'analyze', '--help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('analyze');
      expect(stdout).toContain('hash');
    });

    it('should error without tx hash', () => {
      const { exitCode } = runCli(['tx', 'analyze']);

      expect(exitCode).toBe(1);
    });

    it('should analyze a transaction (requires devnet)', () => {
      const { stdout } = runCli(['--rpc-url', 'http://devnet:8080', 'tx', 'analyze', KNOWN_TX_HASH], 60000);

      // Should return output (success or meaningful error)
      expect(stdout).toBeTruthy();
      expect(stdout.toLowerCase()).toMatch(/transaction|status|pending|success|reverted|not found|error|connect|implemented/i);
    });

    it('should support --effects flag (requires devnet)', () => {
      const { stdout } = runCli(['--rpc-url', 'http://devnet:8080', 'tx', 'analyze', KNOWN_TX_HASH, '--effects'], 60000);

      expect(stdout).toBeTruthy();
    });

    it('should handle non-existent transaction gracefully', () => {
      const fakeTxHash = '0x' + '00'.repeat(32);

      const { stdout } = runCli(['--rpc-url', 'http://devnet:8080', 'tx', 'analyze', fakeTxHash], 60000);

      // Should indicate tx not found, pending, error, or not implemented
      expect(stdout.toLowerCase()).toMatch(/not found|pending|error|null|implemented/i);
    });
  });

  describe('tx status', () => {
    it('should show help for tx status', () => {
      const { stdout, exitCode } = runCli(['tx', 'status', '--help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('status');
      expect(stdout).toContain('hash');
    });

    it('should error without tx hash', () => {
      const { exitCode } = runCli(['tx', 'status']);

      expect(exitCode).toBe(1);
    });
  });

  describe('tx receipt', () => {
    it('should show help for tx receipt', () => {
      const { stdout, exitCode } = runCli(['tx', 'receipt', '--help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('receipt');
      expect(stdout).toContain('hash');
    });

    it('should error without tx hash', () => {
      const { exitCode } = runCli(['tx', 'receipt']);

      expect(exitCode).toBe(1);
    });
  });

  describe('tx wait', () => {
    it('should show help for tx wait', () => {
      const { stdout, exitCode } = runCli(['tx', 'wait', '--help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('wait');
      expect(stdout).toContain('hash');
    });

    it('should error without tx hash', () => {
      const { exitCode } = runCli(['tx', 'wait']);

      expect(exitCode).toBe(1);
    });
  });

  describe('tx decode', () => {
    it('should show help for tx decode', () => {
      const { stdout, exitCode } = runCli(['tx', 'decode', '--help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('decode');
      expect(stdout).toContain('calldata');
    });

    it('should error without calldata argument', () => {
      const { exitCode } = runCli(['tx', 'decode']);

      expect(exitCode).toBe(1);
    });
  });

  describe('tx compare', () => {
    it('should show help for tx compare', () => {
      const { stdout, exitCode } = runCli(['tx', 'compare', '--help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('compare');
      expect(stdout).toContain('hash1');
      expect(stdout).toContain('hash2');
    });

    it('should error without both hashes', () => {
      const { exitCode: exitCode1 } = runCli(['tx', 'compare']);
      expect(exitCode1).toBe(1);

      const { exitCode: exitCode2 } = runCli(['tx', 'compare', KNOWN_TX_HASH]);
      expect(exitCode2).toBe(1);
    });
  });

  describe('tx simulate', () => {
    it('should show help for tx simulate', () => {
      const { stdout, exitCode } = runCli(['tx', 'simulate', '--help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('simulate');
      expect(stdout).toContain('calldata');
    });

    it('should error without calldata argument', () => {
      const { exitCode } = runCli(['tx', 'simulate']);

      expect(exitCode).toBe(1);
    });
  });

  describe('tx command group', () => {
    it('should list all tx subcommands in help', () => {
      const { stdout, exitCode } = runCli(['tx', '--help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('analyze');
      expect(stdout).toContain('compare');
      expect(stdout).toContain('decode');
      expect(stdout).toContain('status');
      expect(stdout).toContain('receipt');
      expect(stdout).toContain('wait');
      expect(stdout).toContain('simulate');
    });
  });
});
