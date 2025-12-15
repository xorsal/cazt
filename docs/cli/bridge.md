# L1↔L2 Messaging

Commands for cross-chain messaging between L1 (Ethereum) and L2 (Aztec).

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

### `l1-to-l2-witness`

Get the membership witness for an L1→L2 message. The witness is needed to prove message existence in the L1→L2 message tree.

**Usage:**
```bash
cazt bridge l1-to-l2-witness <msgHash>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<msgHash>` | Yes | Message hash (32 bytes, hex) |

**Options:** None (uses global options only)

**Examples:**

```bash
# Get witness for a message
cazt --devnet bridge l1-to-l2-witness 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef

# Output as JSON
cazt --json --devnet bridge l1-to-l2-witness 0x1234...
```

**Output (human-readable):**
```
L1->L2 Message Witness
========================================
Message Hash: 0x1234567890abcdef...
Index:        42
Leaf Value:   0xabcdef...
Sibling Path: 32 nodes
```

**Output (JSON):**
```json
{
  "index": 42,
  "leafValue": "0xabcdef...",
  "siblingPath": ["0x...", "0x...", "..."]
}
```

**Notes:**
- Witness is used by contracts to verify message inclusion
- Returns error if message not found
- Related commands: `bridge l1-to-l2-block`, `bridge status`

---

### `l1-to-l2-block`

Find which L2 block contains a specific L1→L2 message.

**Usage:**
```bash
cazt bridge l1-to-l2-block <msgHash>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<msgHash>` | Yes | Message hash (32 bytes, hex) |

**Options:** None (uses global options only)

**Examples:**

```bash
# Find block containing message
cazt --devnet bridge l1-to-l2-block 0x1234567890abcdef...

# Output as JSON
cazt --json --devnet bridge l1-to-l2-block 0x1234...
```

**Output (human-readable):**
```
Message found in block 12345
```

**Output (not found):**
```
Message not found in any block
```

**Output (JSON):**
```json
{
  "msgHash": "0x1234567890abcdef...",
  "blockNumber": 12345
}
```

**Notes:**
- Returns null if message not yet synced
- Messages typically appear after ~2 L2 blocks
- Related commands: `bridge l1-to-l2-witness`, `bridge is-l1-to-l2-synced`

---

### `is-l1-to-l2-synced`

Check if L1→L2 messages from a specific L1 block have been synced to L2.

**Usage:**
```bash
cazt bridge is-l1-to-l2-synced <blockNumber>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<blockNumber>` | Yes | L1 block number |

**Options:** None (uses global options only)

**Examples:**

```bash
# Check if L1 block 1000000 messages are synced
cazt --devnet bridge is-l1-to-l2-synced 1000000

# Output as JSON
cazt --json --devnet bridge is-l1-to-l2-synced 1000000
```

**Output (human-readable):**
```
Synced
```

**Output (not synced):**
```
Not synced
```

**Output (JSON):**
```json
{
  "l1BlockNumber": 1000000,
  "synced": true
}
```

**Notes:**
- Use to verify messages from a specific L1 block are available
- Sync typically takes ~2 L2 blocks
- Related commands: `bridge l1-to-l2-block`

---

### `l2-to-l1`

Get all L2→L1 messages from a specific L2 block.

**Usage:**
```bash
cazt bridge l2-to-l1 <blockNumber>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<blockNumber>` | Yes | L2 block number |

**Options:** None (uses global options only)

**Examples:**

```bash
# Get L2→L1 messages from block 12345
cazt --devnet bridge l2-to-l1 12345

# Output as JSON
cazt --json --devnet bridge l2-to-l1 12345
```

**Output (human-readable):**
```
L2->L1 Messages in Block 12345
========================================
Found: 3 messages

[1] 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
[2] 0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890
[3] 0x5678901234abcdef5678901234abcdef5678901234abcdef5678901234abcdef
```

**Output (JSON):**
```json
{
  "blockNumber": 12345,
  "count": 3,
  "messages": [
    "0x1234567890abcdef...",
    "0xabcdef1234567890...",
    "0x5678901234abcdef..."
  ]
}
```

**Notes:**
- Messages are extracted from transaction effects
- Related commands: `bridge pending`, `query block get`

---

### `send-l1-to-l2`

Send a message from L1 to L2. This command interacts with the L1 Inbox contract.

**Usage:**
```bash
cazt bridge send-l1-to-l2 --recipient <address> --content <hash> --secret-hash <hash> [options]
```

**Arguments:** None

**Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `--recipient <address>` | Required | L2 recipient contract address |
| `--content <hash>` | Required | Message content hash (32 bytes) |
| `--secret-hash <hash>` | Required | Secret hash for consumption (32 bytes) |
| `--l1-rpc-url <url>` | `localhost:8545` (sandbox) | L1 RPC URL |
| `--l1-private-key <key>` | Anvil account 0 | L1 sender private key |

**Examples:**

```bash
# Send message to L2 (sandbox with defaults)
cazt --sandbox bridge send-l1-to-l2 \
  --recipient 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef \
  --content 0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890 \
  --secret-hash 0x5678901234abcdef5678901234abcdef5678901234abcdef5678901234abcdef

# Send with custom L1 settings
cazt --devnet bridge send-l1-to-l2 \
  --recipient 0x1234... \
  --content 0xabcd... \
  --secret-hash 0x5678... \
  --l1-rpc-url https://eth-sepolia.g.alchemy.com/v2/YOUR-KEY \
  --l1-private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

**Output (human-readable):**
```
L1→L2 Message Sent
========================================
L1 Tx Hash:    0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba
Message Hash:  0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
Leaf Index:    42

