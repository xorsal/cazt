# State Queries

Commands for querying blockchain state including storage, notes, nullifiers, transactions, and blocks.

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

### `public`

Read a public storage value from a contract.

**Usage:**
```bash
cazt query public <contract> <slot>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<contract>` | Yes | Contract address |
| `<slot>` | Yes | Storage slot (hex or decimal) |

**Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `--block <number>` | `latest` | Query at specific block |

**Examples:**

```bash
# Read storage slot
cazt --devnet query public 0x1234... 0x01

# Read at specific block
cazt --devnet query public 0x1234... 0x01 --block 1000

# Output as JSON
cazt --json --devnet query public 0x1234... 0x01
```

**Output (human-readable):**
```
Public Storage Value
==================================================

Contract: 0x1234...
Slot:     0x01
Value:    0x00000000000000000000000000001000
```

**Output (JSON):**
```json
{
  "contract": "0x1234...",
  "slot": "0x01",
  "value": "0x00000000000000000000000000001000"
}
```

**Notes:**
- Slot accepts both hex (0x01) and decimal (1) formats
- Related commands: `contract storage`

---

### `notes`

Query notes for an address. Requires PXE connection.

**Usage:**
```bash
cazt query notes <address> [options]
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<address>` | Yes | Owner address |

**Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `--contract <address>` | - | Filter by contract |
| `--artifact <path>` | - | Artifact for note decoding |
| `--secret <key>` | - | Secret key for decryption |
| `--slot <slot>` | - | Filter by storage slot |
| `--status <status>` | `all` | Note status (active, nullified, all) |

**Examples:**

```bash
# Query all notes for an address
cazt --sandbox query notes 0x1234... --secret 0xabc...

# Filter by contract
cazt --sandbox query notes 0x1234... --contract 0x5678... --secret 0xabc...

# Filter by status
cazt --sandbox query notes 0x1234... --status active --secret 0xabc...
```

**Output (human-readable):**
```
Notes for 0x1234...
==================================================

Note 1:
  Contract: 0x5678...
  Slot:     0x01
  Value:    1000
  Status:   active

Note 2:
  Contract: 0x5678...
  Slot:     0x01
  Value:    500
  Status:   active

Found 2 note(s)
```

**Notes:**
- Requires PXE connection (use `--sandbox`)
- Secret key needed for decryption
- Related commands: `monitor notes`

---

### `nullifiers`

Check if a nullifier exists (has been used).

**Usage:**
```bash
cazt query nullifiers <hash>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<hash>` | Yes | Nullifier hash to check |

**Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `--block <number>` | `latest` | Query at specific block |

**Examples:**

```bash
# Check nullifier existence
cazt --devnet query nullifiers 0x1234567890abcdef...

# Output as JSON
cazt --json --devnet query nullifiers 0x1234567890abcdef...
```

**Output (human-readable):**
```
Nullifier Check
==================================================

Hash:   0x1234567890abcdef...
Exists: Yes
```

**Output (JSON):**
```json
{
  "hash": "0x1234567890abcdef...",
  "exists": true
}
```

**Notes:**
- Nullifiers prevent double-spending
- Related commands: `cast nullifier silo`

---

### `tx`

Get transaction details by hash.

**Usage:**
```bash
cazt query tx <hash>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<hash>` | Yes | Transaction hash |

**Options:** None (uses global options only)

**Examples:**

```bash
# Get transaction
cazt --devnet query tx 0x1234567890abcdef...

# Output as JSON
cazt --json --devnet query tx 0x1234567890abcdef...
```

**Output (human-readable):**
```
Transaction
==================================================

Hash:         0x1234567890abcdef...
Block Number: 12345
Status:       success
From:         0xabcd...
```

**Output (JSON):**
```json
{
  "hash": "0x1234567890abcdef...",
  "blockNumber": 12345,
  "status": "success"
}
```

**Notes:**
- Returns "not found" for pending transactions
- Related commands: `tx status`, `tx analyze`

---

### `logs`

Query historical logs for an address.

**Usage:**
```bash
cazt query logs <address> [options]
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<address>` | Yes | Contract address |

**Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `--from <block>` | `0` | Start block |
| `--to <block>` | `latest` | End block |
| `--type <type>` | `public` | Log type (public, private, all) |

**Examples:**

```bash
# Query public logs
cazt --devnet query logs 0x1234... --type public

# Query logs in range
cazt --devnet query logs 0x1234... --from 100 --to 200

# Query private logs (requires PXE)
cazt --sandbox query logs 0x1234... --type private
```

