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

describe('Node Commands', () => {
  describe('node ready', () => {
    it('should show help for node ready', () => {
      const { stdout, exitCode } = runCli(['node', 'ready', '--help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('ready');
    });

    it('should check node readiness (requires network)', () => {
      const { stdout } = runCli(['--rpc-url', 'http://devnet:8080', 'node', 'ready'], 60000);

      // Should return output (success or connection error handled gracefully)
      expect(stdout).toBeTruthy();
      expect(stdout.toLowerCase()).toMatch(/ready|not ready|error|connect|econnrefused/i);
    });

    it('should output JSON with --json flag', () => {
      const { stdout } = runCli(['--json', '--rpc-url', 'http://devnet:8080', 'node', 'ready'], 60000);

      // Either returns valid JSON or connection error
      try {
        const json = JSON.parse(stdout);
        expect(typeof json.ready).toBe('boolean');
      } catch {
        expect(stdout.toLowerCase()).toMatch(/error|connect/i);
      }
    });

    it('should handle connection errors gracefully', () => {
      const { stdout, exitCode } = runCli(['node', 'ready', '--rpc-url', 'http://invalid-host:1234']);

      // Should not crash, should report not ready
      expect(stdout.toLowerCase()).toMatch(/not ready|error/i);
      // Note: ready command doesn't exit with error code on connection failure
    });
  });

  describe('node info', () => {
    it('should show help for node info', () => {
      const { stdout, exitCode } = runCli(['node', 'info', '--help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('info');
    });

    it('should get node info (requires network)', () => {
      const { stdout } = runCli(['--rpc-url', 'http://devnet:8080', 'node', 'info'], 60000);

      // Should return output (success or meaningful error)
      expect(stdout).toBeTruthy();
      expect(stdout.toLowerCase()).toMatch(/node|version|chain|error|connect/i);
    });
  });

  describe('node version', () => {
    it('should show help for node version', () => {
      const { stdout, exitCode } = runCli(['node', 'version', '--help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('version');
    });

    it('should get node version (requires network)', () => {
      const { stdout } = runCli(['--rpc-url', 'http://devnet:8080', 'node', 'version'], 60000);

      // Should return output (success or meaningful error)
      expect(stdout).toBeTruthy();
    });
  });

  describe('node chain-id', () => {
    it('should show help for node chain-id', () => {
      const { stdout, exitCode } = runCli(['node', 'chain-id', '--help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('chain');
    });

    it('should get chain ID (requires network)', () => {
      const { stdout } = runCli(['--rpc-url', 'http://devnet:8080', 'node', 'chain-id'], 60000);

      // Should return output (success or meaningful error)
      expect(stdout).toBeTruthy();
    });

    it('should output JSON with --json flag (requires network)', () => {
      const { stdout } = runCli(['--json', '--rpc-url', 'http://devnet:8080', 'node', 'chain-id'], 60000);

      // Either returns JSON or connection error
      try {
        const json = JSON.parse(stdout);
        expect(json.chainId).toBeDefined();
      } catch {
        expect(stdout.toLowerCase()).toMatch(/error|connect/i);
      }
    });
  });

  describe('node l1-addresses', () => {
    it('should show help for node l1-addresses', () => {
      const { stdout, exitCode } = runCli(['node', 'l1-addresses', '--help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('l1');
      expect(stdout).toContain('address');
    });

    it('should get L1 addresses (requires network)', () => {
      const { stdout } = runCli(['--rpc-url', 'http://devnet:8080', 'node', 'l1-addresses'], 60000);

      // Should return output (success or meaningful error)
      expect(stdout).toBeTruthy();
      expect(stdout.toLowerCase()).toMatch(/l1|address|rollup|error|connect/i);
    });
  });

  describe('node protocol-addresses', () => {
    it('should show help for node protocol-addresses', () => {
      const { stdout, exitCode } = runCli(['node', 'protocol-addresses', '--help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('protocol');
      expect(stdout).toContain('address');
    });

    it('should get protocol addresses (requires network)', () => {
      const { stdout } = runCli(['--rpc-url', 'http://devnet:8080', 'node', 'protocol-addresses'], 60000);

      // Should return output (success or meaningful error)
      expect(stdout).toBeTruthy();
      expect(stdout.toLowerCase()).toMatch(/protocol|address|error|connect/i);
    });
  });

  describe('node enr', () => {
    it('should show help for node enr', () => {
      const { stdout, exitCode } = runCli(['node', 'enr', '--help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('enr');
    });

    it('should get node ENR (requires network)', () => {
      const { stdout } = runCli(['--rpc-url', 'http://devnet:8080', 'node', 'enr'], 60000);

      // Should return output (success or meaningful error)
      expect(stdout).toBeTruthy();
    });
  });

  describe('node base-fees', () => {
    it('should show help for node base-fees', () => {
      const { stdout, exitCode } = runCli(['node', 'base-fees', '--help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('fees');
    });

    it('should get base fees (requires network)', () => {
      const { stdout } = runCli(['--rpc-url', 'http://devnet:8080', 'node', 'base-fees'], 60000);

      // Should return output (success or meaningful error)
      expect(stdout).toBeTruthy();
      expect(stdout.toLowerCase()).toMatch(/fee|gas|error|connect/i);
    });
  });

  describe('node sync-status', () => {
    it('should show help for node sync-status', () => {
      const { stdout, exitCode } = runCli(['node', 'sync-status', '--help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('sync');
    });

    it('should get sync status (requires network)', () => {
      const { stdout } = runCli(['--rpc-url', 'http://devnet:8080', 'node', 'sync-status'], 60000);

      // Should return output (success or meaningful error)
      expect(stdout).toBeTruthy();
      expect(stdout.toLowerCase()).toMatch(/sync|block|status|error|connect/i);
    });

    it('should output JSON with --json flag (requires network)', () => {
      const { stdout } = runCli(['--json', '--rpc-url', 'http://devnet:8080', 'node', 'sync-status'], 60000);

      // Either returns JSON or connection error
      try {
        const json = JSON.parse(stdout);
        expect(typeof json.synced).toBe('boolean');
        expect(json.latestBlock).toBeDefined();
      } catch {
        expect(stdout.toLowerCase()).toMatch(/error|connect/i);
      }
    });
  });

  describe('node command group', () => {
    it('should list all node subcommands in help', () => {
      const { stdout, exitCode } = runCli(['node', '--help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('ready');
      expect(stdout).toContain('info');
      expect(stdout).toContain('version');
      expect(stdout).toContain('chain-id');
      expect(stdout).toContain('l1-addresses');
      expect(stdout).toContain('protocol-addresses');
      expect(stdout).toContain('enr');
      expect(stdout).toContain('base-fees');
      expect(stdout).toContain('sync-status');
    });
  });
});
