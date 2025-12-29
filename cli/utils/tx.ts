/**
 * Transaction utility functions
 */

import { TxHash, TxStatus } from '@aztec/aztec.js/tx';
import { createAztecNodeClient, waitForNode } from '@aztec/aztec.js/node';
import { getDefaultNodeUrl } from '../config/index.js';

/**
 * Transaction status result
 */
export interface TxStatusResult {
  hash: string;
  status: string;
  blockNumber?: number;
  blockHash?: string;
}

/**
 * Transaction utility functions
 */
export class TxUtils {
  /**
   * Get transaction status
   * @param params JSON with: hash, nodeUrl
   */
  static async getStatus(params: string): Promise<TxStatusResult> {
    const p = JSON.parse(params);
    const { hash, nodeUrl = getDefaultNodeUrl() } = p;

    if (!hash) {
      throw new Error('hash is required');
    }

    const node = createAztecNodeClient(nodeUrl);
    await waitForNode(node);

    const txHash = TxHash.fromString(hash);
    const receipt = await node.getTxReceipt(txHash);

    return {
      hash: txHash.toString(),
      status: receipt.status,
      blockNumber: receipt.blockNumber,
      blockHash: receipt.blockHash?.toString(),
    };
  }

  /**
   * Wait for a transaction to be mined
   * @param params JSON with: hash, nodeUrl, timeout
   */
  static async waitForTx(params: string): Promise<TxStatusResult> {
    const p = JSON.parse(params);
    const { hash, nodeUrl = getDefaultNodeUrl(), timeout = 60000 } = p;

    if (!hash) {
      throw new Error('hash is required');
    }

    const node = createAztecNodeClient(nodeUrl);
    await waitForNode(node);

    const txHash = TxHash.fromString(hash);
    const startTime = Date.now();

    // Poll for the transaction receipt
    while (Date.now() - startTime < timeout) {
      const receipt = await node.getTxReceipt(txHash);

      // Check if transaction is in a terminal state
      const isTerminal =
        receipt.status === TxStatus.SUCCESS ||
        receipt.status === TxStatus.DROPPED ||
        receipt.status === TxStatus.APP_LOGIC_REVERTED ||
        receipt.status === TxStatus.TEARDOWN_REVERTED ||
        receipt.status === TxStatus.BOTH_REVERTED;

      if (isTerminal) {
        return {
          hash: txHash.toString(),
          status: receipt.status,
          blockNumber: receipt.blockNumber,
          blockHash: receipt.blockHash?.toString(),
        };
      }

      // Wait before polling again
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Timeout - return current status
    const finalReceipt = await node.getTxReceipt(txHash);
    return {
      hash: txHash.toString(),
      status: `timeout (last status: ${finalReceipt.status})`,
      blockNumber: finalReceipt.blockNumber,
      blockHash: finalReceipt.blockHash?.toString(),
    };
  }
}
