# Utility/Conversion Commands

Low-level utility commands for hashing, type conversion, encoding/decoding, and cryptographic operations.

## Global Options

All commands support these global options:

| Option | Description |
|--------|-------------|
| `--json` | Output in JSON format |

---

## Hash Commands

Cryptographic hash functions commonly used in Aztec.

### `hash zero`

Print the zero hash (all zeros).

**Usage:**
```bash
cazt cast hash zero
```

**Output:**
```
0x0000000000000000000000000000000000000000000000000000000000000000
```

---

### `hash keccak`

Compute Keccak-256 hash (Ethereum-compatible).

**Usage:**
```bash
cazt cast hash keccak <data>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<data>` | Yes | Data to hash (hex with 0x prefix or UTF-8 string) |

**Examples:**

```bash
# Hash hex data
cazt cast hash keccak 0x1234567890abcdef

# Hash UTF-8 string
cazt cast hash keccak "hello world"

# Output as JSON
cazt --json cast hash keccak "hello"
```

**Output:**
```
0x47173285a8d7341e5e972fc677286384f802f8ef42a5ec5f03bbfa254cb01fad
```

**Output (JSON):**
```json
{
  "input": "hello world",
  "hash": "0x47173285a8d7341e5e972fc677286384f802f8ef42a5ec5f03bbfa254cb01fad"
}
```

---

### `hash sha256`

Compute SHA-256 hash.

**Usage:**
```bash
cazt cast hash sha256 <data>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<data>` | Yes | Data to hash (hex with 0x prefix or UTF-8 string) |

**Examples:**

```bash
# Hash UTF-8 string
cazt cast hash sha256 "hello world"

# Hash hex data
cazt cast hash sha256 0xdeadbeef
```

**Output:**
```
0xb94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9
```

---

### `hash poseidon2`

