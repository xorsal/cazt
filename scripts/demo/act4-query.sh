#!/bin/bash
# Act 4: INSIGHT - Blockchain Queries
# Prerequisites: Sandbox running
# Outputs: BLOCK_NUM

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/../.."
source "$SCRIPT_DIR/lib.sh"

act_banner 4 "INSIGHT - Blockchain Queries" \
    "We peer into the blockchain's state - past, present, and proven."

# Check sandbox
if ! check_sandbox; then
    error "Sandbox required for this act. Start with: aztec start --sandbox"
    exit 1
fi
success "Sandbox is available"

# Load state if available
load_all_state

#------------------------------------------------------------------------------
step "4.1" "Get latest block number"
#------------------------------------------------------------------------------
BLOCK_OUTPUT=$($CLI_SANDBOX query block number 2>&1)
echo "$BLOCK_OUTPUT"
BLOCK_NUM=$(echo "$BLOCK_OUTPUT" | grep -oP '[0-9]+' | head -1)
[ -n "$BLOCK_NUM" ] && save_state "BLOCK_NUM" "$BLOCK_NUM"
success "Current block: $BLOCK_NUM"

#------------------------------------------------------------------------------
step "4.2" "Get latest proven block number"
#------------------------------------------------------------------------------
run_net "$CLI_SANDBOX query block proven-number" 10

#------------------------------------------------------------------------------
step "4.3" "Get chain tips"
#------------------------------------------------------------------------------
run_net "$CLI_SANDBOX query block tips" 10

#------------------------------------------------------------------------------
step "4.4" "Get block 1 details"
#------------------------------------------------------------------------------
run_net "$CLI_SANDBOX query block get 1" 10

#------------------------------------------------------------------------------
step "4.5" "Get block range (1-3)"
#------------------------------------------------------------------------------
run_net "$CLI_SANDBOX query block range 1 3" 15

#------------------------------------------------------------------------------
step "4.6" "Get block 1 header only"
#------------------------------------------------------------------------------
run_net "$CLI_SANDBOX query block header 1" 10

#------------------------------------------------------------------------------
step "4.7" "Query a transaction (placeholder hash)"
#------------------------------------------------------------------------------
# Use a placeholder - in real demo you'd use a real tx hash
TEST_TX="0x0000000000000000000000000000000000000000000000000000000000000001"
info "Using placeholder tx hash (replace with real one for actual results)"
run_net "$CLI_SANDBOX query tx $TEST_TX" 10

#------------------------------------------------------------------------------
step "4.8" "Query public storage slot"
#------------------------------------------------------------------------------
# Need a deployed contract address - use placeholder or from state
CONTRACT=${CONTRACT_ADDRESS:-"0x0000000000000000000000000000000000000000000000000000000000000001"}
info "Contract: $CONTRACT"
run_net "$CLI_SANDBOX query public $CONTRACT 0" 10

#------------------------------------------------------------------------------
step "4.9" "Check nullifier existence"
#------------------------------------------------------------------------------
TEST_NULLIFIER="0x0000000000000000000000000000000000000000000000000000000000000001"
run_net "$CLI_SANDBOX query nullifiers $TEST_NULLIFIER" 10

#------------------------------------------------------------------------------
step "4.10" "Query logs for an address"
#------------------------------------------------------------------------------
ADDR=${ALICE_ADDRESS:-$CONTRACT}
info "Address: $ADDR"
run_net "$CLI_SANDBOX query logs $ADDR --from 0 --to 10" 10

#------------------------------------------------------------------------------
echo ""
success "Act 4 Complete!"
[ -n "$BLOCK_NUM" ] && echo "  BLOCK_NUM=$BLOCK_NUM"
