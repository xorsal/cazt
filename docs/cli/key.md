# Key Management

Key management commands for generating, deriving, signing, and storing cryptographic keys used in Aztec accounts.

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

### `generate`

Generate a new random secret key. This is the starting point for creating a new Aztec account.

**Usage:**
```bash
cazt key generate
```

**Arguments:** None

**Options:** None (uses global options only)

**Examples:**

```bash
# Generate a new secret key
cazt key generate

# Generate and output as JSON (useful for scripting)
cazt --json key generate
```

**Output (human-readable):**
```
Generated Secret Key
==================================================

Secret Key: 0xf5151ca62e68b578fd4783f2a6d0bf0fc927677925a373bb3fd70f3351c10005

WARNING: SECURITY WARNING: Store this secret key securely. Anyone with access to it can control your account and funds.
```

**Output (JSON):**
```json
{
  "secretKey": "0x95157aaa14f2dc2c99eb4bd18e2a3ac1cfbdfad66abc568e0ae967f2896f02ac",
  "warning": "SECURITY WARNING: Store this secret key securely. Anyone with access to it can control your account and funds."
}
```

**Notes:**
- Each call generates a different random key
- Store the secret key securely - it cannot be recovered
- Related commands: `key derive-address`, `wallet create`

---

### `from-passphrase`

Derive a deterministic secret key from a passphrase using SHA256 hashing. **For testing purposes only.**

**Usage:**
```bash
cazt key from-passphrase <passphrase>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<passphrase>` | Yes | Any string to derive the key from |

**Options:** None (uses global options only)

**Examples:**

```bash
# Derive key from passphrase
cazt key from-passphrase "alice"

# Use in scripts
cazt --json key from-passphrase "alice"

# Derive key for testing accounts
cazt key from-passphrase "test-account-1"
```

**Output (human-readable):**
```
Secret Key from Passphrase
══════════════════════════
Passphrase: alice
Secret Key: 0x2bd806c97f0e00af1a1fc3328fa763a9269723c8db8fac4f93af71db186d6e90
Address:    0x248e6428341065567b5239864980d36f2bbd0959bc5e5335a8113bc07155d0e2

⚠️  WARNING: This uses simple hashing without key stretching.
   NOT SECURE for production use - for testing only!
```

**Output (JSON):**
```json
{
  "passphrase": "alice",
  "secretKey": "0x2bd806c97f0e00af1a1fc3328fa763a9269723c8db8fac4f93af71db186d6e90",
  "address": "0x248e6428341065567b5239864980d36f2bbd0959bc5e5335a8113bc07155d0e2",
  "warning": "Insecure derivation - for testing only"
}
```

**Notes:**
- Same passphrase always produces the same key (deterministic)
- Uses simple SHA256 - NOT secure for production
- Useful for testing with reproducible accounts
- Related commands: `key generate`, `wallet deploy`

---

### `derive-keys`

Derive all 4 master keys from a secret key. Shows the complete key hierarchy used in Aztec accounts.

**Usage:**
```bash
cazt key derive-keys <secret>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<secret>` | Yes | Secret key (64-character hex string with 0x prefix) |

**Options:** None (uses global options only)

**Examples:**

```bash
# Derive all master keys
cazt key derive-keys 0x2bd806c97f0e00af1a1fc3328fa763a9269723c8db8fac4f93af71db186d6e90

# Output as JSON
cazt --json key derive-keys 0x2bd806c97f0e00af1a1fc3328fa763a9269723c8db8fac4f93af71db186d6e90
```

