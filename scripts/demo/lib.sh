#!/bin/bash
# demo/lib.sh - Shared helpers for CAZT demo scripts

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
GRAY='\033[0;90m'
NC='\033[0m'
BOLD='\033[1m'
DIM='\033[2m'

# State file for sharing values between acts
STATE_FILE="/tmp/cazt-demo-state.env"

# CLI paths
CLI="./bin/cazt"
CLI_SANDBOX="./bin/cazt --sandbox"

# Output helpers
success() { echo -e "${GREEN}✓${NC} $1"; }
info() { echo -e "${BLUE}ℹ${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
error() { echo -e "${RED}✗${NC} $1"; }

# Print step header
step() {
    echo ""
    echo -e "${BOLD}[$1]${NC} $2"
    echo -e "${GRAY}────────────────────────────────────────${NC}"
}

# Run command and display
run() {
    echo -e "${GRAY}\$ $1${NC}"
    eval "$1"
    echo ""
}

# Run with timeout for network commands
run_net() {
    local timeout_sec=${2:-10}
    echo -e "${GRAY}\$ $1${NC}"
    timeout $timeout_sec bash -c "$1" 2>&1 || warn "Command timed out or failed"
    echo ""
}

# Save state variable
save_state() {
    local key=$1
    local value=$2
    # Create file if not exists
    touch "$STATE_FILE"
    # Remove existing key if present
    grep -v "^${key}=" "$STATE_FILE" > "${STATE_FILE}.tmp" 2>/dev/null || true
    mv "${STATE_FILE}.tmp" "$STATE_FILE"
    # Add new value
    echo "${key}=${value}" >> "$STATE_FILE"
}

# Load state variable
load_state() {
    local key=$1
    if [ -f "$STATE_FILE" ]; then
        grep "^${key}=" "$STATE_FILE" | cut -d'=' -f2-
    fi
}

# Load all state into environment
load_all_state() {
    if [ -f "$STATE_FILE" ]; then
        source "$STATE_FILE"
    fi
}

# Check prerequisite variable exists
require() {
    local var_name=$1
    local value=$(load_state "$var_name")
    if [ -z "$value" ]; then
        error "Missing prerequisite: $var_name"
        error "Run the previous act first to set up this value"
        exit 1
    fi
    echo "$value"
}

# Check if sandbox is available
check_sandbox() {
    timeout 5 $CLI_SANDBOX node ready >/dev/null 2>&1
}

# Check if artifact exists
check_artifact() {
    local artifact=$1
    if [[ "$artifact" == aztec:* ]] || [[ "$artifact" == standards:* ]]; then
        return 0  # Built-in artifacts always available
    elif [ -f "$artifact" ]; then
        return 0
    else
        return 1
    fi
}

# Print act banner
act_banner() {
    local num=$1
    local title=$2
    local desc=$3

    echo ""
    echo -e "${BOLD}════════════════════════════════════════════════════════════${NC}"
    echo -e "${BOLD} ACT $num: $title${NC}"
    echo -e "${BOLD}════════════════════════════════════════════════════════════${NC}"
    echo -e "${DIM}$desc${NC}"
    echo ""
}

# Extract hex value from output
extract_hex() {
    grep -oP '0x[0-9a-fA-F]+' | head -1
}

# Extract specific field from CLI output
extract_field() {
    local field=$1
    grep -oP "${field}:\\s*\\K0x[0-9a-fA-F]+" | head -1
}
