import { createAztecNodeClient, waitForNode } from '@aztec/aztec.js/node';
import { Fr } from '@aztec/foundation/fields';
import { AztecAddress } from '@aztec/aztec.js/addresses';
import { getDefaultNodeUrl } from '../config/index.js';
import { Helpers } from './helpers.js';
import { RpcClient } from './rpc.js';

/**
 * Result types for transaction analysis
 */
export interface DecodedLog {
  contractAddress: string;
  eventName?: string;
  fields: string[];
  decoded?: any;
}

export interface PublicDataWrite {
  leafSlot: string;
  value: string;
}

export interface StateDiff {
  slot: string;
  slotName?: string;
  before: string;
  after: string;
  delta?: string;
}

export interface GasBreakdown {
  total: string;
  manaConsumed?: string;
}

export interface TxEffects {
  noteHashes: string[];
  nullifiers: string[];
  publicDataWrites: PublicDataWrite[];
  l2ToL1Msgs: string[];
  privateLogsCount: number;
  publicLogsCount: number;
  contractClassLogsCount: number;
}

export interface TxLogs {
  public: DecodedLog[];
  private: Array<{ encrypted: true; fieldsCount: number }>;
  contractClass: DecodedLog[];
}

export interface TxAnalysisResult {
  txHash: string;
  status: 'pending' | 'success' | 'reverted' | 'dropped';
  blockNumber: number | null;
  blockHash: string | null;
  transactionFee: string;
  revertReason?: string;
  effects?: TxEffects;
  logs?: TxLogs;
  gas?: GasBreakdown;
  diff?: StateDiff[];
}

export interface TxHistoryResult {
  transactions: Array<{
    txHash: string;
    blockNumber: number;
    status: string;
  }>;
  total: number;
}

export interface CalldataDecodedResult {
  functionName: string;
  selector: string;
  args: any[];
  raw: string;
}

export interface TxComparisonResult {
  tx1: TxAnalysisResult;
  tx2: TxAnalysisResult;
  differences: {
    status: boolean;
    fee: boolean;
    effectsCount: {
      noteHashes: [number, number];
      nullifiers: [number, number];
      publicDataWrites: [number, number];
      l2ToL1Msgs: [number, number];
    };
  };
}

/**
 * Transaction utility functions
 */
export class TxUtils {
  /**
   * Analyze a transaction with optional detailed views
   * @param params JSON with: txHash, nodeUrl, showEffects, showLogs, showGas, showDiff, artifact
   */
  static async analyzeTx(params: string): Promise<TxAnalysisResult> {
    const p = JSON.parse(params);
    const {
      txHash,
      nodeUrl = getDefaultNodeUrl(),
      showEffects = false,
      showLogs = false,
      showGas = false,
      showDiff = false,
      artifact = null,
      debug = false,
    } = p;

    const debugLog = (...args: any[]) => {
      if (debug) console.log('[DEBUG]', ...args);
    };

    if (!txHash) {
      throw new Error('txHash is required');
    }

    debugLog('Analyzing transaction:', txHash);
    debugLog('Options:', { showEffects, showLogs, showGas, showDiff, hasArtifact: !!artifact });

    // Create RPC client for raw calls
    const rpcClient = new RpcClient({
      rpcUrl: nodeUrl,
      adminUrl: nodeUrl,
      pretty: true,
    });

    // Fetch receipt and effect in parallel
    debugLog('Fetching receipt and effect...');
    const [receiptResult, effectResult] = await Promise.all([
      rpcClient.call('node_getTxReceipt', [txHash]),
      rpcClient.call('node_getTxEffect', [txHash]),
    ]);

    debugLog('Receipt:', JSON.stringify(receiptResult, null, 2));
    debugLog('Effect:', effectResult ? 'found' : 'not found');

    // Handle not found case
    if (!receiptResult && !effectResult) {
      throw new Error(`Transaction ${txHash} not found. It may be invalid or not yet submitted.`);
    }

    // Build result object
    const result: TxAnalysisResult = {
      txHash,
      status: TxUtils.parseStatus(receiptResult?.status),
      blockNumber: receiptResult?.blockNumber ?? null,
      blockHash: receiptResult?.blockHash ?? null,
      transactionFee: receiptResult?.transactionFee?.toString() ?? '0',
    };

    // Add revert reason if present
    if (receiptResult?.error) {
      result.revertReason = receiptResult.error;
    }

    // Parse effects if requested and available
    if (showEffects && effectResult?.data) {
      result.effects = TxUtils.parseEffects(effectResult.data);
      debugLog('Parsed effects:', result.effects);
    }

    // Parse logs if requested and available
    if (showLogs && effectResult?.data) {
      result.logs = TxUtils.parseLogs(effectResult.data, artifact);
      debugLog('Parsed logs:', result.logs);
    }

    // Add gas breakdown if requested
    if (showGas) {
      result.gas = TxUtils.parseGas(receiptResult, effectResult?.data);
      debugLog('Parsed gas:', result.gas);
    }

    // Compute state diff if requested
    if (showDiff && effectResult?.data && result.blockNumber !== null) {
      result.diff = await TxUtils.computeStateDiff(
        rpcClient,
        result.blockNumber,
        effectResult.data.publicDataWrites || []
      );
      debugLog('Computed diff:', result.diff);
    }

    return result;
  }

