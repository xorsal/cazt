# Node Info and Administration

Commands for querying node status, configuration, and network information.

## Global Options

All commands support these global options:

| Option | Description |
|--------|-------------|
| `--json` | Output in JSON format |
| `--rpc-url <url>` | Custom RPC URL |
| `--devnet` | Use Devnet (default) |
| `--testnet` | Use Testnet |
| `--sandbox` | Use Sandbox (localhost:8080) |

---

## Commands

### `ready`

Check if the node is ready to accept requests.

**Usage:**
```bash
cazt node ready
```

**Arguments:** None

**Options:** None (uses global options only)

**Examples:**

```bash
# Check if devnet node is ready
cazt --devnet node ready

# Check sandbox
cazt --sandbox node ready

# Output as JSON
cazt --json --devnet node ready
```

**Output (human-readable):**
```
Node is ready (block 12345)
```

**Output (not ready):**
```
Node is not ready: Connection refused
```

**Output (JSON):**
```json
{
  "ready": true,
  "nodeUrl": "https://api.aztec.network/aztec-devnet",
  "blockNumber": 12345
}
```

**Output (JSON - not ready):**
```json
{
  "ready": false,
  "nodeUrl": "https://api.aztec.network/aztec-devnet",
  "error": "Connection refused"
}
```

**Notes:**
- Does not exit with error code if node is not ready (successful status check)
- Determines readiness by attempting to get block number
- Related commands: `node sync-status`, `node info`

---

### `info`

Get comprehensive node information including version, chain ID, and L1 contracts.

**Usage:**
```bash
cazt node info
```

**Arguments:** None

**Options:** None (uses global options only)

**Examples:**

```bash
# Get node info from devnet
cazt --devnet node info

# Output as JSON
cazt --json --devnet node info
```

**Output (human-readable):**
```
Node Information
========================================
Node Version:     0.85.0
Chain ID:         31337
Protocol Version: 1
ENR:              enr:-KO4QHbVR5Jp2L3Y8Gy...

L1 Contracts:
  Rollup:         0x1234567890abcdef...
  Registry:       0xabcdef1234567890...
  Inbox:          0x5678901234abcdef...
  Outbox:         0x9012345678abcdef...
```

**Output (JSON):**
```json
{
  "nodeVersion": "0.85.0",
  "l1ChainId": 31337,
  "protocolVersion": 1,
  "enr": "enr:-KO4QHbVR5Jp2L3Y8Gy...",
  "l1ContractAddresses": {
    "rollupAddress": "0x1234567890abcdef...",
    "registryAddress": "0xabcdef1234567890...",
    "inboxAddress": "0x5678901234abcdef...",
    "outboxAddress": "0x9012345678abcdef..."
  }
}
```

**Notes:**
- Most comprehensive node status command
- Related commands: `node version`, `node l1-addresses`, `node chain-id`

---

### `version`

Get the node version string.

**Usage:**
```bash
cazt node version
```

**Arguments:** None

**Options:** None (uses global options only)

**Examples:**

```bash
# Get node version
cazt --devnet node version

# Output as JSON
cazt --json --devnet node version
```

**Output (human-readable):**
```
0.85.0
```

**Output (JSON):**
```json
{
  "version": "0.85.0"
}
```

**Notes:**
- Quick way to check node compatibility
- Related commands: `node info`

---

### `chain-id`

Get the L1 chain ID the node is connected to.

**Usage:**
```bash
cazt node chain-id
```

**Arguments:** None

**Options:** None (uses global options only)

**Examples:**

```bash
# Get chain ID
cazt --devnet node chain-id

# Output as JSON
cazt --json --devnet node chain-id
```

**Output (human-readable):**
```
31337
```

**Output (JSON):**
```json
{
  "chainId": 31337
}
```

**Notes:**
- Common chain IDs: 1 (Ethereum Mainnet), 11155111 (Sepolia), 31337 (Local/Anvil)
- Related commands: `node info`

---

### `l1-addresses`

Get all L1 contract addresses used by the Aztec network.

**Usage:**
```bash
cazt node l1-addresses
```

**Arguments:** None

**Options:** None (uses global options only)

**Examples:**

```bash
# Get L1 contract addresses
cazt --devnet node l1-addresses

# Output as JSON
cazt --json --devnet node l1-addresses
```

**Output (human-readable):**
```
L1 Contract Addresses
========================================
rollup Address         0x1234567890abcdef1234567890abcdef12345678
registry Address       0xabcdef1234567890abcdef1234567890abcdef12
inbox Address          0x5678901234abcdef5678901234abcdef56789012
outbox Address         0x9012345678abcdef9012345678abcdef90123456
fee Juice Address      0xdef0123456789abcdef0123456789abcdef01234
staking Asset Address  0x234567890abcdef1234567890abcdef123456789
```

