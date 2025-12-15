#!/bin/bash
# Act 8: MASTERY - Utility Commands (CAST)
# Prerequisites: None (all offline utilities)
# Outputs: Various computed values

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/../.."
source "$SCRIPT_DIR/lib.sh"

act_banner 8 "MASTERY - Utility Commands" \
    "We master the tools of the trade - hashing, encoding, converting."

#==============================================================================
echo -e "\n${BOLD}═══ 8.1 Hash Operations ═══${NC}\n"
#==============================================================================

step "8.1.1" "Zero hash"
run "$CLI cast hash zero"

step "8.1.2" "Keccak256 hash"
run "$CLI cast hash keccak 'hello aztec'"

step "8.1.3" "SHA256 hash"
run "$CLI cast hash sha256 'hello aztec'"

step "8.1.4" "Poseidon2 hash"
run "$CLI cast hash poseidon2 '[\"1\", \"2\", \"3\"]'"

step "8.1.5" "Pedersen hash"
run "$CLI cast hash pedersen '[\"1\", \"2\"]'"

#==============================================================================
echo -e "\n${BOLD}═══ 8.2 Address Operations ═══${NC}\n"
#==============================================================================

step "8.2.1" "Zero address"
run "$CLI cast address zero"

step "8.2.2" "Random address"
run "$CLI cast address random"

step "8.2.3" "Validate address"
SAMPLE_ADDR="0x0000000000000000000000000000000000000000000000000000000000000042"
run "$CLI cast address validate $SAMPLE_ADDR"

step "8.2.4" "Check if address is valid"
run "$CLI cast address is-valid $SAMPLE_ADDR"

step "8.2.5" "Convert field to address"
run "$CLI cast address from-field 0x42"

step "8.2.6" "Convert bigint to address"
run "$CLI cast address from-bigint 12345"

#==============================================================================
echo -e "\n${BOLD}═══ 8.3 Field Operations ═══${NC}\n"
#==============================================================================

step "8.3.1" "Random field"
run "$CLI cast field random"

step "8.3.2" "String to field"
run "$CLI cast field from-string 'hello'"

step "8.3.3" "Field to bigint"
run "$CLI cast field to-bigint 0x42"

step "8.3.4" "Check if field is zero"
run "$CLI cast field is-zero 0x0"

step "8.3.5" "Field equality"
run "$CLI cast field equals 0x42 0x42"

#==============================================================================
echo -e "\n${BOLD}═══ 8.4 Selector Operations ═══${NC}\n"
#==============================================================================

step "8.4.1" "Compute function selector"
run "$CLI cast selector compute 'transfer(address,uint256)'"

step "8.4.2" "Compute event selector"
run "$CLI cast selector event 'Transfer(address,address,uint256)'"

step "8.4.3" "Empty selector"
run "$CLI cast selector empty"

#==============================================================================
echo -e "\n${BOLD}═══ 8.5 Ethereum Address Operations ═══${NC}\n"
#==============================================================================

step "8.5.1" "Zero ETH address"
run "$CLI cast eth zero"

step "8.5.2" "Random ETH address"
run "$CLI cast eth random"

step "8.5.3" "Validate ETH address"
run "$CLI cast eth validate 0x1234567890123456789012345678901234567890"

step "8.5.4" "ETH address to field"
run "$CLI cast eth to-field 0x1234567890123456789012345678901234567890"

#==============================================================================
echo -e "\n${BOLD}═══ 8.6 Artifact Operations ═══${NC}\n"
#==============================================================================

step "8.6.1" "Load artifact (aztec:Token)"
run "$CLI cast artifact load aztec:Token" || warn "Artifact not found"

step "8.6.2" "Compute artifact hash"
run "$CLI cast artifact hash aztec:Token" || warn "Artifact not found"

#==============================================================================
echo -e "\n${BOLD}═══ 8.7 Nullifier Operations ═══${NC}\n"
#==============================================================================

step "8.7.1" "Silo a nullifier"
run "$CLI cast nullifier silo --contract $SAMPLE_ADDR --nullifier 0x42"

#==============================================================================
echo -e "\n${BOLD}═══ 8.8 Note Operations ═══${NC}\n"
#==============================================================================

step "8.8.1" "Silo a note hash"
run "$CLI cast note silo-hash --contract $SAMPLE_ADDR --note-hash 0x42"

#==============================================================================
echo ""
success "Act 8 Complete! All utility commands demonstrated."
