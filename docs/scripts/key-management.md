# Key Management Workflow

## Context

Aztec uses a hierarchical key derivation system. From a single secret, you derive multiple keys that serve different purposes:

- **Nullifier key** - creates nullifiers to spend notes
- **Incoming viewing key** - decrypts notes sent to you
- **Outgoing viewing key** - decrypts notes you send
- **Tagging key** - enables efficient note discovery

This script walks through the complete key lifecycle: generation, derivation, storage, export, signing, and verification.

---

## Section 1: Generate a Secret Key

Everything starts with a secret. This is the root of your identity on Aztec.

[DEMO]

```bash
$ cazt key generate
```

Output:
```
Generated Secret Key
==================================================

Secret Key: 0x4a6f788661960f2b6de5991fd4032057fb13671748146f0e675e4b42394977dd

WARNING: SECURITY WARNING: Store this secret key securely. Anyone with access to it can control your account and funds.
```

[EMPHASIS] This secret key is 32 bytes of randomness. It's the only thing you need to backup. Everything else can be re-derived from it.

The warning is intentional—if someone obtains this key, they control your account.

---

## Section 2: Derive All Keys

From the secret, we derive the four master key pairs.

[DEMO]

```bash
$ cazt key derive-keys 0x4a6f788661960f2b6de5991fd4032057fb13671748146f0e675e4b42394977dd
```

Output:
```
Derived Keys
==================================================

Secret Key (input):
  0x1a0b2a1380646f01b59553695281c7fad2df7ecece5afe7d237c55ae494977dc

Master Nullifier Key (nsk_m):
  Secret:  0x208b85ede23f015f6201f00dcf74dfd26bb295de87dd274fcaa862b462473492
  Public:  0x15631e3790b370ec99763d576368dff9b845f65d13c78e271ac4e829e3153d58,0x22d5724a1c6441150c876e213d1e1f8c57c6dee3145506dcb1f175f24d3819c0

Master Incoming Viewing Key (ivsk_m):
  Secret:  0x2d865fd3bfadf3dadb09a7a9d0bc63a0a3491a8ce4f3ba15f364f16a53e42498
  Public:  0x059dc012f14efcd81b5ee2bbc00b000a2f402aef048e64713f42c9a0ffe78877,0x21e6070aeac771f689914e66a3752fdd8e73723aab2aba97708031693b78333f

Master Outgoing Viewing Key (ovsk_m):
  Secret:  0x1c141b786900689cc50f62e2793690a14bbd29142ce399ba8ac4fb8a12457452
  Public:  0x1355f61705d61c9ebc15c6edbc1891e0c6d0f2d36e0fb89f1c7b40294f8824f9,0x0b768eb379a1f93d904c01139c37fa94f1d3a9e8acfc71586077882ce2554526

Master Tagging Key (tsk_m):
  Secret:  0x0b8893b0c1ce4bd4aebaadbdf4ab4c7c85b1aafcedfcd02a509f0bfe039387cb
  Public:  0x2fccf5812645b649674b09576b7bc51f7ca03e0952c6d9268208e98da1fedbc1,0x11e4915843d44c725c568f91f1904765eabc30c33000d4347091a827a2e12334

Public Keys Hash:
  0x1d22a5b2f7112517d4d3d50a8d94d0a1dc06ca85c53e8858b01d15ae83c338a8
```

Each key pair has:
- A **secret** (keep private) - used for cryptographic operations
- A **public** (shareable) - can be given to others

[PAUSE]

The **Public Keys Hash** is important. It's a commitment to all your public keys, used in address derivation and contract interactions.

---

## Section 3: Derive Your Address

The address is where others send you funds or interact with you. It's derived from the secret plus a salt.

[DEMO]

```bash
$ cazt key derive-address 0x4a6f788661960f2b6de5991fd4032057fb13671748146f0e675e4b42394977dd
```

Output:
```
Derived Address
==================================================

Address:          0x0f3c4eb51bf22b8c65369e2464074eee4fd5463980591d584ba5a84ac5378b8b
Salt:             0x0000000000000000000000000000000000000000000000000000000000000000
Partial Address:  N/A (use full address)
Public Keys Hash: 0x1d22a5b2f7112517d4d3d50a8d94d0a1dc06ca85c53e8858b01d15ae83c338a8

Note: This address is for a Schnorr account contract.
The account must be deployed before it can send transactions.
```

The same secret with the same salt always produces the same address. This is deterministic—you can recover your address from just the secret.

The default salt is zero. You can use different salts to create multiple addresses from one secret.

---

## Section 4: Import Key to Local Storage

For convenience, you can store keys locally with an alias. This avoids passing the secret every time.

[DEMO]

```bash
$ cazt key import 0x4a6f788661960f2b6de5991fd4032057fb13671748146f0e675e4b42394977dd --alias demo-user
```

Output:
```
Key Imported Successfully
==================================================

Alias:   demo-user
Address: 0x0f3c4eb51bf22b8c65369e2464074eee4fd5463980591d584ba5a84ac5378b8b
Type:    schnorr

WARNING: The secret key is stored unencrypted.
Use "cazt key keystore create" for encrypted storage.
```

Now you can reference this key by "demo-user" instead of the full secret.

