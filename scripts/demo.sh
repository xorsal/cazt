#!/bin/bash
# demo.sh - CAZT Demo Script: "The Aztec Journey"
# A comprehensive demonstration of all CAZT CLI capabilities

# Note: Not using set -e since we handle errors with || warn

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Source helper library
source "$SCRIPT_DIR/demo-lib.sh"

# Change to project directory
cd "$PROJECT_DIR"

# Parse arguments
parse_args "$@"

# Build CLI path
CLI="./bin/cazt"
CLI_SANDBOX="$CLI --sandbox"

# Temp files for keystore
KEYSTORE_FILE="/tmp/cazt-demo-keystore.json"
KEYSTORE_PASSWORD="demo-password-123"

#==============================================================================
# MAIN DEMO
#==============================================================================

banner

info "RPC URL: $RPC_URL"
info "L1 RPC URL: $L1_RPC_URL"
echo ""

# Check sandbox connection (optional for offline demos)
if ! $FAST_MODE; then
    check_sandbox || warn "Continuing anyway (some commands may fail)"
fi

#==============================================================================
# ACT 1: GENESIS - Key Management
#==============================================================================
act 1 "GENESIS - Key Management" \
    "Every journey begins with identity. Let's create our cryptographic soul." \
    "$KEY_COLOR"

step "Generating a fresh secret key..."
GEN_OUTPUT=$($CLI key generate)
echo "$GEN_OUTPUT"
SECRET=$(echo "$GEN_OUTPUT" | grep -oP 'Secret Key: \K0x[0-9a-fA-F]+')
echo ""
success "Secret key generated: ${SECRET:0:20}..."
pause

step "Deriving all key types from secret..."
run "$CLI key derive-keys $SECRET"
success "All key types derived"
pause

step "Preview the wallet address (before deployment)..."
ADDR_OUTPUT=$($CLI key derive-address $SECRET)
echo "$ADDR_OUTPUT"
ALICE_ADDRESS=$(echo "$ADDR_OUTPUT" | grep -oP 'Address: \K0x[0-9a-fA-F]+' || echo "$ADDR_OUTPUT" | grep -oP '0x[0-9a-fA-F]{64}' | head -1)
echo ""
success "Address: ${ALICE_ADDRESS:0:20}..."
pause

step "Export key to encrypted keystore..."
run "$CLI key keystore create $SECRET --output $KEYSTORE_FILE --password $KEYSTORE_PASSWORD"
success "Keystore saved to $KEYSTORE_FILE"
pause

step "Unlock the keystore..."
run "$CLI key keystore unlock $KEYSTORE_FILE --password $KEYSTORE_PASSWORD"
success "Keystore unlocked"
pause

step "Import key with alias 'alice'..."
run "$CLI key import $SECRET --alias alice"
success "Key imported as 'alice'"
pause

step "List all stored keys..."
run "$CLI key list"
pause

step "Sign a message with our key..."
MESSAGE="Hello Aztec World!"
SIGN_OUTPUT=$($CLI key sign "$MESSAGE" $SECRET 2>&1)
echo "$SIGN_OUTPUT"
# Extract signature from output
SIGNATURE=$(echo "$SIGN_OUTPUT" | grep -oP 'Signature: \K0x[0-9a-fA-F]+' || echo "$SIGN_OUTPUT" | grep -oP '0x[0-9a-fA-F]{64,}' | head -1)
echo ""
pause

step "Verify the signature..."
# Get public keys for verification
KEYS_OUTPUT=$($CLI key derive-keys $SECRET)
PUBKEY_X=$(echo "$KEYS_OUTPUT" | grep -oP 'Public Key X: \K0x[0-9a-f]+' || echo "0x0")
PUBKEY_Y=$(echo "$KEYS_OUTPUT" | grep -oP 'Public Key Y: \K0x[0-9a-f]+' || echo "0x0")
if [ "$PUBKEY_X" != "0x0" ] && [ "$SIGNATURE" != "" ]; then
    run "$CLI key verify '$MESSAGE' --signature $SIGNATURE --pubkey $PUBKEY_X,$PUBKEY_Y" || warn "Verification skipped"
else
    warn "Skipping verification (could not extract signature/pubkey)"
