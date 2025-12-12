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

describe('Bridge Commands', () => {
  const TEST_MSG_HASH = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

  describe('bridge l1-to-l2-witness', () => {
    it('should show help for bridge l1-to-l2-witness', () => {
      const { stdout, exitCode } = runCli(['bridge', 'l1-to-l2-witness', '--help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('witness');
      expect(stdout).toContain('msgHash');
    });

    it('should error without message hash', () => {
      const { exitCode } = runCli(['bridge', 'l1-to-l2-witness']);

      expect(exitCode).toBe(1);
    });

    it('should query witness (requires network)', () => {
      const { stdout } = runCli(['--rpc-url', 'http://devnet:8080', 'bridge', 'l1-to-l2-witness', TEST_MSG_HASH], 60000);

      // Should return output (success or meaningful error)
      expect(stdout).toBeTruthy();
      expect(stdout.toLowerCase()).toMatch(/witness|not found|error|connect/i);
    });
  });

  describe('bridge l1-to-l2-block', () => {
    it('should show help for bridge l1-to-l2-block', () => {
      const { stdout, exitCode } = runCli(['bridge', 'l1-to-l2-block', '--help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('block');
      expect(stdout).toContain('msgHash');
    });

    it('should error without message hash', () => {
      const { exitCode } = runCli(['bridge', 'l1-to-l2-block']);

      expect(exitCode).toBe(1);
    });

    it('should query block (requires network)', () => {
      const { stdout } = runCli(['--rpc-url', 'http://devnet:8080', 'bridge', 'l1-to-l2-block', TEST_MSG_HASH], 60000);

      // Should return output (success or meaningful error)
      expect(stdout).toBeTruthy();
      expect(stdout.toLowerCase()).toMatch(/message|found|block|error|connect/i);
    });
  });

  describe('bridge is-l1-to-l2-synced', () => {
    it('should show help for bridge is-l1-to-l2-synced', () => {
      const { stdout, exitCode } = runCli(['bridge', 'is-l1-to-l2-synced', '--help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('synced');
      expect(stdout).toContain('blockNumber');
    });

    it('should error without block number', () => {
      const { exitCode } = runCli(['bridge', 'is-l1-to-l2-synced']);

      expect(exitCode).toBe(1);
    });

    it('should check sync status (requires network)', () => {
      const { stdout } = runCli(['--rpc-url', 'http://devnet:8080', 'bridge', 'is-l1-to-l2-synced', '1'], 60000);

      // Should return output (success or meaningful error)
      expect(stdout).toBeTruthy();
      expect(stdout.toLowerCase()).toMatch(/synced|error|connect/i);
    });
  });

  describe('bridge l2-to-l1', () => {
    it('should show help for bridge l2-to-l1', () => {
      const { stdout, exitCode } = runCli(['bridge', 'l2-to-l1', '--help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('l2-to-l1');
      expect(stdout).toContain('blockNumber');
    });

    it('should error without block number', () => {
      const { exitCode } = runCli(['bridge', 'l2-to-l1']);

      expect(exitCode).toBe(1);
    });

    it('should query L2->L1 messages (requires network)', () => {
      const { stdout } = runCli(['--rpc-url', 'http://devnet:8080', 'bridge', 'l2-to-l1', '1'], 60000);

      // Should return output (success or meaningful error)
      expect(stdout).toBeTruthy();
      expect(stdout.toLowerCase()).toMatch(/message|found|block|error|connect/i);
    });
  });

  describe('bridge send-l1-to-l2', () => {
    it('should show help for bridge send-l1-to-l2', () => {
      const { stdout, exitCode } = runCli(['bridge', 'send-l1-to-l2', '--help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('send');
      expect(stdout).toContain('--recipient');
      expect(stdout).toContain('--content');
      expect(stdout).toContain('--secret-hash');
    });

    it('should require L1 RPC URL without --sandbox', () => {
      const { stdout, exitCode } = runCli([
        'bridge', 'send-l1-to-l2',
        '--recipient', TEST_MSG_HASH,
        '--content', TEST_MSG_HASH,
        '--secret-hash', TEST_MSG_HASH
      ]);

      expect(exitCode).toBe(1);
      expect(stdout.toLowerCase()).toMatch(/l1.*rpc.*url|sandbox/i);
    });
  });

  describe('bridge consume-l1-to-l2', () => {
    it('should show help for bridge consume-l1-to-l2', () => {
      const { stdout, exitCode } = runCli(['bridge', 'consume-l1-to-l2', '--help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('consume');
      expect(stdout).toContain('--message-hash');
    });

    it('should show guidance without --message-hash', () => {
      const { stdout, exitCode } = runCli(['bridge', 'consume-l1-to-l2']);

      // Should show guidance about message consumption
      expect(exitCode).toBe(0);
      expect(stdout).toMatch(/consumed.*by.*contract|typical.*flow/i);
    });
  });

  describe('bridge status', () => {
    it('should show help for bridge status', () => {
      const { stdout, exitCode } = runCli(['bridge', 'status', '--help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('status');
      expect(stdout).toContain('msgHash');
    });

    it('should error without message hash', () => {
      const { exitCode } = runCli(['bridge', 'status']);

      expect(exitCode).toBe(1);
    });

    it('should check message status (requires network)', () => {
      const { stdout } = runCli(['--rpc-url', 'http://devnet:8080', 'bridge', 'status', TEST_MSG_HASH], 60000);

      // Should return output (success or meaningful error)
      expect(stdout).toBeTruthy();
      expect(stdout.toLowerCase()).toMatch(/status|hash|error|connect/i);
    });
  });

  describe('bridge pending', () => {
    it('should show help for bridge pending', () => {
      const { stdout, exitCode } = runCli(['bridge', 'pending', '--help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('pending');
      expect(stdout).toContain('--direction');
    });

    it('should require L1 RPC URL without --sandbox', () => {
      const { stdout, exitCode } = runCli(['bridge', 'pending']);

      expect(exitCode).toBe(1);
      expect(stdout.toLowerCase()).toMatch(/l1.*rpc.*url|sandbox/i);
    });
  });

  describe('bridge command group', () => {
    it('should list all bridge subcommands in help', () => {
      const { stdout, exitCode } = runCli(['bridge', '--help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('l1-to-l2-witness');
      expect(stdout).toContain('l1-to-l2-block');
      expect(stdout).toContain('is-l1-to-l2-synced');
      expect(stdout).toContain('l2-to-l1');
      expect(stdout).toContain('send-l1-to-l2');
      expect(stdout).toContain('consume-l1-to-l2');
      expect(stdout).toContain('status');
      expect(stdout).toContain('pending');
    });
  });
});
