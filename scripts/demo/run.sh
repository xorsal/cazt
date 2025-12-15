#!/bin/bash
# CAZT Demo Runner - "The Aztec Journey"
# Run all acts or specific ones

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/../.."

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
BOLD='\033[1m'
NC='\033[0m'

show_help() {
    echo "CAZT Demo - The Aztec Journey"
    echo ""
    echo "Usage: $0 [OPTIONS] [ACT_NUMBER...]"
    echo ""
    echo "Options:"
    echo "  --all         Run all acts in sequence"
    echo "  --clean       Clear saved state before running"
    echo "  --state       Show current saved state"
    echo "  --help        Show this help"
    echo ""
    echo "Acts:"
    echo "  1  GENESIS     - Key Management (offline)"
    echo "  2  AWAKENING   - Wallet Creation (needs: SECRET)"
    echo "  3  DISCOVERY   - Network Exploration (needs: sandbox)"
    echo "  4  INSIGHT     - Blockchain Queries (needs: sandbox)"
    echo "  5  CREATION    - Contract Deployment (needs: sandbox, SECRET)"
    echo "  6  ACTION      - Transaction Analysis (needs: sandbox)"
    echo "  7  BRIDGE      - L1↔L2 Messaging (needs: sandbox, L1)"
    echo "  8  MASTERY     - Utility Commands (offline)"
    echo "  9  VIGILANCE   - Real-Time Monitoring (needs: sandbox)"
    echo ""
    echo "Examples:"
    echo "  $0 1           # Run only Act 1 (keys)"
    echo "  $0 1 2         # Run Acts 1 and 2"
    echo "  $0 8           # Run Act 8 (cast utilities, no prereqs)"
    echo "  $0 --all       # Run all acts in order"
    echo "  $0 --clean 1   # Clear state, then run Act 1"
}

show_state() {
    STATE_FILE="/tmp/cazt-demo-state.env"
    if [ -f "$STATE_FILE" ]; then
        echo -e "${BOLD}Current Demo State:${NC}"
        cat "$STATE_FILE"
    else
        echo "No state saved yet. Run Act 1 to start."
    fi
}

clean_state() {
    rm -f /tmp/cazt-demo-state.env
    rm -f /tmp/cazt-demo-keystore.json
    echo -e "${GREEN}✓${NC} State cleared"
}

run_act() {
    local act=$1
    local script="$SCRIPT_DIR/act${act}-*.sh"

    # Find the script
    local found=$(ls $script 2>/dev/null | head -1)

    if [ -z "$found" ]; then
        echo -e "${YELLOW}⚠${NC} Act $act script not found"
        return 1
    fi

    echo -e "\n${BLUE}▶${NC} Running: $found\n"
    bash "$found"
}

# Banner
echo -e "${BOLD}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║              CAZT - THE AZTEC JOURNEY                      ║"
echo "║         A Complete CLI Demonstration in 9 Acts             ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Parse arguments
ACTS=()
RUN_ALL=false
CLEAN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --help|-h)
            show_help
            exit 0
            ;;
        --all)
            RUN_ALL=true
            shift
            ;;
        --clean)
            CLEAN=true
            shift
            ;;
        --state)
            show_state
            exit 0
            ;;
        [1-9])
            ACTS+=($1)
            shift
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Clean if requested
if $CLEAN; then
    clean_state
fi

# Determine what to run
if $RUN_ALL; then
    ACTS=(1 2 3 4 5 6 7 8 9)
elif [ ${#ACTS[@]} -eq 0 ]; then
    show_help
    exit 0
fi

# Run selected acts
for act in "${ACTS[@]}"; do
    run_act $act || echo -e "${YELLOW}⚠${NC} Act $act had issues"
done

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Demo session complete!${NC}"
echo ""
echo "View saved state: $0 --state"