fi
pause

step "Export key for backup..."
run "$CLI key export alice --yes-i-understand-the-risks" || warn "Export may require confirmation"
success "Act 1 Complete: Key Management mastered!"

#==============================================================================
# ACT 2: AWAKENING - Wallet Creation
#==============================================================================
act 2 "AWAKENING - Wallet Creation" \
    "With identity forged, we manifest our presence on the network." \
    "$WALLET_COLOR"

step "Compute wallet address before deployment..."
WALLET_OUT=$($CLI wallet address $SECRET 2>&1)
echo "$WALLET_OUT"
ALICE_ADDRESS=$(echo "$WALLET_OUT" | grep -oP '0x[0-9a-fA-F]{64}' | head -1)
echo ""
success "Alice's address: ${ALICE_ADDRESS:0:20}..."
pause

step "Create a new wallet with alias 'bob'..."
BOB_OUTPUT=$($CLI wallet create --alias bob 2>&1)
echo "$BOB_OUTPUT"
BOB_SECRET=$(echo "$BOB_OUTPUT" | grep -oP 'Secret Key: \K0x[0-9a-fA-F]+' || echo "")
BOB_ADDRESS=$(echo "$BOB_OUTPUT" | grep -oP 'Address: \K0x[0-9a-fA-F]+' || echo "")
echo ""
success "Bob's wallet created"
pause

step "Deploy Alice's wallet contract to the network..."
run "$CLI_SANDBOX wallet deploy $SECRET" || warn "Deployment requires sandbox"
pause

step "Inspect deployed wallet info..."
run "$CLI_SANDBOX wallet info $ALICE_ADDRESS" || warn "Requires deployed contract"
pause

step "List all local wallets..."
run "$CLI wallet list --local"
pause

step "Try finding a vanity address..."
run "$CLI wallet vanity 00" || warn "Vanity search timeout"
pause

step "Check public balance (requires token contract)..."
info "Balance check requires a deployed token contract"
# run "$CLI_SANDBOX wallet balance $ALICE_ADDRESS --token <token> --public"
success "Act 2 Complete: Wallet awakened!"

#==============================================================================
# ACT 3: DISCOVERY - Network Exploration
#==============================================================================
act 3 "DISCOVERY - Network Exploration" \
    "We connect to the Aztec network and discover its topology." \
    "$NODE_COLOR"

step "Check if node is ready..."
run "$CLI_SANDBOX node ready" || warn "Node not available"
pause

step "Get full node information..."
run "$CLI_SANDBOX node info" || warn "Node not available"
pause

step "Check node version..."
run "$CLI_SANDBOX node version" || warn "Node not available"
pause

step "Get chain identifier..."
run "$CLI_SANDBOX node chain-id" || warn "Node not available"
pause

step "Get L1 contract addresses..."
run "$CLI_SANDBOX node l1-addresses" || warn "Node not available"
pause

step "Get protocol contract addresses..."
run "$CLI_SANDBOX node protocol-addresses" || warn "Node not available"
pause

step "Get node ENR record..."
run "$CLI_SANDBOX node enr" || warn "Node not available"
pause

step "Check current base fees..."
run "$CLI_SANDBOX node base-fees" || warn "Node not available"
pause

step "Check sync status..."
run "$CLI_SANDBOX node sync-status" || warn "Node not available"
success "Act 3 Complete: Network discovered!"

#==============================================================================
# ACT 4: INSIGHT - Blockchain Queries
#==============================================================================
act 4 "INSIGHT - Blockchain Queries" \
    "We peer into the blockchain's state - past, present, and proven." \
    "$QUERY_COLOR"

step "Get latest block number..."
BLOCK_OUTPUT=$($CLI_SANDBOX query block number 2>&1) || BLOCK_OUTPUT="1"
echo "$BLOCK_OUTPUT"
BLOCK_NUM=$(echo "$BLOCK_OUTPUT" | grep -oP '[0-9]+' | head -1 || echo "1")
echo ""
success "Current block: $BLOCK_NUM"
pause

step "Get latest proven block number..."
run "$CLI_SANDBOX query block proven-number" || warn "Query failed"
pause

