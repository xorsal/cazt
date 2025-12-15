# Transaction Operations

Commands for analyzing, monitoring, and debugging transactions.

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

### `analyze`

Analyze a transaction in detail including status, effects, logs, and gas usage.

**Usage:**
```bash
cazt tx analyze <hash> [options]
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<hash>` | Yes | Transaction hash |

**Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `--effects` | `false` | Include state changes/effects |
| `--logs` | `false` | Include emitted logs |
| `--gas` | `false` | Include detailed gas breakdown |
| `--diff` | `false` | Show state diff |
| `--artifact <path>` | - | Artifact for log decoding |

**Examples:**

```bash
# Basic analysis
cazt --devnet tx analyze 0x1234...

# With state effects
cazt --devnet tx analyze 0x1234... --effects

# Full analysis with all details
cazt --devnet tx analyze 0x1234... --effects --logs --gas

# With log decoding
cazt --devnet tx analyze 0x1234... --logs --artifact aztec:Token
```

**Output (human-readable):**
```
Transaction Analysis
==================================================

Hash:         0x1234567890abcdef...
Status:       success
Block:        12345
Timestamp:    2025-01-01T12:00:00Z

Gas Used:     50000
Gas Price:    1 gwei
Total Cost:   0.00005 ETH

Public Calls: 2
Private Calls: 1
Note Hashes:  3
Nullifiers:   1
```

**Output (JSON):**
```json
{
  "hash": "0x1234567890abcdef...",
  "status": "success",
  "blockNumber": 12345,
  "gasUsed": 50000,
  "publicCalls": 2,
  "privateCalls": 1,
  "noteHashes": 3,
  "nullifiers": 1
}
```

**Notes:**
- Most comprehensive transaction inspection tool
- Related commands: `tx status`, `tx receipt`

---

### `compare`

Compare two transactions side-by-side.

**Usage:**
```bash
cazt tx compare <hash1> <hash2>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<hash1>` | Yes | First transaction hash |
| `<hash2>` | Yes | Second transaction hash |

**Options:** None (uses global options only)

**Examples:**

```bash
# Compare two transactions
cazt --devnet tx compare 0x1234... 0x5678...
```

**Output (human-readable):**
```
Transaction Comparison
==================================================

                    TX 1                TX 2
Hash:               0x1234...          0x5678...
Status:             success            success
Block:              12345              12346
Gas Used:           50000              45000
Public Calls:       2                  1
Private Calls:      1                  2
Note Hashes:        3                  2
Nullifiers:         1                  2
```

**Notes:**
- Useful for debugging similar transactions
- Related commands: `tx analyze`

---

### `decode`

Decode transaction calldata using an ABI.

**Usage:**
```bash
cazt tx decode <calldata> --artifact <path> [options]
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<calldata>` | Yes | Calldata to decode (hex) |

**Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `--artifact <path>` | Required | Contract artifact |
| `--function <name>` | - | Specific function to decode as |

**Examples:**

```bash
# Decode calldata
cazt tx decode 0xabcd1234... --artifact aztec:Token

# Decode as specific function
cazt tx decode 0xabcd1234... --artifact aztec:Token --function transfer
```

**Output (human-readable):**
```
Decoded Calldata
==================================================

Function: transfer
Arguments:
  to:     0x1234567890abcdef...
  amount: 1000
```

**Output (JSON):**
```json
{
  "function": "transfer",
  "args": {
    "to": "0x1234567890abcdef...",
    "amount": "1000"
  }
}
```

**Notes:**
- Requires matching artifact
- Related commands: `contract abi`

---

### `status`

Quick status check for a transaction.

**Usage:**
```bash
cazt tx status <hash>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<hash>` | Yes | Transaction hash |

**Options:** None (uses global options only)

**Examples:**

```bash
# Check transaction status
cazt --devnet tx status 0x1234...
```

**Output (human-readable):**
```
Transaction Status: success
Block: 12345
```

**Output (JSON):**
```json
{
  "hash": "0x1234...",
  "status": "success",
  "blockNumber": 12345
}
```

**Notes:**
- Faster than `tx analyze` for quick checks
- Status can be: pending, success, reverted
- Related commands: `tx analyze`, `tx wait`

---

### `receipt`

Get the full transaction receipt.

**Usage:**
```bash
cazt tx receipt <hash>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<hash>` | Yes | Transaction hash |

**Options:** None (uses global options only)

**Examples:**

```bash
# Get receipt
cazt --devnet tx receipt 0x1234...

# Output as JSON
cazt --json --devnet tx receipt 0x1234...
```

**Output (human-readable):**
```
Transaction Receipt
==================================================

Hash:           0x1234567890abcdef...
Status:         success
Block Number:   12345
Block Hash:     0xabcd...
Gas Used:       50000
Logs:           3
```

**Notes:**
- Returns null for pending transactions
- Related commands: `tx status`, `tx analyze`

---

### `wait`

Wait for a transaction to be mined.

**Usage:**
```bash
cazt tx wait <hash> [options]
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<hash>` | Yes | Transaction hash |

**Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `--timeout <seconds>` | `60` | Maximum wait time |

**Examples:**

```bash
# Wait for transaction
cazt --devnet tx wait 0x1234...

# Wait with custom timeout
cazt --devnet tx wait 0x1234... --timeout 120
```

**Output (human-readable):**
```
Waiting for transaction 0x1234...

Transaction mined!
Block: 12345
Status: success
Time: 5.2s
```

**Notes:**
- Blocks until transaction is mined or timeout
- Exit code 0 on success, 1 on failure/timeout
- Related commands: `tx status`

---

### `simulate`

Simulate raw calldata without sending to network.

**Usage:**
```bash
cazt tx simulate <calldata> [options]
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<calldata>` | Yes | Raw calldata to simulate (hex) |

**Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `--from <address>` | - | Sender address |
| `--to <address>` | - | Target contract address |

**Examples:**

```bash
# Simulate transaction
cazt --devnet tx simulate 0xabcd... --from 0x1234... --to 0x5678...
```

**Output (human-readable):**
```
Simulation Result
==================================================

Status:    Would succeed
Gas Est:   ~50000
Return:    0x0000...
```

**Notes:**
- Does not send transaction to network
- Useful for gas estimation and error checking
- Related commands: `contract simulate`
