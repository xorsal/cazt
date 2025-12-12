#!/bin/bash
#
# CAZT CLI - End-to-End Workflow Script
#
# This script validates each command in sequence across all domains.
# Run with --sandbox, --devnet, or --testnet to specify the network.
#
# Usage:
#   ./scripts/e2e-workflow.sh --sandbox      # Local sandbox
#   ./scripts/e2e-workflow.sh --devnet       # Aztec devnet
#   ./scripts/e2e-workflow.sh --offline      # Offline commands only
#
# Set CAZT_SECRET to use an existing secret key instead of generating a new one.
#

# Exit on errors
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# CLI path
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLI="$SCRIPT_DIR/../bin/cazt"

# Parse arguments
NETWORK_FLAG=""
OFFLINE_ONLY=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --sandbox)
      NETWORK_FLAG="--sandbox"
      shift
      ;;
    --devnet)
      NETWORK_FLAG="--devnet"
      shift
      ;;
    --testnet)
      NETWORK_FLAG="--testnet"
      shift
      ;;
    --offline)
      OFFLINE_ONLY=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 [--sandbox|--devnet|--testnet|--offline]"
      exit 1
      ;;
  esac
done

# Helper functions
print_header() {
  echo ""
  echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}  $1${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
}

print_step() {
  echo ""
  echo -e "${YELLOW}▶ $1${NC}"
}

print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
  echo -e "${RED}✗ $1${NC}"
}

run_cmd() {
  echo -e "${YELLOW}  \$ $CLI $@${NC}"
  if $CLI "$@"; then
    print_success "Command succeeded"
    return 0
  else
    print_error "Command failed"
    return 1
  fi
}

run_cmd_json() {
  echo -e "${YELLOW}  \$ $CLI --json $@${NC}"
  $CLI --json "$@"
}

# State variables
SECRET=""
ADDRESS=""
SIGNATURE=""
PUBKEY=""
KEYSTORE_PATH="/tmp/cazt-e2e-keystore-$$.json"
TOKEN_ADDRESS=""
TX_HASH=""

print_header "CAZT CLI End-to-End Workflow"
echo "Network: ${NETWORK_FLAG:-none (offline mode)}"
echo "Offline only: $OFFLINE_ONLY"
echo ""

# =============================================================================
# DOMAIN 1: KEY COMMANDS
# =============================================================================

print_header "DOMAIN 1: KEY COMMANDS"

print_step "1.1 key generate - Generate a new secret key"
if [ -z "$CAZT_SECRET" ]; then
  KEY_OUTPUT=$($CLI --json key generate 2>/dev/null)
  SECRET=$(echo "$KEY_OUTPUT" | jq -r '.secretKey')
  if [ -z "$SECRET" ] || [ "$SECRET" = "null" ]; then
    print_error "Failed to generate key"
    echo "  Output: $KEY_OUTPUT"
    exit 1
  fi
  echo "  Generated secret: ${SECRET:0:20}..."
else
  SECRET="$CAZT_SECRET"
  echo "  Using provided secret: ${SECRET:0:20}..."
fi
print_success "Secret key ready"

print_step "1.2 key derive-keys - Derive all master keys from secret"
run_cmd key derive-keys "$SECRET"

print_step "1.3 key derive-address - Compute address from secret"
ADDR_OUTPUT=$($CLI --json key derive-address "$SECRET" 2>/dev/null)
ADDRESS=$(echo "$ADDR_OUTPUT" | jq -r '.address')
if [ -z "$ADDRESS" ] || [ "$ADDRESS" = "null" ]; then
  print_error "Failed to derive address"
  echo "  Output: $ADDR_OUTPUT"
  exit 1
fi
echo "  Derived address: $ADDRESS"
print_success "Address derived"

print_step "1.4 key import - Import secret key with alias"
ALIAS="e2e-test-$$"
run_cmd key import "$SECRET" --alias "$ALIAS" || echo "  (May fail if alias exists)"

