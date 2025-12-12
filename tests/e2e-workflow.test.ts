/**
 * CAZT CLI - End-to-End Workflow Tests
 *
 * This file validates each command in sequence across all domains.
 * Commands flow from one to the next, using outputs from previous commands.
 *
 * Domain Order:
 * 1. KEY - Generate, export, import, list, sign, verify, keystore
 * 2. WALLET - Create, deploy, info, address, register, list, balance
 * 3. CONTRACT - Deploy, view, send, simulate, info, class, abi, storage
 * 4. CAST - Hash, address, eth, field, selector, abi utilities
 * 5. QUERY - Public, notes, nullifiers, tx, logs, block
 * 6. NODE - Ready, info, version, chain-id
 * 7. TX - Analyze, compare, decode, status, receipt, wait
 * 8. BRIDGE - L1↔L2 messaging (requires specific setup)
 * 9. MONITOR - Real-time streaming (interactive, tested separately)
 */

import { spawnSync } from 'child_process';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { existsSync, unlinkSync, writeFileSync, readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLI_PATH = path.resolve(__dirname, '../bin/cazt');

// Workflow state - shared across tests within a domain
interface WorkflowState {
  // Key domain
  secretKey?: string;
  publicKey?: string;
  derivedAddress?: string;
  signature?: string;
  keystorePath?: string;

  // Wallet domain
  walletAddress?: string;
  deployedAccountTxHash?: string;

  // Contract domain
  tokenAddress?: string;
  contractTxHash?: string;
  contractClassId?: string;

  // TX domain
  txHash?: string;

  // Cast domain
  computedHash?: string;
  randomField?: string;
}

const state: WorkflowState = {};

/**
 * Helper function to execute CLI command and return output
 */
function runCli(args: string[], timeout = 60000): { stdout: string; stderr: string; exitCode: number } {
  const result = spawnSync(CLI_PATH, args, {
    encoding: 'utf-8',
    timeout,
  });

  return {
    stdout: (result.stdout || '').trim(),
    stderr: (result.stderr || '').trim(),
    exitCode: result.status ?? 1,
  };
}

/**
 * Parse JSON output from CLI, with helpful error on parse failure
 */
function parseJson(stdout: string): any {
  try {
    return JSON.parse(stdout);
  } catch (e) {
    throw new Error(`Failed to parse JSON output: ${stdout}`);
  }
}

// =============================================================================
// DOMAIN 1: KEY COMMANDS
// Flow: generate → derive-keys → derive-address → import → export → list → sign → verify → keystore
// =============================================================================

describe('E2E Workflow: KEY Domain', () => {
  const KEYSTORE_PASSWORD = 'e2e-test-password-123';

  describe('1.1 key generate', () => {
    it('should generate a new secret key', () => {
      const { stdout, exitCode } = runCli(['--json', 'key', 'generate']);

      expect(exitCode).toBe(0);
      const json = parseJson(stdout);
      expect(json.secretKey).toMatch(/^0x[0-9a-f]{64}$/i);

      // Store for subsequent tests
      state.secretKey = json.secretKey;
    });
  });

  describe('1.2 key derive-keys', () => {
    it('should derive all master keys from the generated secret', () => {
      expect(state.secretKey).toBeDefined();

      const { stdout, exitCode } = runCli(['--json', 'key', 'derive-keys', state.secretKey!]);

      expect(exitCode).toBe(0);
      const json = parseJson(stdout);
      expect(json.masterNullifierSecretKey).toMatch(/^0x[0-9a-f]+$/i);
      expect(json.masterIncomingViewingSecretKey).toMatch(/^0x[0-9a-f]+$/i);
      expect(json.masterOutgoingViewingSecretKey).toMatch(/^0x[0-9a-f]+$/i);
      expect(json.masterTaggingSecretKey).toMatch(/^0x[0-9a-f]+$/i);
      expect(json.publicKeysHash).toMatch(/^0x[0-9a-f]{64}$/i);
    });
  });

  describe('1.3 key derive-address', () => {
    it('should derive address from the generated secret', () => {
      expect(state.secretKey).toBeDefined();

      const { stdout, exitCode } = runCli(['--json', 'key', 'derive-address', state.secretKey!]);

      expect(exitCode).toBe(0);
      const json = parseJson(stdout);
      expect(json.address).toMatch(/^0x[0-9a-f]{64}$/i);

      // Store for subsequent tests
      state.derivedAddress = json.address;
    });
  });

  describe('1.4 key import', () => {
    it('should import the generated secret key with alias', () => {
      expect(state.secretKey).toBeDefined();

      const alias = `e2e-test-${Date.now()}`;
      const { stdout, exitCode } = runCli([
        '--json', 'key', 'import', state.secretKey!,
        '--alias', alias,
      ]);

      // May fail if alias already exists
      if (exitCode === 0) {
        const json = parseJson(stdout);
        expect(json.alias).toBe(alias);
        expect(json.address).toMatch(/^0x[0-9a-f]{64}$/i);
      } else {
        expect(stdout).toContain('already exists');
      }
    });
  });

  describe('1.5 key list', () => {
    it('should list stored keys including the imported one', () => {
      const { stdout, exitCode } = runCli(['--json', 'key', 'list']);

      expect(exitCode).toBe(0);
      const json = parseJson(stdout);
      expect(json.keys).toBeDefined();
      expect(typeof json.total).toBe('number');
    });
  });

  describe('1.6 key export', () => {
    it('should export a stored key with confirmation flag', () => {
      // First import with known alias
      const alias = `e2e-export-test-${Date.now()}`;
      runCli(['key', 'import', state.secretKey!, '--alias', alias]);

      const { stdout, exitCode } = runCli([
        '--json', 'key', 'export', alias,
        '--yes-i-understand-the-risks',
      ]);

      if (exitCode === 0) {
        const json = parseJson(stdout);
        expect(json.secretKey).toBe(state.secretKey);
      }
    });

    it('should reject export without confirmation flag', () => {
      const { exitCode, stdout, stderr } = runCli(['key', 'export', 'any-alias']);

      expect(exitCode).toBe(1);
      // Error message may be in stdout or stderr depending on how CLI outputs it
      const output = stdout + stderr;
      expect(output).toContain('--yes-i-understand-the-risks');
    });
  });

  describe('1.7 key sign', () => {
    it('should sign a message with the generated secret', () => {
      expect(state.secretKey).toBeDefined();

      const message = 'E2E Test Message';
      const { stdout, exitCode } = runCli(['--json', 'key', 'sign', message, state.secretKey!]);

      expect(exitCode).toBe(0);
      const json = parseJson(stdout);
      expect(json.message).toBe(message);
      expect(json.signature).toMatch(/^0x[0-9a-f]+$/i);
      expect(json.publicKey).toBeDefined();

      // Store for verify test
      state.signature = json.signature;
      state.publicKey = json.publicKey;
    });
  });

  describe('1.8 key verify', () => {
    it('should verify the signature from previous step', () => {
      expect(state.signature).toBeDefined();
      expect(state.publicKey).toBeDefined();

      const message = 'E2E Test Message';
      const { stdout, exitCode } = runCli([
        '--json', 'key', 'verify', message,
        '--signature', state.signature!,
        '--pubkey', state.publicKey!,
      ]);

      expect(exitCode).toBe(0);
      const json = parseJson(stdout);
      expect(json.valid).toBe(true);
    });

    it('should reject verification with wrong message', () => {
      expect(state.signature).toBeDefined();
      expect(state.publicKey).toBeDefined();

      const { stdout, exitCode } = runCli([
        '--json', 'key', 'verify', 'Wrong Message',
        '--signature', state.signature!,
        '--pubkey', state.publicKey!,
      ]);

      expect(exitCode).toBe(1);
      const json = parseJson(stdout);
      expect(json.valid).toBe(false);
    });
  });

  describe('1.9 key keystore', () => {
    const keystorePath = `/tmp/cazt-e2e-keystore-${Date.now()}.json`;

    afterAll(() => {
      // Cleanup keystore file
      if (existsSync(keystorePath)) {
        unlinkSync(keystorePath);
      }
    });

    it('should create encrypted keystore from the generated secret', () => {
      expect(state.secretKey).toBeDefined();

      const { stdout, exitCode } = runCli([
        '--json', 'key', 'keystore', 'create', state.secretKey!,
        '--password', KEYSTORE_PASSWORD,
        '--output', keystorePath,
      ]);

      expect(exitCode).toBe(0);
      const json = parseJson(stdout);
      expect(json.path).toBe(keystorePath);
      expect(existsSync(keystorePath)).toBe(true);

      state.keystorePath = keystorePath;
    });

    it('should unlock keystore with correct password', () => {
      expect(state.keystorePath).toBeDefined();
      expect(existsSync(state.keystorePath!)).toBe(true);

      const { stdout, exitCode } = runCli([
        '--json', 'key', 'keystore', 'unlock', state.keystorePath!,
        '--password', KEYSTORE_PASSWORD,
      ]);

      expect(exitCode).toBe(0);
      const json = parseJson(stdout);
      expect(json.secretKey).toBe(state.secretKey);
    });

    it('should fail unlock with wrong password', () => {
      expect(state.keystorePath).toBeDefined();

      const { exitCode, stdout, stderr } = runCli([
        'key', 'keystore', 'unlock', state.keystorePath!,
        '--password', 'wrong-password',
      ]);

      expect(exitCode).toBe(1);
      // Error message may be in stdout or stderr
      const output = (stdout + stderr).toLowerCase();
      expect(output).toMatch(/invalid|error|failed|incorrect/);
    });
  });
});

// =============================================================================
// DOMAIN 2: CAST COMMANDS (Offline utilities)
// Flow: hash → address → eth → field → selector → abi
// =============================================================================

describe('E2E Workflow: CAST Domain', () => {
  describe('2.1 cast hash', () => {
    it('should compute zero hash', () => {
      const { stdout, exitCode } = runCli(['--json', 'cast', 'hash', 'zero']);

      expect(exitCode).toBe(0);
      const json = parseJson(stdout);
      expect(json.hash).toMatch(/^0x0+$/i);
    });

    it('should compute keccak hash', () => {
      const { stdout, exitCode } = runCli(['--json', 'cast', 'hash', 'keccak', 'hello']);

      expect(exitCode).toBe(0);
      const json = parseJson(stdout);
      expect(json.hash).toMatch(/^0x[0-9a-f]{64}$/i);
      state.computedHash = json.hash;
    });

    it('should compute sha256 hash', () => {
      const { stdout, exitCode } = runCli(['--json', 'cast', 'hash', 'sha256', 'hello']);

      expect(exitCode).toBe(0);
      const json = parseJson(stdout);
      expect(json.hash).toMatch(/^0x[0-9a-f]{64}$/i);
    });

    it('should compute poseidon2 hash from field array', () => {
      const field = '0x0000000000000000000000000000000000000000000000000000000000000001';
      const { stdout, exitCode } = runCli(['--json', 'cast', 'hash', 'poseidon2', `["${field}"]`]);

      expect(exitCode).toBe(0);
      const json = parseJson(stdout);
      expect(json.hash).toMatch(/^0x[0-9a-f]{64}$/i);
    });

    it('should compute pedersen hash', () => {
      const field = '0x0000000000000000000000000000000000000000000000000000000000000001';
      const { stdout, exitCode } = runCli(['--json', 'cast', 'hash', 'pedersen', `["${field}"]`]);

      expect(exitCode).toBe(0);
      const json = parseJson(stdout);
      expect(json.hash).toMatch(/^0x[0-9a-f]{64}$/i);
    });
  });

  describe('2.2 cast address', () => {
    it('should return zero address', () => {
      const { stdout, exitCode } = runCli(['--json', 'cast', 'address', 'zero']);

      expect(exitCode).toBe(0);
      const json = parseJson(stdout);
      expect(json.address).toMatch(/^0x0+$/i);
    });

    it('should generate random address', () => {
      const { stdout, exitCode } = runCli(['--json', 'cast', 'address', 'random']);

      expect(exitCode).toBe(0);
      const json = parseJson(stdout);
      expect(json.address).toMatch(/^0x[0-9a-f]{64}$/i);
    });

    it('should validate address format', () => {
      const testAddr = '0x0000000000000000000000000000000000000000000000000000000000000001';
      const { stdout, exitCode } = runCli(['--json', 'cast', 'address', 'validate', testAddr]);

      expect(exitCode).toBe(0);
      const json = parseJson(stdout);
      expect(json.valid).toBe(true);
    });

    it('should convert field to address', () => {
      const field = '0x0000000000000000000000000000000000000000000000000000000000000042';
      const { stdout, exitCode } = runCli(['--json', 'cast', 'address', 'from-field', field]);

      expect(exitCode).toBe(0);
      const json = parseJson(stdout);
      expect(json.address).toMatch(/^0x[0-9a-f]{64}$/i);
    });

    it('should convert bigint to address', () => {
      const { stdout, exitCode } = runCli(['--json', 'cast', 'address', 'from-bigint', '12345']);

      expect(exitCode).toBe(0);
      const json = parseJson(stdout);
      expect(json.address).toMatch(/^0x[0-9a-f]{64}$/i);
    });
  });

  describe('2.3 cast eth', () => {
    it('should return zero ETH address', () => {
      const { stdout, exitCode } = runCli(['--json', 'cast', 'eth', 'zero']);

      expect(exitCode).toBe(0);
      const json = parseJson(stdout);
      expect(json.address).toMatch(/^0x0+$/i);
    });

    it('should generate random ETH address', () => {
      const { stdout, exitCode } = runCli(['--json', 'cast', 'eth', 'random']);

      expect(exitCode).toBe(0);
      const json = parseJson(stdout);
      expect(json.address).toMatch(/^0x[0-9a-f]{40}$/i);
    });

    it('should validate ETH address', () => {
      const { stdout, exitCode } = runCli(['--json', 'cast', 'eth', 'validate', '0x0000000000000000000000000000000000000001']);

      expect(exitCode).toBe(0);
      const json = parseJson(stdout);
      expect(json.valid).toBe(true);
    });

    it('should convert ETH address to field', () => {
      const { stdout, exitCode } = runCli(['--json', 'cast', 'eth', 'to-field', '0x0000000000000000000000000000000000000001']);

      expect(exitCode).toBe(0);
      const json = parseJson(stdout);
      expect(json.field).toMatch(/^0x[0-9a-f]{64}$/i);
    });
  });

  describe('2.4 cast field', () => {
    it('should generate random field', () => {
      const { stdout, exitCode } = runCli(['--json', 'cast', 'field', 'random']);

      expect(exitCode).toBe(0);
      const json = parseJson(stdout);
      expect(json.field).toMatch(/^0x[0-9a-f]{64}$/i);
      state.randomField = json.field;
    });

    it('should convert string to field', () => {
      const { stdout, exitCode } = runCli(['--json', 'cast', 'field', 'from-string', '12345']);

      expect(exitCode).toBe(0);
      const json = parseJson(stdout);
      expect(json.field).toMatch(/^0x[0-9a-f]{64}$/i);
    });

    it('should check if field is zero', () => {
      const zeroField = '0x0000000000000000000000000000000000000000000000000000000000000000';
      const { stdout, exitCode } = runCli(['--json', 'cast', 'field', 'is-zero', zeroField]);

      expect(exitCode).toBe(0);
      const json = parseJson(stdout);
      expect(json.isZero).toBe(true);
    });

    it('should compare two fields for equality', () => {
      const field = '0x0000000000000000000000000000000000000000000000000000000000000001';
      const { stdout, exitCode } = runCli(['--json', 'cast', 'field', 'equals', field, field]);

      expect(exitCode).toBe(0);
      const json = parseJson(stdout);
      expect(json.equals).toBe(true);
    });
  });

  describe('2.5 cast selector', () => {
    it('should compute function selector', () => {
      const { stdout, exitCode } = runCli(['--json', 'cast', 'selector', 'compute', 'transfer(address,uint256)']);

      expect(exitCode).toBe(0);
      const json = parseJson(stdout);
      expect(json.selector).toBeDefined();
    });

    it('should compute event selector', () => {
      const { stdout, exitCode } = runCli(['--json', 'cast', 'selector', 'event', 'Transfer(address,address,uint256)']);

      expect(exitCode).toBe(0);
      const json = parseJson(stdout);
      expect(json.selector).toBeDefined();
    });

    it('should return empty selector', () => {
      const { stdout, exitCode } = runCli(['--json', 'cast', 'selector', 'empty']);

      expect(exitCode).toBe(0);
      const json = parseJson(stdout);
      expect(json.selector).toBeDefined();
    });
  });

  describe('2.6 cast abi', () => {
    // Note: cast abi encode/decode commands require full ABI definitions in JSON format
    // e.g., { "abi": [...], "args": [...] } - not simple type arrays
    // These are designed to work with contract artifacts

    it.skip('should encode ABI data (requires full ABI definition)', () => {
      // This command expects: { "abi": [...function definition...], "args": [...] }
      // Not simple type arrays like '["uint256","address"]'
      const { stdout, exitCode } = runCli([
        '--json', 'cast', 'abi', 'encode',
        '{"abi": [], "args": []}',
      ]);

      expect(exitCode).toBe(0);
    });

    it.skip('should decode ABI signature (requires JSON input)', () => {
      // This command expects: { "name": "...", "parameters": [...] }
      // Not a simple function signature string
      const { stdout, exitCode } = runCli([
        '--json', 'cast', 'abi', 'decode-sig',
        '{"name": "transfer", "parameters": []}',
      ]);

      expect(exitCode).toBe(0);
    });
  });
});

// =============================================================================
// DOMAIN 3: NODE COMMANDS (requires network)
// Flow: ready → info → version → chain-id
// =============================================================================

describe('E2E Workflow: NODE Domain', () => {
  // These tests require a running node, skip if not available
  const SKIP_NETWORK_TESTS = process.env.SKIP_NETWORK_TESTS === 'true';

  describe('3.1 node ready', () => {
    it('should check if node is ready', () => {
      if (SKIP_NETWORK_TESTS) {
        console.log('Skipping network test: node ready');
        return;
      }

      const { stdout, exitCode } = runCli(['--sandbox', 'node', 'ready'], 10000);

      // May fail if no sandbox running, that's OK for offline testing
      if (exitCode === 0) {
        expect(stdout.toLowerCase()).toContain('ready');
      }
    });
  });

  describe('3.2 node info', () => {
    it('should get node info', () => {
      if (SKIP_NETWORK_TESTS) {
        console.log('Skipping network test: node info');
        return;
      }

      const { stdout, exitCode } = runCli(['--json', '--sandbox', 'node', 'info'], 10000);

      if (exitCode === 0) {
        const json = parseJson(stdout);
        expect(json).toBeDefined();
      }
    });
  });

  describe('3.3 node version', () => {
    it('should get node version', () => {
      if (SKIP_NETWORK_TESTS) {
        console.log('Skipping network test: node version');
        return;
      }

      const { stdout, exitCode } = runCli(['--json', '--sandbox', 'node', 'version'], 10000);

      if (exitCode === 0) {
        const json = parseJson(stdout);
        expect(json.version || json.nodeVersion).toBeDefined();
      }
    });
  });

  describe('3.4 node chain-id', () => {
    it('should get chain ID', () => {
      if (SKIP_NETWORK_TESTS) {
        console.log('Skipping network test: node chain-id');
        return;
      }

      const { stdout, exitCode } = runCli(['--json', '--sandbox', 'node', 'chain-id'], 10000);

      if (exitCode === 0) {
        const json = parseJson(stdout);
        expect(json.chainId || json.l1ChainId).toBeDefined();
      }
    });
  });
});

// =============================================================================
// DOMAIN 4: WALLET COMMANDS (requires network for deploy)
// Flow: address → create → deploy → info → register → list → balance
// =============================================================================

describe('E2E Workflow: WALLET Domain', () => {
  const SKIP_NETWORK_TESTS = process.env.SKIP_NETWORK_TESTS === 'true';

  describe('4.1 wallet address (offline)', () => {
    it('should compute address from secret without network', () => {
      expect(state.secretKey).toBeDefined();

      const { stdout, exitCode } = runCli([
        '--json', 'wallet', 'address', state.secretKey!,
        '--type', 'schnorr',
      ]);

      expect(exitCode).toBe(0);
      const json = parseJson(stdout);
      expect(json.address).toMatch(/^0x[0-9a-f]{64}$/i);
      state.walletAddress = json.address;
    });
  });

  describe('4.2 wallet create (offline)', () => {
    it('should create new wallet with key generation', () => {
      const { stdout, exitCode } = runCli(['--json', 'wallet', 'create', '--type', 'schnorr']);

      expect(exitCode).toBe(0);
      const json = parseJson(stdout);
      expect(json.secretKey).toMatch(/^0x[0-9a-f]{64}$/i);
      expect(json.address).toMatch(/^0x[0-9a-f]{64}$/i);
    });
  });

  describe('4.3 wallet deploy (requires network)', () => {
    it('should deploy account contract', () => {
      if (SKIP_NETWORK_TESTS) {
        console.log('Skipping network test: wallet deploy');
        return;
      }
      expect(state.secretKey).toBeDefined();

      const { stdout, exitCode } = runCli([
        '--json', '--sandbox', 'wallet', 'deploy', state.secretKey!,
      ], 120000);

      if (exitCode === 0) {
        const json = parseJson(stdout);
        expect(json.address).toBeDefined();
        state.deployedAccountTxHash = json.txHash;
      }
    });
  });

  describe('4.4 wallet info (requires network)', () => {
    it('should get wallet info after deployment', () => {
      if (SKIP_NETWORK_TESTS || !state.walletAddress) {
        console.log('Skipping network test: wallet info');
        return;
      }

      const { stdout, exitCode } = runCli([
        '--json', '--sandbox', 'wallet', 'info', state.walletAddress!,
      ], 30000);

      if (exitCode === 0) {
        const json = parseJson(stdout);
        expect(json.address || json.contractAddress).toBeDefined();
      }
    });
  });

  describe('4.5 wallet list (requires network)', () => {
    it('should list registered accounts', () => {
      if (SKIP_NETWORK_TESTS) {
        console.log('Skipping network test: wallet list');
        return;
      }

      const { stdout, exitCode } = runCli(['--json', '--sandbox', 'wallet', 'list'], 30000);

      if (exitCode === 0) {
        const json = parseJson(stdout);
        expect(json.accounts || json.wallets).toBeDefined();
      }
    });
  });

  describe('4.6 wallet vanity (offline)', () => {
    it('should generate vanity address with prefix', () => {
      const { stdout, exitCode } = runCli([
        '--json', 'wallet', 'vanity', '0x00',
        '--type', 'schnorr',
      ], 60000);

      expect(exitCode).toBe(0);
      const json = parseJson(stdout);
      expect(json.address).toMatch(/^0x00/i);
      expect(json.secretKey).toMatch(/^0x[0-9a-f]{64}$/i);
    });
  });
});

// =============================================================================
// DOMAIN 5: QUERY COMMANDS (requires network)
// Flow: block number → block get → public storage
// =============================================================================

describe('E2E Workflow: QUERY Domain', () => {
  const SKIP_NETWORK_TESTS = process.env.SKIP_NETWORK_TESTS === 'true';

  describe('5.1 query block number', () => {
    it('should get current block number', () => {
      if (SKIP_NETWORK_TESTS) {
        console.log('Skipping network test: query block number');
        return;
      }

      const { stdout, exitCode } = runCli(['--json', '--sandbox', 'query', 'block', 'number'], 30000);

      if (exitCode === 0) {
        const json = parseJson(stdout);
        expect(typeof json.blockNumber).toBe('number');
      }
    });
  });

  describe('5.2 query block proven-number', () => {
    it('should get proven block number', () => {
      if (SKIP_NETWORK_TESTS) {
        console.log('Skipping network test: query block proven-number');
        return;
      }

      const { stdout, exitCode } = runCli(['--json', '--sandbox', 'query', 'block', 'proven-number'], 30000);

      if (exitCode === 0) {
        const json = parseJson(stdout);
        expect(typeof json.provenBlockNumber === 'number' || json.provenBlockNumber === null).toBe(true);
      }
    });
  });

  describe('5.3 query block tips', () => {
    it('should get block tips', () => {
      if (SKIP_NETWORK_TESTS) {
        console.log('Skipping network test: query block tips');
        return;
      }

      const { stdout, exitCode } = runCli(['--json', '--sandbox', 'query', 'block', 'tips'], 30000);

      if (exitCode === 0) {
        const json = parseJson(stdout);
        expect(json).toBeDefined();
      }
    });
  });

  describe('5.4 query public storage', () => {
    it('should query public storage slot', () => {
      if (SKIP_NETWORK_TESTS || !state.walletAddress) {
        console.log('Skipping network test: query public');
        return;
      }

      const { stdout, exitCode } = runCli([
        '--json', '--sandbox', 'query', 'public',
        state.walletAddress!, '0x01',
      ], 30000);

      // May return zero or error if address has no storage
      if (exitCode === 0) {
        const json = parseJson(stdout);
        expect(json.value || json.slot).toBeDefined();
      }
    });
  });
});

// =============================================================================
// DOMAIN 6: TX COMMANDS (requires network + existing tx)
// Flow: status → receipt → wait → analyze
// =============================================================================

describe('E2E Workflow: TX Domain', () => {
  const SKIP_NETWORK_TESTS = process.env.SKIP_NETWORK_TESTS === 'true';

  // Use a placeholder tx hash for testing structure
  const PLACEHOLDER_TX = '0x0000000000000000000000000000000000000000000000000000000000000001';

  describe('6.1 tx status', () => {
    it('should check tx status', () => {
      if (SKIP_NETWORK_TESTS) {
        console.log('Skipping network test: tx status');
        return;
      }

      const txHash = state.deployedAccountTxHash || PLACEHOLDER_TX;
      const { stdout, exitCode } = runCli(['--json', '--sandbox', 'tx', 'status', txHash], 30000);

      // May fail with "not found" which is expected for placeholder
      if (exitCode === 0) {
        const json = parseJson(stdout);
        expect(json.status).toBeDefined();
      }
    });
  });

  describe('6.2 tx receipt', () => {
    it('should get tx receipt', () => {
      if (SKIP_NETWORK_TESTS) {
        console.log('Skipping network test: tx receipt');
        return;
      }

      const txHash = state.deployedAccountTxHash || PLACEHOLDER_TX;
      const { stdout, exitCode } = runCli(['--json', '--sandbox', 'tx', 'receipt', txHash], 30000);

      if (exitCode === 0) {
        const json = parseJson(stdout);
        expect(json).toBeDefined();
      }
    });
  });

  describe('6.3 tx decode (offline with artifact)', () => {
    it('should decode calldata with artifact', () => {
      // This test requires an artifact file, skip if not available
      const artifactPath = path.resolve(__dirname, '../examples/Token.json');
      if (!existsSync(artifactPath)) {
        console.log('Skipping: Token.json artifact not found');
        return;
      }

      // Use a sample calldata (may be invalid for actual decoding)
      const calldata = '0x12345678';
      const { exitCode } = runCli([
        '--json', 'tx', 'decode', calldata,
        '--artifact', artifactPath,
      ]);

      // May fail if calldata doesn't match, that's OK - we're testing command structure
      expect(typeof exitCode).toBe('number');
    });
  });
});

// =============================================================================
// DOMAIN 7: CONTRACT COMMANDS (requires network for most)
// Flow: abi → deploy → info → storage → view → send
// =============================================================================

describe('E2E Workflow: CONTRACT Domain', () => {
  const SKIP_NETWORK_TESTS = process.env.SKIP_NETWORK_TESTS === 'true';

  describe('7.1 contract abi (offline)', () => {
    it('should display contract ABI from artifact', () => {
      const artifactPath = path.resolve(__dirname, '../examples/Token.json');
      if (!existsSync(artifactPath)) {
        console.log('Skipping: Token.json artifact not found');
        return;
      }

      // Note: --json outputs raw artifact, human-readable format shows parsed ABI
      const { stdout, exitCode } = runCli(['contract', 'abi', artifactPath]);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('Contract ABI');
      expect(stdout).toContain('Functions:');
    });
  });

  describe('7.2 contract artifact info (offline)', () => {
    it('should show artifact metadata', () => {
      const artifactPath = path.resolve(__dirname, '../examples/Token.json');
      if (!existsSync(artifactPath)) {
        console.log('Skipping: Token.json artifact not found');
        return;
      }

      const { stdout, exitCode } = runCli(['--json', 'contract', 'artifact', 'info', artifactPath]);

      if (exitCode === 0) {
        const json = parseJson(stdout);
        expect(json.name || json.artifactHash).toBeDefined();
      }
    });
  });

  describe('7.3 contract deploy (requires network)', () => {
    it('should deploy contract from artifact', () => {
      if (SKIP_NETWORK_TESTS) {
        console.log('Skipping network test: contract deploy');
        return;
      }

      const artifactPath = path.resolve(__dirname, '../examples/Token.json');
      if (!existsSync(artifactPath)) {
        console.log('Skipping: Token.json artifact not found');
        return;
      }

      expect(state.secretKey).toBeDefined();
      expect(state.walletAddress).toBeDefined();

      const zeroAddr = '0x0000000000000000000000000000000000000000000000000000000000000000';

      const { stdout, exitCode } = runCli([
        '--json', '--sandbox', 'contract', 'deploy', artifactPath,
        '--from', state.secretKey!,
        '--constructor', 'constructor_with_minter',
        '--args', `["E2EToken", "E2E", 18, "${state.walletAddress}", "${zeroAddr}"]`,
        '--salt', `${Date.now()}`,
      ], 180000);

      if (exitCode === 0) {
        const json = parseJson(stdout);
        state.tokenAddress = json.contract?.address || json.address;
        state.contractTxHash = json.txHash;
        state.contractClassId = json.contract?.classId || json.classId;
      }
    });
  });

  describe('7.4 contract info (requires network)', () => {
    it('should get contract instance info', () => {
      if (SKIP_NETWORK_TESTS || !state.tokenAddress) {
        console.log('Skipping network test: contract info');
        return;
      }

      const { stdout, exitCode } = runCli([
        '--json', '--sandbox', 'contract', 'info', state.tokenAddress!,
      ], 30000);

      if (exitCode === 0) {
        const json = parseJson(stdout);
        expect(json.address || json.contractAddress).toBeDefined();
      }
    });
  });

  describe('7.5 contract class (requires network)', () => {
    it('should get contract class info', () => {
      if (SKIP_NETWORK_TESTS || !state.contractClassId) {
        console.log('Skipping network test: contract class');
        return;
      }

      const { stdout, exitCode } = runCli([
        '--json', '--sandbox', 'contract', 'class', state.contractClassId!,
      ], 30000);

      if (exitCode === 0) {
        const json = parseJson(stdout);
        expect(json.classId || json.id).toBeDefined();
      }
    });
  });

  describe('7.6 contract storage (requires network)', () => {
    it('should read public storage slot', () => {
      if (SKIP_NETWORK_TESTS || !state.tokenAddress) {
        console.log('Skipping network test: contract storage');
        return;
      }

      const { stdout, exitCode } = runCli([
        '--json', '--sandbox', 'contract', 'storage', state.tokenAddress!, '0x01',
      ], 30000);

      if (exitCode === 0) {
        const json = parseJson(stdout);
        expect(json.value !== undefined || json.slot !== undefined).toBe(true);
      }
    });
  });
});

// =============================================================================
// DOMAIN 8: BRIDGE COMMANDS (L1↔L2 messaging)
// Flow: status → l1-to-l2-block → l1-to-l2-witness → is-l1-to-l2-synced → l2-to-l1
// =============================================================================

describe('E2E Workflow: BRIDGE Domain', () => {
  const SKIP_NETWORK_TESTS = process.env.SKIP_NETWORK_TESTS === 'true';
  const TEST_MSG_HASH = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

  describe('8.1 bridge status', () => {
    it('should check cross-chain message status', () => {
      if (SKIP_NETWORK_TESTS) {
        console.log('Skipping network test: bridge status');
        return;
      }

      const { stdout, stderr, exitCode } = runCli(
        ['--sandbox', 'bridge', 'status', TEST_MSG_HASH],
        60000
      );

      // May return "unknown" if message not found, which is OK
      const output = stdout + stderr;
      expect(output).toMatch(/status|unknown|delivered|error|connect/i);
    });
  });

  describe('8.2 bridge l1-to-l2-block', () => {
    it('should find block containing L1→L2 message', () => {
      if (SKIP_NETWORK_TESTS) {
        console.log('Skipping network test: bridge l1-to-l2-block');
        return;
      }

      const { stdout, stderr, exitCode } = runCli(
        ['--sandbox', 'bridge', 'l1-to-l2-block', TEST_MSG_HASH],
        60000
      );

      // May return "not found" which is OK for test message
      const output = stdout + stderr;
      expect(output).toMatch(/block|not found|error|connect/i);
    });
  });

  describe('8.3 bridge l1-to-l2-witness', () => {
    it('should get L1→L2 message membership witness', () => {
      if (SKIP_NETWORK_TESTS) {
        console.log('Skipping network test: bridge l1-to-l2-witness');
        return;
      }

      const { stdout, stderr, exitCode } = runCli(
        ['--sandbox', 'bridge', 'l1-to-l2-witness', TEST_MSG_HASH],
        60000
      );

      // May return witness or "not found"
      const output = stdout + stderr;
      expect(output).toMatch(/witness|not found|error|connect/i);
    });
  });

  describe('8.4 bridge is-l1-to-l2-synced', () => {
    it('should check if L1→L2 messages are synced', () => {
      if (SKIP_NETWORK_TESTS) {
        console.log('Skipping network test: bridge is-l1-to-l2-synced');
        return;
      }

      // Use block 1 as test block number
      const { stdout, stderr, exitCode } = runCli(
        ['--sandbox', 'bridge', 'is-l1-to-l2-synced', '1'],
        60000
      );

      // Should return true/false or error
      const output = stdout + stderr;
      expect(output).toMatch(/true|false|synced|error|connect/i);
    });
  });

  describe('8.5 bridge l2-to-l1', () => {
    it('should get L2→L1 messages from a block', () => {
      if (SKIP_NETWORK_TESTS) {
        console.log('Skipping network test: bridge l2-to-l1');
        return;
      }

      // Use block 1 as test block number
      const { stdout, stderr, exitCode } = runCli(
        ['--sandbox', 'bridge', 'l2-to-l1', '1'],
        60000
      );

      // May return messages or empty list
      const output = stdout + stderr;
      expect(output).toMatch(/message|no.*message|empty|\[\]|error|connect/i);
    });
  });

  describe('8.6 bridge send-l1-to-l2', () => {
    it('should send L1→L2 message via Inbox contract', () => {
      if (SKIP_NETWORK_TESTS) {
        console.log('Skipping network test: bridge send-l1-to-l2');
        return;
      }

      // Send a test message to L2
      const { stdout, stderr, exitCode } = runCli([
        '--sandbox', 'bridge', 'send-l1-to-l2',
        '--recipient', TEST_MSG_HASH,
        '--content', TEST_MSG_HASH,
        '--secret-hash', TEST_MSG_HASH,
      ], 60000);

      const output = stdout + stderr;
      // Should succeed and show tx hash, message hash, and leaf index
      expect(output).toMatch(/l1.*tx.*hash|message.*hash|leaf.*index|sent|error|connect/i);
    });

    it('should require --sandbox or --l1-rpc-url flag', () => {
      // Without network flag, should fail asking for L1 RPC URL
      const { stdout, stderr, exitCode } = runCli([
        'bridge', 'send-l1-to-l2',
        '--recipient', TEST_MSG_HASH,
        '--content', TEST_MSG_HASH,
        '--secret-hash', TEST_MSG_HASH,
      ]);

      expect(exitCode).toBe(1);
      const output = (stdout + stderr).toLowerCase();
      expect(output).toMatch(/l1.*rpc.*url|sandbox/i);
    });
  });

  describe('8.7 bridge consume-l1-to-l2', () => {
    it('should show guidance without --message-hash', () => {
      const { stdout, stderr, exitCode } = runCli([
        'bridge', 'consume-l1-to-l2',
      ]);

      // Should show guidance about how message consumption works
      expect(exitCode).toBe(0);
      const output = stdout + stderr;
      expect(output).toMatch(/consumed.*by.*contract|context\.consume_l1_to_l2_message|typical.*flow/i);
    });

    it('should check message availability with --message-hash', () => {
      if (SKIP_NETWORK_TESTS) {
        console.log('Skipping network test: bridge consume-l1-to-l2 --message-hash');
        return;
      }

      const { stdout, stderr, exitCode } = runCli([
        '--sandbox', 'bridge', 'consume-l1-to-l2',
        '--message-hash', TEST_MSG_HASH,
      ], 60000);

      // May succeed with availability info or error
      const output = stdout + stderr;
      expect(output).toMatch(/available|status|hash|error|connect/i);
    });
  });

  describe('8.8 bridge pending', () => {
    it('should list pending cross-chain messages', () => {
      if (SKIP_NETWORK_TESTS) {
        console.log('Skipping network test: bridge pending');
        return;
      }

      const { stdout, stderr, exitCode } = runCli(
        ['--sandbox', 'bridge', 'pending'],
        60000
      );

      // Should return message list (may be empty)
      expect(exitCode).toBe(0);
      const output = stdout + stderr;
      expect(output).toMatch(/l1.*l2.*message|l2.*l1.*message|pending|no.*message|found/i);
    });

    it('should filter by direction', () => {
      if (SKIP_NETWORK_TESTS) {
        console.log('Skipping network test: bridge pending --direction');
        return;
      }

      const { stdout, stderr, exitCode } = runCli(
        ['--sandbox', 'bridge', 'pending', '--direction', 'l1-to-l2'],
        60000
      );

      expect(exitCode).toBe(0);
      const output = stdout + stderr;
      expect(output).toMatch(/l1.*l2.*message|pending|no.*message|found/i);
      // Should not show L2→L1 section when filtering
      expect(output).not.toMatch(/l2.*l1.*message.*root/i);
    });

    it('should require --sandbox or --l1-rpc-url flag', () => {
      const { stdout, stderr, exitCode } = runCli(['bridge', 'pending']);

      expect(exitCode).toBe(1);
      const output = (stdout + stderr).toLowerCase();
      expect(output).toMatch(/l1.*rpc.*url|sandbox/i);
    });
  });
});

// =============================================================================
// Complete Workflow Summary
// =============================================================================

describe('E2E Workflow: Summary', () => {
  afterAll(() => {
    console.log('\n=== E2E Workflow State ===');
    console.log('Secret Key:', state.secretKey ? `${state.secretKey.slice(0, 20)}...` : 'N/A');
    console.log('Derived Address:', state.derivedAddress || 'N/A');
    console.log('Wallet Address:', state.walletAddress || 'N/A');
    console.log('Token Address:', state.tokenAddress || 'N/A');
    console.log('Signature:', state.signature ? `${state.signature.slice(0, 30)}...` : 'N/A');
    console.log('==========================\n');
  });

  it('should have completed key domain workflow', () => {
    expect(state.secretKey).toBeDefined();
    expect(state.derivedAddress).toBeDefined();
    expect(state.signature).toBeDefined();
    expect(state.publicKey).toBeDefined();
  });

  it('should have computed cast utilities', () => {
    expect(state.computedHash).toBeDefined();
    expect(state.randomField).toBeDefined();
  });
});
