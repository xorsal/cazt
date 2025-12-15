# Contract Interaction

Commands for deploying, calling, and inspecting Aztec smart contracts.

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

### `view`

Call a view function (read-only, no state change).

**Usage:**
```bash
cazt contract view <address> <function> [args...] --artifact <path>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<address>` | Yes | Contract address |
| `<function>` | Yes | Function name to call |
| `[args...]` | No | Function arguments |

**Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `--artifact <path>` | Required | Contract artifact (path or shortcut) |
| `--secret <key>` | - | Secret key for private functions |

**Examples:**

```bash
# Call view function on a token contract
cazt --devnet contract view 0x1234... get_balance 0x5678... --artifact aztec:Token

# Call with artifact file
cazt --devnet contract view 0x1234... total_supply --artifact ./target/my_token.json

# Output as JSON
cazt --json --devnet contract view 0x1234... get_balance 0x5678... --artifact aztec:Token
```

**Output (human-readable):**
```
View Result
==================================================

Contract: 0x1234...
Function: get_balance
Result:   1000
```

**Output (JSON):**
```json
{
  "contract": "0x1234...",
  "function": "get_balance",
  "result": "1000"
}
```

**Notes:**
- View functions don't modify state
- Artifact shortcuts: `aztec:ContractName`, `standards:ContractName`
- Related commands: `contract send`, `contract simulate`

---

### `send`

Send a state-changing transaction to a contract.

**Usage:**
```bash
cazt contract send <address> <function> [args...] --artifact <path> --secret <key>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<address>` | Yes | Contract address |
| `<function>` | Yes | Function name to call |
| `[args...]` | No | Function arguments |

**Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `--artifact <path>` | Required | Contract artifact |
| `--secret <key>` | Required | Sender's secret key |
| `--wait` | `true` | Wait for transaction confirmation |

**Examples:**

```bash
# Transfer tokens
cazt --devnet contract send 0x1234... transfer 0x5678... 100 \
  --artifact aztec:Token \
  --secret 0xabc...

# Mint tokens (if authorized)
cazt --devnet contract send 0x1234... mint 0x5678... 1000 \
  --artifact aztec:Token \
  --secret 0xabc...
```

**Output (human-readable):**
```
Transaction Sent
==================================================

Contract:     0x1234...
Function:     transfer
Tx Hash:      0xabcd...
Block Number: 12345
Status:       success
```

**Output (JSON):**
```json
{
  "contract": "0x1234...",
  "function": "transfer",
  "txHash": "0xabcd...",
  "blockNumber": 12345,
  "status": "success"
}
```

**Notes:**
- Requires a funded account with deployed contract
- Related commands: `contract view`, `contract simulate`

---

### `simulate`

Simulate a transaction without sending it to the network.

**Usage:**
```bash
cazt contract simulate <address> <function> [args...] --artifact <path> --secret <key>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<address>` | Yes | Contract address |
| `<function>` | Yes | Function name |
| `[args...]` | No | Function arguments |

**Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `--artifact <path>` | Required | Contract artifact |
| `--secret <key>` | Required | Sender's secret key |

**Examples:**

```bash
# Simulate a transfer before actually sending
cazt --devnet contract simulate 0x1234... transfer 0x5678... 100 \
  --artifact aztec:Token \
  --secret 0xabc...
```

**Output (human-readable):**
```
Simulation Result
==================================================

Contract: 0x1234...
Function: transfer
Status:   Would succeed
Gas Est:  ~50000
```

**Notes:**
- Useful for testing before committing to a transaction
- Shows estimated gas and potential errors
- Related commands: `contract send`

---

### `info`

Show contract instance details.

**Usage:**
```bash
cazt contract info <address>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<address>` | Yes | Contract address |

**Options:** None (uses global options only)

**Examples:**

```bash
# Get contract info
cazt --devnet contract info 0x1234...

# Output as JSON
cazt --json --devnet contract info 0x1234...
```

**Output (human-readable):**
```
Contract Instance
==================================================

Address:          0x1234...
Contract Class:   0x5678...
Salt:             0x0000...
Deployer:         0xabcd...
Initialization:   0xef01...
```

**Output (JSON):**
```json
{
  "address": "0x1234...",
  "contractClassId": "0x5678...",
  "salt": "0x0000...",
  "deployer": "0xabcd...",
  "initializationHash": "0xef01..."
}
```