  /**
   * Get transaction history for an address
   * @param params JSON with: address, nodeUrl, limit, offset
   */
  static async getTxHistory(params: string): Promise<TxHistoryResult> {
    const p = JSON.parse(params);
    const {
      address,
      nodeUrl = getDefaultNodeUrl(),
      limit = 50,
      offset = 0,
    } = p;

    if (!address) {
      throw new Error('address is required');
    }

    const rpcClient = new RpcClient({
      rpcUrl: nodeUrl,
      adminUrl: nodeUrl,
      pretty: true,
    });

    // Query public logs filtered by contract address
    const filter = {
      contractAddress: address,
      fromBlock: 0,
    };

    const logsResult = await rpcClient.call('node_getPublicLogs', [filter]);

    // Extract unique transaction hashes from logs
    const txMap = new Map<string, { blockNumber: number; status: string }>();

    if (logsResult?.logs && Array.isArray(logsResult.logs)) {
      for (const log of logsResult.logs) {
        if (log.id?.txHash && !txMap.has(log.id.txHash)) {
          txMap.set(log.id.txHash, {
            blockNumber: log.id.blockNumber || 0,
            status: 'success', // Logs only exist for successful txs
          });
        }
      }
    }

    // Convert to array and apply pagination
    const allTxs = Array.from(txMap.entries()).map(([hash, info]) => ({
      txHash: hash,
      blockNumber: info.blockNumber,
      status: info.status,
    }));

    // Sort by block number descending (most recent first)
    allTxs.sort((a, b) => b.blockNumber - a.blockNumber);

    // Apply pagination
    const paginated = allTxs.slice(offset, offset + limit);

    return {
      transactions: paginated,
      total: allTxs.length,
    };
  }

  /**
   * Decode calldata using ABI
   * @param params JSON with: calldata, artifact, functionName
   */
  static async decodeCalldata(params: string): Promise<CalldataDecodedResult> {
    const p = JSON.parse(params);
    const { calldata, artifact, functionName } = p;

    if (!calldata) {
      throw new Error('calldata is required');
    }
    if (!artifact) {
      throw new Error('artifact is required');
    }

    // Remove 0x prefix if present
    const cleanCalldata = calldata.startsWith('0x') ? calldata.slice(2) : calldata;

    // Extract selector (first 4 bytes = 8 hex chars)
    const selector = '0x' + cleanCalldata.slice(0, 8);
    const argsData = cleanCalldata.slice(8);

    // Find matching function in artifact
    let matchedFunction: any = null;

    if (functionName) {
      // Find by name
      matchedFunction = artifact.functions?.find((f: any) => f.name === functionName);
    } else {
      // Find by selector
      matchedFunction = artifact.functions?.find((f: any) => {
        // Compute selector from function signature
        const sig = `${f.name}(${(f.parameters || []).map((p: any) => p.type?.kind || 'field').join(',')})`;
        // For now, just match by name since selector computation is complex
        return false; // TODO: implement proper selector matching
      });
    }

    if (!matchedFunction && functionName) {
      throw new Error(`Function "${functionName}" not found in artifact`);
    }

    // Decode arguments - for now return raw hex chunks
    const args: string[] = [];
    for (let i = 0; i < argsData.length; i += 64) {
      const chunk = argsData.slice(i, i + 64);
      if (chunk.length > 0) {
        args.push('0x' + chunk);
      }
    }

    return {
      functionName: matchedFunction?.name || 'unknown',
      selector,
      args,
      raw: calldata,
    };
  }