step "Get chain tips..."
run "$CLI_SANDBOX query block tips" || warn "Query failed"
pause

step "Get block 1 details..."
run "$CLI_SANDBOX query block get 1" || warn "Query failed"
pause

step "Get block range 1-3..."
run "$CLI_SANDBOX query block range 1 3" || warn "Query failed"
pause

step "Get block 1 header only..."
run "$CLI_SANDBOX query block header 1" || warn "Query failed"
pause

step "Query transaction by hash (using placeholder)..."
TEST_TX_HASH="0x0000000000000000000000000000000000000000000000000000000000000001"
run "$CLI_SANDBOX query tx $TEST_TX_HASH" || warn "Transaction not found"
pause

step "Query public storage slot..."
TEST_CONTRACT="0x0000000000000000000000000000000000000000000000000000000000000001"
run "$CLI_SANDBOX query public $TEST_CONTRACT 0" || warn "Query failed"
pause

step "Check nullifier existence..."
TEST_NULLIFIER="0x0000000000000000000000000000000000000000000000000000000000000001"
run "$CLI_SANDBOX query nullifiers $TEST_NULLIFIER" || warn "Query failed"
pause

step "Query logs for an address..."
run "$CLI_SANDBOX query logs $ALICE_ADDRESS --from 0 --to 10" || warn "No logs found"
success "Act 4 Complete: Blockchain insights gained!"

#==============================================================================
# ACT 5: CREATION - Contract Deployment
#==============================================================================
act 5 "CREATION - Contract Deployment" \
    "We deploy our first smart contract - a Token that lives on Aztec." \
    "$CONTRACT_COLOR"

step "Inspect Token artifact info..."
run "$CLI contract artifact info aztec:Token" || warn "Artifact not found"
pause

step "View contract ABI..."
run "$CLI contract abi aztec:Token" || warn "ABI not available"
pause

step "Browse contract registry..."
run "$CLI_SANDBOX contract registry list" || warn "Registry not available"
pause

step "Search registry for 'Token'..."
run "$CLI_SANDBOX contract registry search Token" || warn "Search failed"
pause

step "Deploy Token contract..."
info "Deploying with Alice as admin..."
# Token constructor: (admin: AztecAddress, name: str, symbol: str, decimals: u8)
DEPLOY_ARGS="[\"$ALICE_ADDRESS\", \"DemoToken\", \"DEMO\", 18]"
run "$CLI_SANDBOX contract deploy aztec:Token --args '$DEPLOY_ARGS' --from $SECRET" && {
    # Try to capture deployed address from output
    CONTRACT_ADDRESS="<deployed-address>"
    success "Token deployed!"
} || warn "Deployment failed (requires sandbox)"
pause

step "Get contract info..."
if [ "$CONTRACT_ADDRESS" != "" ] && [ "$CONTRACT_ADDRESS" != "<deployed-address>" ]; then
    run "$CLI_SANDBOX contract info $CONTRACT_ADDRESS"
else
    info "Using placeholder address for demo"
    run "$CLI_SANDBOX contract info $TEST_CONTRACT" || warn "Contract not found"
fi
pause

step "Get contract class info..."
run "$CLI_SANDBOX contract class 0x0000000000000000000000000000000000000000000000000000000000000001" || warn "Class not found"
pause

step "Dump contract storage..."
run "$CLI_SANDBOX contract storage $TEST_CONTRACT" || warn "Storage dump failed"
pause

step "Get contract events..."
run "$CLI_SANDBOX contract events $TEST_CONTRACT --from 0 --to 10" || warn "No events"
pause

step "Get contract logs..."
run "$CLI_SANDBOX contract logs $TEST_CONTRACT --from 0 --to 10" || warn "No logs"
success "Act 5 Complete: Contract created!"

#==============================================================================
# ACT 6: ACTION - Transaction Analysis
#==============================================================================
act 6 "ACTION - Transaction Analysis" \
    "We examine transactions - the heartbeat of blockchain activity." \
    "$TX_COLOR"

step "Check transaction status..."
run "$CLI_SANDBOX tx status $TEST_TX_HASH" || warn "Transaction not found"
pause

