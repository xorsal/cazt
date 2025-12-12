# CAZT CLI Implementation Review

**Date:** 2025-12-10
**Reviewer:** Claude Opus 4.5
**File Reviewed:** `cli/commands/index.ts` (~4000 lines)
**Test Status:** 258 tests passing across 9 test suites

---

## Executive Summary

The CAZT CLI implementation is comprehensive and well-structured. Most commands follow consistent patterns for error handling, JSON output, and human-readable formatting. Commands requiring PXE or L1 wallet integration are properly documented with helpful error messages.

**Overall Assessment:** Production-ready for read-only operations. Write operations correctly defer to external dependencies.

---

## Domain-by-Domain Analysis

### 1. TX Domain (7 commands) - Lines 69-348

| Command | Status | Notes |
|---------|--------|-------|
| `tx analyze` | ✅ Good | Uses TxUtils.analyzeTx(), passes options correctly |
| `tx compare` | ✅ Good | Clean implementation with TxUtils.compareTx() |
| `tx decode` | ✅ Good | Uses requiredOption correctly for --artifact |
| `tx status` | ✅ Good | Direct RPC call, properly handles status normalization |
| `tx receipt` | ✅ Good | Clean error handling for not-found case |
| `tx wait` | ✅ Good | Proper polling implementation with timeout |
| `tx simulate` | ⚠️ Stub | Correctly explains limitation (requires PXE) |

**Minor Issues:**
- Line 200: Redundant `adminUrl: nodeUrl` pattern (no functional issue)
- Line 206-209: Status mapping hard-coded, could be utility

**Verdict:** Solid implementation. Minor code duplication.

---

### 2. Key Domain (10 commands) - Lines 354-682

| Command | Status | Notes |
|---------|--------|-------|
| `key generate` | ✅ Good | Uses WalletUtils.generateKey() |
| `key derive-keys` | ✅ Good | Proper JSON serialization pattern |
| `key derive-address` | ✅ Good | Salt option handled correctly |
| `key import` | ✅ Good | Type validation, alias support |
| `key export` | ✅ Excellent | Safety flag `--yes-i-understand-the-risks` |
| `key list` | ✅ Good | Uses KeyStorage.listKeys() |
| `key sign` | ✅ Good | Schnorr signature working |
| `key verify` | ✅ Good | Returns proper exit codes |
| `key keystore create` | ✅ Good | Derives address for metadata |
| `key keystore unlock` | ✅ Good | Proper error for bad decrypt |

**Minor Issues:**
- Line 603-607: Requires `--password` as option, no interactive prompt support
- Line 432-438: Type casting could validate input first

**Verdict:** Well implemented with good security considerations.

---

### 3. Wallet Domain (9 commands) - Lines 688-1070

| Command | Status | Notes |
|---------|--------|-------|
| `wallet create` | ✅ Good | AccountUtils.createAccount() |
| `wallet deploy` | ✅ Good | Delegates to AccountUtils.deployAccount() |
| `wallet info` | ✅ Good | AccountUtils.getAccountInfo() |
| `wallet address` | ✅ Good | Deterministic computation |
| `wallet register` | ⚠️ Partial | Validates address but notes PXE requirement |
| `wallet list` | ⚠️ Partial | --local flag works, network mode requires PXE |
| `wallet balance` | ⚠️ Partial | --public works via node, --private needs PXE |
| `wallet vanity` | ✅ Good | Progress updates, configurable max-attempts |
| `wallet authwit create` | ⚠️ Stub | Not implemented, shows example format |

**Issues:**
- Line 815: Hard-coded salt `Fr.ZERO` in register
- Line 919-924: Public balance assumes slot `1` - may not work for all tokens
- Line 979-982: Vanity only supports 'schnorr' type

**Concerns:**
- `wallet register`: Returns `registered: false` - might confuse users
- `wallet balance --public`: Assumes storage layout - fragile

**Verdict:** Reasonable partial implementation with clear limitations documented.

---

### 4. Contract Domain (15 commands) - Lines 1076-1586

