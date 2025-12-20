/**
 * Shared helper functions for CAZT CLI commands
 */

import { Command } from 'commander';

export interface GlobalOpts {
  json?: boolean;
  rpcUrl?: string;
  devnet?: boolean;
  testnet?: boolean;
  sandbox?: boolean;
  mainnet?: boolean;
}

/**
 * Stub action for unimplemented commands
 */
export const notImplemented = () => {
  console.log('Not implemented yet');
  process.exit(1);
};

/**
 * Get global options from command hierarchy
 */
export function getGlobalOpts(command: Command): GlobalOpts {
  let current: Command | null = command;
  while (current?.parent) {
    current = current.parent;
  }
  return current?.opts() || {};
}

/**
 * Resolve node URL from global options
 */
export function resolveNodeUrl(globalOpts: { rpcUrl?: string; sandbox?: boolean; devnet?: boolean; testnet?: boolean }): string {
  if (globalOpts.rpcUrl) {
    return globalOpts.rpcUrl;
  }
  if (globalOpts.sandbox) {
    return 'http://localhost:8080';
  }
  if (globalOpts.testnet) {
    return 'https://aztec-testnet-fullnode.zkv.xyz';
  }
  // Default to devnet
  return 'https://devnet.aztec-labs.com';
}
