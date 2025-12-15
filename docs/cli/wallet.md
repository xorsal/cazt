# Wallet Operations

Account and wallet management commands for creating, deploying, and managing Aztec accounts.

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

### `create`

Create a new account by generating a secret key and computing its address. Does not deploy by default.

**Usage:**
```bash
cazt wallet create [options]
```

**Arguments:** None

**Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `--type <type>` | `schnorr` | Account type (schnorr, ecdsa-k, ecdsa-r) |
| `--salt <salt>` | `0` | Salt for address derivation |
| `--alias <name>` | - | Store key with this alias |
| `--deploy` | `false` | Deploy the account after creation |

**Examples:**

```bash
# Create a new account
cazt wallet create

# Create and store with alias
cazt wallet create --alias alice

# Create with custom salt
cazt wallet create --salt 1337

# Create and output as JSON
cazt --json wallet create
```

**Output (human-readable):**
```
Account Created
==================================================

Type:        schnorr
Address:     0x227e64df234b691f84d2af5726886c464ad8ec38456317d8246a8edcaa3fe6fa
Salt:        0x0000000000000000000000000000000000000000000000000000000000000000
Deployed:    No

Secret Key:  0x2239e4c3016dfe74d723691c59c50ecdd63a6f8e768105e7a0ef75420031fd0b

WARNING: SECURITY WARNING: Store the secret key securely. Anyone with access can control this account.
```

**Output (JSON):**
```json
{
  "secretKey": "0x145b0c16821e4b51cb0626304a01290a96769ddded1fc772e8a7df71967ac4d1",
  "salt": "0x0000000000000000000000000000000000000000000000000000000000000000",
  "address": "0x134d3004f5cb612805bec65fd9fd3719fd2d8959411b6acf35ef859cb5b57484",
  "type": "schnorr",
  "deployed": false,
  "warning": "SECURITY WARNING: Store the secret key securely. Anyone with access can control this account."
}
```

**Notes:**
- Each call generates a new random secret key
- Account must be deployed before it can send transactions
- ECDSA types are not yet implemented
- Related commands: `wallet deploy`, `key generate`

---

### `deploy`

Deploy an account contract to the network.

**Usage:**
```bash
cazt wallet deploy <secret> [options]
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<secret>` | Yes | Secret key (64-character hex) |

**Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `--type <type>` | `schnorr` | Account type (schnorr, ecdsa-k, ecdsa-r) |
| `--salt <salt>` | `0` | Salt for address derivation |

**Examples:**

```bash
# Deploy an account
cazt --devnet wallet deploy 0x2bd806c97f0e00af1a1fc3328fa763a9269723c8db8fac4f93af71db186d6e90

# Deploy with custom salt
cazt --devnet wallet deploy 0x2bd806c97f0e00af1a1fc3328fa763a9269723c8db8fac4f93af71db186d6e90 --salt 1337

# Using passphrase workflow
SECRET=$(cazt --json key from-passphrase "alice" | jq -r .secretKey)
cazt --devnet wallet deploy $SECRET
```

**Output (human-readable):**
```
Account Deployed
==================================================

Address:      0x248e6428341065567b5239864980d36f2bbd0959bc5e5335a8113bc07155d0e2
Tx Hash:      0x1234567890abcdef...
Block Number: 12345
Status:       success
```

**Output (JSON):**
```json
{
  "address": "0x248e6428341065567b5239864980d36f2bbd0959bc5e5335a8113bc07155d0e2",
  "txHash": "0x1234567890abcdef...",
  "blockNumber": 12345,
  "status": "success"
}
```

**Notes:**
- Requires network connection
- Salt must match the one used to derive the address
- Related commands: `wallet create`, `wallet info`

---

### `info`

Show account details including deployment status.

**Usage:**
```bash
cazt wallet info <address>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<address>` | Yes | Account address to query |

**Options:** None (uses global options only)

**Examples:**

```bash
# Check account info
cazt --devnet wallet info 0x248e6428341065567b5239864980d36f2bbd0959bc5e5335a8113bc07155d0e2

# Output as JSON
cazt --json --devnet wallet info 0x248e6428341065567b5239864980d36f2bbd0959bc5e5335a8113bc07155d0e2
```

**Output (not deployed):**
```
Account Info
==================================================

Address:     0x248e6428341065567b5239864980d36f2bbd0959bc5e5335a8113bc07155d0e2
Deployed:    No

Note: Account contract not deployed yet.
Use `cazt wallet deploy` to deploy.
```

