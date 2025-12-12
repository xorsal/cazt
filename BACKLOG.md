# CAZT Feature Backlog

> **Scope**: 2-month roadmap to expand CAZT from ~80 commands to ~180+ commands
> **Goal**: Position CAZT as the definitive Swiss Army knife for Aztec developers, DevOps, and protocol integrators
> **Last Updated**: 2025-12-09

---

## Priority Legend

| Priority | Meaning |
|----------|---------|
| **P0** | Must have - Core functionality that unblocks users |
| **P1** | Should have - Completes the experience |
| **P2** | Nice to have - Power user features |
| **P3** | Future - Extensibility and advanced use cases |

---

## Implementation Progress

| Domain | Status | Implemented Commands |
|--------|--------|---------------------|
| 1. Transaction Analysis | **DONE** | tx analyze, tx history, tx decode-calldata, tx compare |
| 2. Wallet & Key Mgmt | **PARTIAL** | generate, derive-keys, derive-address, app-key, sign, verify |
| 3. Account Management | **PARTIAL** | create, deploy, info, address |
| 4. Real-Time Monitoring | NOT STARTED | - |
| 5. Contract Interaction | NOT STARTED | - |
| 6. State Queries | NOT STARTED | - |
| 7. Bridge & L1 Ops | NOT STARTED | - |
| 8. Node Operations | NOT STARTED | - |
| 9. Developer Utilities | NOT STARTED | - |
| 10. Config & Profiles | NOT STARTED | - |

**Files Created:**
- `cli/utils/tx.ts` - TxUtils class (~500 lines)
- `cli/utils/wallet.ts` - WalletUtils class (~300 lines)
- `cli/utils/account.ts` - AccountUtils class (~320 lines)
- `tests/tx.test.ts` - 19 tests
- `tests/wallet.test.ts` - 22 tests
- `tests/account.test.ts` - 19 tests

---

## Domain 1: Transaction Analysis (`tx analyze`) ✅ COMPLETE

**Motivation**: Transactions in Aztec are complex - they contain private/public execution phases, multiple log types, state changes across several trees, and cross-layer messages. Currently, developers must manually piece together information from multiple RPC calls. A unified analyzer makes debugging 10x faster.

### Features

- [x] **P0** `tx analyze <hash>` - Full transaction breakdown showing status, fees, gas, block info, and revert reason
  > Entry point for all tx debugging. Combines `getTxReceipt` + `getTxEffect` into human-readable output. Should highlight failures prominently.
  > **Implemented in:** `cli/utils/tx.ts:TxUtils.analyzeTx()`

- [x] **P0** `tx analyze --effects` - Display all state changes: note hashes, nullifiers, public data writes, L2→L1 messages
  > The `TxEffect` structure contains everything that changed. This visualizes it: "3 notes created, 2 nullifiers added, 1 public storage write at slot X".

- [x] **P0** `tx analyze --logs` - Decode and display all logs (private, public, contract class) with event names when ABI available
  > Raw logs are Field arrays. With contract artifacts, we can decode them to `Transfer(from, to, amount)` style output. Falls back to hex for unknown events.

- [x] **P1** `tx analyze --gas` - Gas breakdown showing total, public phase, teardown phase, and mana consumed
  > Helps developers optimize. Shows where gas is spent: "Public: 450k (60%), Teardown: 100k (13%), Base: 200k (27%)".

- [x] **P1** `tx analyze --diff` - Show public state before/after comparison for contracts touched by the transaction
  > Queries `getPublicStorageAt` for affected slots at block N-1 and N. Output: "Token.balances[alice]: 100 → 80 (-20)".

- [ ] **P2** `tx analyze --trace` - Execution trace with function calls, nested calls, and gas per step
  > Advanced debugging. Requires simulation replay. Shows call stack: "Token.transfer → _deduct_balance → emit_log".
  > **Status:** Deferred - requires complex simulation replay infrastructure

- [x] **P0** `tx analyze --json` - Machine-readable JSON output for scripting and CI pipelines
  > Same data as human output but structured. Enables `cazt tx analyze $HASH --json | jq '.effects.nullifiers | length'`.

- [x] **P2** `tx compare <hash1> <hash2>` - Side-by-side comparison of two transactions
  > Useful for regression testing: "Why did this tx succeed yesterday but fail today?" Highlights differences in gas, effects, logs.
  > **Implemented in:** `cli/utils/tx.ts:TxUtils.compareTx()`

- [x] **P1** `tx history <address>` - List all transactions involving an address as sender, recipient, or interacted contract
  > Requires archiver queries. Shows chronological list with status, block, and brief description. Pagination via `--limit` and `--offset`.
  > **Implemented in:** `cli/utils/tx.ts:TxUtils.getTxHistory()`