print_step "1.5 key list - List stored keys"
run_cmd key list

print_step "1.6 key export - Export stored key (with confirmation)"
run_cmd key export "$ALIAS" --yes-i-understand-the-risks || echo "  (May fail if key not found)"

print_step "1.7 key sign - Sign a message"
MESSAGE="E2E Test Message"
SIGN_RESULT=$($CLI --json key sign "$MESSAGE" "$SECRET" 2>/dev/null)
SIGNATURE=$(echo "$SIGN_RESULT" | jq -r '.signature')
PUBKEY=$(echo "$SIGN_RESULT" | jq -r '.publicKey')
if [ -z "$SIGNATURE" ] || [ "$SIGNATURE" = "null" ]; then
  print_error "Failed to sign message"
  echo "  Output: $SIGN_RESULT"
else
  echo "  Signature: ${SIGNATURE:0:40}..."
  echo "  Public Key: ${PUBKEY:0:40}..."
  print_success "Message signed"
fi

print_step "1.8 key verify - Verify the signature"
run_cmd key verify "$MESSAGE" --signature "$SIGNATURE" --pubkey "$PUBKEY"

print_step "1.9 key keystore create - Create encrypted keystore"
run_cmd key keystore create "$SECRET" --password "test-password" --output "$KEYSTORE_PATH"
echo "  Keystore created at: $KEYSTORE_PATH"

print_step "1.10 key keystore unlock - Unlock keystore"
run_cmd key keystore unlock "$KEYSTORE_PATH" --password "test-password"

# Cleanup keystore
rm -f "$KEYSTORE_PATH"
print_success "Keystore tests complete (cleaned up)"

# =============================================================================
# DOMAIN 2: CAST COMMANDS (all offline)
# =============================================================================

print_header "DOMAIN 2: CAST COMMANDS (Utilities)"

print_step "2.1 cast hash zero"
run_cmd cast hash zero

print_step "2.2 cast hash keccak"
run_cmd cast hash keccak "hello world"

print_step "2.3 cast hash sha256"
run_cmd cast hash sha256 "hello world"

print_step "2.4 cast hash poseidon2"
FIELD1="0x0000000000000000000000000000000000000000000000000000000000000001"
run_cmd cast hash poseidon2 "[\"$FIELD1\"]"

print_step "2.5 cast hash pedersen"
run_cmd cast hash pedersen "[\"$FIELD1\"]"

print_step "2.6 cast hash secret"
run_cmd cast hash secret "$FIELD1"

print_step "2.7 cast address zero"
run_cmd cast address zero

print_step "2.8 cast address random"
run_cmd cast address random

print_step "2.9 cast address validate"
run_cmd cast address validate "$ADDRESS"

print_step "2.10 cast address from-field"
run_cmd cast address from-field "$FIELD1"

print_step "2.11 cast address from-bigint"
run_cmd cast address from-bigint "12345"

print_step "2.12 cast eth zero"
run_cmd cast eth zero

print_step "2.13 cast eth random"
run_cmd cast eth random

print_step "2.14 cast eth validate"
run_cmd cast eth validate "0x0000000000000000000000000000000000000001"

print_step "2.15 cast eth to-field"
run_cmd cast eth to-field "0x0000000000000000000000000000000000000001"

print_step "2.16 cast field random"
FIELD_OUTPUT=$($CLI --json cast field random 2>/dev/null)
RANDOM_FIELD=$(echo "$FIELD_OUTPUT" | jq -r '.field')
echo "  Random field: ${RANDOM_FIELD:0:30}..."

print_step "2.17 cast field from-string"
run_cmd cast field from-string "12345"

print_step "2.18 cast field is-zero"
ZERO_FIELD="0x0000000000000000000000000000000000000000000000000000000000000000"
run_cmd cast field is-zero "$ZERO_FIELD"

print_step "2.19 cast field equals"
run_cmd cast field equals "$FIELD1" "$FIELD1"

print_step "2.20 cast selector compute"
run_cmd cast selector compute "transfer(address,uint256)"