step "Get full transaction receipt..."
run "$CLI_SANDBOX tx receipt $TEST_TX_HASH" || warn "Receipt not found"
pause

step "Wait for transaction confirmation..."
info "Using short timeout for demo"
run "$CLI_SANDBOX tx wait $TEST_TX_HASH --timeout 5" || warn "Timeout or not found"
pause

step "Deep transaction analysis..."
run "$CLI_SANDBOX tx analyze $TEST_TX_HASH --effects --gas" || warn "Analysis failed"
pause

step "Decode transaction calldata..."
TEST_CALLDATA="0x00000001"
run "$CLI tx decode $TEST_CALLDATA --artifact examples/Token.json" || warn "Decode failed"
pause

step "Compare two transactions..."
TEST_TX_HASH2="0x0000000000000000000000000000000000000000000000000000000000000002"
run "$CLI_SANDBOX tx compare $TEST_TX_HASH $TEST_TX_HASH2" || warn "Comparison failed"
success "Act 6 Complete: Transactions analyzed!"

#==============================================================================
# ACT 7: BRIDGE - Cross-Chain Messaging
#==============================================================================
act 7 "BRIDGE - Cross-Chain Messaging" \
    "We bridge the gap between L1 and L2 - messages across worlds." \
    "$BRIDGE_COLOR"

step "Send L1->L2 message..."
CONTENT_HASH="0x0000000000000000000000000000000000000000000000000000000000000042"
SECRET_HASH="0x0000000000000000000000000000000000000000000000000000000000000024"
run "$CLI_SANDBOX bridge send-l1-to-l2 --recipient $ALICE_ADDRESS --content $CONTENT_HASH --secret-hash $SECRET_HASH" && {
    MSG_HASH="<captured-msg-hash>"
    success "Message sent!"
} || warn "L1 connection required"
pause

step "Check message status..."
TEST_MSG_HASH="0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
run "$CLI_SANDBOX bridge status $TEST_MSG_HASH" || warn "Status check failed"
pause

step "Get L1->L2 inclusion witness..."
run "$CLI_SANDBOX bridge l1-to-l2-witness $TEST_MSG_HASH" || warn "Witness not found"
pause

step "Find message inclusion block..."
run "$CLI_SANDBOX bridge l1-to-l2-block $TEST_MSG_HASH" || warn "Block not found"
pause

step "Check if L1 block is synced..."
run "$CLI_SANDBOX bridge is-l1-to-l2-synced 1" || warn "Sync check failed"
pause

step "Get L2->L1 messages for block..."
run "$CLI_SANDBOX bridge l2-to-l1 1" || warn "No messages found"
pause

step "List pending bridge messages..."
run "$CLI_SANDBOX bridge pending --direction all" || warn "No pending messages"
pause

step "Show message consumption guidance..."
run "$CLI bridge consume-l1-to-l2"
success "Act 7 Complete: Bridge crossed!"

#==============================================================================
# ACT 8: MASTERY - Utility Commands (CAST)
#==============================================================================
act 8 "MASTERY - Utility Commands" \
    "We master the tools of the trade - hashing, encoding, converting." \
    "$CAST_COLOR"

divider
echo -e "${BOLD}8.1 Hash Operations${NC}"
divider

step "Get zero hash..."
run "$CLI cast hash zero"

step "Keccak256 hash..."
run "$CLI cast hash keccak 'hello aztec'"

step "SHA256 hash..."
run "$CLI cast hash sha256 'hello aztec'"

step "Poseidon2 hash..."
run "$CLI cast hash poseidon2 '[\"1\", \"2\", \"3\"]'"

step "Pedersen hash..."
run "$CLI cast hash pedersen '[\"1\", \"2\"]'"

step "Hash a secret..."
run "$CLI cast hash secret $SECRET"
pause

divider
echo -e "${BOLD}8.2 Address Operations${NC}"
divider

step "Get zero address..."
run "$CLI cast address zero"

step "Generate random address..."
run "$CLI cast address random"

step "Validate address format..."
run "$CLI cast address validate $ALICE_ADDRESS" || warn "Validation failed"

step "Check if address is valid..."
run "$CLI cast address is-valid $ALICE_ADDRESS"

