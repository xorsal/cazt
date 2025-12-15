#!/bin/bash
# Act 7: BRIDGE - Cross-Chain Messaging
# Prerequisites: Sandbox running (includes Anvil L1 at localhost:8545)
# Outputs: MSG_HASH

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/../.."
source "$SCRIPT_DIR/lib.sh"

act_banner 7 "BRIDGE - Cross-Chain Messaging" \
    "We bridge the gap between L1 and L2 - messages across worlds."

# Check sandbox
if ! check_sandbox; then
    error "Sandbox required for this act. Start with: aztec start --sandbox"
    exit 1
fi
success "Sandbox is available (includes Anvil L1 at localhost:8545)"

# Load state
load_all_state

# Get or create recipient address
if [ -z "$ALICE_ADDRESS" ]; then
    ALICE_ADDRESS="0x0000000000000000000000000000000000000000000000000000000000000042"
    warn "No ALICE_ADDRESS found, using placeholder"
fi
info "Recipient: ${ALICE_ADDRESS:0:20}..."

#------------------------------------------------------------------------------
step "7.1" "Send L1→L2 message"
#------------------------------------------------------------------------------
CONTENT_HASH="0x0000000000000000000000000000000000000000000000000000000000000042"
SECRET_HASH="0x0000000000000000000000000000000000000000000000000000000000000024"

info "Sending message via Inbox contract on Anvil..."
echo "  Recipient: $ALICE_ADDRESS"
echo "  Content: $CONTENT_HASH"
echo "  Secret Hash: $SECRET_HASH"
echo ""

SEND_OUT=$(timeout 30 $CLI_SANDBOX bridge send-l1-to-l2 \
    --recipient "$ALICE_ADDRESS" \
    --content "$CONTENT_HASH" \
    --secret-hash "$SECRET_HASH" 2>&1) || true
echo "$SEND_OUT"

# Extract message hash if successful
MSG_HASH=$(echo "$SEND_OUT" | grep -oP 'Message Hash:\s*\K0x[0-9a-fA-F]+' | head -1)
if [ -n "$MSG_HASH" ]; then
    save_state "MSG_HASH" "$MSG_HASH"
    success "Message sent! Hash: ${MSG_HASH:0:20}..."
else
    MSG_HASH="0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
    warn "Could not extract message hash, using placeholder for remaining steps"
fi

#------------------------------------------------------------------------------
step "7.2" "Check message status"
#------------------------------------------------------------------------------
run_net "$CLI_SANDBOX bridge status $MSG_HASH" 10

#------------------------------------------------------------------------------
step "7.3" "Get L1→L2 inclusion witness"
#------------------------------------------------------------------------------
run_net "$CLI_SANDBOX bridge l1-to-l2-witness $MSG_HASH" 10

#------------------------------------------------------------------------------
step "7.4" "Find message inclusion block"
#------------------------------------------------------------------------------
run_net "$CLI_SANDBOX bridge l1-to-l2-block $MSG_HASH" 10

#------------------------------------------------------------------------------
step "7.5" "Check if L1 block is synced"
#------------------------------------------------------------------------------
run_net "$CLI_SANDBOX bridge is-l1-to-l2-synced 1" 10

#------------------------------------------------------------------------------
step "7.6" "Get L2→L1 messages for block"
#------------------------------------------------------------------------------
run_net "$CLI_SANDBOX bridge l2-to-l1 1" 10

#------------------------------------------------------------------------------
step "7.7" "List pending bridge messages"
#------------------------------------------------------------------------------
run_net "$CLI_SANDBOX bridge pending --direction all" 15

#------------------------------------------------------------------------------
step "7.8" "Show message consumption guidance"
#------------------------------------------------------------------------------
run "$CLI bridge consume-l1-to-l2"

#------------------------------------------------------------------------------
echo ""
success "Act 7 Complete!"
[ -n "$MSG_HASH" ] && echo "  MSG_HASH=$MSG_HASH"