**Notes:**
- Returns error if contract not found
- Related commands: `contract class`, `wallet info`

---

### `class`

Show contract class details.

**Usage:**
```bash
cazt contract class <id>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<id>` | Yes | Contract class ID |

**Options:** None (uses global options only)

**Examples:**

```bash
# Get contract class info
cazt --devnet contract class 0x1234...
```

**Output (human-readable):**
```
Contract Class
==================================================

Class ID:      0x1234...
Artifact Hash: 0x5678...
Functions:     5
```

**Notes:**
- Contract classes are templates for contract instances
- Related commands: `contract info`

---

### `abi`

Pretty-print contract ABI from an artifact.

**Usage:**
```bash
cazt contract abi <artifact>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<artifact>` | Yes | Artifact path or shortcut |

**Options:** None (uses global options only)

**Examples:**

```bash
# View ABI from built-in artifact
cazt contract abi aztec:Token

# View ABI from local file
cazt contract abi ./target/my_contract.json

# Output as JSON
cazt --json contract abi aztec:Token
```

**Output (human-readable):**
```
Contract ABI: Token
==================================================

Functions:
  constructor(admin: AztecAddress, name: str, symbol: str, decimals: u8)
  transfer(to: AztecAddress, amount: Field) -> bool
  balance_of(owner: AztecAddress) -> Field [view]
  total_supply() -> Field [view]
  mint(to: AztecAddress, amount: Field)
```

**Notes:**
- Shortcuts: `aztec:ContractName`, `standards:ContractName`
- Related commands: `contract artifact info`

---

### `storage`

Read public storage from a contract.

**Usage:**
```bash
cazt contract storage <address> [slot]
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<address>` | Yes | Contract address |
| `[slot]` | No | Specific storage slot to read |

**Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `--artifact <path>` | - | Artifact for slot name resolution |

**Examples:**

```bash
# Show storage guidance
cazt --devnet contract storage 0x1234...

# Read specific slot
cazt --devnet contract storage 0x1234... 0x01

# Read slot with artifact for names
cazt --devnet contract storage 0x1234... 0x01 --artifact aztec:Token
```

**Output (human-readable):**
```
Public Storage
==================================================

Contract: 0x1234...
Slot:     0x01
Value:    0x00000000000000000000000000001000
```

**Notes:**
- Without slot argument, shows guidance on storage layout
- Related commands: `query public`

---

### `events`

Query historical events from a contract.

**Usage:**
```bash
cazt contract events <address> [options]
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
| `--event <name>` | - | Filter by event name |
| `--artifact <path>` | - | Artifact for event decoding |

**Examples:**

```bash
# Get all events
cazt --devnet contract events 0x1234...

# Get events in range
cazt --devnet contract events 0x1234... --from 100 --to 200

# Filter by event type
cazt --devnet contract events 0x1234... --event Transfer --artifact aztec:Token
```

**Output (human-readable):**
```
Contract Events
==================================================

Block 150: Transfer
  from: 0x1234...
  to:   0x5678...
  amount: 100

Block 175: Transfer
  from: 0x5678...
  to:   0xabcd...
  amount: 50

Found 2 event(s)
```

**Notes:**
- Events are indexed by contract address
- Related commands: `query logs`, `monitor events`

---

### `logs`

Query contract logs.

**Usage:**
```bash
cazt contract logs <address> [options]
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
| `--artifact <path>` | - | Artifact for log decoding |

**Examples:**

```bash
# Get contract logs
cazt --devnet contract logs 0x1234...

# With block range
cazt --devnet contract logs 0x1234... --from 100 --to 200
```

**Notes:**
- Similar to events but for raw logs
- Related commands: `contract events`, `query logs`

---

### `deploy`

Deploy a contract to the network.

**Usage:**
```bash
cazt contract deploy <artifact> [options]
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<artifact>` | Yes | Artifact path or shortcut |

**Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `--args <args>` | - | Constructor arguments (JSON array) |
| `--salt <salt>` | `random` | Contract address salt |
| `--from <secret>` | Required | Deployer secret key |
| `--account-salt <salt>` | `0` | Deployer account salt |
| `--constructor <name>` | `constructor` | Constructor function name |
| `--no-wait` | `false` | Don't wait for deployment |
| `--debug` | `false` | Enable debug output |

**Examples:**