**Output (JSON):**
```json
{
  "rollupAddress": "0x1234567890abcdef1234567890abcdef12345678",
  "registryAddress": "0xabcdef1234567890abcdef1234567890abcdef12",
  "inboxAddress": "0x5678901234abcdef5678901234abcdef56789012",
  "outboxAddress": "0x9012345678abcdef9012345678abcdef90123456",
  "feeJuiceAddress": "0xdef0123456789abcdef0123456789abcdef01234",
  "stakingAssetAddress": "0x234567890abcdef1234567890abcdef123456789"
}
```

**Notes:**
- Useful for L1↔L2 bridge operations
- Rollup: Main rollup contract
- Inbox/Outbox: L1↔L2 messaging contracts
- Related commands: `node protocol-addresses`, `bridge l1-to-l2-witness`

---

### `protocol-addresses`

Get Aztec protocol contract addresses (deployed on L2).

**Usage:**
```bash
cazt node protocol-addresses
```

**Arguments:** None

**Options:** None (uses global options only)

**Examples:**

```bash
# Get protocol addresses
cazt --devnet node protocol-addresses

# Output as JSON
cazt --json --devnet node protocol-addresses
```

**Output (human-readable):**
```
Protocol Contract Addresses
========================================
class Registerer       0x1234567890abcdef...
fee Juice              0xabcdef1234567890...
instance Deployer      0x5678901234abcdef...
multi Call Entrypoint  0x9012345678abcdef...
```

**Output (JSON):**
```json
{
  "classRegisterer": "0x1234567890abcdef...",
  "feeJuice": "0xabcdef1234567890...",
  "instanceDeployer": "0x5678901234abcdef...",
  "multiCallEntrypoint": "0x9012345678abcdef..."
}
```

**Notes:**
- These are system contracts on Aztec L2
- Related commands: `node l1-addresses`

---

### `enr`

Get the node's Ethereum Node Record (ENR) for P2P discovery.

**Usage:**
```bash
cazt node enr
```

**Arguments:** None

**Options:** None (uses global options only)

**Examples:**

```bash
# Get node ENR
cazt --devnet node enr

# Output as JSON
cazt --json --devnet node enr
```

**Output (human-readable):**
```
enr:-KO4QHbVR5Jp2L3Y8Gy7xNn8Q2vL9cD3eF6gH8iJ0kL1mN2oP3qR4sT5uV6wX7yZ...
```

**Output (JSON):**
```json
{
  "enr": "enr:-KO4QHbVR5Jp2L3Y8Gy7xNn8Q2vL9cD3eF6gH8iJ0kL1mN2oP3qR4sT5uV6wX7yZ..."
}
```

**Notes:**
- ENR is used for peer-to-peer node discovery
- May not be available on all node types
- Related commands: `node info`

---

### `base-fees`

Get the current base fees for gas and DA gas.

**Usage:**
```bash
cazt node base-fees
```

**Arguments:** None

**Options:** None (uses global options only)

**Examples:**

```bash
# Get current base fees
cazt --devnet node base-fees

# Output as JSON
cazt --json --devnet node base-fees
```

**Output (human-readable):**
```
Base Fees
========================================
Fee Per Gas:    1000000000
Fee Per DA Gas: 100000000
```

**Output (JSON):**
```json
{
  "baseFees": {
    "feePerGas": "1000000000",
    "feePerDaGas": "100000000"
  },
  "feePerGas": "1000000000",
  "feePerDaGas": "100000000"
}
```

**Notes:**
- Fee Per Gas: Cost for L2 execution
- Fee Per DA Gas: Cost for data availability
- Fees may vary based on network congestion
- Related commands: `node info`

---

### `sync-status`

Get the synchronization status of the node.

**Usage:**
```bash
cazt node sync-status
```

**Arguments:** None

**Options:** None (uses global options only)

**Examples:**

```bash
# Check sync status
cazt --devnet node sync-status

# Output as JSON
cazt --json --devnet node sync-status
```

**Output (human-readable - synced):**
```
Sync Status
========================================
Status:        Synced
Latest Block:  12345
Proven Block:  12340
```

**Output (human-readable - syncing):**
```
Sync Status
========================================
Status:        Syncing
Latest Block:  12345
Proven Block:  12000
Blocks Behind: 345
```

**Output (JSON):**
```json
{
  "synced": true,
  "latestBlock": 12345,
  "provenBlock": 12340,
  "blocksBehind": 5
}
```

**Notes:**
- Latest Block: Most recent block the node knows about
- Proven Block: Most recent block verified by rollup proof
- Blocks Behind: Difference between latest and proven
- Related commands: `node ready`, `query block tips`