The warning reminds you that local storage is unencrypted. For production, use the keystore commands for password-protected storage.

---

## Section 5: List Stored Keys

See what keys are in your local storage:

[DEMO]

```bash
$ cazt key list
```

Output:
```
Stored Keys
======================================================================

Alias:    demo-user
Address:  0x0f3c4eb51bf22b8c65369e2464074eee4fd5463980591d584ba5a84ac5378b8b
Type:     schnorr
Created:  2025-12-12T17:30:00.000Z
----------------------------------------------------------------------

Total: 1 key(s)
```

Each entry shows:
- **Alias** - the name you gave it
- **Address** - the derived Aztec address
- **Type** - the account contract type (schnorr, ecdsa-k, ecdsa-r)
- **Created** - when it was imported

---

## Section 6: Export a Key

To move a key to another machine or backup, export it:

[DEMO]

```bash
$ cazt key export demo-user --yes-i-understand-the-risks
```

Output:
```
Exported Key
==================================================

Alias:      demo-user
Secret Key: 0x4a6f788661960f2b6de5991fd4032057fb13671748146f0e675e4b42394977dd
Address:    0x0f3c4eb51bf22b8c65369e2464074eee4fd5463980591d584ba5a84ac5378b8b
Type:       schnorr

WARNING: Keep this secret key secure!
```

[EMPHASIS] The flag `--yes-i-understand-the-risks` is intentionally long. Exporting a secret key is a security-sensitive operation—you should think twice before doing it.

With this secret, you can import on another machine and have the exact same account.

---

## Section 7: Sign a Message

Sign arbitrary messages with your key. Useful for proving ownership or creating off-chain attestations.

[DEMO]

```bash
$ cazt key sign "Hello Aztec" 0x4a6f788661960f2b6de5991fd4032057fb13671748146f0e675e4b42394977dd
```

Output:
```
Schnorr Signature
==================================================

Message:    Hello Aztec
Signature:  0x052dff41c76920e489daee51c64ccaa86ed589f935ab43b167ad1c1e5f9d4aa9c73b5f430b3370e1c42b4410c3c53e29a96633722c273c182c7d41947514ee51
Public Key: 0x059dc012f14efcd81b5ee2bbc00b000a2f402aef048e64713f42c9a0ffe78877,0x21e6070aeac771f689914e66a3752fdd8e73723aab2aba97708031693b78333f
```

The signature is a Schnorr signature. The public key shown is the signing key (derived from the incoming viewing secret key).

---

## Section 8: Verify a Signature

Anyone with the public key can verify the signature:

[DEMO]

```bash
$ cazt key verify "Hello Aztec" \
    --signature 0x052dff41c76920e489daee51c64ccaa86ed589f935ab43b167ad1c1e5f9d4aa9c73b5f430b3370e1c42b4410c3c53e29a96633722c273c182c7d41947514ee51 \
    --pubkey "0x059dc012f14efcd81b5ee2bbc00b000a2f402aef048e64713f42c9a0ffe78877,0x21e6070aeac771f689914e66a3752fdd8e73723aab2aba97708031693b78333f"
```

Output:
```
Signature Verification
==================================================

Message:    Hello Aztec
Public Key: 0x059dc012f14efcd81b5ee2bbc00b000a2f402aef048e64713f42c9a0ffe78877,0x21e6070aeac771f689914e66a3752fdd8e73723aab2aba97708031693b78333f
Valid:      YES
```

`Valid: YES` confirms the signature was created by the holder of the corresponding secret key.

---

## Recap

What we covered:

| Command | Purpose |
|---------|---------|
| `cazt key generate` | Create random secret |
| `cazt key derive-keys <secret>` | Show all derived keys |
| `cazt key derive-address <secret>` | Compute address |
| `cazt key import <secret> --alias <name>` | Store locally |
| `cazt key list` | View stored keys |
| `cazt key export <alias> --yes-i-understand-the-risks` | Retrieve secret |
| `cazt key sign <msg> <secret>` | Create signature |
| `cazt key verify <msg> --signature <sig> --pubkey <key>` | Verify signature |

The complete flow for moving keys between machines:

1. `cazt key export my-key --yes-i-understand-the-risks` → copy the secret
2. On new machine: `cazt key import <secret> --alias my-key`

---

## Commands Validated

| Command | Exists | Works | Notes |
|---------|--------|-------|-------|
| `key generate` | YES | YES | |
| `key derive-keys` | YES | YES | |
| `key derive-address` | YES | YES | |
| `key import` | YES | YES | Supports `--alias`, `--type` |
| `key list` | YES | YES | |
| `key export` | YES | YES | Requires long confirmation flag |
| `key sign` | YES | YES | |
| `key verify` | YES | YES | Requires `--signature`, `--pubkey` |

---

## Usability Notes

**Good:**
- Clear output formatting with section headers
- Warnings are prominent and helpful
- Deterministic derivation makes recovery straightforward

**Could improve:**
- `key sign` takes secret directly (security concern for shell history)
- `key verify` requires two separate flags; could accept JSON
- No `key delete` command visible in help
- No way to sign using an alias (must export and use secret)

---

*Script validated: 2025-12-12*