Compute Poseidon2 hash (Aztec's native hash function for circuits).

**Usage:**
```bash
cazt cast hash poseidon2 <fields>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<fields>` | Yes | JSON array of field values |

**Examples:**

```bash
# Hash single field
cazt cast hash poseidon2 '["0x1234"]'

# Hash multiple fields
cazt cast hash poseidon2 '["0x1", "0x2", "0x3"]'

# Output as JSON
cazt --json cast hash poseidon2 '["0x1", "0x2"]'
```

**Output:**
```
0x1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890
```

**Notes:**
- Poseidon2 is the primary hash in Aztec circuits
- More efficient than Keccak in zero-knowledge proofs

---

### `hash pedersen`

Compute Pedersen hash.

**Usage:**
```bash
cazt cast hash pedersen <fields>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<fields>` | Yes | JSON array of field values |

**Examples:**

```bash
# Hash fields
cazt cast hash pedersen '["0x1234", "0x5678"]'
```

**Output:**
```
0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890
```

---

### `hash secret`

Compute the hash of a secret (for L1→L2 messaging).

**Usage:**
```bash
cazt cast hash secret <secret>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<secret>` | Yes | Secret value (hex with 0x prefix) |

**Examples:**

```bash
# Compute secret hash for bridge messaging
cazt cast hash secret 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
```

**Output:**
```
0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890
```

**Notes:**
- Used when sending L1→L2 messages
- Related commands: `bridge send-l1-to-l2`

---

## Address Commands

Aztec address utilities.

### `address zero`

Print the zero address.

**Usage:**
```bash
cazt cast address zero
```

**Output:**
```
0x0000000000000000000000000000000000000000000000000000000000000000
```

---

### `address random`

Generate a random valid address.

**Usage:**
```bash
cazt cast address random
```

**Output:**
```
0x1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890
```

**Notes:**
- Address is random but valid (on Grumpkin curve)

---

### `address validate`

Validate address format (64 hex characters, 0x prefix).

**Usage:**
```bash
cazt cast address validate <address>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<address>` | Yes | Address to validate |

**Examples:**

```bash
cazt cast address validate 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
```

**Output:**
```
Valid
```

---

### `address is-valid`

Check if address is valid (format + on curve).

**Usage:**
```bash
cazt cast address is-valid <address>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<address>` | Yes | Address to check |

**Output:**
```
true
```

**Notes:**
- More thorough than `validate` - checks curve membership

---

### `address from-field`

Create an address from a field element.

**Usage:**
```bash
cazt cast address from-field <field>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<field>` | Yes | Field element (hex) |

---

### `address from-bigint`

Create an address from a bigint value.

**Usage:**
```bash
cazt cast address from-bigint <value>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<value>` | Yes | BigInt value |

---

### `address from-number`

Create an address from a number.

**Usage:**
```bash
cazt cast address from-number <value>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<value>` | Yes | Number value |

---

### `address to-point`

Convert an address to its Grumpkin point representation.

**Usage:**
```bash
cazt cast address to-point <address>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<address>` | Yes | Address to convert |

**Output:**
```json
{
  "x": "0x1234...",
  "y": "0x5678..."
}
```

---

## Ethereum Address Commands

Utilities for EVM/Ethereum addresses (20 bytes).

### `eth zero`

Print zero Ethereum address.

**Usage:**
```bash
cazt cast eth zero
```

**Output:**
```
0x0000000000000000000000000000000000000000
```

---

### `eth random`

Generate a random Ethereum address.

**Usage:**
```bash
cazt cast eth random
```

**Output:**
```
0x1234567890AbcdEF1234567890aBcDeF12345678
```

---

### `eth validate`

Validate Ethereum address format.

**Usage:**
```bash
cazt cast eth validate <address>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<address>` | Yes | ETH address to validate |

---

### `eth is-zero`

Check if Ethereum address is zero.

**Usage:**
```bash
cazt cast eth is-zero <address>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<address>` | Yes | ETH address to check |

**Output:**
```
false
```

---

### `eth from-field`

Create Ethereum address from field element.

**Usage:**
```bash
cazt cast eth from-field <field>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<field>` | Yes | Field element (lower 20 bytes used) |

---

### `eth to-field`

Convert Ethereum address to field element.

**Usage:**
```bash
cazt cast eth to-field <address>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<address>` | Yes | ETH address to convert |

---

## Field Commands

Field element utilities (Fr - the scalar field of BN254).

### `field random`

Generate a random field element.

**Usage:**
```bash
cazt cast field random
```

**Output:**
```
0x1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890
```

---

### `field from-string`

Convert string to field element.

**Usage:**
```bash
cazt cast field from-string <value>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<value>` | Yes | String to convert (hex, decimal, or UTF-8) |

**Examples:**

```bash
# From hex
cazt cast field from-string 0x1234

# From decimal
cazt cast field from-string 1337

# From UTF-8 passphrase
cazt cast field from-string "alice"
```

---

### `field to-string`

Convert field element to string.

**Usage:**
```bash
cazt cast field to-string <field>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<field>` | Yes | Field element to convert |

---

### `field from-buffer`

Create field from buffer.

**Usage:**
```bash
cazt cast field from-buffer <buffer>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<buffer>` | Yes | Hex buffer (0x prefix) |

---

### `field to-buffer`

Convert field to buffer.

**Usage:**
```bash
cazt cast field to-buffer <field>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<field>` | Yes | Field element to convert |

---

### `field from-bigint`

Create field from bigint.

**Usage:**
```bash
cazt cast field from-bigint <value>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<value>` | Yes | BigInt value (decimal or hex) |

---

### `field to-bigint`

Convert field to bigint.

**Usage:**
```bash
cazt cast field to-bigint <field>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<field>` | Yes | Field element to convert |

---

### `field is-zero`

Check if field is zero.

**Usage:**
```bash
cazt cast field is-zero <field>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<field>` | Yes | Field element to check |

**Output:**
```
false
```

---

### `field equals`

Compare two field elements.

**Usage:**
```bash
cazt cast field equals <a> <b>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<a>` | Yes | First field element |
| `<b>` | Yes | Second field element |

**Output:**
```
true
```

---

## Selector Commands

Function, event, and note selector utilities.

### `selector compute`

Compute function selector from signature.

**Usage:**
```bash
cazt cast selector compute <sig>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<sig>` | Yes | Function signature (e.g., "transfer(address,uint256)") |

**Examples:**

```bash
# ERC20 transfer
cazt cast selector compute "transfer(address,uint256)"

# Aztec function
cazt cast selector compute "mint(AztecAddress,Field)"
```

**Output:**
```
0xa9059cbb
```

---

### `selector event`

Compute event selector.

**Usage:**
```bash
cazt cast selector event <sig>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<sig>` | Yes | Event signature |

---

### `selector note`

Compute note selector.

**Usage:**
```bash
cazt cast selector note <sig>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<sig>` | Yes | Note type signature |

---

### `selector from-field`

Create selector from field element.

**Usage:**
```bash
cazt cast selector from-field <field>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<field>` | Yes | Field element |

---

### `selector from-string`

Create selector from hex string.

**Usage:**
```bash
cazt cast selector from-string <hex>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<hex>` | Yes | Hex string (4 bytes) |

---

### `selector empty`

Get the empty selector.

**Usage:**
```bash
cazt cast selector empty
```

**Output:**
```
0x00000000
```

---

## ABI Commands

ABI encoding and decoding.

### `abi encode`

ABI encode arguments.

**Usage:**
```bash
cazt cast abi encode <params>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<params>` | Yes | JSON with `abi` (type array) and `args` (values) |

**Examples:**

```bash
# Encode address and uint256
cazt cast abi encode '{"abi": ["address", "uint256"], "args": ["0x1234...", "1000"]}'
```

---

### `abi decode`

ABI decode fields.

**Usage:**
```bash
cazt cast abi decode <params>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<params>` | Yes | JSON with `types` and `fields` |

**Examples:**

```bash
# Decode fields
cazt cast abi decode '{"types": ["address", "uint256"], "fields": ["0x1234...", "0x3e8"]}'
```

---

### `abi decode-sig`

Decode a function signature into its components.

**Usage:**
```bash
cazt cast abi decode-sig <params>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<params>` | Yes | JSON with signature to decode |

---

## Nullifier Commands

Nullifier computation utilities.

### `nullifier silo`

Silo a nullifier with a contract address.

**Usage:**
```bash
cazt cast nullifier silo --contract <addr> --nullifier <val>
```

**Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `--contract <addr>` | Required | Contract address |
| `--nullifier <val>` | Required | Nullifier to silo |

**Examples:**

```bash
cazt cast nullifier silo --contract 0x1234... --nullifier 0xabcd...
```

**Output:**
```
0x5678901234abcdef5678901234abcdef5678901234abcdef5678901234abcdef
```

**Notes:**
- Siloing binds a nullifier to a specific contract
- Prevents cross-contract nullifier collisions

---

### `nullifier l1-to-l2`

Compute nullifier for L1→L2 message consumption.

**Usage:**
```bash
cazt cast nullifier l1-to-l2
```

**Notes:**
- Used internally when consuming L1→L2 messages

---

## Note Commands

Note hash computation utilities.

### `note hash-nonce`

Compute note hash nonce.

**Usage:**
```bash
cazt cast note hash-nonce --nullifier-zero <val> --index <n>
```

**Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `--nullifier-zero <val>` | Required | First nullifier in transaction |
| `--index <n>` | Required | Note hash index in transaction |

---

### `note silo-hash`

Silo a note hash to a contract.

**Usage:**
```bash
cazt cast note silo-hash
```

**Notes:**
- Binds note hash to contract address

---

### `note unique-hash`

Compute unique note hash.

**Usage:**
```bash
cazt cast note unique-hash
```

---

## Artifact Commands

Contract artifact utilities.

### `artifact hash`

Compute artifact hash (contract class ID).

**Usage:**
```bash
cazt cast artifact hash <artifact>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<artifact>` | Yes | Artifact path or shortcut |

**Examples:**

```bash
# Hash built-in artifact
cazt cast artifact hash aztec:Token

# Hash local artifact
cazt cast artifact hash ./target/my_contract.json
```

---

### `artifact hash-preimage`

Compute artifact hash preimage.

**Usage:**
```bash
cazt cast artifact hash-preimage <artifact>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<artifact>` | Yes | Artifact path or shortcut |

---

### `artifact metadata-hash`

Compute metadata hash of artifact.

**Usage:**
```bash
cazt cast artifact metadata-hash <artifact>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<artifact>` | Yes | Artifact path or shortcut |

---

### `artifact function-hash`

Compute function artifact hash.

**Usage:**
```bash
cazt cast artifact function-hash <artifact> <function>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<artifact>` | Yes | Artifact path or shortcut |
| `<function>` | Yes | Function name |

---

### `artifact load`

Load and display contract artifact.

**Usage:**
```bash
cazt cast artifact load <artifact>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<artifact>` | Yes | Artifact path or shortcut |

---

### `artifact to-buffer`

Serialize artifact to buffer.

**Usage:**
```bash
cazt cast artifact to-buffer <artifact>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<artifact>` | Yes | Artifact path or shortcut |

---

### `artifact from-buffer`

Deserialize artifact from buffer.

**Usage:**
```bash
cazt cast artifact from-buffer <buffer>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<buffer>` | Yes | Hex buffer |

---

## Message Commands

Cross-chain message utilities.

### `message l2-to-l1-hash`

Compute L2→L1 message hash.

**Usage:**
```bash
cazt cast message l2-to-l1-hash <params>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<params>` | Yes | JSON with message parameters |

---

## Log Commands

Log utilities.

### `log silo-private`

Silo a private log tag.

**Usage:**
```bash
cazt cast log silo-private
```

---

### `log decrypt-private`

Decrypt a private log.

**Usage:**
```bash
cazt cast log decrypt-private
```

---

## Miscellaneous Commands

### `calldata-hash`

Hash public function calldata.

**Usage:**
```bash
cazt cast calldata-hash <calldata>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<calldata>` | Yes | JSON array of fields |

**Examples:**

```bash
cazt cast calldata-hash '["0x1234", "0x5678", "0x9abc"]'
```

---

### `var-args-hash`

Hash function arguments (for authwit computation).

**Usage:**
```bash
cazt cast var-args-hash <fields>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<fields>` | Yes | JSON array of fields |

**Examples:**

```bash
cazt cast var-args-hash '["0x1234", "0x5678"]'
```

**Notes:**
- Used when computing authorization witnesses
- Related commands: `wallet authwit create`

---

### `public-data-slot`

Compute public data tree slot for a storage variable.

**Usage:**
```bash
cazt cast public-data-slot --contract <addr> --slot <slot>
```

**Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `--contract <addr>` | Required | Contract address |
| `--slot <slot>` | Required | Storage slot |

**Examples:**

```bash
cazt cast public-data-slot --contract 0x1234... --slot 0x01
```

**Notes:**
- Computes the global slot in the public data tree
- Related commands: `query public`, `contract storage`

---

### `hash-vk`

Hash a verification key.

**Usage:**
```bash
cazt cast hash-vk <fields>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<fields>` | Yes | JSON array of VK fields |

---

### `buffer-as-fields`

Convert a buffer to field array.

**Usage:**
```bash
cazt cast buffer-as-fields <params>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<params>` | Yes | JSON with `buffer` (hex) and `targetLength` |

**Examples:**

```bash
cazt cast buffer-as-fields '{"buffer": "0x1234567890abcdef", "targetLength": 2}'
```
