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

describe('Monitor Commands', () => {
  const TEST_ADDRESS = '0x0000000000000000000000000000000000000000000000000000000000000001';

  describe('monitor blocks', () => {
    it('should show help for monitor blocks', () => {
      const { stdout, exitCode } = runCli(['monitor', 'blocks', '--help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('blocks');
      expect(stdout).toContain('--proven');
      expect(stdout).toContain('--interval');
    });

    // Note: We don't test the actual monitoring as it runs indefinitely
  });

  describe('monitor nullifiers', () => {
    it('should show help for monitor nullifiers', () => {
      const { stdout, exitCode } = runCli(['monitor', 'nullifiers', '--help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('nullifiers');
      expect(stdout).toContain('--contract');
    });

    it('should error because not implemented', () => {
      const { stdout, exitCode } = runCli(['monitor', 'nullifiers']);

      expect(exitCode).toBe(1);
      expect(stdout.toLowerCase()).toContain('not');
    });
  });

  describe('monitor notes', () => {
    it('should show help for monitor notes', () => {
      const { stdout, exitCode } = runCli(['monitor', 'notes', '--help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('notes');
      expect(stdout).toContain('contract');
    });

    it('should error without contract', () => {
      const { exitCode } = runCli(['monitor', 'notes']);

      expect(exitCode).toBe(1);
    });

    // Note: We don't test actual monitoring as it runs indefinitely and polls PXE
  });

  describe('monitor address', () => {
    it('should show help for monitor address', () => {
      const { stdout, exitCode } = runCli(['monitor', 'address', '--help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('address');
      expect(stdout).toContain('--interval');
    });

    it('should error without address', () => {
      const { exitCode } = runCli(['monitor', 'address']);

      expect(exitCode).toBe(1);
    });

    // Note: We don't test the actual monitoring as it runs indefinitely
  });

  describe('monitor messages', () => {
    it('should show help for monitor messages', () => {
      const { stdout, exitCode } = runCli(['monitor', 'messages', '--help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('messages');
      expect(stdout).toContain('--direction');
    });

    it('should require L1 RPC URL', () => {
      const { stdout, exitCode } = runCli(['monitor', 'messages']);

      expect(exitCode).toBe(1);
      expect(stdout.toLowerCase()).toContain('l1 rpc');
    });
  });

  describe('monitor events', () => {
    it('should show help for monitor events', () => {
      const { stdout, exitCode } = runCli(['monitor', 'events', '--help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('events');
      expect(stdout).toContain('contract');
      expect(stdout).toContain('--event');
      expect(stdout).toContain('--artifact');
    });

    it('should error without contract', () => {
      const { exitCode } = runCli(['monitor', 'events']);

      expect(exitCode).toBe(1);
    });

    // Note: We don't test the actual monitoring as it runs indefinitely
  });

  describe('monitor logs', () => {
    it('should show help for monitor logs', () => {
      const { stdout, exitCode } = runCli(['monitor', 'logs', '--help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('logs');
      expect(stdout).toContain('--contract');
      expect(stdout).toContain('--interval');
    });

    // Note: We don't test the actual monitoring as it runs indefinitely
  });

  describe('monitor pending', () => {
    it('should show help for monitor pending', () => {
      const { stdout, exitCode } = runCli(['monitor', 'pending', '--help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('pending');
      expect(stdout).toContain('--from');
    });

    // Note: We don't test actual monitoring as it runs indefinitely and polls the node
  });

  describe('monitor command group', () => {
    it('should list all monitor subcommands in help', () => {
      const { stdout, exitCode } = runCli(['monitor', '--help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('blocks');
      expect(stdout).toContain('nullifiers');
      expect(stdout).toContain('notes');
      expect(stdout).toContain('address');
      expect(stdout).toContain('messages');
      expect(stdout).toContain('events');
      expect(stdout).toContain('logs');
      expect(stdout).toContain('pending');
    });
  });
});
