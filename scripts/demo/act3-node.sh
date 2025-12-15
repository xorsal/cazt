#!/bin/bash
# Act 3: DISCOVERY - Network Exploration
# Prerequisites: Sandbox running (optional but recommended)
# Outputs: L1_ADDRESSES, CHAIN_ID

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/../.."
source "$SCRIPT_DIR/lib.sh"

act_banner 3 "DISCOVERY - Network Exploration" \
    "We connect to the Aztec network and discover its topology."

# Check sandbox availability
if check_sandbox; then
    success "Sandbox is available"
else
    warn "Sandbox not available - some commands will fail"
fi

#------------------------------------------------------------------------------
step "3.1" "Check if node is ready"
#------------------------------------------------------------------------------
run_net "$CLI_SANDBOX node ready" 5

#------------------------------------------------------------------------------
step "3.2" "Get node information"
#------------------------------------------------------------------------------
run_net "$CLI_SANDBOX node info" 5

#------------------------------------------------------------------------------
step "3.3" "Get node version"
#------------------------------------------------------------------------------
VERSION_OUT=$(timeout 5 $CLI_SANDBOX node version 2>&1) || true
echo "$VERSION_OUT"
save_state "NODE_VERSION" "$VERSION_OUT"

#------------------------------------------------------------------------------
step "3.4" "Get chain ID"
#------------------------------------------------------------------------------
CHAIN_OUT=$(timeout 5 $CLI_SANDBOX node chain-id 2>&1) || true
echo "$CHAIN_OUT"
CHAIN_ID=$(echo "$CHAIN_OUT" | grep -oP '[0-9]+' | head -1)
[ -n "$CHAIN_ID" ] && save_state "CHAIN_ID" "$CHAIN_ID"

#------------------------------------------------------------------------------
step "3.5" "Get L1 contract addresses"
#------------------------------------------------------------------------------
L1_OUT=$(timeout 5 $CLI_SANDBOX node l1-addresses 2>&1) || true
echo "$L1_OUT"
# Extract key addresses
ROLLUP=$(echo "$L1_OUT" | grep -i "rollup" | extract_hex)
INBOX=$(echo "$L1_OUT" | grep -i "inbox" | extract_hex)
[ -n "$ROLLUP" ] && save_state "ROLLUP_ADDRESS" "$ROLLUP"
[ -n "$INBOX" ] && save_state "INBOX_ADDRESS" "$INBOX"

#------------------------------------------------------------------------------
step "3.6" "Get protocol addresses"
#------------------------------------------------------------------------------
run_net "$CLI_SANDBOX node protocol-addresses" 5

#------------------------------------------------------------------------------
step "3.7" "Get node ENR"
#------------------------------------------------------------------------------
run_net "$CLI_SANDBOX node enr" 5

#------------------------------------------------------------------------------
step "3.8" "Get base fees"
#------------------------------------------------------------------------------
run_net "$CLI_SANDBOX node base-fees" 5

#------------------------------------------------------------------------------
step "3.9" "Get sync status"
#------------------------------------------------------------------------------
run_net "$CLI_SANDBOX node sync-status" 5

#------------------------------------------------------------------------------
echo ""
success "Act 3 Complete!"
[ -n "$CHAIN_ID" ] && echo "  CHAIN_ID=$CHAIN_ID"
[ -n "$ROLLUP" ] && echo "  ROLLUP_ADDRESS=$ROLLUP"