- [x] **P1** `tx decode-calldata <data>` - Decode raw calldata bytes using provided ABI
  > Input: hex calldata + artifact. Output: `transfer(to: 0x1234..., amount: 1000)`. Essential for inspecting pending txs.
  > **Implemented in:** `cli/utils/tx.ts:TxUtils.decodeCalldata()`

---

## Domain 2: Wallet & Key Management (`wallet`) 🔶 PARTIAL

**Motivation**: Aztec has a complex key model with 4 master keys (nullifier, incoming viewing, outgoing viewing, tagging) derived from a single secret. Developers need to understand and work with these keys for debugging note decryption, computing addresses, and managing multiple accounts. Currently no CLI tool exposes this cleanly.

### Features

- [x] **P0** `wallet generate` - Generate new secret key with optional BIP-39 mnemonic output
  > Secure random generation. Optionally output as mnemonic for backup. Warn about security implications.
  > **Implemented in:** `cli/utils/wallet.ts:WalletUtils.generateKey()`

- [x] **P0** `wallet derive-keys <secret>` - Display all 4 master keys (nsk_m, ivsk_m, ovsk_m, tsk_m) and their public counterparts
  > Educational and debugging. Shows the full key hierarchy: "Master Nullifier Secret Key: 0x... → Public: 0x...".
  > **Implemented in:** `cli/utils/wallet.ts:WalletUtils.deriveKeys()`

- [x] **P0** `wallet derive-address <secret> [salt]` - Compute address without deploying account contract
  > Useful for pre-computing addresses for allowlists, airdrops. Shows: address, partial address, preaddress.
  > **Implemented in:** `cli/utils/wallet.ts:WalletUtils.deriveAddress()`

- [ ] **P0** `wallet import <secret> [--type schnorr|ecdsa-k|ecdsa-r]` - Import existing secret key into local storage
  > Stores encrypted in local keystore. Type affects which account contract will be used on deployment.
  > **Status:** Requires persistent storage infrastructure (Domain 10)

- [ ] **P0** `wallet list` - List all stored wallets with aliases and deployment status
  > Quick overview: "alice (schnorr, deployed) | bob (ecdsa-r, not deployed) | test-1 (schnorr, deployed)".
  > **Status:** Requires persistent storage infrastructure (Domain 10)

- [ ] **P1** `wallet export <alias>` - Export secret key with confirmation prompt
  > Dangerous operation - requires explicit `--yes-i-understand-the-risks` flag. Outputs hex secret key.
  > **Status:** Requires persistent storage infrastructure (Domain 10)

- [x] **P1** `wallet app-key <secret> <contract>` - Derive app-siloed keys for a specific contract address
  > Keys are siloed per-app for security. Shows: "App Nullifier Key for 0x1234: 0x...". Useful for debugging note nullification.
  > **Implemented in:** `cli/utils/wallet.ts:WalletUtils.deriveAppKeys()`

- [x] **P1** `wallet sign <message> <secret>` - Sign arbitrary message with Schnorr or ECDSA depending on key type
  > For off-chain signatures. Output includes signature components (s, e for Schnorr; r, s, v for ECDSA).
  > **Implemented in:** `cli/utils/wallet.ts:WalletUtils.signMessage()`

- [x] **P1** `wallet verify <message> --signature <sig> --pubkey <key>` - Verify a signature against public key
  > Counterpart to sign. Returns exit code 0 on valid, 1 on invalid. Useful in scripts.
  > **Implemented in:** `cli/utils/wallet.ts:WalletUtils.verifySignature()`

- [ ] **P2** `wallet encrypt <data> <pubkey>` - Encrypt data to a recipient's incoming viewing public key
  > Uses Aztec's encryption scheme. For sending encrypted off-chain messages.

- [ ] **P2** `wallet decrypt <data> <secret>` - Decrypt data using incoming viewing secret key
  > Counterpart to encrypt. For receiving encrypted off-chain messages.

- [ ] **P1** `wallet keystore create` - Create password-encrypted keystore file (like Ethereum JSON keystore)
  > Safer than plaintext secrets. Uses scrypt/argon2 for key derivation. Outputs `.cazt-keystore` file.

- [ ] **P1** `wallet keystore unlock <file>` - Unlock keystore for current session
  > Prompts for password, caches decrypted key in memory for session duration. Auto-locks on exit.

---

## Domain 3: Account Management (`account`) 🔶 PARTIAL

**Motivation**: Aztec accounts are smart contracts, not just key pairs. Creating an account involves deploying an account contract that defines authentication logic (Schnorr, ECDSA, multisig). This domain handles the full account lifecycle.