step "Convert field to address..."
run "$CLI cast address from-field 0x0000000000000000000000000000000000000000000000000000000000000042"

step "Convert bigint to address..."
run "$CLI cast address from-bigint 12345"
pause

divider
echo -e "${BOLD}8.3 Field Operations${NC}"
divider

step "Generate random field..."
run "$CLI cast field random"

step "Convert string to field..."
run "$CLI cast field from-string 'hello'"

step "Convert field to bigint..."
run "$CLI cast field to-bigint 0x0000000000000000000000000000000000000000000000000000000000000042"

step "Check if field is zero..."
run "$CLI cast field is-zero 0x0000000000000000000000000000000000000000000000000000000000000000"

step "Check field equality..."
run "$CLI cast field equals 0x42 0x42"
pause

divider
echo -e "${BOLD}8.4 Selector Operations${NC}"
divider

step "Compute function selector..."
run "$CLI cast selector compute 'transfer(address,uint256)'"

step "Compute event selector..."
run "$CLI cast selector event 'Transfer(address,address,uint256)'"

step "Get empty selector..."
run "$CLI cast selector empty"
pause

divider
echo -e "${BOLD}8.5 Ethereum Address Operations${NC}"
divider

step "Get zero ETH address..."
run "$CLI cast eth zero"

step "Generate random ETH address..."
run "$CLI cast eth random"

step "Validate ETH address..."
run "$CLI cast eth validate 0x1234567890123456789012345678901234567890"

step "Convert ETH address to field..."
run "$CLI cast eth to-field 0x1234567890123456789012345678901234567890"
pause

divider
echo -e "${BOLD}8.6 Artifact Operations${NC}"
divider

step "Load Token artifact..."
run "$CLI cast artifact load aztec:Token" || warn "Artifact not found"

step "Compute artifact hash..."
run "$CLI cast artifact hash aztec:Token" || warn "Artifact not found"

step "Get artifact metadata hash..."
run "$CLI cast artifact metadata-hash aztec:Token" || warn "Artifact not found"
pause

divider
echo -e "${BOLD}8.7 Nullifier & Note Operations${NC}"
divider

step "Silo a nullifier..."
run "$CLI cast nullifier silo --contract $TEST_CONTRACT --nullifier 0x42"

step "Silo a note hash..."
run "$CLI cast note silo-hash --contract $TEST_CONTRACT --note-hash 0x42"
pause

divider
echo -e "${BOLD}8.8 Message Operations${NC}"
divider

step "Compute L2->L1 message hash..."
L2_TO_L1_PARAMS='{"l2Sender":"0x01","l1Recipient":"0x1234567890123456789012345678901234567890","content":"0x42","rollupVersion":1,"chainId":31337}'
run "$CLI cast message l2-to-l1-hash '$L2_TO_L1_PARAMS'" || warn "Hash computation failed"

success "Act 8 Complete: Utility commands mastered!"

#==============================================================================
# ACT 9: VIGILANCE - Real-Time Monitoring
#==============================================================================
act 9 "VIGILANCE - Real-Time Monitoring" \
    "We become watchers - monitoring the network's pulse in real-time." \
    "$MONITOR_COLOR"

info "Monitor commands run continuously. We'll demonstrate with short timeouts."
echo ""

step "Monitor new blocks (3 seconds)..."
timeout 3 $CLI_SANDBOX monitor blocks --interval 1000 || info "Monitor stopped"
pause

step "Monitor address activity (3 seconds)..."
timeout 3 $CLI_SANDBOX monitor address $ALICE_ADDRESS --interval 1000 || info "Monitor stopped"
pause

step "Monitor contract events (3 seconds)..."
timeout 3 $CLI_SANDBOX monitor events $TEST_CONTRACT --interval 1000 || info "Monitor stopped"
pause

step "Monitor all logs (3 seconds)..."
timeout 3 $CLI_SANDBOX monitor logs --interval 1000 || info "Monitor stopped"

success "Act 9 Complete: Network monitored!"

#==============================================================================
# FINALE
#==============================================================================

summary

# Cleanup
rm -f "$KEYSTORE_FILE" 2>/dev/null

echo ""
echo "Thank you for experiencing THE AZTEC JOURNEY!"
echo ""