  /**
   * Compare two transactions
   * @param params JSON with: hash1, hash2, nodeUrl
   */
  static async compareTx(params: string): Promise<TxComparisonResult> {
    const p = JSON.parse(params);
    const { hash1, hash2, nodeUrl = getDefaultNodeUrl() } = p;

    if (!hash1 || !hash2) {
      throw new Error('Both hash1 and hash2 are required');
    }

    // Analyze both transactions with effects
    const [tx1, tx2] = await Promise.all([
      this.analyzeTx(JSON.stringify({ txHash: hash1, nodeUrl, showEffects: true })),
      this.analyzeTx(JSON.stringify({ txHash: hash2, nodeUrl, showEffects: true })),
    ]);

    // Compute differences
    const differences = {
      status: tx1.status !== tx2.status,
      fee: tx1.transactionFee !== tx2.transactionFee,
      effectsCount: {
        noteHashes: [
          tx1.effects?.noteHashes.length ?? 0,
          tx2.effects?.noteHashes.length ?? 0,
        ] as [number, number],
        nullifiers: [
          tx1.effects?.nullifiers.length ?? 0,
          tx2.effects?.nullifiers.length ?? 0,
        ] as [number, number],
        publicDataWrites: [
          tx1.effects?.publicDataWrites.length ?? 0,
          tx2.effects?.publicDataWrites.length ?? 0,
        ] as [number, number],
        l2ToL1Msgs: [
          tx1.effects?.l2ToL1Msgs.length ?? 0,
          tx2.effects?.l2ToL1Msgs.length ?? 0,
        ] as [number, number],
      },
    };

    return { tx1, tx2, differences };
  }

  // ==================== Private Helper Methods ====================

  /**
   * Parse transaction status from receipt
   */
  private static parseStatus(status: string | undefined): TxAnalysisResult['status'] {
    if (!status) return 'pending';

    const normalizedStatus = status.toUpperCase();

    switch (normalizedStatus) {
      case 'SUCCESS':
        return 'success';
      case 'DROPPED':
        return 'dropped';
      case 'PENDING':
        return 'pending';
      case 'APP_LOGIC_REVERTED':
      case 'TEARDOWN_REVERTED':
      case 'BOTH_REVERTED':
        return 'reverted';
      default:
        return 'pending';
    }
  }

  /**
   * Parse transaction effects from TxEffect data
   */
  private static parseEffects(effectData: any): TxEffects {
    return {
      noteHashes: (effectData.noteHashes || []).map((h: any) => h?.toString?.() ?? h),
      nullifiers: (effectData.nullifiers || []).map((n: any) => n?.toString?.() ?? n),
      publicDataWrites: (effectData.publicDataWrites || []).map((w: any) => ({
        leafSlot: w.leafSlot?.toString?.() ?? w.leafSlot ?? '0',
        value: w.value?.toString?.() ?? w.value ?? '0',
      })),
      l2ToL1Msgs: (effectData.l2ToL1Msgs || []).map((m: any) => m?.toString?.() ?? m),
      privateLogsCount: effectData.privateLogs?.length ?? 0,
      publicLogsCount: effectData.publicLogs?.length ?? 0,
      contractClassLogsCount: effectData.contractClassLogs?.length ?? 0,
    };
  }

  /**
   * Parse logs from TxEffect data
   */
  private static parseLogs(effectData: any, artifact: any): TxLogs {
    const publicLogs: DecodedLog[] = (effectData.publicLogs || []).map((log: any) => {
      const decodedLog: DecodedLog = {
        contractAddress: log.contractAddress?.toString?.() ?? log.contractAddress ?? 'unknown',
        fields: (log.fields || []).map((f: any) => f?.toString?.() ?? f),
      };

      // Try to decode event name if artifact is provided
      if (artifact && decodedLog.fields.length > 0) {
        // First field is often the event selector
        const eventSelector = decodedLog.fields[0];
        // TODO: match selector against artifact events
        // For now, leave eventName undefined
      }

      return decodedLog;
    });

    const privateLogs = (effectData.privateLogs || []).map((log: any) => ({
      encrypted: true as const,
      fieldsCount: log.fields?.length ?? log.emittedLength ?? 0,
    }));

    const contractClassLogs: DecodedLog[] = (effectData.contractClassLogs || []).map((log: any) => ({
      contractAddress: log.contractAddress?.toString?.() ?? log.contractAddress ?? 'unknown',
      fields: (log.fields || []).map((f: any) => f?.toString?.() ?? f),
    }));

    return {
      public: publicLogs,
      private: privateLogs,
      contractClass: contractClassLogs,
    };
  }

