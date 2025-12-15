#!/bin/bash
# demo-lib.sh - Helper functions for CAZT demo script

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color
BOLD='\033[1m'
DIM='\033[2m'

# Domain colors
KEY_COLOR=$MAGENTA
WALLET_COLOR=$GREEN
NODE_COLOR=$CYAN
QUERY_COLOR=$BLUE
CONTRACT_COLOR=$YELLOW
TX_COLOR=$RED
BRIDGE_COLOR=$MAGENTA
CAST_COLOR=$WHITE
MONITOR_COLOR=$CYAN

# State
CURRENT_ACT=0
CURRENT_STEP=0
PRESENTATION_MODE=false
FAST_MODE=false
RPC_URL="http://localhost:8080"
L1_RPC_URL="http://localhost:8545"

# Captured values (shared between acts)
SECRET=""
ALICE_ADDRESS=""
BOB_ADDRESS=""
CONTRACT_ADDRESS=""
TX_HASH=""
MSG_HASH=""
SIGNATURE=""
PUBKEY_X=""
PUBKEY_Y=""

# Print banner
banner() {
    echo -e "${BOLD}"
    echo "========================================================================"
    echo "                     CAZT - THE AZTEC JOURNEY                          "
    echo "              A Complete CLI Demonstration in 9 Acts                   "
    echo "========================================================================"
    echo -e "${NC}"
    echo ""
}

# Print act header
act() {
    local num=$1
    local title=$2
    local narrative=$3
    local color=$4

    CURRENT_ACT=$num
    CURRENT_STEP=0

    echo ""
    echo -e "${color}${BOLD}"
    echo "========================================================================"
    printf " ACT %d: %s %*s[%d/9]\n" "$num" "$title" $((50 - ${#title})) "" "$num"
    echo "========================================================================"
    echo -e "${NC}"
    echo -e "${DIM} \"$narrative\"${NC}"
    echo ""

    if $PRESENTATION_MODE; then
        read -p "Press ENTER to begin Act $num..."
        echo ""
    fi
}

# Print step
step() {
    local desc=$1
    CURRENT_STEP=$((CURRENT_STEP + 1))

    echo -e "${GRAY}[$CURRENT_ACT.$CURRENT_STEP]${NC} ${BOLD}$desc${NC}"
}

# Run command and display
run() {
    local cmd=$1
    echo -e "${GRAY}\$ $cmd${NC}"

    if ! $FAST_MODE; then
        sleep 0.3
    fi

    eval "$cmd"
    local status=$?

    echo ""
    return $status
}

# Run network command with timeout
run_net() {
    local cmd=$1
    local timeout_sec=${2:-10}
    echo -e "${GRAY}\$ $cmd${NC}"

    if ! $FAST_MODE; then
        sleep 0.3
    fi

    timeout $timeout_sec bash -c "$cmd" 2>&1
    local status=$?

    echo ""
    return $status
}

# Run command, capture output, and display
capture() {
    local var=$1
    local cmd=$2

    echo -e "${GRAY}\$ $cmd${NC}"

    if ! $FAST_MODE; then
        sleep 0.3
    fi

    local output
    output=$(eval "$cmd" 2>&1)
    local status=$?

    # Store in variable
    eval "$var=\"\$output\""

    # Display output
    echo "$output"
    echo ""

    return $status
}

# Success message
success() {
    echo -e "${GREEN}✓${NC} $1"
}

# Info message
info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Warning message
warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Error message
error() {
    echo -e "${RED}✗${NC} $1"
}

# Pause for presentation
pause() {
    if $PRESENTATION_MODE; then
        echo ""
        read -p "Press ENTER to continue..."
        echo ""
    elif ! $FAST_MODE; then
        sleep 1
    fi
}

# Section divider
divider() {
    echo -e "${GRAY}────────────────────────────────────────────────────────────────────────${NC}"
}

# Extract JSON field using node
extract_json() {
    local json=$1
    local field=$2
    echo "$json" | node -e "
        let data = '';
        process.stdin.on('data', chunk => data += chunk);
        process.stdin.on('end', () => {
            try {
                const obj = JSON.parse(data);
                const value = obj['$field'];
                if (value !== undefined) console.log(value);
            } catch (e) {
                // Try to extract from non-JSON output
                const match = data.match(/$field[:\\s]+([0-9a-fA-Fx]+)/i);
                if (match) console.log(match[1]);
            }
        });
    "
}

# Show summary at end
summary() {
    echo ""
    echo -e "${BOLD}"
    echo "========================================================================"
    echo "                         JOURNEY COMPLETE!                              "
    echo "========================================================================"
    echo -e "${NC}"
    echo ""
    echo "Values collected during this journey:"
    echo -e "  ${GRAY}Secret:${NC}           ${SECRET:0:20}..."
    echo -e "  ${GRAY}Alice Address:${NC}    ${ALICE_ADDRESS:0:20}..."
    echo -e "  ${GRAY}Bob Address:${NC}      ${BOB_ADDRESS:0:20}..."
    echo -e "  ${GRAY}Contract:${NC}         ${CONTRACT_ADDRESS:0:20}..."
    echo -e "  ${GRAY}TX Hash:${NC}          ${TX_HASH:0:20}..."
    echo ""
    success "Demo completed successfully!"
}

# Skip to act
skip_to_act() {
    local target=$1
    CURRENT_ACT=$((target - 1))
}

# Check if sandbox is running
check_sandbox() {
    info "Checking if sandbox is running..."
    if timeout 5 ./bin/cazt --sandbox node ready >/dev/null 2>&1; then
        success "Sandbox is ready at $RPC_URL"
        return 0
    else
        error "Sandbox not responding at $RPC_URL"
        echo "Start it with: aztec start --sandbox"
        return 1
    fi
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --sandbox)
                RPC_URL="http://localhost:8080"
                L1_RPC_URL="http://localhost:8545"
                shift
                ;;
            --devnet)
                RPC_URL="http://devnet.aztec-labs.com:8080"
                shift
                ;;
            --presentation)
                PRESENTATION_MODE=true
                shift
                ;;
            --fast)
                FAST_MODE=true
                shift
                ;;
            --act)
                skip_to_act "$2"
                shift 2
                ;;
            --help)
                echo "Usage: ./demo.sh [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --sandbox       Use local sandbox (default)"
                echo "  --devnet        Use devnet"
                echo "  --presentation  Add pauses between slides"
                echo "  --fast          Skip delays"
                echo "  --act N         Start from act N"
                echo "  --help          Show this help"
                exit 0
                ;;
            *)
                echo "Unknown option: $1"
                exit 1
                ;;
        esac
    done
}
