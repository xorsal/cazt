# CAZT

> A Swiss Army knife for interacting with Aztec applications from the command line

[![GitHub](https://img.shields.io/badge/github-zkfrov%2Fcazt-blue)](https://github.com/zkfrov/cazt)

**CAZT = cast + Aztec** is a command-line tool inspired by Foundry's `cast`, but specifically designed for the Aztec Network. It provides a comprehensive set of utilities for interacting with Aztec nodes, managing keys and wallets, deploying contracts, and working with Aztec-specific data structures.

## Installation

### Prerequisites

- **Node.js** 20+ and npm/yarn
- (Optional) Access to an Aztec Node for RPC commands

### Method 1: From Source

```bash
# Clone and build
git clone https://github.com/zkfrov/cazt.git
cd cazt
yarn install
yarn build

# Install globally
yarn install-global
```

### Method 2: Development Setup

For local development without global installation:

```bash
git clone https://github.com/zkfrov/cazt.git
cd cazt
yarn install

# Use directly (no build needed)
yarn start --help
# or
npx tsx cli/cli.ts --help

# Or build and use locally
yarn build
./bin/cazt --help
```

### Method 3: npm/npx (Once Published)

```bash
# Global installation
npm install -g cazt

# Or use without installing
npx cazt --help
```

**Note**: The package needs to be published to npm first. Until then, use Method 1 or 2.

### Troubleshooting

If `cazt` command is not found after installation:

```bash
# Add npm global bin to PATH
echo 'export PATH="$(npm bin -g):$PATH"' >> ~/.zshrc && source ~/.zshrc
# (Use ~/.bashrc for bash)
```

## Quick Start

```bash
# Get help (compact view)
cazt --help

# Get detailed help with all subcommands
cazt --hhelp

# Check node connectivity
cazt node ready

# Generate a new secret key
cazt key generate

# Create a new wallet
cazt wallet create

# Hash some data
cazt cast hash keccak "hello world"

# Get current block number
cazt query block number
```

## Command Structure

CAZT uses a hierarchical command structure organized by domain:

| Domain | Description |
|--------|-------------|
| `key` | Key management (generate, derive, sign, verify) |
| `wallet` | Account/wallet operations (create, deploy, balance) |
| `contract` | Contract interaction (view, send, deploy, registry) |
| `query` | State queries (blocks, notes, nullifiers, storage) |
| `tx` | Transaction operations (analyze, status, decode) |
| `cast` | Utilities (hash, address, field, selector, abi) |
| `node` | Node info and administration |
| `bridge` | L1↔L2 cross-chain messaging |
| `monitor` | Real-time monitoring and streaming |

## Configuration

Set environment variables or use flags:

```bash
# Set default RPC URL
export CAZT_RPC_URL=http://localhost:8080

# Or use flags
cazt --rpc-url http://localhost:8080 query block number

# Use network shortcuts
cazt --devnet query block number     # https://api.aztec.network (default)
cazt --testnet query block number    # testnet endpoint
cazt --sandbox query block number    # localhost:8080
```

## Command Reference

### Key Management (`key`)

```bash
# Generate a new secret key
cazt key generate

# Derive all master keys from secret
cazt key derive-keys <secret>

# Compute address from secret (without deploying)
cazt key derive-address <secret>

# Sign a message with Schnorr
cazt key sign <message> <secret>

# Verify signature
cazt key verify <message> --signature <sig> --public-key <pubkey>

# Import/export/list stored keys
cazt key import <secret> --alias mykey
cazt key export mykey --confirm
cazt key list

# Encrypted keystore
cazt key keystore create <secret> --password <pass> --output keystore.json
cazt key keystore unlock keystore.json --password <pass>
```

### Wallet Operations (`wallet`)

```bash
# Create new account (generates key, computes address)
cazt wallet create
cazt wallet create --type schnorr   # default
cazt wallet create --type ecdsa-k   # ECDSA (not yet implemented)

# Compute address from existing secret
cazt wallet address <secret>
cazt wallet address <secret> --salt 0x42

# Deploy account contract to network
cazt wallet deploy <secret>
cazt wallet deploy <secret> --wait

# Get account info
cazt wallet info <address>

# List accounts (from PXE or local storage)
cazt wallet list          # requires PXE
cazt wallet list --local  # local keys only

# Check token balance
cazt wallet balance <address> --token <token-address>

# Generate vanity address
cazt wallet vanity abc --max-attempts 100000

# Create authorization witness for delegation
cazt wallet authwit create <messageHash> --secret <key>

# Register account with PXE
cazt wallet register <address> --secret <key>
```

### Contract Interaction (`contract`)

```bash
# Call view function (no state change)
cazt contract view <address> <function> [args...] --artifact <path>

# Send state-changing transaction
cazt contract send <address> <function> [args...] --artifact <path> --secret <key>

# Simulate transaction without sending
cazt contract simulate <address> <function> [args...] --artifact <path> --secret <key>

# Get contract info
cazt contract info <address>
cazt contract class <classId>

# Read contract ABI
cazt contract abi <artifact-path>

# Read public storage
cazt contract storage <address>           # show guidance
cazt contract storage <address> <slot>    # specific slot

# Query events and logs
cazt contract events <address> --from 0 --to latest
cazt contract logs <address>

# Deploy contract
cazt contract deploy <artifact> --args arg1,arg2 --secret <key>
cazt contract deploy <artifact> --constructor init --salt 0x123

# Artifact operations
cazt contract artifact info <path>

# Registry operations (devnet.aztec-registry.xyz)
cazt contract registry list
cazt contract registry get <classId> --output artifact.json
cazt contract registry upload <artifact> --api-key <key>
cazt contract registry search "token"
```

### State Queries (`query`)

```bash
# Block queries
cazt query block number          # current block
cazt query block proven-number   # latest proven
cazt query block tips            # all tips
cazt query block get <number>    # by number or hash
cazt query block range 0 10      # range of blocks
cazt query block header <id>     # header only

# Public storage
cazt query public <contract> <slot>

# Notes (requires PXE)
cazt query notes <ownerAddress> --contract <addr> --artifact <path> --secret <key>

# Nullifiers
cazt query nullifiers <hash>

# Transaction
cazt query tx <hash>

# Logs
cazt query logs <address> --type public
```

### Transaction Operations (`tx`)

```bash
# Analyze transaction (status, effects, logs, gas)
cazt tx analyze <hash>
cazt tx analyze <hash> --effects  # include state changes

# Quick status check
cazt tx status <hash>

# Full receipt
cazt tx receipt <hash>

# Wait for mining
cazt tx wait <hash> --timeout 60

# Decode calldata
cazt tx decode <calldata> --artifact <path>

# Compare two transactions
cazt tx compare <hash1> <hash2>

# Simulate raw calldata
cazt tx simulate <calldata> --from <address>
```

### Cast Utilities (`cast`)

#### Hash Functions
```bash
cazt cast hash zero                    # zero hash
cazt cast hash keccak "hello"          # Keccak-256
cazt cast hash sha256 "hello"          # SHA-256
cazt cast hash poseidon2 0x1,0x2,0x3   # Poseidon2
cazt cast hash pedersen 0x1,0x2        # Pedersen
cazt cast hash pedersen 0x1,0x2 --index 5
cazt cast hash secret <secret>         # secret hash
```

#### Address Utilities
```bash
cazt cast address zero                 # zero address
cazt cast address random               # random address
cazt cast address validate <addr>      # validate format
cazt cast address from-field <field>   # from field element
cazt cast address to-point <addr>      # to Grumpkin point
```

#### Ethereum Address Utilities
```bash
cazt cast eth zero                     # zero ETH address
cazt cast eth random                   # random ETH address
cazt cast eth validate <addr>          # validate format
cazt cast eth is-zero <addr>           # check if zero
cazt cast eth to-field <addr>          # convert to field
```

#### Field Utilities
```bash
cazt cast field random                 # random field
cazt cast field from-string "0x123"    # from hex string
cazt cast field is-zero <field>        # check if zero
cazt cast field equals <a> <b>         # compare fields
```

#### Selector Utilities
```bash
cazt cast selector compute "transfer(address,uint256)"  # function selector
cazt cast selector event "Transfer(address,address)"    # event selector
cazt cast selector empty                                # empty selector
```

#### ABI Encoding
```bash
cazt cast abi encode <type> <value>
cazt cast abi decode <type> <data>
```

#### Nullifier & Note Utilities
```bash
cazt cast nullifier silo --contract <addr> --nullifier <value>
cazt cast note silo-hash --contract <addr> --note-hash <hash>
cazt cast note unique-hash --siloed-hash <hash> --nonce <nonce>
```

#### Artifact Utilities
```bash
cazt cast artifact hash <artifact>                    # compute artifact hash
cazt cast artifact hash-preimage <artifact>           # get hash preimage
cazt cast artifact metadata-hash <artifact>           # compute metadata hash
cazt cast artifact function-hash <artifact> <fn>      # function artifact hash
```

#### Other Utilities
```bash
cazt cast calldata-hash <calldata>        # hash public calldata
cazt cast var-args-hash 0x1,0x2,0x3       # hash for authwit
cazt cast public-data-slot                # public data tree slot
cazt cast hash-vk <fields>                # hash verification key
```

### Node Commands (`node`)

```bash
cazt node ready              # check if node is ready
cazt node info               # node information
cazt node version            # node version
cazt node chain-id           # chain ID
cazt node l1-addresses       # L1 contract addresses
cazt node protocol-addresses # protocol addresses
cazt node enr                # node ENR
cazt node base-fees          # current base fees
cazt node sync-status        # sync status
```

### Bridge Commands (`bridge`)

```bash
# Send L1→L2 message (requires sandbox or L1 RPC)
cazt --sandbox bridge send-l1-to-l2 \
  --recipient <l2-address> \
  --content <hash> \
  --secret-hash <hash>

# List pending cross-chain messages
cazt --sandbox bridge pending
cazt --sandbox bridge pending --direction l1-to-l2
cazt --sandbox bridge pending --direction l2-to-l1

# Check message status
cazt bridge status <messageHash>

# Get L1→L2 message witness
cazt bridge l1-to-l2-witness <messageHash>

# Find block containing message
cazt bridge l1-to-l2-block <messageHash>

# Check sync status
cazt bridge is-l1-to-l2-synced <blockNumber>

# Get L2→L1 messages from block
cazt bridge l2-to-l1 <blockNumber>

# Guidance on consuming messages
cazt bridge consume-l1-to-l2
cazt --sandbox bridge consume-l1-to-l2 --message-hash <hash>
```

**Note**: Bridge commands that interact with L1 require `--sandbox` flag (for Anvil at localhost:8545) or `--l1-rpc-url` for other L1 endpoints.

### Monitor Commands (`monitor`)

```bash
# Stream new blocks
cazt monitor blocks --interval 1000

# Watch note creation (requires PXE)
cazt monitor notes <contract> --artifact <path> --secret <key>

# Watch address activity
cazt monitor address <address>

# Watch L1↔L2 messages
cazt --sandbox monitor messages
cazt --sandbox monitor messages --direction l1-to-l2

# Watch contract events
cazt monitor events <contract> --artifact <path>

# Stream public logs
cazt monitor logs --contract <address>

# Watch pending transactions
cazt monitor pending --from <address>

# Watch nullifier insertions (not yet implemented)
cazt monitor nullifiers
```

## Output Format

By default, utility commands output raw values:

```bash
$ cazt cast address zero
0x0000000000000000000000000000000000000000000000000000000000000000

$ cazt cast hash keccak "hello"
0x1c8aff950685c2ed4bc3174f3472287b56d9517b9c948127319a09a7a36deac8
```

Use `--json` flag for JSON output:

```bash
$ cazt --json cast address zero
{
  "address": "0x0000000000000000000000000000000000000000000000000000000000000000"
}

$ cazt --json key generate
{
  "secretKey": "0x..."
}
```

## Artifact Sources

CAZT supports multiple artifact sources:

1. **File paths**: Direct paths to JSON artifact files
   - Example: `./target/my_contract.json`

2. **Aztec artifacts** (`aztec:ContractName`): Built-in artifacts from `@aztec/noir-contracts.js`
   - Example: `aztec:Token`, `aztec:Escrow`

3. **Standards artifacts** (`standards:ContractName`): Artifacts from Aztec Standards
   - Example: `standards:Token`
   - Build with: `yarn build-aztec-standards`

## Development

```bash
# Install dependencies
yarn install

# Build
yarn build

# Run in development mode
yarn start --help

# Run tests
yarn test

# Clean build artifacts
yarn clean
```

### Project Structure

```
cazt/
├── bin/
│   └── cazt              # Wrapper script
├── cli/
│   ├── cli.ts           # Main CLI entry point
│   ├── commands/        # Command implementations
│   │   └── index.ts     # Command registration
│   └── utils/           # Utility modules
│       ├── pxe.ts       # PXE helpers
│       ├── tx.ts        # Transaction utilities
│       ├── l1.ts        # L1 bridge utilities
│       ├── note.ts      # Note utilities
│       └── ...
├── tests/               # Test suites
├── dist/                # Compiled JavaScript
└── package.json
```

## Repository

- **GitHub**: https://github.com/zkfrov/cazt
- **Version**: 3.0.0-devnet.2

## License

MIT
