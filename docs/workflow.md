# CAZT CLI - End-to-End Workflow

This guide walks through a complete workflow: from generating keys to deploying and interacting with contracts.

## Prerequisites

- A running Aztec node (sandbox, devnet, or testnet)
- The Token contract artifact (included in `examples/Token.json`)

## Fee Payments

CAZT uses the **Sponsored FPC** (Fee Payment Contract) for all transactions. This is automatically registered with the wallet when you deploy accounts or contracts, so you don't need to have any tokens to pay for gas - fees are sponsored.

## Quick Start

```bash
# Start local sandbox (in another terminal)
aztec start --sandbox

# Set environment for sandbox
export AZTEC_RPC_URL="http://localhost:8080"
```

---

## TL;DR - Complete Example

```bash
# 1. Create a key
SECRET=$(./bin/cazt --json key generate zorzal | jq -r '.secretKey')
echo "Secret: $SECRET"

# 2. Deploy the account
./bin/cazt --sandbox wallet deploy $SECRET

# 3. Get the minter address (the account we just deployed)
MINTER=$(./bin/cazt --json key derive-address $SECRET | jq -r '.address')
echo "Minter: $MINTER"

# 4. Get the zero address for upgrade_authority
ZERO=$(./bin/cazt cast address zero)
echo "Zero: $ZERO"

# 5. Deploy the Token contract using constructor_with_minter
./bin/cazt --sandbox contract deploy examples/Token.json \
  --from $SECRET \
  --constructor constructor_with_minter \
  --args "[\"MyToken\", \"MTK\", 18, \"$MINTER\", \"$ZERO\"]" \
  --salt 1337
```

---

## Step 1: Generate Keys

```bash
# Generate a new secret key
./bin/cazt key generate

# Output:
# Generated Secret Key
# ==================================================
#
# Secret Key: 0x1234567890abcdef...
#
# WARNING: Store this key securely...

# Save the secret key to a variable
SECRET=$(./bin/cazt --json key generate | jq -r '.secretKey')
echo "Secret: $SECRET"
```

---

## Step 2: Derive Account Address

```bash
# Compute the address that will be created from this secret
./bin/cazt key derive-address $SECRET

# Output:
# Derived Address
# ==================================================
#
# Type:            schnorr
# Address:         0x0c8a6673d7676cc80aaebe7fa7504cf51daa90ba906861bfad70a58a98bf5a7d
# Salt:            0x0000...
# Partial Address: 0x...

# Save address
ADDRESS=$(./bin/cazt --json key derive-address $SECRET | jq -r '.address')
echo "Address: $ADDRESS"
```

---

## Step 3: Store Key Locally (Optional)

```bash
# Import key for easy access later
./bin/cazt key import $SECRET --alias my-wallet

# List stored keys
./bin/cazt key list
```

---

## Step 4: Deploy Account Contract

```bash
# Deploy the account contract to the network
./bin/cazt --sandbox wallet deploy $SECRET

# Output:
# Account Deployed
# ==================================================
#
# Address:     0x0c8a6673d7676cc80aaebe7fa7504cf51daa90ba906861bfad70a58a98bf5a7d
# TX Hash:     0x...
# Block:       42
```

---

## Step 5: Verify Account Deployment

```bash
# Check if the account contract exists on-chain
./bin/cazt --sandbox contract info $ADDRESS

# Output:
# Contract Instance
# ==================================================
# Address:         0x0c8a...
# Class ID:        0x... (Schnorr account class)
# Deployer:        0x...
# ...
```

---

## Step 6: Deploy a Token Contract

```bash
# Deploy Token contract with constructor arguments
# Token constructor: (name, symbol, decimals, asset, upgrade_authority)
./bin/cazt --sandbox contract deploy examples/Token.json \
  --from $SECRET \
  --args '["MyToken", "MTK", 18, "'$ADDRESS'", "'$ADDRESS'"]' \
  --salt random

# Output:
# Contract Deployed
# ==================================================
# Address:       0x1234567890abcdef...
# TX Hash:       0x...
# Class ID:      0x...
# Block:         43
# Status:        success
#
# Deployer Account:
#   Address:     0x0c8a...

# Save token address
TOKEN=$(./bin/cazt --json --sandbox contract deploy examples/Token.json \
  --from $SECRET \
  --args '["MyToken", "MTK", 18, "'$ADDRESS'", "'$ADDRESS'"]' \
  --salt random | jq -r '.contract.address')
echo "Token: $TOKEN"
```

---

## Step 7: Query Contract Information

```bash
# Get contract info
./bin/cazt --sandbox contract info $TOKEN

# Get contract class info
CLASS_ID=$(./bin/cazt --json --sandbox contract info $TOKEN | jq -r '.contractClassId')
./bin/cazt --sandbox contract class $CLASS_ID

# View the contract's ABI
./bin/cazt contract abi examples/Token.json
```

---

## Step 8: Read Public Storage