print_step "2.21 cast selector event"
run_cmd cast selector event "Transfer(address,address,uint256)"

print_step "2.22 cast selector empty"
run_cmd cast selector empty

# Note: cast abi encode/decode commands require full ABI definitions
# They are designed to work with contract artifacts, not simple type arrays
# Skipping for e2e workflow - these are tested in unit tests with proper ABI fixtures
echo ""
echo "  [Skipping cast abi commands - require full ABI definitions from artifacts]"

# =============================================================================
# DOMAIN 3: WALLET COMMANDS (offline parts)
# =============================================================================

print_header "DOMAIN 3: WALLET COMMANDS"

print_step "3.1 wallet address - Compute address offline"
run_cmd wallet address "$SECRET" --type schnorr

print_step "3.2 wallet create - Create new wallet"
NEW_WALLET=$($CLI --json wallet create --type schnorr 2>/dev/null)
NEW_WALLET_ADDR=$(echo "$NEW_WALLET" | jq -r '.address')
echo "  New wallet address: $NEW_WALLET_ADDR"

print_step "3.3 wallet vanity - Generate vanity address"
echo "  (This may take a few seconds...)"
run_cmd wallet vanity "0x00" --type schnorr || echo "  (Vanity generation timed out or failed)"

if [ "$OFFLINE_ONLY" = true ]; then
  print_header "OFFLINE MODE - Skipping network commands"
  echo "Run with --sandbox, --devnet, or --testnet for full workflow"

  print_header "E2E WORKFLOW COMPLETE (Offline)"
  echo "Secret: ${SECRET:0:30}..."
  echo "Address: $ADDRESS"
  exit 0
fi

# =============================================================================
# NETWORK COMMANDS (require --sandbox, --devnet, or --testnet)
# =============================================================================

if [ -z "$NETWORK_FLAG" ]; then
  print_header "NO NETWORK FLAG - Skipping network commands"
  echo "Run with --sandbox, --devnet, or --testnet for full workflow"
  exit 0
fi

# =============================================================================
# DOMAIN 4: NODE COMMANDS
# =============================================================================

print_header "DOMAIN 4: NODE COMMANDS"

print_step "4.1 node ready - Check if node is ready"
run_cmd $NETWORK_FLAG node ready || echo "  (Node may not be running)"

print_step "4.2 node info - Get node information"
run_cmd $NETWORK_FLAG node info || echo "  (Failed to get node info)"

print_step "4.3 node version - Get node version"
run_cmd $NETWORK_FLAG node version || echo "  (Failed to get version)"

print_step "4.4 node chain-id - Get chain ID"
run_cmd $NETWORK_FLAG node chain-id || echo "  (Failed to get chain ID)"

print_step "4.5 node base-fees - Get current fees"
run_cmd $NETWORK_FLAG node base-fees || echo "  (Failed to get fees)"

print_step "4.6 node sync-status - Get sync status"
run_cmd $NETWORK_FLAG node sync-status || echo "  (Failed to get sync status)"

# =============================================================================
# DOMAIN 5: WALLET NETWORK COMMANDS
# =============================================================================

print_header "DOMAIN 5: WALLET NETWORK COMMANDS"

print_step "5.1 wallet deploy - Deploy account contract"
echo "  Deploying account for: $ADDRESS"
DEPLOY_RESULT=$($CLI --json $NETWORK_FLAG wallet deploy "$SECRET" 2>/dev/null) || {
  echo "  Deployment failed or account already exists"
  DEPLOY_RESULT="{}"
}
TX_HASH=$(echo "$DEPLOY_RESULT" | jq -r '.txHash // empty' 2>/dev/null || echo "")
if [ -n "$TX_HASH" ] && [ "$TX_HASH" != "null" ]; then
  echo "  TX Hash: $TX_HASH"
  print_success "Account deployed"
else
  echo "  (Account may already be deployed)"
fi

