#!/bin/bash
# Act 1: GENESIS - Key Management
# Prerequisites: None
# Outputs: SECRET, ALICE_ADDRESS

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/../.."
source "$SCRIPT_DIR/lib.sh"

act_banner 1 "GENESIS - Key Management" \
    "Every journey begins with identity. Let's create our cryptographic soul."

#------------------------------------------------------------------------------
step "1.1" "Generate a fresh secret key"
#------------------------------------------------------------------------------
GEN_OUTPUT=$($CLI key generate)
echo "$GEN_OUTPUT"
SECRET=$(echo "$GEN_OUTPUT" | extract_field "Secret Key")
save_state "SECRET" "$SECRET"
success "Secret: ${SECRET:0:20}..."

#------------------------------------------------------------------------------
step "1.2" "Derive all key types from secret"
#------------------------------------------------------------------------------
run "$CLI key derive-keys $SECRET"

#------------------------------------------------------------------------------
step "1.3" "Preview wallet address (before deployment)"
#------------------------------------------------------------------------------
ADDR_OUTPUT=$($CLI key derive-address $SECRET)
echo "$ADDR_OUTPUT"
ALICE_ADDRESS=$(echo "$ADDR_OUTPUT" | extract_field "Address")
save_state "ALICE_ADDRESS" "$ALICE_ADDRESS"
success "Address: ${ALICE_ADDRESS:0:20}..."

#------------------------------------------------------------------------------
step "1.4" "Export key to encrypted keystore"
#------------------------------------------------------------------------------
KEYSTORE_FILE="/tmp/cazt-demo-keystore.json"
run "$CLI key keystore create $SECRET --output $KEYSTORE_FILE --password demo123"
save_state "KEYSTORE_FILE" "$KEYSTORE_FILE"

#------------------------------------------------------------------------------
step "1.5" "Unlock the keystore"
#------------------------------------------------------------------------------
run "$CLI key keystore unlock $KEYSTORE_FILE --password demo123"

#------------------------------------------------------------------------------
step "1.6" "Import key with alias"
#------------------------------------------------------------------------------
run "$CLI key import $SECRET --alias demo-alice" || warn "Key may already exist"

#------------------------------------------------------------------------------
step "1.7" "List stored keys"
#------------------------------------------------------------------------------
run "$CLI key list"

#------------------------------------------------------------------------------
step "1.8" "Sign a message"
#------------------------------------------------------------------------------
MESSAGE="Hello Aztec!"
SIGN_OUTPUT=$($CLI key sign "$MESSAGE" $SECRET)
echo "$SIGN_OUTPUT"
SIGNATURE=$(echo "$SIGN_OUTPUT" | extract_hex)
save_state "SIGNATURE" "$SIGNATURE"
success "Signature: ${SIGNATURE:0:30}..."

#------------------------------------------------------------------------------
step "1.9" "Verify signature"
#------------------------------------------------------------------------------
# Get public key for verification
KEYS_OUTPUT=$($CLI key derive-keys $SECRET)
PUBKEY=$(echo "$KEYS_OUTPUT" | grep -A1 "Master Nullifier" | grep "Public:" | grep -oP '0x[0-9a-f]+' | tr '\n' ',' | sed 's/,$//')
if [ -n "$PUBKEY" ] && [ -n "$SIGNATURE" ]; then
    run "$CLI key verify '$MESSAGE' --signature $SIGNATURE --pubkey $PUBKEY" || warn "Verification failed"
else
    warn "Skipping verification (could not extract keys)"
fi

#------------------------------------------------------------------------------
echo ""
success "Act 1 Complete! State saved:"
echo "  SECRET=$SECRET"
echo "  ALICE_ADDRESS=$ALICE_ADDRESS"