**Output (deployed):**
```
Account Info
==================================================

Address:         0x248e6428341065567b5239864980d36f2bbd0959bc5e5335a8113bc07155d0e2
Deployed:        Yes
Contract Class:  0x1234...
Salt:            0x0000...
Deployer:        0x5678...
```

**Output (JSON - not deployed):**
```json
{
  "address": "0x248e6428341065567b5239864980d36f2bbd0959bc5e5335a8113bc07155d0e2",
  "deployed": false
}
```

**Output (JSON - deployed):**
```json
{
  "address": "0x248e6428341065567b5239864980d36f2bbd0959bc5e5335a8113bc07155d0e2",
  "deployed": true,
  "contractClassId": "0x1234...",
  "salt": "0x0000...",
  "deployer": "0x5678...",
  "publicKeys": {
    "masterNullifierPublicKey": "...",
    "masterIncomingViewingPublicKey": "...",
    "masterOutgoingViewingPublicKey": "...",
    "masterTaggingPublicKey": "..."
  }
}
```

**Notes:**
- Use this to check if an account exists on the network
- Related commands: `wallet deploy`, `contract info`

---

### `address`

Compute an account address from a secret key without deploying.

**Usage:**
```bash
cazt wallet address <secret> [options]
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<secret>` | Yes | Secret key (64-character hex) |

**Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `--type <type>` | `schnorr` | Account type |
| `--salt <salt>` | `0` | Salt for address derivation |

**Examples:**

```bash
# Compute address
cazt wallet address 0x2bd806c97f0e00af1a1fc3328fa763a9269723c8db8fac4f93af71db186d6e90

# With custom salt
cazt wallet address 0x2bd806c97f0e00af1a1fc3328fa763a9269723c8db8fac4f93af71db186d6e90 --salt 1337

# Output as JSON
cazt --json wallet address 0x2bd806c97f0e00af1a1fc3328fa763a9269723c8db8fac4f93af71db186d6e90
```

**Output (human-readable):**
```
Computed Address
==================================================

Type:    schnorr
Address: 0x248e6428341065567b5239864980d36f2bbd0959bc5e5335a8113bc07155d0e2
Salt:    0x0000000000000000000000000000000000000000000000000000000000000000
```

**Output (JSON):**
```json
{
  "address": "0x248e6428341065567b5239864980d36f2bbd0959bc5e5335a8113bc07155d0e2",
  "salt": "0x0000000000000000000000000000000000000000000000000000000000000000",
  "type": "schnorr"
}
```

**Notes:**
- Same as `key derive-address` but returns wallet-focused output
- Different salts produce different addresses
- Related commands: `key derive-address`, `wallet deploy`

---

### `register`

Register an account with a PXE (Private eXecution Environment).

**Usage:**
```bash
cazt wallet register <address> --secret <secret> [options]
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<address>` | Yes | Account address to register |

**Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `--secret <secret>` | Required | Secret key for the account |
| `--partial-address <addr>` | - | Partial address (if known) |

**Examples:**

```bash
# Register account with PXE
cazt --sandbox wallet register 0x248e6428341065567b5239864980d36f2bbd0959bc5e5335a8113bc07155d0e2 \
  --secret 0x2bd806c97f0e00af1a1fc3328fa763a9269723c8db8fac4f93af71db186d6e90
```

**Output (human-readable):**
```
Account Registered
==================================================

Address: 0x248e6428341065567b5239864980d36f2bbd0959bc5e5335a8113bc07155d0e2
Status:  Registered with PXE
```

**Notes:**
- Requires PXE connection (use `--sandbox` or configure PXE URL)
- Address must match the derived address from the secret
- Related commands: `wallet list`

---

### `list`

List known accounts.

**Usage:**
```bash
cazt wallet list [options]
```

**Arguments:** None

**Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `--local` | `false` | List only locally stored keys (no network) |

**Examples:**

```bash
# List local keys only (no network required)
cazt wallet list --local

# List accounts from PXE (requires network)
cazt --sandbox wallet list

# Output as JSON
cazt --json wallet list --local
```

**Output (human-readable):**
```
Local Accounts
==================================================

Alias:    alice
Address:  0x248e6428341065567b5239864980d36f2bbd0959bc5e5335a8113bc07155d0e2
Type:     schnorr
----------------------------------------------------------------------

Total: 1 account(s)
```

