# Real-time Monitoring

Commands for streaming and monitoring blockchain activity in real-time.

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

### `blocks`

Stream new blocks as they are produced. Runs continuously until interrupted.

**Usage:**
```bash
cazt monitor blocks [options]
```

**Arguments:** None

**Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `--proven` | `false` | Only show proven blocks |
| `--interval <ms>` | `2000` | Polling interval in milliseconds |

**Examples:**

```bash
# Monitor all new blocks
cazt --devnet monitor blocks

# Monitor only proven blocks
cazt --devnet monitor blocks --proven

# Faster polling (500ms)
cazt --devnet monitor blocks --interval 500

# Output as JSON
cazt --json --devnet monitor blocks
```

**Output (human-readable):**
```
Monitoring blocks (Ctrl+C to stop)...

Block 12345: 3 txs
Block 12346: 1 txs
Block 12347: 5 txs
^C
Stopped monitoring
```

**Output (JSON):**
```json
{"blockNumber": 12345, "txCount": 3, "timestamp": "1704067200", "proven": false}
{"blockNumber": 12346, "txCount": 1, "timestamp": "1704067215", "proven": false}
```

**Notes:**
- Press Ctrl+C to stop monitoring
- `--proven` is useful for watching finality
- Related commands: `query block number`, `node sync-status`

---

### `nullifiers`

Stream nullifier insertions. Note: Real-time nullifier streaming requires node subscription support.

**Usage:**
```bash
cazt monitor nullifiers [options]
```

**Arguments:** None

**Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `--contract <address>` | - | Filter by contract address |

**Examples:**

```bash
# Monitor all nullifiers
cazt --devnet monitor nullifiers

# Filter by contract
cazt --devnet monitor nullifiers --contract 0x1234...
```

**Output:**
```
Error: Real-time nullifier monitoring requires node subscription support (not yet implemented).
Hint: Use query nullifiers <hash> to check specific nullifiers.
```

**Notes:**
- Not yet fully implemented (requires WebSocket subscriptions)
- Use `query nullifiers <hash>` to check specific nullifiers instead
- Related commands: `query nullifiers`

---

### `notes`

Watch note creation for a contract. Requires PXE connection and private key for decryption.

**Usage:**
```bash
cazt monitor notes <contract> [options]
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<contract>` | Yes | Contract address to monitor |

**Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `--slot <slot>` | - | Storage slot filter (hex or name) |
| `--artifact <path>` | - | Contract artifact for note decoding |
| `--secret <key>` | - | Secret key for account (for decryption) |
| `--interval <ms>` | `5000` | Polling interval in milliseconds |

**Examples:**

```bash
# Monitor notes for a token contract
cazt --sandbox monitor notes 0x1234... --secret 0xabc...

# Monitor specific storage slot
cazt --sandbox monitor notes 0x1234... --slot 0x01 --secret 0xabc...

# With artifact for decoding
cazt --sandbox monitor notes 0x1234... --artifact aztec:Token --secret 0xabc...

# Output as JSON
cazt --json --sandbox monitor notes 0x1234... --secret 0xabc...
```

**Output (human-readable):**
```
Monitoring notes for 0x1234abcd... (Ctrl+C to stop)

[2025-01-15T12:00:00.000Z] Notes: 5 (+2)
[2025-01-15T12:00:05.000Z] Notes: 7 (+2)
^C
Stopped monitoring
```

**Output (JSON):**
```json
{"timestamp": "2025-01-15T12:00:00.000Z", "notesCount": 5, "newNotes": 2}
{"timestamp": "2025-01-15T12:00:05.000Z", "notesCount": 7, "newNotes": 2}
```

**Notes:**
- Requires PXE connection (`--sandbox` or configured PXE URL)
- Secret key enables decryption of notes
- Related commands: `query notes`, `contract view`

---

### `address`

Watch all public activity (logs/events) for a specific address.

**Usage:**
```bash
cazt monitor address <address> [options]
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<address>` | Yes | Address to monitor |

**Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `--interval <ms>` | `2000` | Polling interval in milliseconds |

**Examples:**

```bash
# Monitor all activity for an address
cazt --devnet monitor address 0x1234567890abcdef...

# Faster polling
cazt --devnet monitor address 0x1234... --interval 1000

# Output as JSON
cazt --json --devnet monitor address 0x1234...
```

**Output (human-readable):**
```
Monitoring address 0x1234abcd... (Ctrl+C to stop)

Block 12345: Log with 3 fields
Block 12346: Log with 5 fields
^C
Stopped monitoring
```

**Output (JSON):**
```json
{"id": {"blockNumber": 12345, "logIndex": 0}, "fields": ["0x...", "0x...", "0x..."]}
{"id": {"blockNumber": 12346, "logIndex": 0}, "fields": ["0x...", "0x...", "0x...", "0x...", "0x..."]}
```

**Notes:**
- Monitors public logs emitted by/to this address
- Works for both accounts and contracts
- Related commands: `query logs`, `contract events`

---

### `messages`

Watch L1↔L2 cross-chain messages.

**Usage:**
```bash
cazt monitor messages [options]
```

**Arguments:** None

**Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `--direction <dir>` | `all` | `l1-to-l2`, `l2-to-l1`, or `all` |
| `--l1-rpc-url <url>` | `localhost:8545` (sandbox) | L1 RPC URL |
| `--interval <ms>` | `5000` | Polling interval in milliseconds |

**Examples:**

```bash
# Monitor all cross-chain messages (sandbox)
cazt --sandbox monitor messages

# Monitor only L1→L2 messages
cazt --sandbox monitor messages --direction l1-to-l2

# With custom L1 RPC
cazt --devnet monitor messages \
  --l1-rpc-url https://eth-sepolia.g.alchemy.com/v2/YOUR-KEY

# Output as JSON
cazt --json --sandbox monitor messages
```

**Output (human-readable):**
```
Monitoring cross-chain messages (all) (Ctrl+C to stop)

[2025-01-15T12:00:00.000Z] L1→L2: 5 messages (+2)
[2025-01-15T12:00:05.000Z] L2→L1: 3 message roots (+1)
^C
Stopped monitoring
```

**Output (JSON):**
```json
{"direction": "l1-to-l2", "count": 5, "delta": 2, "timestamp": "2025-01-15T12:00:00.000Z"}
{"direction": "l2-to-l1", "count": 3, "delta": 1, "timestamp": "2025-01-15T12:00:05.000Z"}
```

**Notes:**
- Requires L1 RPC access for L1→L2 message monitoring
- Use `--sandbox` for local development (defaults to localhost:8545)
- Related commands: `bridge pending`, `bridge status`

---

### `events`

Watch events emitted by a specific contract.

**Usage:**
```bash
cazt monitor events <contract> [options]
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<contract>` | Yes | Contract address to watch |

**Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `--event <name>` | - | Filter by event name |
| `--artifact <path>` | - | Contract artifact for event decoding |
| `--interval <ms>` | `2000` | Polling interval in milliseconds |

**Examples:**

```bash
# Monitor all events for a contract
cazt --devnet monitor events 0x1234...

# Filter by event name (requires artifact)
cazt --devnet monitor events 0x1234... --event Transfer --artifact aztec:Token

# Output as JSON
cazt --json --devnet monitor events 0x1234...
```

**Output (human-readable):**
```
Monitoring events for 0x1234abcd... (Ctrl+C to stop)

Block 12345: Event with 3 fields
Block 12346: Event with 5 fields
^C
Stopped monitoring
```

**Output (JSON):**
```json
{"id": {"blockNumber": 12345, "logIndex": 0}, "fields": ["0x...", "0x...", "0x..."]}
```

**Notes:**
- Queries public logs emitted by the contract
- Event name filtering requires artifact for decoding
- Related commands: `contract events`, `query logs`

---

### `logs`

Stream all public logs on the network.

**Usage:**
```bash
cazt monitor logs [options]
```

**Arguments:** None

**Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `--contract <address>` | - | Filter by contract address |
| `--interval <ms>` | `2000` | Polling interval in milliseconds |

**Examples:**

```bash
# Monitor all public logs
cazt --devnet monitor logs

# Filter by contract
cazt --devnet monitor logs --contract 0x1234...

# Faster polling
cazt --devnet monitor logs --interval 1000

# Output as JSON
cazt --json --devnet monitor logs
```

**Output (human-readable):**
```
Monitoring public logs (Ctrl+C to stop)...

Block 12345 - Contract 0x1234abcd...: 3 fields
Block 12346 - Contract 0x5678efgh...: 2 fields
^C
Stopped monitoring
```

**Output (JSON):**
```json
{"id": {"blockNumber": 12345}, "contractAddress": "0x1234...", "fields": ["0x...", "0x...", "0x..."]}
```

**Notes:**
- Shows all public logs across the network
- Use `--contract` to filter to specific contract
- Related commands: `query logs`, `monitor events`

---

### `pending`

Watch the pending transaction pool.

**Usage:**
```bash
cazt monitor pending [options]
```

**Arguments:** None

**Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `--from <address>` | - | Filter by sender address |
| `--interval <ms>` | `2000` | Polling interval in milliseconds |

**Examples:**

```bash
# Monitor pending transaction pool
cazt --devnet monitor pending

# Filter by sender
cazt --devnet monitor pending --from 0x1234...

# Output as JSON
cazt --json --devnet monitor pending
```

**Output (human-readable):**
```
Monitoring pending transactions (Ctrl+C to stop)

[2025-01-15T12:00:00.000Z] New pending: 0x1234567890abcd...
[2025-01-15T12:00:00.500Z] Pending pool: 3 txs
[2025-01-15T12:00:02.000Z] New pending: 0xabcdef12345678...
[2025-01-15T12:00:02.100Z] Pending pool: 4 txs
^C
Stopped monitoring
```

**Output (JSON):**
```json
{"txHash": "0x1234567890abcd...", "origin": "0xabc...", "timestamp": "2025-01-15T12:00:00.000Z"}
{"txHash": "0xabcdef12345678...", "origin": "0xdef...", "timestamp": "2025-01-15T12:00:02.000Z"}
```

**Notes:**
- Shows new transactions entering the mempool
- Pending tx support may vary by node implementation
- Useful for debugging transaction submission
- Related commands: `tx status`, `tx wait`
