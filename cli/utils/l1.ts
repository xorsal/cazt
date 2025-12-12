/**
 * L1 (Ethereum) interaction utilities
 *
 * Provides utilities for interacting with L1 contracts including:
 * - Sending L1→L2 messages via the Inbox contract
 * - Querying pending messages
 * - Creating L1 wallet clients
 */

import { InboxAbi, RollupAbi } from '@aztec/l1-artifacts';
import { createWalletClient, createPublicClient, http, getContract, decodeEventLog, type Hash, type Log } from 'viem';
import { anvil } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

// Default Anvil private key (first account, pre-funded)
export const DEFAULT_ANVIL_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

/**
 * L1 contract addresses from the node
 */
export interface L1Addresses {
  rollupAddress: string;
  inboxAddress: string;
  outboxAddress: string;
  registryAddress: string;
}

/**
 * Create an L1 public client for reading state
 */
export function createL1PublicClient(l1RpcUrl: string) {
  return createPublicClient({
    chain: anvil,
    transport: http(l1RpcUrl),
  });
}

/**
 * Create an L1 wallet client for sending transactions
 */
export function createL1WalletClient(l1RpcUrl: string, privateKey: string = DEFAULT_ANVIL_PRIVATE_KEY) {
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  return createWalletClient({
    account,
    chain: anvil,
    transport: http(l1RpcUrl),
  });
}

/**
 * Send an L1→L2 message via the Inbox contract
 */
export async function sendL1ToL2Message(
  params: {
    recipient: string;
    content: string;
    secretHash: string;
  },
  ctx: {
    l1RpcUrl: string;
    l1Addresses: L1Addresses;
    privateKey?: string;
  }
): Promise<{
  txHash: Hash;
  msgHash: string;
  globalLeafIndex: bigint;
}> {
  const { recipient, content, secretHash } = params;
  const { l1RpcUrl, l1Addresses, privateKey } = ctx;

  // Create clients
  const walletClient = createL1WalletClient(l1RpcUrl, privateKey);
  const publicClient = createL1PublicClient(l1RpcUrl);

  // Get inbox contract
  const inbox = getContract({
    address: l1Addresses.inboxAddress as `0x${string}`,
    abi: InboxAbi,
    client: walletClient,
  });

  // Get rollup version using raw viem call
  const rollup = getContract({
    address: l1Addresses.rollupAddress as `0x${string}`,
    abi: RollupAbi,
    client: publicClient,
  });
  const version = await rollup.read.getVersion();

  // Send the message
  const txHash = await inbox.write.sendL2Message(
    [
      { actor: recipient as `0x${string}`, version: version as bigint },
      content as `0x${string}`,
      secretHash as `0x${string}`,
    ],
    { gas: 1_000_000n }
  );

  // Wait for receipt
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

  if (receipt.status !== 'success') {
    throw new Error(`L1→L2 message failed: tx ${txHash}, status: ${receipt.status}`);
  }

  // Decode MessageSent event to get the message hash
  const messageSentLogs = receipt.logs
    .filter((log: Log) => log.address.toLowerCase() === l1Addresses.inboxAddress.toLowerCase())
    .map((log: Log) => {
      try {
        const decoded = decodeEventLog({
          abi: InboxAbi,
          data: log.data,
          topics: log.topics,
        });
        return { log, decoded };
      } catch {
        return null;
      }
    })
    .filter((item): item is { log: Log; decoded: any } => item !== null && item.decoded.eventName === 'MessageSent');

  if (messageSentLogs.length !== 1) {
    throw new Error(`Expected 1 MessageSent event, got ${messageSentLogs.length}`);
  }

  const { hash: msgHash, index: globalLeafIndex } = messageSentLogs[0].decoded.args;

  return {
    txHash,
    msgHash: msgHash as string,
    globalLeafIndex: globalLeafIndex as bigint,
  };
}

/**
 * Query pending L1→L2 messages from Inbox contract events
 */
export async function getPendingL1ToL2Messages(
  ctx: {
    l1RpcUrl: string;
    l1Addresses: L1Addresses;
  },
  options: {
    fromBlock?: bigint;
    toBlock?: bigint;
  } = {}
): Promise<Array<{
  msgHash: string;
  index: bigint;
  l2BlockNumber: bigint;
  l1BlockNumber: bigint;
  txHash: string;
}>> {
  const { l1RpcUrl, l1Addresses } = ctx;
  const publicClient = createL1PublicClient(l1RpcUrl);

  // Get MessageSent events from Inbox using the actual ABI
  const messageSentEvent = InboxAbi.find(x => x.type === 'event' && x.name === 'MessageSent');
  if (!messageSentEvent) {
    throw new Error('MessageSent event not found in InboxAbi');
  }

  const logs = await publicClient.getLogs({
    address: l1Addresses.inboxAddress as `0x${string}`,
    event: messageSentEvent as any,
    fromBlock: options.fromBlock ?? 0n,
    toBlock: options.toBlock ?? 'latest',
  });

  return logs.map((log: any) => ({
    msgHash: log.args.hash,
    index: log.args.index,
    l2BlockNumber: log.args.l2BlockNumber,
    l1BlockNumber: log.blockNumber,
    txHash: log.transactionHash,
  }));
}

/**
 * Query L2→L1 message roots from Outbox contract events
 * Note: Outbox uses RootAdded events for merkle roots of L2→L1 messages
 */
export async function getL2ToL1Messages(
  ctx: {
    l1RpcUrl: string;
    l1Addresses: L1Addresses;
  },
  options: {
    fromBlock?: bigint;
    toBlock?: bigint;
  } = {}
): Promise<Array<{
  root: string;
  l2BlockNumber: bigint;
  l1BlockNumber: bigint;
  txHash: string;
}>> {
  const { l1RpcUrl, l1Addresses } = ctx;
  const publicClient = createL1PublicClient(l1RpcUrl);

  // Get RootAdded events from Outbox (merkle roots of L2→L1 messages)
  const rootAddedEvent = {
    type: 'event' as const,
    name: 'RootAdded',
    inputs: [
      { name: 'l2BlockNumber', type: 'uint256', indexed: true },
      { name: 'root', type: 'bytes32', indexed: true },
    ],
  };

  const logs = await publicClient.getLogs({
    address: l1Addresses.outboxAddress as `0x${string}`,
    event: rootAddedEvent,
    fromBlock: options.fromBlock ?? 0n,
    toBlock: options.toBlock ?? 'latest',
  });

  return logs.map((log: any) => ({
    root: log.args.root,
    l2BlockNumber: log.args.l2BlockNumber,
    l1BlockNumber: log.blockNumber,
    txHash: log.transactionHash,
  }));
}

/**
 * Get L1 RPC URL based on network flags
 * For sandbox: localhost:8545 (Anvil)
 * For devnet/testnet: requires explicit --l1-rpc-url
 */
export function resolveL1RpcUrl(options: {
  sandbox?: boolean;
  devnet?: boolean;
  testnet?: boolean;
  l1RpcUrl?: string;
}): string {
  if (options.l1RpcUrl) {
    return options.l1RpcUrl;
  }
  if (options.sandbox) {
    return 'http://localhost:8545';
  }
  throw new Error('L1 RPC URL required. Use --l1-rpc-url or --sandbox for localhost:8545');
}