**Output (human-readable):**
```
Logs for 0x1234...
==================================================

Block 150:
  Type: public
  Data: 0xabcd...

Block 175:
  Type: public
  Data: 0xef01...

Found 2 log(s)
```

**Notes:**
- Private logs require PXE connection
- Related commands: `contract logs`, `monitor logs`

---

## Block Commands

Block-related queries.

### `block number`

Get the current block number.

**Usage:**
```bash
cazt query block number
```

**Arguments:** None

**Options:** None (uses global options only)

**Examples:**

```bash
# Get current block number
cazt --devnet query block number

# Output as JSON
cazt --json --devnet query block number
```

**Output (human-readable):**
```
Current Block Number: 12345
```

**Output (JSON):**
```json
{
  "blockNumber": 12345
}
```

**Notes:**
- Related commands: `query block tips`, `query block proven-number`

---

### `block proven-number`

Get the latest proven block number.

**Usage:**
```bash
cazt query block proven-number
```

**Arguments:** None

**Options:** None (uses global options only)

**Examples:**

```bash
# Get proven block number
cazt --devnet query block proven-number
```

**Output (human-readable):**
```
Latest Proven Block: 12340
```

**Output (JSON):**
```json
{
  "provenBlockNumber": 12340
}
```

**Notes:**
- Proven blocks have been verified by the rollup
- Related commands: `query block number`, `query block tips`

---

### `block tips`

Get block tips (latest, proven, finalized).

**Usage:**
```bash
cazt query block tips
```

**Arguments:** None

**Options:** None (uses global options only)

**Examples:**

```bash
# Get all block tips
cazt --devnet query block tips

# Output as JSON
cazt --json --devnet query block tips
```

**Output (human-readable):**
```
Block Tips
==================================================

Latest:    12345
Proven:    12340
Finalized: 12335
```

**Output (JSON):**
```json
{
  "latest": 12345,
  "proven": 12340,
  "finalized": 12335
}
```

**Notes:**
- Latest: Most recent block
- Proven: Verified by rollup proof
- Finalized: Cannot be reverted
- Related commands: `query block number`

---

### `block get`

Get a block by number or hash.

**Usage:**
```bash
cazt query block get <id> [options]
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<id>` | Yes | Block number or hash |

**Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `--full` | `false` | Include full transaction details |

**Examples:**

```bash
# Get block by number
cazt --devnet query block get 12345

# Get block by hash
cazt --devnet query block get 0xabcd...

# Get block with full transactions
cazt --devnet query block get 12345 --full
```

**Output (human-readable):**
```
Block 12345
==================================================

Hash:         0xabcd...
Timestamp:    2025-01-01T12:00:00Z
Transactions: 5
```

**Output (JSON):**
```json
{
  "number": 12345,
  "hash": "0xabcd...",
  "timestamp": "2025-01-01T12:00:00Z",
  "txCount": 5
}
```

**Notes:**
- Related commands: `query block header`, `query block range`

---

### `block range`

Get a range of blocks.

**Usage:**
```bash
cazt query block range <from> <to>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<from>` | Yes | Start block number |
| `<to>` | Yes | End block number |

**Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `--full` | `false` | Include full transaction details |

**Examples:**

```bash
# Get blocks 100-110
cazt --devnet query block range 100 110

# Get blocks with full details
cazt --devnet query block range 100 110 --full
```

**Output (human-readable):**
```
Blocks 100-110
==================================================

Block 100: 3 txs, 0xabc...
Block 101: 5 txs, 0xdef...
Block 102: 2 txs, 0x123...
...

Found 11 block(s)
```

**Notes:**
- Maximum range is 100 blocks
- Error if `from > to`
- Related commands: `query block get`

---

### `block header`

Get a block header.

**Usage:**
```bash
cazt query block header <id>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<id>` | Yes | Block number or hash |

**Options:** None (uses global options only)

**Examples:**

```bash
# Get block header
cazt --devnet query block header 12345

# Output as JSON
cazt --json --devnet query block header 12345
```

**Output (human-readable):**
```
Block Header 12345
==================================================

Hash:            0xabcd...
Parent Hash:     0x1234...
Timestamp:       2025-01-01T12:00:00Z
State Root:      0x5678...
Transactions:    5
```

**Notes:**
- Headers contain metadata without full transaction data
- Related commands: `query block get`