```bash
# Read the token name (slot 1 in Token contract)
./bin/cazt --sandbox contract storage $TOKEN 0x01

# Read token symbol (slot 3)
./bin/cazt --sandbox contract storage $TOKEN 0x03

# Read decimals (slot 5)
./bin/cazt --sandbox contract storage $TOKEN 0x05

# Query public storage directly
./bin/cazt --sandbox query public $TOKEN 0x01
```

---

## Step 9: Monitor Activity

```bash
# Watch for new blocks
./bin/cazt --sandbox monitor blocks

# Watch events from the token contract
./bin/cazt --sandbox monitor events $TOKEN

# Watch logs from the token contract
./bin/cazt --sandbox monitor logs --contract $TOKEN
```

---

## Step 10: Query Transactions

```bash
# Get a specific transaction
./bin/cazt --sandbox query tx $TX_HASH

# Analyze transaction details
./bin/cazt --sandbox tx analyze $TX_HASH

# Wait for a transaction to be mined
./bin/cazt --sandbox tx wait $TX_HASH
```

---

## Complete Script Example

```bash
#!/bin/bash
set -e

# Configuration
NODE_URL="http://localhost:8080"

echo "=== CAZT CLI Workflow Demo ==="
echo ""

# Step 1: Generate key
echo "1. Generating secret key..."
SECRET=$(./bin/cazt --json key generate | jq -r '.secretKey')
echo "   Secret: ${SECRET:0:20}..."

# Step 2: Derive address
echo "2. Deriving address..."
ADDRESS=$(./bin/cazt --json key derive-address $SECRET | jq -r '.address')
echo "   Address: $ADDRESS"

# Step 3: Check node is ready
echo "3. Checking node status..."
./bin/cazt --rpc-url $NODE_URL node ready

# Step 4: Deploy account
echo "4. Deploying account contract..."
ACCOUNT_RESULT=$(./bin/cazt --json --rpc-url $NODE_URL wallet deploy $SECRET)
echo "   TX: $(echo $ACCOUNT_RESULT | jq -r '.txHash')"

# Step 5: Deploy Token contract
echo "5. Deploying Token contract..."
TOKEN_RESULT=$(./bin/cazt --json --rpc-url $NODE_URL contract deploy examples/Token.json \
  --from $SECRET \
  --args "[\"DemoToken\", \"DEMO\", 18, \"$ADDRESS\", \"$ADDRESS\"]" \
  --salt random)
TOKEN=$(echo $TOKEN_RESULT | jq -r '.contract.address')
echo "   Token Address: $TOKEN"
echo "   TX: $(echo $TOKEN_RESULT | jq -r '.txHash')"

# Step 6: Query contract info
echo "6. Querying contract info..."
./bin/cazt --rpc-url $NODE_URL contract info $TOKEN

# Step 7: Read storage
echo "7. Reading token storage..."
echo "   Name slot:"
./bin/cazt --rpc-url $NODE_URL contract storage $TOKEN 0x01

echo ""
echo "=== Workflow Complete ==="
echo "Account: $ADDRESS"
echo "Token:   $TOKEN"
```

---

## Workflow with Devnet

```bash
# Connect to devnet instead of sandbox
./bin/cazt --devnet node ready

# All commands work the same, just use --devnet flag
./bin/cazt --devnet key generate
./bin/cazt --devnet wallet deploy $SECRET
./bin/cazt --devnet contract deploy examples/Token.json --from $SECRET --args '...'
```

---

## Workflow with Testnet

```bash
# Connect to testnet
./bin/cazt --testnet node ready

# Deploy to testnet
./bin/cazt --testnet contract deploy examples/Token.json --from $SECRET --args '...'
```

---

## Common Patterns

### Get JSON output for scripting

```bash
# All commands support --json flag
RESULT=$(./bin/cazt --json --sandbox node info)
CHAIN_ID=$(echo $RESULT | jq -r '.l1ChainId')
VERSION=$(echo $RESULT | jq -r '.nodeVersion')
```

### Error handling

```bash
if ! ./bin/cazt --sandbox node ready 2>/dev/null; then
  echo "Node not ready, starting sandbox..."
  # Start sandbox
fi
```

### Compute address without deploying

```bash
# Just compute the address (no network needed)
./bin/cazt wallet address $SECRET --type schnorr --salt 0x0000
```

### Use with custom RPC

```bash
./bin/cazt --rpc-url http://my-node:8080 node info
```

---

## Quick Reference

| Step | Command | Network |
|------|---------|---------|
| Generate key | `cazt key generate` | No |
| Derive address | `cazt key derive-address <secret>` | No |
| Import key | `cazt key import <secret> --alias <name>` | No |
| Deploy account | `cazt wallet deploy <secret>` | Yes |
| Deploy contract | `cazt contract deploy <artifact> --from <secret>` | Yes |
| Query contract | `cazt contract info <address>` | Yes |
| Read storage | `cazt contract storage <address> <slot>` | Yes |
| Monitor blocks | `cazt monitor blocks` | Yes |
| Query TX | `cazt query tx <hash>` | Yes |

---

*Generated for CAZT CLI - Aztec Protocol*