### Features

- [x] **P0** `account create [--type schnorr|ecdsa-k|ecdsa-r] [--deploy]` - Create new account with specified authentication type
  > Generates secret, derives address, optionally deploys. Schnorr is default (native to Aztec). ECDSA variants for Ethereum/Bitcoin compatibility.
  > **Implemented in:** `cli/utils/account.ts:AccountUtils.createAccount()`

- [x] **P0** `account deploy <secret> [--type] [--salt]` - Deploy account contract for a previously created account
  > Separate from create for cases where you want to pre-compute address but deploy later. Handles fee payment.
  > **Implemented in:** `cli/utils/account.ts:AccountUtils.deployAccount()`

- [x] **P0** `account info <address>` - Display account details: deployed status, contract type, public keys, nonce
  > Quick inspection: "Address: 0x... | Type: Schnorr | Deployed: Yes | Nonce: 5 | Public Keys: ...".
  > **Implemented in:** `cli/utils/account.ts:AccountUtils.getAccountInfo()`

- [x] **P0** `account address <secret> [--type] [--salt]` - Compute address from secret key without deploying
  > Pre-compute address for allowlists, airdrops. Shows: address, salt, type.
  > **Implemented in:** `cli/utils/account.ts:AccountUtils.computeAddress()`

- [ ] **P0** `account register <address> [--secret]` - Register account with PXE for note syncing
  > Required before you can see notes sent to an account. Secret enables decryption of private notes.

- [ ] **P0** `account list` - List all known accounts with deployment status and aliases
  > Overview of local account state. Shows which are deployed, registered, have pending txs.
  > **Status:** Requires persistent storage infrastructure (Domain 10)

- [ ] **P1** `account alias <address> <name>` - Set human-readable alias for an account
  > Use "alice" instead of "0x1234..." in all subsequent commands. Stored in local config.
  > **Status:** Requires persistent storage infrastructure (Domain 10)

- [ ] **P1** `account balance <address> [--token <contract>]` - Show token balances
  > Queries token contracts. Default shows native fee token. With `--token` shows specific token balance.

- [ ] **P1** `account nonce <address>` - Get current transaction nonce
  > Important for manual transaction construction. Shows both pending and confirmed nonce.

- [ ] **P1** `account authwit create <intent>` - Create authorization witness for delegated execution
  > Authwits let other accounts act on your behalf. Intent can be JSON or interactive builder.

- [ ] **P2** `account authwit list <address>` - List active authorization witnesses for an account
  > Shows what permissions have been granted. Includes expiry if applicable.

---

## Domain 4: Real-Time Monitoring (`monitor`)

**Motivation**: Developers need to watch live blockchain activity during development and operations. Currently only basic polling exists via `get-logs --follow`. This domain provides rich, filterable event streams.

### Features

- [ ] **P0** `monitor blocks` - Stream new blocks as they're added to the chain
  > Continuous output: "Block 1234 | 5 txs | 12.3k gas | proposer: 0x...". Ctrl+C to stop.

- [ ] **P1** `monitor blocks --proven` - Only show blocks once they're proven on L1
  > Filters to proven blocks only. Shows proof timestamp and L1 tx hash.

- [ ] **P0** `monitor logs <contract> [--event <name>]` - Watch contract events in real-time
  > Core monitoring feature. "Transfer: alice → bob, 100 tokens". Event name filters to specific event type.

- [ ] **P0** `monitor logs --public` - Stream all public (unencrypted) logs network-wide
  > Firehose of all public events. Use with `--filter` to narrow down.

- [ ] **P1** `monitor logs --private <secret>` - Stream and decrypt private logs you can read
  > Uses your viewing key to decrypt logs tagged to you. Shows decrypted content or "[encrypted - not for you]".

- [ ] **P0** `monitor tx <hash>` - Watch a transaction from submission to finalization
  > States: pending → included → proven → finalized. Shows block number and confirmations.

- [ ] **P1** `monitor address <address>` - Watch all activity involving an address
  > Combines: sent txs, received notes, emitted events, balance changes. Comprehensive activity feed.

- [ ] **P2** `monitor nullifiers` - Stream nullifier insertions to the nullifier tree
  > Advanced debugging. Shows when notes are spent. Can filter by contract.

- [ ] **P1** `monitor notes <contract> [--slot]` - Watch note creation for a contract/storage slot
  > Track when new notes are added. Useful for monitoring token deposits, escrow fills.

- [ ] **P9** `monitor --webhook <url>` - POST events to webhook endpoint instead of stdout
  > Integration with external systems. Sends JSON payload for each event. Retries on failure.

