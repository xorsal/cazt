#!/bin/bash
# Act 5: CREATION - Contract Deployment
# Prerequisites: Sandbox running, SECRET (from Act 1)
# Outputs: CONTRACT_ADDRESS, CONTRACT_CLASS_ID

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/../.."
source "$SCRIPT_DIR/lib.sh"

act_banner 5 "CREATION - Contract Deployment" \
    "We deploy our first smart contract - a Token that lives on Aztec."

# Check sandbox
if ! check_sandbox; then
    error "Sandbox required for this act. Start with: aztec start --sandbox"
    exit 1
fi
success "Sandbox is available"

# Load state
load_all_state

# Check prerequisites
if [ -z "$SECRET" ]; then
    warn "No SECRET found. Run Act 1 first, or we'll generate one now."
    GEN_OUTPUT=$($CLI key generate)
    SECRET=$(echo "$GEN_OUTPUT" | grep -oP 'Secret Key: \K0x[0-9a-fA-F]+')
    save_state "SECRET" "$SECRET"

    ADDR_OUTPUT=$($CLI key derive-address $SECRET)
    ALICE_ADDRESS=$(echo "$ADDR_OUTPUT" | grep -oP 'Address:\s*\K0x[0-9a-fA-F]+')
    save_state "ALICE_ADDRESS" "$ALICE_ADDRESS"
    info "Generated new SECRET and ALICE_ADDRESS"
fi

info "Using SECRET: ${SECRET:0:20}..."
info "Admin address: ${ALICE_ADDRESS:0:20}..."

#------------------------------------------------------------------------------
step "5.1" "Inspect Token artifact info"
#------------------------------------------------------------------------------
run "$CLI contract artifact info aztec:Token" || warn "Artifact info failed"

#------------------------------------------------------------------------------
step "5.2" "View contract ABI"
#------------------------------------------------------------------------------
# Just show first few functions to avoid massive output
ABI_OUT=$($CLI contract abi aztec:Token 2>&1) || true
echo "$ABI_OUT" | head -50
echo "... (truncated)"
echo ""

#------------------------------------------------------------------------------
step "5.3" "Browse contract registry"
#------------------------------------------------------------------------------
run_net "$CLI_SANDBOX contract registry list" 10

#------------------------------------------------------------------------------
step "5.4" "Search registry for 'Token'"
#------------------------------------------------------------------------------
run_net "$CLI_SANDBOX contract registry search Token" 10

#------------------------------------------------------------------------------
step "5.5" "Deploy Token contract"
#------------------------------------------------------------------------------
info "Deploying Token with Alice as admin..."
# Token constructor args: (admin: AztecAddress, name: str, symbol: str, decimals: u8)
DEPLOY_ARGS="[\"$ALICE_ADDRESS\", \"DemoToken\", \"DEMO\", 18]"
echo "Constructor args: $DEPLOY_ARGS"
echo ""

DEPLOY_OUT=$(timeout 120 $CLI_SANDBOX contract deploy aztec:Token \
    --args "$DEPLOY_ARGS" \
    --from "$SECRET" \
    --salt random 2>&1) || true
echo "$DEPLOY_OUT"

# Try to extract deployed address
CONTRACT_ADDRESS=$(echo "$DEPLOY_OUT" | grep -oP 'Address:\s*\K0x[0-9a-fA-F]+' | head -1)
CONTRACT_CLASS_ID=$(echo "$DEPLOY_OUT" | grep -oP 'Class ID:\s*\K0x[0-9a-fA-F]+' | head -1)
TX_HASH=$(echo "$DEPLOY_OUT" | grep -oP 'TX Hash:\s*\K0x[0-9a-fA-F]+' | head -1)

if [ -n "$CONTRACT_ADDRESS" ]; then
    save_state "CONTRACT_ADDRESS" "$CONTRACT_ADDRESS"
    save_state "TOKEN_ADDRESS" "$CONTRACT_ADDRESS"
    success "Token deployed at: $CONTRACT_ADDRESS"
else
    warn "Could not extract contract address from output"
    # Use a placeholder for remaining steps
    CONTRACT_ADDRESS="0x0000000000000000000000000000000000000000000000000000000000000001"
fi

[ -n "$CONTRACT_CLASS_ID" ] && save_state "CONTRACT_CLASS_ID" "$CONTRACT_CLASS_ID"
[ -n "$TX_HASH" ] && save_state "DEPLOY_TX_HASH" "$TX_HASH"

#------------------------------------------------------------------------------
step "5.6" "Get deployed contract info"
#------------------------------------------------------------------------------
run_net "$CLI_SANDBOX contract info $CONTRACT_ADDRESS" 10

#------------------------------------------------------------------------------
step "5.7" "Get contract class info"
#------------------------------------------------------------------------------
if [ -n "$CONTRACT_CLASS_ID" ]; then
    run_net "$CLI_SANDBOX contract class $CONTRACT_CLASS_ID" 10
else
    info "No class ID available, using placeholder"
    run_net "$CLI_SANDBOX contract class 0x0000000000000000000000000000000000000000000000000000000000000001" 10
fi

#------------------------------------------------------------------------------
step "5.8" "Dump contract storage"
#------------------------------------------------------------------------------
run_net "$CLI_SANDBOX contract storage $CONTRACT_ADDRESS" 15

#------------------------------------------------------------------------------
step "5.9" "Get contract events"
#------------------------------------------------------------------------------
run_net "$CLI_SANDBOX contract events $CONTRACT_ADDRESS --from 0" 10

#------------------------------------------------------------------------------
step "5.10" "Get contract logs"
#------------------------------------------------------------------------------
run_net "$CLI_SANDBOX contract logs $CONTRACT_ADDRESS --from 0" 10

#------------------------------------------------------------------------------
echo ""
success "Act 5 Complete!"
[ -n "$CONTRACT_ADDRESS" ] && echo "  CONTRACT_ADDRESS=$CONTRACT_ADDRESS"
[ -n "$CONTRACT_CLASS_ID" ] && echo "  CONTRACT_CLASS_ID=$CONTRACT_CLASS_ID"
[ -n "$TX_HASH" ] && echo "  DEPLOY_TX_HASH=$TX_HASH"