**Output (human-readable):**
```
Derived Keys
==================================================

Secret Key (input):
  0x2bd806c97f0e00af1a1fc3328fa763a9269723c8db8fac4f93af71db186d6e90

Master Nullifier Key (nsk_m):
  Secret:  0x2869611c7c125bacac745063403240ec30bb7e89484e8012ecbbca4088cb63db
  Public:  0x1d68e308b3412054a8a01181a7055eb310885e512f52eb96a211eae0db5dd3bc,0x274351409371488f407172d6adef668edbcdb8ddbc8fec4e9fba5fa688886997

Master Incoming Viewing Key (ivsk_m):
  Secret:  0x03ebe648b2f8ddf00c28c9abea3a26d5e8be840193d4314f12e04e2ebe448ed9
  Public:  0x1d04c06ae108d30fa7bfb9ef198a5c0bdcf3b7c3f6ef4999367cd53af98fdabd,0x2bfa38cfdd453a98a099571bfa3d4066ee464868152f709a4c813363d30c4f3f

Master Outgoing Viewing Key (ovsk_m):
  Secret:  0x205c7d2f9128146073a6a5835b44c7b123ab986cf87821645aa8c038ee5ad7fe
  Public:  0x112577bfcda2a10d184dc07de790d4ede7265699d94ce37050fad437b4eaeddc,0x1c0acf612add9c0cc1b93484fadbf3cb6b4e5dd31253c0c2b9be2a6193fd1246

Master Tagging Key (tsk_m):
  Secret:  0x2a2c789fde9b77e86a519903e40ede3f9d3484e18ff8184f2f2f2ae049c82410
  Public:  0x0c653a96cd27cd1244325a478388bda97ec0263f92d0531d2a79bfbfb2bf97a0,0x2668f600a326a037ad43c9a316aef0ca870448015c8de7554f7914ff3b9ca70f

Public Keys Hash:
  0x19bce8da7bc5de4709dedd18f5e6f9f293e5efa298bbea792b25e9485ea1574e
```

**Output (JSON):**
```json
{
  "secretKey": "0x2bd806c97f0e00af1a1fc3328fa763a9269723c8db8fac4f93af71db186d6e90",
  "masterNullifierSecretKey": "0x2869611c7c125bacac745063403240ec30bb7e89484e8012ecbbca4088cb63db",
  "masterNullifierPublicKey": "0x1d68e308b3412054a8a01181a7055eb310885e512f52eb96a211eae0db5dd3bc,0x274351409371488f407172d6adef668edbcdb8ddbc8fec4e9fba5fa688886997",
  "masterIncomingViewingSecretKey": "0x03ebe648b2f8ddf00c28c9abea3a26d5e8be840193d4314f12e04e2ebe448ed9",
  "masterIncomingViewingPublicKey": "0x1d04c06ae108d30fa7bfb9ef198a5c0bdcf3b7c3f6ef4999367cd53af98fdabd,0x2bfa38cfdd453a98a099571bfa3d4066ee464868152f709a4c813363d30c4f3f",
  "masterOutgoingViewingSecretKey": "0x205c7d2f9128146073a6a5835b44c7b123ab986cf87821645aa8c038ee5ad7fe",
  "masterOutgoingViewingPublicKey": "0x112577bfcda2a10d184dc07de790d4ede7265699d94ce37050fad437b4eaeddc,0x1c0acf612add9c0cc1b93484fadbf3cb6b4e5dd31253c0c2b9be2a6193fd1246",
  "masterTaggingSecretKey": "0x2a2c789fde9b77e86a519903e40ede3f9d3484e18ff8184f2f2f2ae049c82410",
  "masterTaggingPublicKey": "0x0c653a96cd27cd1244325a478388bda97ec0263f92d0531d2a79bfbfb2bf97a0,0x2668f600a326a037ad43c9a316aef0ca870448015c8de7554f7914ff3b9ca70f",
  "publicKeysHash": "0x19bce8da7bc5de4709dedd18f5e6f9f293e5efa298bbea792b25e9485ea1574e"
}
```

**Notes:**
- Public keys are in Grumpkin point format (x,y)
- The 4 master keys control different aspects of the account:
  - **Nullifier Key**: Used to nullify notes (spend funds)
  - **Incoming Viewing Key**: Decrypt notes sent to you
  - **Outgoing Viewing Key**: Decrypt notes you sent
  - **Tagging Key**: Used for note discovery