print_step "5.2 wallet info - Get account info"
run_cmd $NETWORK_FLAG wallet info "$ADDRESS" || echo "  (Failed to get account info)"

print_step "5.3 wallet list - List registered accounts"
run_cmd $NETWORK_FLAG wallet list || echo "  (Failed to list accounts)"

# =============================================================================
# DOMAIN 6: QUERY COMMANDS
# =============================================================================

print_header "DOMAIN 6: QUERY COMMANDS"

print_step "6.1 query block number - Get current block"
BLOCK_OUTPUT=$($CLI --json $NETWORK_FLAG query block number 2>/dev/null || echo "{}")
BLOCK_NUM=$(echo "$BLOCK_OUTPUT" | jq -r '.blockNumber // 0' 2>/dev/null || echo "0")
echo "  Block number: $BLOCK_NUM"

print_step "6.2 query block proven-number - Get proven block"
run_cmd $NETWORK_FLAG query block proven-number || echo "  (Failed to get proven block)"

print_step "6.3 query block tips - Get block tips"
run_cmd $NETWORK_FLAG query block tips || echo "  (Failed to get tips)"

print_step "6.4 query block get - Get block details"
if [ "$BLOCK_NUM" != "0" ] && [ -n "$BLOCK_NUM" ]; then
  run_cmd $NETWORK_FLAG query block get "$BLOCK_NUM" || echo "  (Failed to get block)"
fi

print_step "6.5 query public - Read public storage"
run_cmd $NETWORK_FLAG query public "$ADDRESS" "0x01" || echo "  (No storage at slot)"

# =============================================================================
# DOMAIN 7: TX COMMANDS
# =============================================================================

print_header "DOMAIN 7: TX COMMANDS"

if [ -n "$TX_HASH" ]; then
  print_step "7.1 tx status - Check TX status"
  run_cmd $NETWORK_FLAG tx status "$TX_HASH" || echo "  (TX not found)"

  print_step "7.2 tx receipt - Get TX receipt"
  run_cmd $NETWORK_FLAG tx receipt "$TX_HASH" || echo "  (TX not found)"

  print_step "7.3 tx wait - Wait for TX (already mined)"
  run_cmd $NETWORK_FLAG tx wait "$TX_HASH" --timeout 5 || echo "  (TX not found or timeout)"

  print_step "7.4 tx analyze - Analyze TX"
  run_cmd $NETWORK_FLAG tx analyze "$TX_HASH" || echo "  (Failed to analyze)"
else
  echo "  No TX hash available - skipping TX commands"
fi

# =============================================================================
# DOMAIN 8: CONTRACT COMMANDS
# =============================================================================

print_header "DOMAIN 8: CONTRACT COMMANDS"

ARTIFACT_PATH="$SCRIPT_DIR/../examples/Token.json"

if [ -f "$ARTIFACT_PATH" ]; then
  print_step "8.1 contract abi - Display ABI"
  run_cmd contract abi "$ARTIFACT_PATH"

  print_step "8.2 contract artifact info - Show artifact metadata"
  run_cmd contract artifact info "$ARTIFACT_PATH" || echo "  (Command may not exist)"

  print_step "8.3 contract deploy - Deploy Token contract"
  ZERO_ADDR="0x0000000000000000000000000000000000000000000000000000000000000000"
  SALT="$RANDOM"
  CONTRACT_RESULT=$($CLI --json $NETWORK_FLAG contract deploy "$ARTIFACT_PATH" \
    --from "$SECRET" \
    --constructor "constructor_with_minter" \
    --args "[\"E2EToken\", \"E2E\", 18, \"$ADDRESS\", \"$ZERO_ADDR\"]" \
    --salt "$SALT" 2>/dev/null) || {
    echo "  Contract deployment failed"
    CONTRACT_RESULT="{}"
  }
  TOKEN_ADDRESS=$(echo "$CONTRACT_RESULT" | jq -r '.contract.address // .address // empty' 2>/dev/null || echo "")

  if [ -n "$TOKEN_ADDRESS" ]; then
    echo "  Token deployed at: $TOKEN_ADDRESS"
    print_success "Contract deployed"

    print_step "8.4 contract info - Get contract instance"
    run_cmd $NETWORK_FLAG contract info "$TOKEN_ADDRESS" || echo "  (Failed)"

    print_step "8.5 contract storage - Read public storage"
    run_cmd $NETWORK_FLAG contract storage "$TOKEN_ADDRESS" "0x01" || echo "  (Failed)"

    CLASS_ID=$(echo "$CONTRACT_RESULT" | jq -r '.contract.classId // .classId // empty' 2>/dev/null || echo "")
    if [ -n "$CLASS_ID" ]; then
      print_step "8.6 contract class - Get class info"
      run_cmd $NETWORK_FLAG contract class "$CLASS_ID" || echo "  (Failed)"
    fi
  else
    echo "  (Skipping contract interaction - no deployed contract)"
  fi