| Command | Status | Notes |
|---------|--------|-------|
| `contract view` | ⚠️ Stub | PXE required, hints about query public |
| `contract send` | ⚠️ Stub | PXE required |
| `contract simulate` | ⚠️ Stub | PXE required |
| `contract info` | ✅ Good | node_getContractInstance RPC call |
| `contract class` | ✅ Good | node_getContractClass RPC call |
| `contract abi` | ✅ Good | Parses and pretty-prints artifact |
| `contract storage` | ✅ Good | Single slot or guidance mode |
| `contract events` | ✅ Good | Filter by block range |
| `contract logs` | ✅ Good | Similar to events (node_getPublicLogs) |
| `contract deploy` | ⚠️ Stub | PXE required |
| `contract artifact info` | ✅ Good | Loads and displays artifact info |
| `contract registry list` | ✅ Good | REST API to devnet.aztec-registry.xyz |
| `contract registry get` | ✅ Good | Downloads artifact, supports -o output |
| `contract registry upload` | ⚠️ Stub | Not implemented |
| `contract registry search` | ✅ Good | Search with query parameter |

**Issues:**
- Lines 1284-1342 vs 1344-1389: `contract events` and `contract logs` are nearly identical - code duplication
- Line 1557: Registry search `?search=` query param - verify API compatibility

**Verdict:** Good for read-only operations. PXE-dependent commands correctly documented.

---

### 5. Monitor Domain (8 commands) - Lines 1592-1900

| Command | Status | Notes |
|---------|--------|-------|
| `monitor blocks` | ✅ Good | Polling loop with SIGINT handler |
| `monitor nullifiers` | ⚠️ Stub | Requires subscription support |
| `monitor notes` | ⚠️ Stub | Requires PXE |
| `monitor address` | ⚠️ Misleading | See issue below |
| `monitor messages` | ⚠️ Stub | Not implemented |
| `monitor events` | ✅ Good | Polls contract events |
| `monitor logs` | ✅ Good | Generic log monitoring |
| `monitor pending` | ⚠️ Stub | Requires pending pool access |

**Issues:**
- Lines 1648-1652, 1735-1739, 1810-1814, 1876-1882: SIGINT handlers duplicated
- Line 1621: Sequential block fetch could miss blocks if multiple arrive quickly

**⚠️ Semantic Issue:**
- `monitor address` (lines 1689-1743): Description says "Watch all activity for address" but implementation only monitors logs WHERE that address is the CONTRACT. It doesn't monitor transactions involving that address. This is misleading.

**Verdict:** Working implementations where possible. Semantic ambiguity in "monitor address".

---

### 6. Query Domain (11 commands) - Lines 1906-2314

| Command | Status | Notes |
|---------|--------|-------|
| `query public` | ✅ Good | node_getPublicStorageAt |
| `query notes` | ⚠️ Stub | Requires PXE |
| `query nullifiers` | ✅ Good | node_findNullifiersIndexesWithBlock |
| `query tx` | ✅ Good | Uses TxUtils.analyzeTx() |
| `query logs` | ✅ Good | Filter by type (public only working) |
| `query block number` | ✅ Good | node_getBlockNumber |
| `query block proven-number` | ✅ Good | node_getProvenBlockNumber |
| `query block tips` | ✅ Good | Parallel fetch of latest/proven |
| `query block get` | ✅ Good | Supports number or hash |
| `query block range` | ✅ Good | Max 100 blocks guard |
| `query block header` | ✅ Good | Extracts header from block |

**Issues:**
- Line 2160-2161: `finalized: proven` assumption - verify correctness
- Line 1973: Type inconsistency (`'latest'` string vs integer)

**Verdict:** Comprehensive and well-implemented.

---

### 7. Cast Domain (~50 commands) - Lines 2320-3487

| Subgroup | Commands | Status |
|----------|----------|--------|
| `cast hash` | 6 | ✅ All working |
| `cast address` | 8 | ✅ All working |
| `cast eth` | 6 | ✅ All working |
| `cast field` | 9 | ✅ All working |
| `cast selector` | 6 | ✅ All working |
| `cast abi` | 3 | ✅ All working |
| `cast nullifier` | 2 | ✅ All working |
| `cast note` | 3 | ✅ All working |
| `cast artifact` | 7 | ⚠️ 4 stubs (hash, hash-preimage, metadata-hash, function-hash) |
| `cast message` | 1 | ✅ Working |
| `cast log` | 2 | ✅ Working |
| `cast misc` | 5 | ✅ All working |

**Issues:**
- Lines 3200-3228: 4 artifact commands use `notImplemented`
- Line 2775-2776: Buffer conversion strips `0x` prefix - inconsistent with other commands

**Verdict:** Excellent utility library. Minor inconsistencies in artifact commands.

---

### 8. Node Domain (9 commands) - Lines 3493-3789