- Related commands: `key derive-address`

---

### `derive-address`

Compute the account address from a secret key without deploying. Useful to know your address before deployment.

**Usage:**
```bash
cazt key derive-address <secret> [options]
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<secret>` | Yes | Secret key (64-character hex string with 0x prefix) |

**Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `--salt <salt>` | `0` | Salt for address derivation (hex or decimal) |

**Examples:**

```bash
# Derive address with default salt (0)
cazt key derive-address 0x2bd806c97f0e00af1a1fc3328fa763a9269723c8db8fac4f93af71db186d6e90

# Derive address with custom salt
cazt key derive-address 0x2bd806c97f0e00af1a1fc3328fa763a9269723c8db8fac4f93af71db186d6e90 --salt 1337
cazt key derive-address 0x2bd806c97f0e00af1a1fc3328fa763a9269723c8db8fac4f93af71db186d6e90 --salt 0x539

# Output as JSON
cazt --json key derive-address 0x2bd806c97f0e00af1a1fc3328fa763a9269723c8db8fac4f93af71db186d6e90
```

**Output (human-readable):**
```
Derived Address
==================================================

Address:          0x248e6428341065567b5239864980d36f2bbd0959bc5e5335a8113bc07155d0e2
Salt:             0x0000000000000000000000000000000000000000000000000000000000000000
Partial Address:  N/A (use full address)
Public Keys Hash: 0x19bce8da7bc5de4709dedd18f5e6f9f293e5efa298bbea792b25e9485ea1574e

Note: This address is for a Schnorr account contract.
The account must be deployed before it can send transactions.
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
- Different salts produce different addresses from the same secret
- Salt accepts both decimal (1337) and hex (0x539) formats
- Address is deterministic: same secret + salt = same address
- Related commands: `wallet deploy`, `wallet address`

---

### `sign`

Sign a message using Schnorr signature scheme.

**Usage:**
```bash
cazt key sign <message> <secret>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<message>` | Yes | Message to sign (UTF-8 string) |
| `<secret>` | Yes | Secret key (64-character hex string with 0x prefix) |

**Options:** None (uses global options only)

**Examples:**

```bash
# Sign a message
cazt key sign "Hello Aztec" 0x2bd806c97f0e00af1a1fc3328fa763a9269723c8db8fac4f93af71db186d6e90

# Sign and output as JSON
cazt --json key sign "Hello Aztec" 0x2bd806c97f0e00af1a1fc3328fa763a9269723c8db8fac4f93af71db186d6e90
```

**Output (human-readable):**
```
Schnorr Signature
==================================================

Message:    Hello Aztec
Signature:  0x2d99def9d818b5a0d94b587f4fbd64f19ffdf6170b6c8755623c5b156b86942696ac16c5deb4a594dd2863164ccd679930b36532be7c2426cff0ebcb24699efe
Public Key: 0x1d04c06ae108d30fa7bfb9ef198a5c0bdcf3b7c3f6ef4999367cd53af98fdabd,0x2bfa38cfdd453a98a099571bfa3d4066ee464868152f709a4c813363d30c4f3f
```

**Output (JSON):**
```json
{
  "message": "Hello Aztec",
  "signature": "0x2d99def9d818b5a0d94b587f4fbd64f19ffdf6170b6c8755623c5b156b86942696ac16c5deb4a594dd2863164ccd679930b36532be7c2426cff0ebcb24699efe",
  "publicKey": "0x1d04c06ae108d30fa7bfb9ef198a5c0bdcf3b7c3f6ef4999367cd53af98fdabd,0x2bfa38cfdd453a98a099571bfa3d4066ee464868152f709a4c813363d30c4f3f"
}
```

**Notes:**
- Signature is 64 bytes (128 hex characters)
- Public key is derived from the signing key (ivsk_m)
- Related commands: `key verify`

---

### `verify`

Verify a Schnorr signature against a public key.

**Usage:**
```bash
cazt key verify <message> --signature <sig> --pubkey <key>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<message>` | Yes | Original message that was signed |

**Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `--signature <sig>` | Required | Signature to verify (128-character hex) |
| `--pubkey <key>` | Required | Public key in format "x,y" |

**Examples:**

```bash
# First sign a message
cazt --json key sign "Hello" 0x2bd806c97f0e00af1a1fc3328fa763a9269723c8db8fac4f93af71db186d6e90

