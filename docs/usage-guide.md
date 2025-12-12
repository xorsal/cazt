# CAZT CLI Usage Guide

A comprehensive guide with examples for every command in the CAZT CLI.

## Table of Contents

- [Global Options](#global-options)
- [Key Commands](#key-commands)
- [Wallet Commands](#wallet-commands)
- [Cast Commands](#cast-commands)
- [Query Commands](#query-commands)
- [Node Commands](#node-commands)
- [TX Commands](#tx-commands)
- [Contract Commands](#contract-commands)
- [Bridge Commands](#bridge-commands)
- [Monitor Commands](#monitor-commands)

---

## Example Contract

Examples in this guide use the **Token contract** from `@defi-wonderland/aztec-standards`.
A copy is available at `examples/Token.json`.

**Key addresses used in examples:**
```bash
# Example addresses (replace with your own)
ALICE="0x0c8a6673d7676cc80aaebe7fa7504cf51daa90ba906861bfad70a58a98bf5a7d"
BOB="0x226e8d1b3456e8f7c9adae5e3f5b7fcb87c39e5ca8e19a52d4dbc5d69a5c8e71"
TOKEN="0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"

# Example secret key (NEVER share real keys)
SECRET="0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"

# Example hashes
TX_HASH="0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
MSG_HASH="0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321"
```

---

## Global Options

Options that apply to all commands:

```bash
# JSON output (for scripting)
cazt --json <command>

# Network selection
cazt --sandbox <command>       # localhost:8080
cazt --devnet <command>        # devnet.aztec-labs.com (default)
cazt --testnet <command>       # aztec-testnet-fullnode.zkv.xyz

# Custom RPC URL
cazt --rpc-url http://my-node:8080 <command>
```

---

## Key Commands

Cryptographic key management.

### key generate

Generate a new random secret key:

```bash
# Generate new key
cazt key generate

# Output:
# Generated Secret Key
# ==================================================
#
# Secret Key: 0x1a2b3c4d...
#
# WARNING: Store this key securely...

# JSON output
cazt --json key generate
# {"secretKey":"0x1a2b3c4d...","warning":"Store this key..."}
```

### key derive-keys

Derive all 4 master keys from a secret:

```bash
cazt key derive-keys $SECRET

# Output:
# Derived Keys
# ==================================================
#
# Master Nullifier Key:   0x...
# Master Incoming Key:    0x...
# Master Outgoing Key:    0x...
# Master Tagging Key:     0x...
# Public Keys Hash:       0x...
```

### key derive-address

Compute account address from secret (without deploying):

```bash
# Default (schnorr, salt=0)
cazt key derive-address $SECRET

# With custom salt
cazt key derive-address $SECRET --salt 0x1234

# Output:
# Derived Address
# ==================================================
#
# Type:            schnorr
# Address:         0x0c8a6673d7676cc80aaebe7fa7504cf51daa90ba906861bfad70a58a98bf5a7d
# Salt:            0x0000...
# Partial Address: 0x...
```

### key import

Import a secret key to local storage:

```bash
# Import with auto-generated alias
cazt key import $SECRET

# Import with custom alias and type
cazt key import $SECRET --alias "my-wallet" --type schnorr
```

### key export

Export a secret key (requires confirmation):

```bash
# This will fail without confirmation flag
cazt key export my-wallet

# Confirm export
cazt key export my-wallet --yes-i-understand-the-risks
```

### key list

List stored keys:

```bash
cazt key list

# Output:
# Stored Keys
# ==================================================
#
# Alias:   my-wallet
# Address: 0x0c8a...
# Type:    schnorr
#
# Alias:   backup-key
# Address: 0x226e...
# Type:    schnorr
```

### key sign

Sign a message with Schnorr:

```bash
cazt key sign "Hello, Aztec!" $SECRET

# Output:
# Schnorr Signature
# ==================================================
#
# Message:    Hello, Aztec!
# Signature:  0x...
# Public Key: 0x...
```

### key verify

Verify a Schnorr signature:

```bash
cazt key verify "Hello, Aztec!" \
  --signature 0x... \
  --pubkey "0x...,0x..."

# Output: Valid: YES or Valid: NO
```

### key keystore create

Create an encrypted keystore file:

```bash
cazt key keystore create $SECRET --password "my-secure-password" --output ./keystore.json

# Output:
# Keystore Created
# ==================================================
#
# File:    ./keystore.json
# Address: 0x0c8a...
```

### key keystore unlock

Decrypt a keystore file:

```bash
cazt key keystore unlock ./keystore.json --password "my-secure-password"

# Output:
# Keystore Unlocked
# ==================================================
#
# Secret Key: 0x...
# Address:    0x...
```

---

## Wallet Commands

Account and wallet operations.

### wallet create

Create a new account:

```bash
# Create schnorr account (default)
cazt wallet create

# Create with specific type
cazt wallet create --type ecdsa-k

# Output:
# Account Created
# ==================================================
#
# Secret Key: 0x...
# Address:    0x...
# Type:       schnorr
# Salt:       0x...
```

### wallet address

Compute address from secret:

```bash
cazt wallet address $SECRET

# With options
cazt wallet address $SECRET --type schnorr --salt 0x1234
```

### wallet deploy

Deploy account contract (requires network):

```bash
cazt --sandbox wallet deploy $SECRET
```

### wallet info

Get account information:

```bash
cazt wallet info $ALICE
```

### wallet register

Register account with PXE (partial - shows computed keys):

```bash
cazt wallet register $ALICE --secret $SECRET
```

### wallet list

List known accounts:

```bash
# List locally stored keys
cazt wallet list --local
```

### wallet balance

Check token balance:

```bash
# Public balance (works via node)
cazt --sandbox wallet balance $ALICE --token $TOKEN --public

# Output:
# Token Balance
# ==================================================
#
# Address:  0x0c8a...
# Token:    0x1234...
# Balance:  1000000
# Type:     public
```

### wallet vanity

Generate vanity address:

```bash
# Find address starting with "0xdead"
cazt wallet vanity dead

# With suffix and max attempts
cazt wallet vanity abc --suffix def --max-attempts 5000000

# Output:
# Vanity Address Found!
# ==================================================
#
# Address:    0xdeadbeef...
# Secret Key: 0x...
# Found after 42,000 attempts in 5.23s
```

---

## Cast Commands

Utility and conversion commands.

### cast hash

Hash functions:

```bash
# Zero hash
cazt cast hash zero
# Output: 0x0000000000000000000000000000000000000000000000000000000000000000

# Keccak-256
cazt cast hash keccak "hello"
cazt cast hash keccak 0x68656c6c6f
# Output: 0x1c8aff950685c2ed4bc3174f3472287b56d9517b9c948127319a09a7a36deac8

# SHA-256
cazt cast hash sha256 "hello"

# Poseidon2 (fields as JSON array)
cazt cast hash poseidon2 '["0x01", "0x02", "0x03"]'

# Pedersen with generator index
cazt cast hash pedersen '["0x01", "0x02"]' --index 0

# Secret hash
cazt cast hash secret 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
```

### cast address

Aztec address utilities:

```bash
# Zero address
cazt cast address zero
# Output: 0x0000000000000000000000000000000000000000000000000000000000000000

# Random address
cazt cast address random

# Validate address
cazt cast address validate $ALICE
# Output: Valid: 0x0c8a...

# Check if valid
cazt cast address is-valid $ALICE
# Output: true

# Convert from field
cazt cast address from-field 0x1234

# Convert from bigint
cazt cast address from-bigint 12345678901234567890

# Convert from number
cazt cast address from-number 42

# Get Grumpkin point
cazt cast address to-point $ALICE
# Output:
# x: 0x...
# y: 0x...
```

### cast eth

Ethereum address utilities:

```bash
# Zero ETH address
cazt cast eth zero
# Output: 0x0000000000000000000000000000000000000000

# Random ETH address
cazt cast eth random

# Validate ETH address
cazt cast eth validate 0x742d35cc6634c0532925a3b844bc454e4438f44e

# Check if zero
cazt cast eth is-zero 0x0000000000000000000000000000000000000000
# Output: true

# Convert to/from field
cazt cast eth from-field 0x742d35cc6634c0532925a3b844bc454e4438f44e
cazt cast eth to-field 0x742d35cc6634c0532925a3b844bc454e4438f44e
```

### cast field

Field element utilities:

```bash
# Random field
cazt cast field random

# From/to string
cazt cast field from-string 0x1234
cazt cast field to-string 0x1234567890abcdef

# From/to buffer
cazt cast field from-buffer 1234567890abcdef
cazt cast field to-buffer 0x1234567890abcdef

# From/to bigint
cazt cast field from-bigint 12345678901234567890
cazt cast field to-bigint 0x1234567890abcdef

# Check if zero
cazt cast field is-zero 0x0000000000000000000000000000000000000000000000000000000000000000
# Output: true

# Compare fields
cazt cast field equals 0x01 0x01
# Output: true
```

### cast selector

Function selector utilities:

```bash
# Compute function selector
cazt cast selector compute "transfer(address,uint256)"

# Event selector
cazt cast selector event "Transfer(address,address,uint256)"

# Note selector
cazt cast selector note "ValueNote"

# From field/string
cazt cast selector from-field 0x12345678
cazt cast selector from-string 0x12345678

# Empty selector
cazt cast selector empty
```

### cast abi

ABI encoding/decoding:

```bash
# Encode arguments
cazt cast abi encode '{"abi":[{"kind":"field"}],"args":["0x1234"]}'

# Decode fields
cazt cast abi decode '{"types":[{"kind":"field"}],"fields":["0x1234"]}'

# Decode function signature
cazt cast abi decode-sig '{"name":"transfer","parameters":[{"name":"to","type":{"kind":"field"}},{"name":"amount","type":{"kind":"integer","sign":"unsigned","width":64}}]}'
```

### cast nullifier

Nullifier utilities:

```bash
# Silo nullifier with contract
cazt cast nullifier silo --contract $TOKEN --nullifier 0x1234

# Compute L1->L2 message nullifier
cazt cast nullifier l1-to-l2 \
  --contract $TOKEN \
  --message-hash $MSG_HASH \
  --secret $SECRET
```

### cast note

Note utilities:

```bash
# Compute note hash nonce
cazt cast note hash-nonce --nullifier-zero 0x1234 --index 0

# Silo note hash
cazt cast note silo-hash --contract $TOKEN --note-hash 0x1234

# Compute unique note hash
cazt cast note unique-hash --nonce 0x1234 --siloed-note-hash 0x5678
```

### cast artifact

Contract artifact utilities:

```bash
# Load and display artifact
cazt cast artifact load examples/Token.json

# Serialize to buffer
cazt cast artifact to-buffer examples/Token.json

# Deserialize from buffer
cazt cast artifact from-buffer 0x...
```

### cast message

Message utilities:

```bash
# Compute L2->L1 message hash
cazt cast message l2-to-l1-hash '{"l2Sender":"0x...","l1Recipient":"0x...","content":"0x...","rollupVersion":"1","chainId":"31337"}'
```

### cast log

Log utilities:

```bash
# Silo private log tag
cazt cast log silo-private --contract $TOKEN --tag 0x1234

# Decrypt private log
cazt cast log decrypt-private \
  --ciphertext '["0x1234","0x5678"]' \
  --recipient-address $ALICE \
  --recipient-secret-key $SECRET
```

### cast misc

Miscellaneous utilities:

```bash
# Hash calldata
cazt cast calldata-hash '["0x1234","0x5678"]'

# Hash variable arguments (authwit)
cazt cast var-args-hash '["0x1234","0x5678"]'

# Compute public data slot
cazt cast public-data-slot --contract $TOKEN --slot 0x01

# Hash verification key
cazt cast hash-vk '["0x01","0x02","0x03"]'

# Convert buffer to fields
cazt cast buffer-as-fields '{"buffer":"1234567890abcdef","targetLength":2}'
```

---

## Query Commands

State queries.

### query public

Read public storage:

```bash
# Read slot at latest block
cazt --sandbox query public $TOKEN 0x01

# Read at specific block
cazt --sandbox query public $TOKEN 0x01 --block 100

# Output:
# Public Storage Query
# ========================================
# Contract:    0x1234...
# Slot:        0x01
# Block:       latest
# Value:       1000000
```

### query nullifiers

Check if nullifier exists:

```bash
cazt --sandbox query nullifiers 0x1234567890abcdef

# Output:
# Nullifier Query
# ========================================
# Nullifier:   0x1234...
# Exists:      Yes
# Index:       42
```

### query tx

Get transaction details:

```bash
cazt --sandbox query tx $TX_HASH
```

### query logs

Query historical logs:

```bash
# Query public logs
cazt --sandbox query logs $TOKEN --from 0 --to 100

# Output:
# Public Logs Query
# ========================================
# Contract:    0x1234...
# From Block:  0
# To Block:    100
# Found:       5 logs
```

### query block

Block queries:

```bash
# Get current block number
cazt --sandbox query block number
# Output: 42

# Get proven block number
cazt --sandbox query block proven-number
# Output: 40

# Get block tips
cazt --sandbox query block tips
# Output:
# Block Tips
# ========================================
# Latest:     42
# Proven:     40
# Finalized:  40

# Get block by number
cazt --sandbox query block get 42

# Get block by hash
cazt --sandbox query block get 0xabcdef...

# Get full block with transactions
cazt --sandbox query block get 42 --full

# Get block range
cazt --sandbox query block range 10 20

# Get block header
cazt --sandbox query block header 42
```

---

## Node Commands

Node information and status.

### node ready

Check if node is ready:

```bash
cazt --sandbox node ready
# Output: Node is ready (block 42)

# JSON output
cazt --json --sandbox node ready
# {"ready":true,"nodeUrl":"http://localhost:8080","blockNumber":42}
```

### node info

Get node information:

```bash
cazt --sandbox node info

# Output:
# Node Information
# ========================================
# Node Version:     0.72.0
# Chain ID:         31337
# Protocol Version: 1
# ENR:              enr:-...
#
# L1 Contracts:
#   Rollup:         0x...
#   Registry:       0x...
#   Inbox:          0x...
#   Outbox:         0x...
```

### node version

Get node version:

```bash
cazt --sandbox node version
# Output: 0.72.0
```

### node chain-id

Get chain ID:

```bash
cazt --sandbox node chain-id
# Output: 31337
```

### node l1-addresses

Get L1 contract addresses:

```bash
cazt --sandbox node l1-addresses

# Output:
# L1 Contract Addresses
# ========================================
# rollup Address        0x...
# registry Address      0x...
# inbox Address         0x...
# outbox Address        0x...
```

### node protocol-addresses

Get protocol contract addresses:

```bash
cazt --sandbox node protocol-addresses
```

### node enr

Get node ENR:

```bash
cazt --sandbox node enr
# Output: enr:-...
```

### node base-fees

Get current base fees:

```bash
cazt --sandbox node base-fees

# Output:
# Base Fees
# ========================================
# Fee Per Gas:    1
# Fee Per DA Gas: 1
```

### node sync-status

Get sync status:

```bash
cazt --sandbox node sync-status

# Output:
# Sync Status
# ========================================
# Status:        Synced
# Latest Block:  42
# Proven Block:  40
# Blocks Behind: 2

# JSON output (for scripting)
cazt --json --sandbox node sync-status
# {"synced":true,"latestBlock":42,"provenBlock":40,"blocksBehind":2}
```

---

## TX Commands

Transaction operations.

### tx analyze

Analyze a transaction:

```bash
# Basic analysis
cazt --sandbox tx analyze $TX_HASH

# With options
cazt --sandbox tx analyze $TX_HASH --effects --logs --gas

# With artifact for decoding
cazt --sandbox tx analyze $TX_HASH --artifact examples/Token.json
```

### tx compare

Compare two transactions:

```bash
cazt --sandbox tx compare $TX_HASH1 $TX_HASH2
```

### tx decode

Decode calldata:

```bash
cazt tx decode 0x1234567890 --artifact examples/Token.json

# With specific function
cazt tx decode 0x1234567890 --artifact examples/Token.json --function transfer
```

### tx status

Quick status check:

```bash
cazt --sandbox tx status $TX_HASH
# Output: mined

# Possible outputs: pending, mined, reverted, dropped
```

### tx receipt

Get full receipt:

```bash
cazt --sandbox tx receipt $TX_HASH

# Output:
# Transaction Receipt
# ========================================
# TX Hash:     0xabcd...
# Status:      SUCCESS
# Block:       42
# Block Hash:  0x1234...
# Fee:         1000 wei
```

### tx wait

Wait for transaction to be mined:

```bash
# Wait with default timeout (60s)
cazt --sandbox tx wait $TX_HASH

# Custom timeout
cazt --sandbox tx wait $TX_HASH --timeout 120

# Output: Transaction mined in block 42
```

---

## Contract Commands

Contract interaction.

### contract info

Get contract instance details:

```bash
cazt --sandbox contract info $TOKEN

# Output:
# Contract Instance
# ========================================
# Address:         0x1234...
# Class ID:        0x5678...
# Deployer:        0xabcd...
# Initialization:  0x...
# Public Keys:     Present
```

### contract class

Get contract class details:

```bash
cazt --sandbox contract class 0x5678...

# Output:
# Contract Class
# ========================================
# Class ID:        0x5678...
# Artifact Hash:   0x...
# Functions:       10 public, 5 private
# Version:         1
```

### contract abi

Pretty-print contract ABI:

```bash
cazt contract abi examples/Token.json

# Output:
# Contract ABI
# ========================================
# Name:      Token
# Functions: 25
# Events:    3
#
# Functions:
#   [public] constructor_with_minter(admin: field, minter: field)
#   [private] transfer(to: field, amount: integer)
#   [public] balance_of_public(owner: field) -> integer
#   ...
```

### contract storage

Read public storage:

```bash
# Get guidance without slot
cazt --sandbox contract storage $TOKEN

# Read specific slot
cazt --sandbox contract storage $TOKEN 0x01
# Output: Storage[0x01] = 1000000
```

### contract events

Query contract events:

```bash
# All events
cazt --sandbox contract events $TOKEN

# With block range
cazt --sandbox contract events $TOKEN --from 0 --to 100

# Filter by event name (requires artifact)
cazt --sandbox contract events $TOKEN --event Transfer --artifact examples/Token.json
```

### contract logs

Query contract logs:

```bash
cazt --sandbox contract logs $TOKEN --from 0 --to 100
```

### contract artifact info

Show artifact information:

```bash
cazt contract artifact info examples/Token.json

# Output:
# Artifact Info
# ========================================
# Name:       Token
# Functions:  25
# Events:     3
# Notes:      2
#
# Functions:
#   - constructor_with_minter (public)
#   - transfer (private)
#   - balance_of_public (utility)
#   ...
```

### contract registry

Interact with artifact registry:

```bash
# List all artifacts
cazt contract registry list

# Output:
# Artifact Registry
# ========================================
# Found: 15 artifacts
#
#   Token
#     Class ID: 0x1234...
#   NFT
#     Class ID: 0x5678...
#   ...

# Download artifact by class ID
cazt contract registry get 0x1234... -o Token.json

# Search artifacts
cazt contract registry search "Token"
```

---

## Bridge Commands

L1<->L2 messaging.

### bridge l1-to-l2-witness

Get L1->L2 message membership witness:

```bash
cazt --sandbox bridge l1-to-l2-witness $MSG_HASH

# Output:
# L1->L2 Message Witness
# ========================================
# Message Hash: 0xfedc...
# Index:        42
# Leaf Value:   0x...
# Sibling Path: 32 nodes
```

### bridge l1-to-l2-block

Find block containing L1->L2 message:

```bash
cazt --sandbox bridge l1-to-l2-block $MSG_HASH
# Output: Message found in block 42
```

### bridge is-l1-to-l2-synced

Check if L1->L2 messages are synced:

```bash
cazt --sandbox bridge is-l1-to-l2-synced 1000
# Output: Synced
```

### bridge l2-to-l1

Get L2->L1 messages from a block:

```bash
cazt --sandbox bridge l2-to-l1 42

# Output:
# L2->L1 Messages in Block 42
# ========================================
# Found: 2 messages
#
# [1] 0x1234...
# [2] 0x5678...
```

### bridge status

Check cross-chain message status:

```bash
cazt --sandbox bridge status $MSG_HASH

# Output:
# Message Status
# ========================================
# Hash:   0xfedc...
# Status: delivered
# Block:  42
```

---

## Monitor Commands

Real-time monitoring.

### monitor blocks

Stream new blocks:

```bash
# Monitor all blocks
cazt --sandbox monitor blocks

# Monitor only proven blocks
cazt --sandbox monitor blocks --proven

# Custom polling interval
cazt --sandbox monitor blocks --interval 5000

# Output (continuous):
# Monitoring blocks (Ctrl+C to stop)...
#
# Block 42: 3 txs
# Block 43: 1 txs
# Block 44: 5 txs
# ^C
# Stopped monitoring
```

### monitor address

Watch activity for an address:

```bash
cazt --sandbox monitor address $TOKEN

# Output (continuous):
# Monitoring address 0x1234... (Ctrl+C to stop)
#
# Block 42: Log with 5 fields
# Block 43: Log with 3 fields
```

### monitor events

Watch contract events:

```bash
# All events
cazt --sandbox monitor events $TOKEN

# Filter by event name
cazt --sandbox monitor events $TOKEN --event Transfer --artifact examples/Token.json

# Custom interval
cazt --sandbox monitor events $TOKEN --interval 3000
```

### monitor logs

Stream public logs:

```bash
# All logs
cazt --sandbox monitor logs

# Filter by contract
cazt --sandbox monitor logs --contract $TOKEN
```

---

## Scripting Examples

### Check if node is ready before running commands

```bash
#!/bin/bash
if cazt --json --sandbox node ready | jq -e '.ready' > /dev/null; then
  echo "Node is ready, proceeding..."
  cazt --sandbox query block number
else
  echo "Node not ready, exiting"
  exit 1
fi
```

### Generate and store a new account

```bash
#!/bin/bash
# Generate new key
RESULT=$(cazt --json key generate)
SECRET=$(echo $RESULT | jq -r '.secretKey')

# Import with alias
cazt key import $SECRET --alias "new-account"

# Get address
ADDRESS=$(cazt --json wallet address $SECRET | jq -r '.address')
echo "Created account: $ADDRESS"
```

### Monitor blocks and extract transactions

```bash
#!/bin/bash
cazt --json --sandbox monitor blocks 2>&1 | while read line; do
  BLOCK=$(echo $line | jq -r '.blockNumber // empty')
  if [ -n "$BLOCK" ]; then
    echo "New block: $BLOCK"
    # Could fetch full block details here
  fi
done
```

### Query token balance

```bash
#!/bin/bash
TOKEN="0x..."
OWNER="0x..."

BALANCE=$(cazt --json --sandbox wallet balance $OWNER --token $TOKEN --public | jq -r '.balance')
echo "Balance: $BALANCE"
```

---

## Error Handling

Most commands exit with code 1 on error:

```bash
# Check exit code
cazt --sandbox contract info 0xinvalid
echo "Exit code: $?"  # 1

# Capture error message
ERROR=$(cazt --sandbox contract info 0xinvalid 2>&1)
if [ $? -ne 0 ]; then
  echo "Error: $ERROR"
fi
```

---

## Environment Variables

You can set defaults via environment:

```bash
# Set default RPC URL
export AZTEC_RPC_URL="http://localhost:8080"

# Now commands use this by default
cazt node ready
```

---

*Generated for CAZT CLI - Aztec Protocol*
