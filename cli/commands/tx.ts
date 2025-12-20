/**
 * TX Commands - Transaction operations
 */

import { Command } from 'commander';
import { getGlobalOpts, resolveNodeUrl } from './helpers.js';

export function registerTxCommands(program: Command): void {
  const txCmd = program.command('tx').description('Transaction operations');

  txCmd
    .command('analyze')
    .description('Analyze transaction: status, effects, logs, gas')
    .argument('<hash>', 'Transaction hash')
    .option('--effects', 'Show state changes')
    .option('--logs', 'Show decoded logs')
    .option('--gas', 'Show gas breakdown')
    .option('--diff', 'Show state before/after')
    .option('--artifact <path>', 'Contract artifact for decoding')
    .action(async function(this: Command, hash: string, options: {
      effects?: boolean;
      logs?: boolean;
      gas?: boolean;
      diff?: boolean;
      artifact?: string;
    }) {
      const globalOpts = getGlobalOpts(this);
      try {
        const { TxUtils } = await import('../utils/tx.js');
        const { parseJsonOrFile } = await import('../utils/rpc.js');
        const nodeUrl = resolveNodeUrl(globalOpts);

        // Load artifact if provided
        let artifact = null;
        if (options.artifact) {
          artifact = parseJsonOrFile(options.artifact);
        }

        const result = await TxUtils.analyzeTx(JSON.stringify({
          txHash: hash,
          nodeUrl,
          showEffects: options.effects ?? false,
          showLogs: options.logs ?? false,
          showGas: options.gas ?? false,
          showDiff: options.diff ?? false,
          artifact,
        }));

        if (globalOpts.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(TxUtils.formatHumanReadable(result));
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  txCmd
    .command('compare')
    .description('Compare two transactions side-by-side')
    .argument('<hash1>', 'First transaction hash')
    .argument('<hash2>', 'Second transaction hash')
    .action(async function(this: Command, hash1: string, hash2: string) {
      const globalOpts = getGlobalOpts(this);
      try {
        const { TxUtils } = await import('../utils/tx.js');
        const nodeUrl = resolveNodeUrl(globalOpts);

        const result = await TxUtils.compareTx(JSON.stringify({
          hash1,
          hash2,
          nodeUrl,
        }));

        if (globalOpts.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(TxUtils.formatComparisonHumanReadable(result));
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  txCmd
    .command('decode')
    .description('Decode calldata using ABI')
    .argument('<calldata>', 'Hex calldata to decode')
    .requiredOption('--artifact <path>', 'Contract artifact for decoding')
    .option('--function <name>', 'Function name (optional)')
    .action(async function(this: Command, calldata: string, options: {
      artifact: string;
      function?: string;
    }) {
      const globalOpts = getGlobalOpts(this);
      try {
        const { TxUtils } = await import('../utils/tx.js');
        const { parseJsonOrFile } = await import('../utils/rpc.js');

        const artifact = parseJsonOrFile(options.artifact);

        const result = await TxUtils.decodeCalldata(JSON.stringify({
          calldata,
          artifact,
          functionName: options.function,
        }));

        if (globalOpts.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log('Decoded Calldata');
          console.log('='.repeat(40));
          console.log(`Function:  ${result.functionName}`);
          console.log(`Selector:  ${result.selector}`);
          console.log('');
          console.log('Arguments:');
          for (let i = 0; i < result.args.length; i++) {
            console.log(`  [${i}] ${result.args[i]}`);
          }
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  txCmd
    .command('status')
    .description('Quick status check (pending/mined/reverted)')
    .argument('<hash>', 'Transaction hash')
    .action(async function(this: Command, hash: string) {
      const globalOpts = getGlobalOpts(this);
      try {
        const { RpcClient } = await import('../utils/rpc.js');
        const nodeUrl = resolveNodeUrl(globalOpts);
        const rpcClient = new RpcClient({ rpcUrl: nodeUrl, adminUrl: nodeUrl, pretty: true });

        const receipt = await rpcClient.call('node_getTxReceipt', [hash]);

        let status = 'pending';
        if (receipt) {
          const normalizedStatus = receipt.status?.toUpperCase();
          if (normalizedStatus === 'SUCCESS') status = 'mined';
          else if (['APP_LOGIC_REVERTED', 'TEARDOWN_REVERTED', 'BOTH_REVERTED'].includes(normalizedStatus)) status = 'reverted';
          else if (normalizedStatus === 'DROPPED') status = 'dropped';
        }

        if (globalOpts.json) {
          console.log(JSON.stringify({
            txHash: hash,
            status,
            blockNumber: receipt?.blockNumber ?? null,
          }, null, 2));
        } else {
          console.log(status);
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  txCmd
    .command('receipt')
    .description('Get full transaction receipt')
    .argument('<hash>', 'Transaction hash')
    .action(async function(this: Command, hash: string) {
      const globalOpts = getGlobalOpts(this);
      try {
        const { RpcClient } = await import('../utils/rpc.js');
        const nodeUrl = resolveNodeUrl(globalOpts);
        const rpcClient = new RpcClient({ rpcUrl: nodeUrl, adminUrl: nodeUrl, pretty: true });

        const receipt = await rpcClient.call('node_getTxReceipt', [hash]);

        if (!receipt) {
          console.error(`Error: Transaction ${hash} not found`);
          process.exit(1);
        }

        if (globalOpts.json) {
          console.log(JSON.stringify(receipt, null, 2));
        } else {
          console.log('Transaction Receipt');
          console.log('='.repeat(40));
          console.log(`TX Hash:     ${hash}`);
          console.log(`Status:      ${receipt.status ?? 'pending'}`);
          console.log(`Block:       ${receipt.blockNumber ?? 'N/A'}`);
          console.log(`Block Hash:  ${receipt.blockHash ?? 'N/A'}`);
          console.log(`Fee:         ${receipt.transactionFee ?? '0'} wei`);
          if (receipt.error) {
            console.log(`Error:       ${receipt.error}`);
          }
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  txCmd
    .command('wait')
    .description('Wait for tx to be mined')
    .argument('<hash>', 'Transaction hash')
    .option('--timeout <seconds>', 'Timeout in seconds', '60')
    .action(async function(this: Command, hash: string, options: { timeout: string }) {
      const globalOpts = getGlobalOpts(this);
      try {
        const { RpcClient } = await import('../utils/rpc.js');
        const nodeUrl = resolveNodeUrl(globalOpts);
        const rpcClient = new RpcClient({ rpcUrl: nodeUrl, adminUrl: nodeUrl, pretty: true });

        const timeoutMs = parseInt(options.timeout, 10) * 1000;
        const pollInterval = 2000; // Poll every 2 seconds
        const startTime = Date.now();

        let receipt = null;
        let status = 'pending';

        while (Date.now() - startTime < timeoutMs) {
          receipt = await rpcClient.call('node_getTxReceipt', [hash]);

          if (receipt?.status) {
            const normalizedStatus = receipt.status.toUpperCase();
            if (normalizedStatus === 'SUCCESS') {
              status = 'mined';
              break;
            } else if (['APP_LOGIC_REVERTED', 'TEARDOWN_REVERTED', 'BOTH_REVERTED'].includes(normalizedStatus)) {
              status = 'reverted';
              break;
            } else if (normalizedStatus === 'DROPPED') {
              status = 'dropped';
              break;
            }
          }

          // Wait before polling again
          await new Promise(resolve => setTimeout(resolve, pollInterval));
        }

        if (status === 'pending') {
          console.error(`Error: Transaction ${hash} not mined within ${options.timeout} seconds`);
          process.exit(1);
        }

        if (globalOpts.json) {
          console.log(JSON.stringify({
            txHash: hash,
            status,
            blockNumber: receipt?.blockNumber ?? null,
            waitTime: Math.round((Date.now() - startTime) / 1000),
          }, null, 2));
        } else {
          if (status === 'mined') {
            console.log(`Transaction mined in block ${receipt?.blockNumber ?? 'unknown'}`);
          } else if (status === 'reverted') {
            console.log(`Transaction reverted: ${receipt?.error ?? 'unknown reason'}`);
          } else {
            console.log(`Transaction status: ${status}`);
          }
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  txCmd
    .command('simulate')
    .description('Simulate raw calldata before sending')
    .argument('<calldata>', 'Hex calldata to simulate')
    .option('--from <address>', 'Sender address')
    .option('--to <address>', 'Target contract address')
    .action(async function(this: Command, calldata: string, options: {
      from?: string;
      to?: string;
    }) {
      const globalOpts = getGlobalOpts(this);
      // Simulation requires PXE or advanced node features not universally available
      console.error('Error: Transaction simulation is not yet fully implemented.');
      console.error('Hint: Use a local PXE for simulation capabilities.');
      process.exit(1);
    });
}