# Then verify the signature
cazt key verify "Hello" \
  --signature 0x2d99def9d818b5a0d94b587f4fbd64f19ffdf6170b6c8755623c5b156b86942696ac16c5deb4a594dd2863164ccd679930b36532be7c2426cff0ebcb24699efe \
  --pubkey "0x1d04c06ae108d30fa7bfb9ef198a5c0bdcf3b7c3f6ef4999367cd53af98fdabd,0x2bfa38cfdd453a98a099571bfa3d4066ee464868152f709a4c813363d30c4f3f"
```

**Output (valid signature):**
```
Signature Verification
==================================================

Message:    Hello
Public Key: 0x1d04c06ae108d30fa7bfb9ef198a5c0bdcf3b7c3f6ef4999367cd53af98fdabd,0x2bfa38cfdd453a98a099571bfa3d4066ee464868152f709a4c813363d30c4f3f
Valid:      YES ✓
```

**Output (invalid signature):**
```
Signature Verification
==================================================

Message:    Wrong message
Public Key: 0x1d04c06ae108d30fa7bfb9ef198a5c0bdcf3b7c3f6ef4999367cd53af98fdabd,0x2bfa38cfdd453a98a099571bfa3d4066ee464868152f709a4c813363d30c4f3f
Valid:      NO ✗
```

**Notes:**
- Exit code is 0 for valid, 1 for invalid
- Public key format is "x,y" (Grumpkin point coordinates)
- Related commands: `key sign`

---

### `import`

Import a secret key to local storage for later use.

**Usage:**
```bash
cazt key import <secret> [options]
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<secret>` | Yes | Secret key to import (64-character hex) |

**Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `--alias <name>` | Required | Alias name for the key |
| `--type <type>` | `schnorr` | Account type (schnorr, ecdsa-k, ecdsa-r) |

**Examples:**

```bash
# Import a key with alias
cazt key import 0x2bd806c97f0e00af1a1fc3328fa763a9269723c8db8fac4f93af71db186d6e90 --alias alice

# Import with JSON output
cazt --json key import 0x2bd806c97f0e00af1a1fc3328fa763a9269723c8db8fac4f93af71db186d6e90 --alias bob
```

**Output (human-readable):**
```
Key Imported Successfully
==================================================

Alias:   alice
Address: 0x248e6428341065567b5239864980d36f2bbd0959bc5e5335a8113bc07155d0e2
Type:    schnorr
```

**Notes:**
- Keys are stored in `~/.cazt/keys.json`
- Alias must be unique
- Related commands: `key export`, `key list`

---

### `export`

Export a stored secret key. Requires explicit confirmation flag for security.

**Usage:**
```bash
cazt key export <alias> --yes-i-understand-the-risks
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<alias>` | Yes | Alias of the key to export |

**Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `--yes-i-understand-the-risks` | Required | Confirmation flag |

**Examples:**

```bash
# Export a key (requires confirmation flag)
cazt key export alice --yes-i-understand-the-risks

# This will fail without the flag
cazt key export alice  # Error: requires confirmation
```

**Output (human-readable):**
```
Exported Key
==================================================

Alias:      alice
Secret Key: 0x2bd806c97f0e00af1a1fc3328fa763a9269723c8db8fac4f93af71db186d6e90
Address:    0x248e6428341065567b5239864980d36f2bbd0959bc5e5335a8113bc07155d0e2

