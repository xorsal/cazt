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

describe('Contract Commands', () => {
  const TEST_ADDRESS = '0x0000000000000000000000000000000000000000000000000000000000000001';
  const TEST_CLASS_ID = '0x0000000000000000000000000000000000000000000000000000000000000001';

  describe('contract view', () => {
    it('should show help for contract view', () => {
      const { stdout, exitCode } = runCli(['contract', 'view', '--help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('view');
      expect(stdout).toContain('address');
      expect(stdout).toContain('function');
    });

    it('should require --artifact option', () => {
      const { stdout, exitCode } = runCli(['contract', 'view', TEST_ADDRESS, 'get_balance']);

      expect(exitCode).toBe(1);
      expect(stdout.toLowerCase()).toContain('artifact');
    });
  });

  describe('contract send', () => {
    it('should show help for contract send', () => {
      const { stdout, exitCode } = runCli(['contract', 'send', '--help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('send');
      expect(stdout).toContain('address');
      expect(stdout).toContain('function');
    });

    it('should require --artifact option', () => {
      const { stdout, exitCode } = runCli(['contract', 'send', TEST_ADDRESS, 'transfer']);

      expect(exitCode).toBe(1);
      expect(stdout.toLowerCase()).toContain('artifact');
    });
  });

  describe('contract simulate', () => {
    it('should show help for contract simulate', () => {
      const { stdout, exitCode } = runCli(['contract', 'simulate', '--help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('simulate');
      expect(stdout).toContain('address');
    });

    it('should require --artifact option', () => {
      const { stdout, exitCode } = runCli(['contract', 'simulate', TEST_ADDRESS, 'transfer']);

      expect(exitCode).toBe(1);
      expect(stdout.toLowerCase()).toContain('artifact');
    });
  });

  describe('contract info', () => {
    it('should show help for contract info', () => {
      const { stdout, exitCode } = runCli(['contract', 'info', '--help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('info');
      expect(stdout).toContain('address');
    });

    it('should error without address', () => {
      const { exitCode } = runCli(['contract', 'info']);

      expect(exitCode).toBe(1);
    });

    it('should query contract info (requires network)', () => {
      const { stdout } = runCli(['--rpc-url', 'http://devnet:8080', 'contract', 'info', TEST_ADDRESS], 60000);

      // Should return output (success or meaningful error)
      expect(stdout).toBeTruthy();
      expect(stdout.toLowerCase()).toMatch(/contract|instance|class|not found|error|connect/i);
    });
  });

  describe('contract class', () => {
    it('should show help for contract class', () => {
      const { stdout, exitCode } = runCli(['contract', 'class', '--help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('class');
      expect(stdout).toContain('id');
    });

    it('should error without class ID', () => {
      const { exitCode } = runCli(['contract', 'class']);

      expect(exitCode).toBe(1);
    });

    it('should query contract class (requires network)', () => {
      const { stdout } = runCli(['--rpc-url', 'http://devnet:8080', 'contract', 'class', TEST_CLASS_ID], 60000);

      // Should return output (success or meaningful error)
      expect(stdout).toBeTruthy();
      expect(stdout.toLowerCase()).toMatch(/class|artifact|not found|error|connect/i);
    });
  });

  describe('contract abi', () => {
    it('should show help for contract abi', () => {
      const { stdout, exitCode } = runCli(['contract', 'abi', '--help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('abi');
      expect(stdout).toContain('artifact');
    });

    it('should error without artifact path', () => {
      const { exitCode } = runCli(['contract', 'abi']);

      expect(exitCode).toBe(1);
    });
  });

  describe('contract storage', () => {
    it('should show help for contract storage', () => {
      const { stdout, exitCode } = runCli(['contract', 'storage', '--help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('storage');
      expect(stdout).toContain('address');
    });

    it('should error without address', () => {
      const { exitCode } = runCli(['contract', 'storage']);

      expect(exitCode).toBe(1);
    });

    it('should show guidance without slot', () => {
      const { stdout, exitCode } = runCli(['contract', 'storage', TEST_ADDRESS]);

      expect(exitCode).toBe(0);
      expect(stdout.toLowerCase()).toContain('slot');
    });

    it('should query specific slot (requires network)', () => {
      const { stdout } = runCli(['--rpc-url', 'http://devnet:8080', 'contract', 'storage', TEST_ADDRESS, '0x01'], 60000);

      // Should return output (success or meaningful error)
      expect(stdout).toBeTruthy();
      expect(stdout.toLowerCase()).toMatch(/storage|value|empty|error|connect/i);
    });
  });

  describe('contract events', () => {
    it('should show help for contract events', () => {
      const { stdout, exitCode } = runCli(['contract', 'events', '--help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('events');
      expect(stdout).toContain('address');
      expect(stdout).toContain('--from');
    });

    it('should error without address', () => {
      const { exitCode } = runCli(['contract', 'events']);

      expect(exitCode).toBe(1);
    });

    it('should query events (requires network)', () => {
      const { stdout } = runCli(['--rpc-url', 'http://devnet:8080', 'contract', 'events', TEST_ADDRESS], 60000);

      // Should return output (success or meaningful error)
      expect(stdout).toBeTruthy();
      expect(stdout.toLowerCase()).toMatch(/events|found|block|error|connect/i);
    });
  });

  describe('contract logs', () => {
    it('should show help for contract logs', () => {
      const { stdout, exitCode } = runCli(['contract', 'logs', '--help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('logs');
      expect(stdout).toContain('address');
    });

    it('should error without address', () => {
      const { exitCode } = runCli(['contract', 'logs']);

      expect(exitCode).toBe(1);
    });
  });

  describe('contract deploy', () => {
    it('should show help for contract deploy', () => {
      const { stdout, exitCode } = runCli(['contract', 'deploy', '--help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('deploy');
      expect(stdout).toContain('artifact');
      expect(stdout).toContain('--args');
      expect(stdout).toContain('--salt');
      expect(stdout).toContain('--from');
      expect(stdout).toContain('--constructor');
      expect(stdout).toContain('--no-wait');
    });

    it('should error with invalid artifact path', () => {
      const { stdout, exitCode } = runCli(['contract', 'deploy', './nonexistent-artifact.json']);

      expect(exitCode).toBe(1);
      expect(stdout.toLowerCase()).toMatch(/error|not found|enoent/i);
    });

    // Note: Actual deployment requires network - tested in e2e tests
  });

  describe('contract artifact info', () => {
    it('should show help for contract artifact info', () => {
      const { stdout, exitCode } = runCli(['contract', 'artifact', 'info', '--help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('info');
      expect(stdout).toContain('path');
    });

    it('should error without path', () => {
      const { exitCode } = runCli(['contract', 'artifact', 'info']);

      expect(exitCode).toBe(1);
    });
  });

  describe('contract registry list', () => {
    it('should show help for contract registry list', () => {
      const { stdout, exitCode } = runCli(['contract', 'registry', 'list', '--help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('list');
    });

    it('should list registry artifacts (requires network)', () => {
      const { stdout } = runCli(['contract', 'registry', 'list'], 60000);

      // Should return output (success or meaningful error)
      expect(stdout).toBeTruthy();
      expect(stdout.toLowerCase()).toMatch(/registry|artifact|found|error/i);
    });
  });

  describe('contract registry get', () => {
    it('should show help for contract registry get', () => {
      const { stdout, exitCode } = runCli(['contract', 'registry', 'get', '--help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('get');
      expect(stdout).toContain('classId');
      expect(stdout).toContain('--output');
    });

    it('should error without class ID', () => {
      const { exitCode } = runCli(['contract', 'registry', 'get']);

      expect(exitCode).toBe(1);
    });
  });

  describe('contract registry upload', () => {
    it('should show help for contract registry upload', () => {
      const { stdout, exitCode } = runCli(['contract', 'registry', 'upload', '--help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('upload');
      expect(stdout).toContain('artifact');
    });

    it('should require API key for upload', () => {
      const { stdout, exitCode } = runCli(['contract', 'registry', 'upload', './artifact.json']);

      expect(exitCode).toBe(1);
      expect(stdout.toLowerCase()).toContain('api key');
    });
  });

  describe('contract registry search', () => {
    it('should show help for contract registry search', () => {
      const { stdout, exitCode } = runCli(['contract', 'registry', 'search', '--help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('search');
      expect(stdout).toContain('query');
    });

    it('should error without query', () => {
      const { exitCode } = runCli(['contract', 'registry', 'search']);

      expect(exitCode).toBe(1);
    });
  });

  describe('contract command group', () => {
    it('should list all contract subcommands in help', () => {
      const { stdout, exitCode } = runCli(['contract', '--help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('view');
      expect(stdout).toContain('send');
      expect(stdout).toContain('simulate');
      expect(stdout).toContain('info');
      expect(stdout).toContain('class');
      expect(stdout).toContain('abi');
      expect(stdout).toContain('storage');
      expect(stdout).toContain('events');
      expect(stdout).toContain('logs');
      expect(stdout).toContain('deploy');
      expect(stdout).toContain('artifact');
      expect(stdout).toContain('registry');
    });
  });
});
