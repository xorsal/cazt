#!/bin/bash
# Act 6: ACTION - Transaction Analysis
# Prerequisites: Sandbox running, DEPLOY_TX_HASH (from Act 5, optional)
# Outputs: None

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/../.."
source "$SCRIPT_DIR/lib.sh"

act_banner 6 "ACTION - Transaction Analysis" \
    "We examine transactions - the heartbeat of blockchain activity."

# Check sandbox
if ! check_sandbox; then
    error "Sandbox required for this act. Start with: aztec start --sandbox"
    exit 1
fi
success "Sandbox is available"

# Load state
load_all_state

# Use real TX hash if available, otherwise placeholder
if [ -n "$DEPLOY_TX_HASH" ]; then
    TX_HASH="$DEPLOY_TX_HASH"
    info "Using deployment TX from Act 5: ${TX_HASH:0:20}..."
else
    TX_HASH="0x0000000000000000000000000000000000000000000000000000000000000001"
    warn "No real TX hash found. Run Act 5 first for better results."
    info "Using placeholder: ${TX_HASH:0:20}..."
fi

#------------------------------------------------------------------------------
step "6.1" "Check transaction status"
#------------------------------------------------------------------------------
run_net "$CLI_SANDBOX tx status $TX_HASH" 10

#------------------------------------------------------------------------------
step "6.2" "Get full transaction receipt"
#------------------------------------------------------------------------------
run_net "$CLI_SANDBOX tx receipt $TX_HASH" 10

#------------------------------------------------------------------------------
step "6.3" "Wait for transaction (short timeout)"
#------------------------------------------------------------------------------
info "Using 5 second timeout for demo"
run_net "$CLI_SANDBOX tx wait $TX_HASH --timeout 5" 10

#------------------------------------------------------------------------------
step "6.4" "Deep transaction analysis"
#------------------------------------------------------------------------------
run_net "$CLI_SANDBOX tx analyze $TX_HASH --effects --gas" 15

#------------------------------------------------------------------------------
step "6.5" "Decode transaction calldata"
#------------------------------------------------------------------------------
# Example calldata - in real usage you'd have actual calldata
TEST_CALLDATA="0x00000001"
info "Decoding sample calldata (use real calldata for actual results)"
run "$CLI tx decode $TEST_CALLDATA --artifact examples/Token.json" || warn "Decode requires matching artifact"

#------------------------------------------------------------------------------
step "6.6" "Compare two transactions"
#------------------------------------------------------------------------------
TX_HASH2="0x0000000000000000000000000000000000000000000000000000000000000002"
info "Comparing transactions (use real hashes for actual comparison)"
run_net "$CLI_SANDBOX tx compare $TX_HASH $TX_HASH2" 10

#------------------------------------------------------------------------------
echo ""
success "Act 6 Complete!"
echo "  TX_HASH used: $TX_HASH"