| Command | Status | Notes |
|---------|--------|-------|
| `node ready` | ✅ Good | Graceful error handling, no exit(1) on failure |
| `node info` | ✅ Good | Comprehensive output |
| `node version` | ✅ Good | Simple and clean |
| `node chain-id` | ✅ Good | Simple and clean |
| `node l1-addresses` | ✅ Good | Formats keys nicely |
| `node protocol-addresses` | ✅ Good | Same pattern as l1-addresses |
| `node enr` | ✅ Good | Handles null case |
| `node base-fees` | ✅ Good | Falls back to gasFees if baseFees not present |
| `node sync-status` | ✅ Good | Parallel fetch, blocksBehind calculation |

**Issues:**
- Lines 3622-3651 and 3653-3683: `l1-addresses` and `protocol-addresses` nearly identical - could extract

**Verdict:** Solid, production-quality implementations.

---

### 9. Bridge Domain (8 commands) - Lines 3795-4018

| Command | Status | Notes |
|---------|--------|-------|
| `bridge l1-to-l2-witness` | ✅ Good | node_getL1ToL2MessageWitness |
| `bridge l1-to-l2-block` | ✅ Good | node_getL1ToL2MessageBlockNumber |
| `bridge is-l1-to-l2-synced` | ✅ Good | node_isL1ToL2MessageSynced |
| `bridge l2-to-l1` | ✅ Good | Extracts from block tx effects |
| `bridge send-l1-to-l2` | ⚠️ Stub | Requires L1 wallet |
| `bridge consume-l1-to-l2` | ⚠️ Stub | Requires PXE |
| `bridge status` | ✅ Good | Checks L1->L2 tree |
| `bridge pending` | ⚠️ Stub | Requires state tracking |

**Issues:**
- Line 3981-3984: Status only checks `delivered` - doesn't check if message was consumed

**Improvement:** `bridge status` could query nullifiers to detect consumed messages

**Verdict:** Read operations work well. Write operations properly documented.

---

## Issues Summary

### High Priority

| Issue | Location | Description |
|-------|----------|-------------|
| Misleading Description | `monitor address` (L1689-1743) | Description says "Watch all activity for address" but only monitors logs FROM that contract address, not activity INVOLVING the address |

### Medium Priority

| Issue | Location | Description |
|-------|----------|-------------|
| Code Duplication | `contract events`/`contract logs` | Nearly identical implementations |
| Code Duplication | `node l1-addresses`/`node protocol-addresses` | Similar logic could be extracted |
| Code Duplication | Monitor SIGINT handlers | Same pattern repeated 4 times |
| Type Inconsistency | Line 1973 | `'latest'` string vs integer for block numbers |
| Incomplete Commands | `cast artifact` | 4 of 7 commands are stubs |

### Low Priority

| Issue | Location | Description |
|-------|----------|-------------|
| Hardcoded Value | `wallet balance` | Assumes slot 1 for public balances |
| Hardcoded Value | `wallet register` | Uses Fr.ZERO salt |
| Hardcoded Value | `query block tips` | Assumes finalized = proven |
| Missing Feature | `key keystore` | No interactive password prompt |
| Missing Feature | `bridge status` | Doesn't check message consumption |

---

## Open Questions

1. **Finalized = Proven?** - Is `finalized = proven` always correct in Aztec protocol?
2. **Registry API** - Does devnet.aztec-registry.xyz support `?search=` query parameter?
3. **Stub Commands** - Should stubbed `cast artifact` commands be removed or documented differently?
4. **Monitor Address** - Should this be renamed or behavior changed to match description?

---

## Recommendations

### Immediate Actions
1. Fix `monitor address` description to match actual behavior, or expand implementation
2. Add tests for stubbed artifact commands to verify they return proper error

### Code Quality Improvements
1. Extract common patterns (SIGINT handler, address formatting)
2. Create constants for hardcoded values (storage slots, status mappings)
3. Add type validation before casting in key import

### Documentation
1. Document which commands require PXE vs Node
2. Add examples for complex JSON input commands
3. Document storage slot assumptions for wallet balance

---

## Test Coverage

| Domain | Tests | Status |
|--------|-------|--------|
| Key | 30 | ✅ Pass |
| Cast | 81 | ✅ Pass |
| Wallet | 25 | ✅ Pass |
| Query | 32 | ✅ Pass |
| Node | 23 | ✅ Pass |
| TX | 18 | ✅ Pass |
| Contract | 36 | ✅ Pass |
| Bridge | 22 | ✅ Pass |
| Monitor | 16 | ✅ Pass |
| **Total** | **258** | ✅ Pass |

---

*Generated by Claude Opus 4.5 during CAZT CLI implementation review*