  /**
   * Parse gas information
   */
  private static parseGas(receipt: any, effectData: any): GasBreakdown {
    return {
      total: receipt?.transactionFee?.toString() ?? '0',
      manaConsumed: effectData?.manaConsumed?.toString?.() ?? undefined,
    };
  }

  /**
   * Compute state diff for public data writes
   */
  private static async computeStateDiff(
    rpcClient: RpcClient,
    blockNumber: number,
    publicDataWrites: any[]
  ): Promise<StateDiff[]> {
    if (!publicDataWrites || publicDataWrites.length === 0) {
      return [];
    }

    const diffs: StateDiff[] = [];

    // For each write, query the previous value
    for (const write of publicDataWrites) {
      const slot = write.leafSlot?.toString?.() ?? write.leafSlot;
      const newValue = write.value?.toString?.() ?? write.value;

      // Query value at previous block
      let oldValue = '0';
      if (blockNumber > 0) {
        try {
          // Note: This requires knowing the contract address for the slot
          // For now, we show the raw slot without contract context
          // TODO: Improve this to map slots back to contracts
          oldValue = '0'; // Placeholder - would need contract address
        } catch {
          oldValue = '0';
        }
      }

      diffs.push({
        slot,
        before: oldValue,
        after: newValue,
      });
    }

    return diffs;
  }