**Output (JSON):**
```json
{
  "source": "local",
  "accounts": [
    {
      "alias": "alice",
      "address": "0x248e6428341065567b5239864980d36f2bbd0959bc5e5335a8113bc07155d0e2",
      "type": "schnorr"
    }
  ]
}
```

**Notes:**
- Without `--local`, requires PXE connection
- Related commands: `key list`, `key import`

---

### `balance`

Show token balances for an account.

**Usage:**
```bash
cazt wallet balance <address> --token <contract> [options]
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<address>` | Yes | Account address to check |

**Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `--token <contract>` | Required | Token contract address |
| `--private` | `false` | Check private balance (requires PXE) |
| `--public` | `false` | Check public balance |

**Examples:**

```bash
# Check public token balance
cazt --devnet wallet balance 0x248e... --token 0xabc... --public

# Check private balance (requires PXE and secret)
cazt --sandbox wallet balance 0x248e... --token 0xabc... --private
```

**Output (human-readable):**
```
Token Balance
==================================================

Account:  0x248e6428341065567b5239864980d36f2bbd0959bc5e5335a8113bc07155d0e2
Token:    0xabc...
Balance:  1000
Type:     public
```

**Output (JSON):**
```json
{
  "account": "0x248e...",
  "token": "0xabc...",
  "balance": "1000",
  "type": "public"
}
```

**Notes:**
- Private balances require PXE connection with registered account
- Public balances can be queried from any node
- Related commands: `contract view`

---

### `vanity`

Generate a vanity address with a specific prefix.

**Usage:**
```bash
cazt wallet vanity <prefix> [options]
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<prefix>` | Yes | Hex prefix to search for (without 0x) |

**Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `--suffix <suffix>` | - | Also match this suffix |
| `--type <type>` | `schnorr` | Account type |
| `--max-attempts <n>` | `1000000` | Maximum attempts before giving up |

**Examples:**

```bash
# Find address starting with 0x0
cazt wallet vanity 0 --max-attempts 1000

# Find address starting with 0xdead
cazt wallet vanity dead --max-attempts 100000

# Output as JSON
cazt --json wallet vanity 0 --max-attempts 1000
```

**Output (human-readable):**
```
Searching for address starting with "0x0"...
This may take a while depending on the prefix length.

Vanity Address Found!
==================================================

Address:    0x01c0af397af4cb1e83672be72d04c4b098f3c4655770c5ba5fbfdc19abf36d41
Secret Key: 0x3023ebabf5aa88984d1015126335f7f2deba5dd2c4205775650c01e5239b89d2
Salt:       0x0000000000000000000000000000000000000000000000000000000000000000
Type:       schnorr

Found after 7 attempts in 0.92s

WARNING: Store the secret key securely!
```

**Output (JSON):**
```json
{
  "address": "0x01c0af397af4cb1e83672be72d04c4b098f3c4655770c5ba5fbfdc19abf36d41",
  "secretKey": "0x3023ebabf5aa88984d1015126335f7f2deba5dd2c4205775650c01e5239b89d2",
  "salt": "0x0000000000000000000000000000000000000000000000000000000000000000",
  "type": "schnorr",
  "attempts": 7
}
```

**Notes:**
- Longer prefixes take exponentially longer to find
- Each hex character adds ~16x search time
- Returns error if max attempts reached without finding a match
- Related commands: `wallet create`

---

## Authwit Commands

Authorization witness operations for delegating actions.

### `authwit create`

Create an authorization witness for delegating actions to another account.

**Usage:**
```bash
cazt wallet authwit create <messageHash> --secret <secret>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<messageHash>` | Yes | Message hash to authorize (Fr field element) |

**Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `--secret <secret>` | Required | Secret key to sign with |

**Examples:**

```bash
# Create authorization witness
cazt wallet authwit create 0x1234567890abcdef... --secret 0x2bd806c97f0e00af1a1fc3328fa763a9269723c8db8fac4f93af71db186d6e90
```

**Output (human-readable):**
```
Authorization Witness Created
==================================================

Message Hash: 0x1234567890abcdef...
Witness:      0xabcd...
```

**Output (JSON):**
```json
{
  "messageHash": "0x1234567890abcdef...",
  "witness": "0xabcd..."
}
```

**Notes:**
- Used for token approvals and delegations
- The witness proves authorization without revealing the secret
- Related commands: `contract send`