```bash
# Deploy Token contract
cazt --devnet contract deploy aztec:Token \
  --args '["0x1234...", "My Token", "MTK", 18]' \
  --from 0xabc...

# Deploy with deterministic salt
cazt --devnet contract deploy ./target/my_contract.json \
  --args '[]' \
  --salt 0x42 \
  --from 0xabc...

# Deploy without waiting
cazt --devnet contract deploy aztec:Token \
  --args '["0x1234...", "Token", "TKN", 18]' \
  --from 0xabc... \
  --no-wait
```

**Output (human-readable):**
```
Contract Deployed
==================================================

Address:      0x1234567890abcdef...
Tx Hash:      0xabcd...
Block Number: 12345
Class ID:     0x5678...

Constructor: constructor
Arguments:   ["0x1234...", "My Token", "MTK", 18]
```

**Output (JSON):**
```json
{
  "address": "0x1234567890abcdef...",
  "txHash": "0xabcd...",
  "blockNumber": 12345,
  "classId": "0x5678...",
  "constructor": "constructor",
  "args": ["0x1234...", "My Token", "MTK", 18]
}
```

**Notes:**
- Deployer account must be deployed first
- `--salt random` generates a random salt
- Related commands: `wallet deploy`, `contract info`

---

## Artifact Commands

Operations on contract artifacts.

### `artifact info`

Show information about a contract artifact.

**Usage:**
```bash
cazt contract artifact info <path>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<path>` | Yes | Artifact path or shortcut |

**Examples:**

```bash
# Info from built-in artifact
cazt contract artifact info aztec:Token

# Info from local file
cazt contract artifact info ./target/my_contract.json
```

**Output (human-readable):**
```
Artifact Info
==================================================

Name:        Token
Class ID:    0x1234...
Functions:   5
  - constructor (initializer)
  - transfer (private)
  - balance_of (view)
  - total_supply (view)
  - mint (private)
```

**Notes:**
- Related commands: `contract abi`, `contract deploy`

---

## Registry Commands

Interact with the artifact registry at devnet.aztec-registry.xyz.

### `registry list`

List all artifacts in the registry.

**Usage:**
```bash
cazt contract registry list
```

**Arguments:** None

**Options:** None (uses global options only)

**Examples:**

```bash
# List registry artifacts
cazt contract registry list

# Output as JSON
cazt --json contract registry list
```

**Output (human-readable):**
```
Registry Artifacts
==================================================

Token (0x1234...)
  Version: 1.0.0
  Functions: 5

Counter (0x5678...)
  Version: 1.0.0
  Functions: 3

Found 2 artifact(s)
```

**Notes:**
- Registry is at devnet.aztec-registry.xyz
- Related commands: `registry get`, `registry search`

---

### `registry get`

Download an artifact by class ID.

**Usage:**
```bash
cazt contract registry get <classId> [options]
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<classId>` | Yes | Contract class ID |

**Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `-o, --output <path>` | `./<name>.json` | Output file path |

**Examples:**

```bash
# Download artifact
cazt contract registry get 0x1234... --output ./token.json

# Download with default name
cazt contract registry get 0x1234...
```

**Output (human-readable):**
```
Artifact Downloaded
==================================================

Class ID: 0x1234...
Name:     Token
Saved to: ./token.json
```

**Notes:**
- Related commands: `registry list`, `contract deploy`

---

### `registry upload`

Upload an artifact to the registry.

**Usage:**
```bash
cazt contract registry upload <artifact> --api-key <key>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<artifact>` | Yes | Artifact file path |

**Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `--api-key <key>` | Required | Registry API key |

**Examples:**

```bash
# Upload artifact
cazt contract registry upload ./target/my_contract.json --api-key abc123
```

**Output (human-readable):**
```
Artifact Uploaded
==================================================

Class ID: 0x1234...
Name:     MyContract
Registry: devnet.aztec-registry.xyz
```

**Notes:**
- Requires API key from registry
- Related commands: `registry list`

---

### `registry search`

Search artifacts by name.

**Usage:**
```bash
cazt contract registry search <query>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<query>` | Yes | Search query |

**Examples:**

```bash
# Search for token contracts
cazt contract registry search token

# Search for NFT contracts
cazt contract registry search nft
```

**Output (human-readable):**
```
Search Results for "token"
==================================================

Token (0x1234...)
  Standard ERC20-like token contract

PrivateToken (0x5678...)
  Private token with shielded balances

Found 2 result(s)
```

**Notes:**
- Searches by contract name
- Related commands: `registry list`, `registry get`