  /**
   * Format transaction analysis for human-readable output
   */
  static formatHumanReadable(result: TxAnalysisResult): string {
    const lines: string[] = [];

    // Header
    const shortHash = result.txHash.length > 20
      ? `${result.txHash.slice(0, 10)}...${result.txHash.slice(-8)}`
      : result.txHash;
    lines.push(`Transaction ${shortHash}`);
    lines.push('='.repeat(50));
    lines.push('');

    // Status with color hint
    const statusDisplay = result.status.toUpperCase();
    lines.push(`Status:  ${statusDisplay}`);

    // Block info
    if (result.blockNumber !== null) {
      lines.push(`Block:   ${result.blockNumber}`);
    } else {
      lines.push(`Block:   (pending)`);
    }

    // Fee
    lines.push(`Fee:     ${result.transactionFee} wei`);

    // Revert reason
    if (result.revertReason) {
      lines.push('');
      lines.push(`Revert:  ${result.revertReason}`);
    }

    // Effects section
    if (result.effects) {
      lines.push('');
      lines.push('State Changes:');
      lines.push(`  Notes Created:    ${result.effects.noteHashes.length}`);
      lines.push(`  Notes Spent:      ${result.effects.nullifiers.length}`);
      lines.push(`  Storage Writes:   ${result.effects.publicDataWrites.length}`);
      lines.push(`  L2->L1 Messages:  ${result.effects.l2ToL1Msgs.length}`);

      // Show details if present
      if (result.effects.noteHashes.length > 0 && result.effects.noteHashes.length <= 5) {
        lines.push('');
        lines.push('  Note Hashes:');
        for (const hash of result.effects.noteHashes) {
          const shortHash = hash.length > 20 ? `${hash.slice(0, 18)}...` : hash;
          lines.push(`    - ${shortHash}`);
        }
      }

      if (result.effects.nullifiers.length > 0 && result.effects.nullifiers.length <= 5) {
        lines.push('');
        lines.push('  Nullifiers:');
        for (const nullifier of result.effects.nullifiers) {
          const shortNullifier = nullifier.length > 20 ? `${nullifier.slice(0, 18)}...` : nullifier;
          lines.push(`    - ${shortNullifier}`);
        }
      }

      if (result.effects.publicDataWrites.length > 0) {
        lines.push('');
        lines.push('  Public Data Writes:');
        for (const write of result.effects.publicDataWrites) {
          const shortSlot = write.leafSlot.length > 16 ? `${write.leafSlot.slice(0, 14)}...` : write.leafSlot;
          const shortValue = write.value.length > 16 ? `${write.value.slice(0, 14)}...` : write.value;
          lines.push(`    - Slot ${shortSlot} = ${shortValue}`);
        }
      }
    }

    // Logs section
    if (result.logs) {
      lines.push('');
      lines.push('Logs:');
      lines.push(`  Public:          ${result.logs.public.length}`);
      lines.push(`  Private:         ${result.logs.private.length} (encrypted)`);
      lines.push(`  Contract Class:  ${result.logs.contractClass.length}`);

      // Show public log details
      if (result.logs.public.length > 0 && result.logs.public.length <= 5) {
        lines.push('');
        lines.push('  Public Log Details:');
        for (let i = 0; i < result.logs.public.length; i++) {
          const log = result.logs.public[i];
          const eventName = log.eventName || 'UnknownEvent';
          const shortAddr = log.contractAddress.length > 16
            ? `${log.contractAddress.slice(0, 14)}...`
            : log.contractAddress;
          lines.push(`    [${i + 1}] ${eventName}`);
          lines.push(`        Contract: ${shortAddr}`);
          lines.push(`        Fields:   ${log.fields.length}`);
        }
      }
    }

    // Gas section
    if (result.gas) {
      lines.push('');
      lines.push('Gas:');
      lines.push(`  Total Fee:       ${result.gas.total} wei`);
      if (result.gas.manaConsumed) {
        lines.push(`  Mana Consumed:   ${result.gas.manaConsumed}`);
      }
    }

    // State diff section
    if (result.diff && result.diff.length > 0) {
      lines.push('');
      lines.push('State Diff:');
      for (const d of result.diff) {
        const slotName = d.slotName || d.slot;
        const shortSlot = slotName.length > 20 ? `${slotName.slice(0, 18)}...` : slotName;
        lines.push(`  ${shortSlot}:`);
        lines.push(`    Before: ${d.before}`);
        lines.push(`    After:  ${d.after}`);
      }
    }

    // Tips
    if (!result.effects && !result.logs) {
      lines.push('');
      lines.push('Tips:');
      lines.push('  Use --effects to see state changes');
      lines.push('  Use --logs to see event logs');
      lines.push('  Use --gas for gas breakdown');
    }

    return lines.join('\n');
  }

  /**
   * Format comparison result for human-readable output
   */
  static formatComparisonHumanReadable(result: TxComparisonResult): string {
    const lines: string[] = [];

    lines.push('Transaction Comparison');
    lines.push('='.repeat(50));
    lines.push('');

    // Side by side summary
    lines.push('                    TX 1                TX 2');
    lines.push('-'.repeat(50));

    const shortHash1 = result.tx1.txHash.slice(0, 10) + '...';
    const shortHash2 = result.tx2.txHash.slice(0, 10) + '...';
    lines.push(`Hash:       ${shortHash1.padEnd(20)} ${shortHash2}`);

    const status1 = result.tx1.status.toUpperCase().padEnd(20);
    const status2 = result.tx2.status.toUpperCase();
    lines.push(`Status:     ${status1} ${status2}${result.differences.status ? ' *' : ''}`);

    const fee1 = result.tx1.transactionFee.padEnd(20);
    const fee2 = result.tx2.transactionFee;
    lines.push(`Fee:        ${fee1} ${fee2}${result.differences.fee ? ' *' : ''}`);

    lines.push('');
    lines.push('Effects Comparison:');

    const d = result.differences.effectsCount;
    lines.push(`  Note Hashes:      ${String(d.noteHashes[0]).padEnd(20)} ${d.noteHashes[1]}`);
    lines.push(`  Nullifiers:       ${String(d.nullifiers[0]).padEnd(20)} ${d.nullifiers[1]}`);
    lines.push(`  Storage Writes:   ${String(d.publicDataWrites[0]).padEnd(20)} ${d.publicDataWrites[1]}`);
    lines.push(`  L2->L1 Msgs:      ${String(d.l2ToL1Msgs[0]).padEnd(20)} ${d.l2ToL1Msgs[1]}`);

    lines.push('');
    lines.push('* indicates difference');

    return lines.join('\n');
  }
}