⚠️  WARNING: Never share this secret key. Anyone with it can control your account.
```

**Notes:**
- The confirmation flag is required to prevent accidental exposure
- Related commands: `key import`, `key list`

---

### `list`

List all stored keys.

**Usage:**
```bash
cazt key list
```

**Arguments:** None

**Options:** None (uses global options only)

**Examples:**

```bash
# List all stored keys
cazt key list

# Output as JSON
cazt --json key list
```

**Output (human-readable):**
```
Stored Keys
======================================================================

Alias:    alice
Address:  0x248e6428341065567b5239864980d36f2bbd0959bc5e5335a8113bc07155d0e2
Type:     schnorr
Created:  2025-12-12T17:11:00.908Z
----------------------------------------------------------------------
Alias:    bob
Address:  0x1122cc8b80b7c78248a9801537897d121f0f1cca005c3909299dfee7e602f109
Type:     schnorr
Created:  2025-12-11T02:11:53.237Z
----------------------------------------------------------------------

Total: 2 key(s)
```

**Output (JSON):**
```json
{
  "keys": [
    {
      "alias": "alice",
      "address": "0x248e6428341065567b5239864980d36f2bbd0959bc5e5335a8113bc07155d0e2",
      "type": "schnorr",
      "created": "2025-12-12T17:11:00.908Z"
    }
  ],
  "total": 1
}
```

**Notes:**
- Secret keys are NOT shown in the list
- Use `key export` to reveal a secret key
- Related commands: `key import`, `key export`

---

## Keystore Commands

Encrypted keystore operations for secure key storage.

### `keystore create`

Create a password-encrypted keystore file.

**Usage:**
```bash
cazt key keystore create <secret> --password <password> [options]
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<secret>` | Yes | Secret key to encrypt |

**Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `--password <password>` | Required | Encryption password |
| `--output <path>` | `./keystore.json` | Output file path |

**Examples:**

```bash
# Create encrypted keystore
cazt key keystore create 0x2bd806c97f0e00af1a1fc3328fa763a9269723c8db8fac4f93af71db186d6e90 \
  --password "my-secure-password" \
  --output ./alice-keystore.json
```

**Output (human-readable):**
```
Keystore Created
==================================================

Path:    ./alice-keystore.json
Address: 0x248e6428341065567b5239864980d36f2bbd0959bc5e5335a8113bc07155d0e2

The keystore is encrypted with your password.
Use 'cazt key keystore unlock' to decrypt.
```

**Notes:**
- Uses AES-256-GCM encryption
- Password is required to decrypt
- Related commands: `keystore unlock`

---

### `keystore unlock`

Decrypt and reveal the secret key from a keystore file.

**Usage:**
```bash
cazt key keystore unlock <file> --password <password>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<file>` | Yes | Path to keystore file |

**Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `--password <password>` | Required | Decryption password |

**Examples:**

```bash
# Unlock keystore
cazt key keystore unlock ./alice-keystore.json --password "my-secure-password"

# Output as JSON
cazt --json key keystore unlock ./alice-keystore.json --password "my-secure-password"
```

**Output (human-readable):**
```
Keystore Unlocked
==================================================

Secret Key: 0x2bd806c97f0e00af1a1fc3328fa763a9269723c8db8fac4f93af71db186d6e90
Address:    0x248e6428341065567b5239864980d36f2bbd0959bc5e5335a8113bc07155d0e2

⚠️  WARNING: Never share this secret key.
```

**Output (JSON):**
```json
{
  "secretKey": "0x2bd806c97f0e00af1a1fc3328fa763a9269723c8db8fac4f93af71db186d6e90",
  "address": "0x248e6428341065567b5239864980d36f2bbd0959bc5e5335a8113bc07155d0e2"
}
```

**Notes:**
- Wrong password returns "Invalid password" error
- Related commands: `keystore create`
