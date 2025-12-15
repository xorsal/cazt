#!/bin/bash
# Act 2: AWAKENING - Wallet Creation
# Prerequisites: SECRET (from Act 1)
# Outputs: ALICE_ADDRESS, BOB_SECRET, BOB_ADDRESS

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/../.."
source "$SCRIPT_DIR/lib.sh"

act_banner 2 "AWAKENING - Wallet Creation" \
    "With identity forged, we manifest our presence on the network."

# Check prerequisites
SECRET=$(require "SECRET")
info "Using SECRET from Act 1: ${SECRET:0:20}..."

#------------------------------------------------------------------------------
step "2.1" "Compute wallet address"
#------------------------------------------------------------------------------
WALLET_OUT=$($CLI wallet address $SECRET)
echo "$WALLET_OUT"
ALICE_ADDRESS=$(echo "$WALLET_OUT" | extract_field "Address")
save_state "ALICE_ADDRESS" "$ALICE_ADDRESS"
success "Alice's address: ${ALICE_ADDRESS:0:20}..."

#------------------------------------------------------------------------------
step "2.2" "Create a new wallet (Bob)"
#------------------------------------------------------------------------------
BOB_OUTPUT=$($CLI wallet create --alias demo-bob 2>&1) || true
echo "$BOB_OUTPUT"
BOB_SECRET=$(echo "$BOB_OUTPUT" | extract_field "Secret Key")
BOB_ADDRESS=$(echo "$BOB_OUTPUT" | extract_field "Address")
if [ -n "$BOB_SECRET" ]; then
    save_state "BOB_SECRET" "$BOB_SECRET"
    save_state "BOB_ADDRESS" "$BOB_ADDRESS"
    success "Bob created: ${BOB_ADDRESS:0:20}..."
else
    warn "Could not extract Bob's keys (may already exist)"
fi

#------------------------------------------------------------------------------
step "2.3" "Deploy Alice's wallet (requires sandbox)"
#------------------------------------------------------------------------------
if check_sandbox; then
    run_net "$CLI_SANDBOX wallet deploy $SECRET" 30
else
    warn "Sandbox not available - skipping deployment"
fi

#------------------------------------------------------------------------------
step "2.4" "Inspect wallet info (requires sandbox)"
#------------------------------------------------------------------------------
if check_sandbox && [ -n "$ALICE_ADDRESS" ]; then
    run_net "$CLI_SANDBOX wallet info $ALICE_ADDRESS" 10
else
    warn "Skipping - requires sandbox and deployed wallet"
fi

#------------------------------------------------------------------------------
step "2.5" "List local wallets"
#------------------------------------------------------------------------------
run "$CLI wallet list --local"

#------------------------------------------------------------------------------
step "2.6" "Find vanity address (prefix: 00)"
#------------------------------------------------------------------------------
run "$CLI wallet vanity 00" || warn "Vanity search completed"

#------------------------------------------------------------------------------
echo ""
success "Act 2 Complete! State saved:"
echo "  ALICE_ADDRESS=$ALICE_ADDRESS"
[ -n "$BOB_ADDRESS" ] && echo "  BOB_ADDRESS=$BOB_ADDRESS"