- [ ] **P9** `monitor --filter <jq-expr>` - Filter events with jq-like expressions
  > Power feature: `--filter '.value > 1000'` to only show large transfers. Uses jq syntax.

---

## Domain 5: Contract Interaction (`contract`)

**Motivation**: The core developer workflow is deploying and interacting with contracts. While basic deployment exists, richer interaction patterns (simulation, storage inspection, event history) are missing.

### Features

- [ ] **P0** `contract call <address> <function> [args...]` - Call view/utility function (no state change)
  > Read-only queries. Decodes return value using ABI. Example: `cazt contract call $TOKEN balanceOf $ALICE`.

- [ ] **P0** `contract send <address> <function> [args...] [--from] [--fee]` - Send state-changing transaction
  > Full transaction flow: simulate → prove → send → wait. Shows tx hash and receipt.

- [ ] **P0** `contract simulate <address> <function> [args...]` - Simulate transaction without sending
  > Dry run. Shows expected gas, return values, and any revert reasons. No on-chain effect.

- [ ] **P0** `contract info <address>` - Show contract instance details
  > Deployed address, class ID, initialization args, deployer, salt, public keys. Quick reference.

- [ ] **P1** `contract class <id>` - Show contract class details
  > Artifact hash, function list, bytecode hash. Useful for verifying deployments.

- [ ] **P0** `contract abi <artifact>` - Pretty-print ABI with function signatures and types
  > Human-readable ABI. Shows: "transfer(to: AztecAddress, amount: Field) → external/private".

- [ ] **P1** `contract storage <address>` - Dump all public storage slots with values
  > Iterates known storage layout. Shows: "slot 0 (owner): 0x1234 | slot 1 (totalSupply): 1000000".

- [ ] **P0** `contract storage <address> <slot>` - Read specific public storage slot
  > Direct slot read. Accepts slot as number, hex, or name if artifact provided.

- [ ] **P1** `contract events <address> [--from] [--to] [--event]` - Query historical events
  > Paginated event history. Decodes events using ABI. Supports block range filtering.

- [ ] **P2** `contract verify <address> <artifact>` - Verify deployed bytecode matches local artifact
  > Security check. Compares on-chain class ID with locally computed hash. Exit code indicates match.

- [ ] **P1** `contract alias <address> <name>` - Create alias for contract address
  > Use "token" instead of "0x1234..." in commands. Stored with artifact reference for ABI decoding.

---

## Domain 6: State Queries (`state`)

**Motivation**: Aztec maintains multiple merkle trees (note hash, nullifier, public data, archive). Developers need to query and prove state for debugging, verification, and building off-chain systems.

### Features

- [ ] **P0** `state public <contract> <slot>` - Read public storage value at slot
  > Alias for `contract storage`. Direct state tree query.

- [ ] **P0** `state note-hash-exists <hash> [--block]` - Check if note hash exists in the note hash tree
  > Returns boolean + leaf index if found. Useful for verifying note creation.

- [ ] **P0** `state nullifier-exists <nullifier>` - Check if nullifier has been inserted
  > Returns boolean + leaf index. Useful for checking if note was spent.

- [ ] **P1** `state merkle-proof <tree> <leaf-index>` - Get merkle inclusion proof
  > Trees: note-hash, nullifier, public-data, archive. Returns sibling path for verification.

- [ ] **P1** `state archive <block>` - Get archive root and snapshot at specific block
  > Shows state of all trees at that block. Useful for historical queries.

- [ ] **P2** `state diff <block1> <block2>` - Compare state between two blocks
  > Shows what changed: new note hashes, new nullifiers, storage changes. Good for auditing.

- [ ] **P2** `state export <block> [--format json|csv]` - Export full state snapshot
  > Dump all public storage for all contracts. Heavy operation - use with caution.

---

## Domain 7: Bridge & L1 Operations (`bridge`)

**Motivation**: Aztec is an L2 - cross-layer messaging is fundamental. Developers need to track deposits, withdrawals, and message status across L1 and L2.

### Features

- [ ] **P0** `bridge l1-to-l2 status <msg-hash>` - Check status of L1→L2 message
  > States: pending-on-L1, available-on-L2, consumed. Shows block numbers and tx hashes.

- [ ] **P0** `bridge l2-to-l1 status <msg-hash>` - Check status of L2→L1 message
  > States: pending-on-L2, available-on-L1, claimed. Shows merkle proof when ready.

- [ ] **P1** `bridge l1-to-l2 list [--pending] [--address]` - List L1→L2 messages
  > Filter by status and recipient. Shows content hash, sender, recipient, block.