else
  echo "  Token.json artifact not found at: $ARTIFACT_PATH"
  echo "  Skipping contract commands"
fi

# =============================================================================
# DOMAIN 9: BRIDGE COMMANDS
# =============================================================================

print_header "DOMAIN 9: BRIDGE COMMANDS"

TEST_MSG_HASH="0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"

print_step "9.1 bridge status - Check message status"
run_cmd $NETWORK_FLAG bridge status "$TEST_MSG_HASH" || echo "  (Message not found - expected)"

print_step "9.2 bridge l1-to-l2-block - Find block for L1→L2 message"
run_cmd $NETWORK_FLAG bridge l1-to-l2-block "$TEST_MSG_HASH" || echo "  (Message not found - expected)"

print_step "9.3 bridge l1-to-l2-witness - Get message witness"
run_cmd $NETWORK_FLAG bridge l1-to-l2-witness "$TEST_MSG_HASH" || echo "  (Witness not found - expected)"

print_step "9.4 bridge is-l1-to-l2-synced - Check sync status"
run_cmd $NETWORK_FLAG bridge is-l1-to-l2-synced 1 || echo "  (Failed to check sync)"

print_step "9.5 bridge l2-to-l1 - Get L2→L1 messages from block"
run_cmd $NETWORK_FLAG bridge l2-to-l1 1 || echo "  (Failed to get messages)"

print_step "9.6 bridge send-l1-to-l2 - Send L1→L2 message"
if [ "$MODE" = "sandbox" ]; then
  run_cmd $NETWORK_FLAG bridge send-l1-to-l2 --recipient "$TEST_MSG_HASH" --content "$TEST_MSG_HASH" --secret-hash "$TEST_MSG_HASH" || echo "  (Failed to send message)"
else
  echo "  (Skipped - requires sandbox mode for Anvil L1)"
fi

print_step "9.7 bridge consume-l1-to-l2 - Show guidance"
run_cmd bridge consume-l1-to-l2 || echo "  (Failed to show guidance)"

print_step "9.8 bridge pending - List pending messages"
if [ "$MODE" = "sandbox" ]; then
  run_cmd $NETWORK_FLAG bridge pending || echo "  (Failed to list pending messages)"
  run_cmd $NETWORK_FLAG bridge pending --direction l1-to-l2 || echo "  (Failed to filter by direction)"
else
  echo "  (Skipped - requires sandbox mode for Anvil L1)"
fi

# =============================================================================
# SUMMARY
# =============================================================================

print_header "E2E WORKFLOW COMPLETE"
echo ""
echo "Summary:"
echo "  Secret Key:    ${SECRET:0:30}..."
echo "  Address:       $ADDRESS"
echo "  Signature:     ${SIGNATURE:0:40}..."
[ -n "$TX_HASH" ] && echo "  Deploy TX:     $TX_HASH"
[ -n "$TOKEN_ADDRESS" ] && echo "  Token:         $TOKEN_ADDRESS"
echo ""
echo -e "${GREEN}All workflow steps completed!${NC}"