Note: Message will be available on L2 after ~2 blocks.
```

**Output (JSON):**
```json
{
  "success": true,
  "txHash": "0x9876543210fedcba...",
  "msgHash": "0x1234567890abcdef...",
  "globalLeafIndex": "42"
}
```

**Notes:**
- Requires access to L1 RPC and funded account
- Default L1 private key is Anvil's account 0 (for local testing)
- Message available on L2 after ~2 blocks
- Related commands: `bridge consume-l1-to-l2`, `bridge status`

---

### `consume-l1-to-l2`

Get information about consuming L1→L2 messages on L2. Can also check if a specific message is available.

**Usage:**
```bash
cazt bridge consume-l1-to-l2 [options]
```

**Arguments:** None

**Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `--message-hash <hash>` | - | Check availability of specific message |

**Examples:**

```bash
# Show guidance on message consumption
cazt --sandbox bridge consume-l1-to-l2

# Check if a specific message is available
cazt --sandbox bridge consume-l1-to-l2 --message-hash 0x1234...

# Output as JSON
cazt --json --sandbox bridge consume-l1-to-l2 --message-hash 0x1234...
```

**Output (guidance - no message hash):**
```
L1→L2 Message Consumption
==================================================

L1→L2 messages are consumed BY CONTRACTS, not directly via CLI.

Typical flow:
  1. Send message from L1:
     cazt --sandbox bridge send-l1-to-l2 \
       --recipient <l2-contract> \
       --content <data> \
       --secret-hash <hash>

  2. Wait ~2 L2 blocks for sync

  3. Call your L2 contract function that internally calls:
     context.consume_l1_to_l2_message(...)

To check if a message is available:
  cazt --sandbox bridge consume-l1-to-l2 --message-hash <hash>

To see pending messages:
  cazt --sandbox bridge pending --direction l1-to-l2
```

**Output (with message hash - available):**
```
L1→L2 Message Status
========================================
Hash:      0x1234567890abcdef...
Available: Yes (synced at block 12345)

This message can be consumed by a contract on L2.
```

**Output (with message hash - not available):**
```
L1→L2 Message Status
========================================
Hash:      0x1234567890abcdef...
Available: No (not yet synced or invalid hash)

Wait for ~2 L2 blocks after sending from L1.
```

**Output (JSON):**
```json
{
  "messageHash": "0x1234567890abcdef...",
  "available": true,
  "blockNumber": 12345
}
```

**Notes:**
- L1→L2 message consumption happens inside contracts, not via CLI
- Use this to verify a message is ready before calling your contract
- Related commands: `bridge send-l1-to-l2`, `bridge status`

---

### `status`

Check the status of a cross-chain message.

**Usage:**
```bash
cazt bridge status <msgHash>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<msgHash>` | Yes | Message hash (32 bytes, hex) |

**Options:** None (uses global options only)

**Examples:**

```bash
# Check message status
cazt --devnet bridge status 0x1234567890abcdef...

# Output as JSON
cazt --json --devnet bridge status 0x1234...
```

**Output (human-readable - delivered):**
```
Message Status
========================================
Hash:   0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
Status: delivered
Block:  12345
```

**Output (human-readable - unknown):**
```
Message Status
========================================
Hash:   0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
Status: unknown
```

**Output (JSON):**
```json
{
  "msgHash": "0x1234567890abcdef...",
  "status": "delivered",
  "blockNumber": 12345
}
```

**Notes:**
- Status can be: `delivered`, `unknown`
- `delivered` means the message is in the L1→L2 tree
- Related commands: `bridge l1-to-l2-block`, `bridge consume-l1-to-l2`

---

### `pending`

List pending cross-chain messages. Queries L1 events to find messages.

**Usage:**
```bash
cazt bridge pending [options]
```

**Arguments:** None

**Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `--direction <dir>` | `all` | `l1-to-l2`, `l2-to-l1`, or `all` |
| `--l1-rpc-url <url>` | `localhost:8545` (sandbox) | L1 RPC URL |
| `--from-block <number>` | `0` | Start block for query |
| `--limit <number>` | `100` | Maximum messages to return |

**Examples:**

```bash
# List all pending messages (sandbox)
cazt --sandbox bridge pending

# List only L1→L2 messages
cazt --sandbox bridge pending --direction l1-to-l2

# List with custom L1 RPC
cazt --devnet bridge pending \
  --direction l1-to-l2 \
  --l1-rpc-url https://eth-sepolia.g.alchemy.com/v2/YOUR-KEY \
  --from-block 1000000 \
  --limit 50
```

**Output (human-readable):**
```
Pending Cross-Chain Messages
========================================

L1→L2 Messages (3):
  [1] Hash: 0x1234..., Recipient: 0xabcd..., Content: 0x5678...
  [2] Hash: 0x2345..., Recipient: 0xbcde..., Content: 0x6789...
  [3] Hash: 0x3456..., Recipient: 0xcdef..., Content: 0x789a...

L2→L1 Messages (1):
  [1] Hash: 0xfedc..., Sender: 0x9876..., Content: 0x5432...
```

**Output (JSON):**
```json
{
  "l1ToL2": [
    {
      "msgHash": "0x1234...",
      "recipient": "0xabcd...",
      "content": "0x5678...",
      "secretHash": "0x...",
      "blockNumber": "1000001"
    }
  ],
  "l2ToL1": [
    {
      "msgHash": "0xfedc...",
      "sender": "0x9876...",
      "content": "0x5432...",
      "blockNumber": "12345"
    }
  ]
}
```

**Notes:**
- Requires L1 RPC access to query L1→L2 messages
- L2→L1 messages are queried from the Aztec node
- Use `--from-block` to avoid querying from genesis on mainnet
- Related commands: `bridge status`, `bridge l2-to-l1`