- [ ] **P1** `bridge l2-to-l1 list [--pending] [--address]` - List L2→L1 messages
  > Filter by status and recipient. Shows content hash, sender, recipient, block.

- [ ] **P1** `bridge deposit <token> <amount> <recipient>` - Deposit tokens from L1 to L2
  > End-to-end deposit flow. Handles L1 tx, waits for L2 availability, optional claim.

- [ ] **P1** `bridge withdraw <token> <amount> <recipient>` - Initiate withdrawal from L2 to L1
  > Creates L2 tx, shows when L1 claim will be available (after proof).

- [ ] **P2** `bridge claim <msg-hash>` - Claim L2→L1 message on L1
  > Final step of withdrawal. Sends L1 tx with merkle proof.

- [ ] **P1** `bridge monitor` - Watch cross-layer message activity
  > Streams deposit/withdrawal events. Shows progress through states.

---

## Infrastructure Improvements

**Motivation**: Cross-cutting improvements that benefit all domains.

### Features

- [ ] **P0** Fix critical security issues from audit
  > Command injection in build script, path traversal via `@` prefix. Must fix before wider release.

- [ ] **P0** `--quiet` / `--verbose` flags - Control output verbosity
  > `-q` for scripts (just the data), `-v` for debugging (full details).

- [ ] **P1** `--format` flag - Output formats: json, yaml, table, csv
  > All commands should support multiple output formats for integration.

- [ ] **P1** Persistent storage (SQLite/LevelDB) - Store accounts, aliases, tx history locally
  > Enables account list, tx history, and other stateful features.

- [ ] **P1** Shell completions - bash/zsh/fish autocompletion
  > `cazt tx ana<TAB>` → `cazt tx analyze`. Major UX improvement.

- [ ] **P2** Interactive mode (`cazt shell`) - REPL with history and autocomplete
  > Enter once, run multiple commands. Maintains connection. History with up/down arrows.

- [ ] **P3** Plugin system - Allow custom command extensions
  > Load commands from `~/.cazt/plugins/`. Enables community extensions.

---

## Summary

| Domain | P0 | P1 | P2 | P3 | Total | Done |
|--------|----|----|----|----|-------|------|
| Transaction Analysis | 4 | 3 | 3 | 0 | 10 | **9/10** ✅ |
| Wallet & Key Management | 5 | 5 | 2 | 0 | 12 | **6/12** |
| Account Management | 5 | 4 | 1 | 0 | 10 | **4/10** |
| Real-Time Monitoring | 4 | 4 | 3 | 0 | 11 | 0/11 |
| Contract Interaction | 5 | 4 | 2 | 0 | 11 | 0/11 |
| State Queries | 3 | 2 | 2 | 0 | 7 | 0/7 |
| Bridge & L1 Operations | 2 | 5 | 1 | 0 | 8 | 0/8 |
| Node Operations | 4 | 4 | 0 | 0 | 8 | 0/8 |
| Developer Utilities | 4 | 5 | 1 | 0 | 10 | 0/10 |
| Configuration & Profiles | 6 | 2 | 0 | 0 | 8 | 0/8 |
| Infrastructure | 2 | 3 | 1 | 1 | 7 | 0/7 |
| **Total** | **44** | **41** | **16** | **1** | **102** | **19/102** |

P9: This is for tasks ON HOLD. Do no implement them.

---

## Recommended Implementation Order

### Phase 1: Core Domains ✅ COMPLETE
1. ~~Domain 1: Transaction Analysis~~ - **DONE**
2. ~~Domain 2: Wallet (core features)~~ - **DONE** (6/12 features)
3. ~~Domain 3: Account (core features)~~ - **DONE** (4/10 features)

### Phase 2: Essential Developer Tools
4. Domain 5: Contract Interaction (high value for devs)
5. Domain 9: Developer Utilities (dev workflow)
6. Domain 10: Config & Profiles (UX foundation, enables wallet/account storage)

### Phase 3: Advanced Features
7. Domain 4: Real-Time Monitoring
8. Domain 6: State Queries
9. Complete Domain 2/3 remaining features

### Phase 4: Infrastructure & Operations
10. Domain 8: Node Operations
11. Domain 7: Bridge & L1 Operations
12. Infrastructure improvements

---

## Notes

- This backlog assumes the existing ~80 CAZT commands remain and are maintained
- Some features may require upstream Aztec SDK enhancements
- Priority can be adjusted based on user feedback and team capacity
- Consider pairing features when implementing (e.g., encode + decode, sign + verify)
- Domain 10 (Config & Profiles) is a dependency for wallet import/list and account list/alias features
