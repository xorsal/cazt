#!/bin/bash
# CAZT CLI - Valid Commands Reference
# Each command can be executed directly (offline commands work without network)

# ==============================================================================
# KEY COMMANDS (all work offline)
# ==============================================================================

# key generate - Generate new secret key
./bin/cazt key generate

# key derive-keys - Derive all 4 master keys from secret
./bin/cazt key derive-keys 0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# key derive-address - Compute address from secret
./bin/cazt key derive-address 0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# key derive-address with salt
./bin/cazt key derive-address 0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef --salt 0x1234

# key import - Import secret key to local storage
./bin/cazt key import 0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef --alias test-key

# key export - Export secret key (requires confirmation)
./bin/cazt key export test-key --yes-i-understand-the-risks

# key list - List stored keys
./bin/cazt key list

# key sign - Sign message with Schnorr
./bin/cazt key sign "Hello Aztec" 0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# key verify - Verify Schnorr signature
./bin/cazt key verify "Hello Aztec" --signature 0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000 --pubkey "0x0000000000000000000000000000000000000000000000000000000000000001,0x0000000000000000000000000000000000000000000000000000000000000002"

# key keystore create - Create encrypted keystore
./bin/cazt key keystore create 0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef --password testpass123

# key keystore unlock - Unlock keystore file
./bin/cazt key keystore unlock ~/.cazt/keystores/keystore-*.json --password testpass123

# ==============================================================================
# WALLET COMMANDS (mostly offline)
# ==============================================================================

# wallet create - Create new account
./bin/cazt wallet create

# wallet create with type
./bin/cazt wallet create --type schnorr

# wallet address - Compute address from secret
./bin/cazt wallet address 0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# wallet address with options
./bin/cazt wallet address 0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef --type schnorr --salt 0x0000

# wallet list --local - List locally stored keys
./bin/cazt wallet list --local

# wallet vanity - Generate vanity address (CPU intensive)
./bin/cazt wallet vanity 00 --max-attempts 10000

# ==============================================================================
# CAST HASH COMMANDS (all work offline)
# ==============================================================================

# cast hash zero - Print zero hash
./bin/cazt cast hash zero

# cast hash keccak - Keccak-256 hash (UTF-8 string)
./bin/cazt cast hash keccak "hello"

# cast hash keccak - Keccak-256 hash (hex input)
./bin/cazt cast hash keccak 0x68656c6c6f

# cast hash sha256 - SHA-256 hash
./bin/cazt cast hash sha256 "hello"

# cast hash poseidon2 - Poseidon2 hash
./bin/cazt cast hash poseidon2 '["0x01","0x02","0x03"]'

# cast hash pedersen - Pedersen hash
./bin/cazt cast hash pedersen '["0x01","0x02"]'

# cast hash pedersen with index
./bin/cazt cast hash pedersen '["0x01","0x02"]' --index 1

# cast hash secret - Compute secret hash
./bin/cazt cast hash secret 0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# ==============================================================================
# CAST ADDRESS COMMANDS (all work offline)
# ==============================================================================

# cast address zero - Print zero address
./bin/cazt cast address zero

# cast address random - Generate random address
./bin/cazt cast address random

# cast address validate - Validate address format
./bin/cazt cast address validate 0x0c8a6673d7676cc80aaebe7fa7504cf51daa90ba906861bfad70a58a98bf5a7d

# cast address is-valid - Check if address is valid
./bin/cazt cast address is-valid 0x0c8a6673d7676cc80aaebe7fa7504cf51daa90ba906861bfad70a58a98bf5a7d

# cast address from-field - Create address from field
./bin/cazt cast address from-field 0x0000000000000000000000000000000000000000000000000000000000000001

# cast address from-bigint - Create address from bigint
./bin/cazt cast address from-bigint 12345678901234567890

# cast address from-number - Create address from number
./bin/cazt cast address from-number 42

# cast address to-point - Convert address to Grumpkin point
./bin/cazt cast address to-point 0x0c8a6673d7676cc80aaebe7fa7504cf51daa90ba906861bfad70a58a98bf5a7d

# ==============================================================================
# CAST ETH COMMANDS (all work offline)
# ==============================================================================

# cast eth zero - Print zero ETH address
./bin/cazt cast eth zero

# cast eth random - Generate random ETH address
./bin/cazt cast eth random

# cast eth validate - Validate ETH address
./bin/cazt cast eth validate 0x742d35Cc6634C0532925a3b844Bc454e4438f44e

# cast eth is-zero - Check if ETH address is zero
./bin/cazt cast eth is-zero 0x0000000000000000000000000000000000000000

# cast eth from-field - Create ETH address from field
./bin/cazt cast eth from-field 0x000000000000000000000000742d35cc6634c0532925a3b844bc454e4438f44e

# cast eth to-field - Convert ETH address to field
./bin/cazt cast eth to-field 0x742d35Cc6634C0532925a3b844Bc454e4438f44e

# ==============================================================================
# CAST FIELD COMMANDS (all work offline)
# ==============================================================================

# cast field random - Generate random field
./bin/cazt cast field random

# cast field from-string - Convert string to field
./bin/cazt cast field from-string 0x1234

# cast field to-string - Convert field to string
./bin/cazt cast field to-string 0x0000000000000000000000000000000000000000000000000000000000001234

# cast field from-buffer - Create field from buffer
./bin/cazt cast field from-buffer 1234567890abcdef

# cast field to-buffer - Convert field to buffer
./bin/cazt cast field to-buffer 0x0000000000000000000000000000000000000000000000000000000000001234

# cast field from-bigint - Create field from bigint
./bin/cazt cast field from-bigint 12345678901234567890

# cast field to-bigint - Convert field to bigint
./bin/cazt cast field to-bigint 0x0000000000000000000000000000000000000000000000000000000000001234

# cast field is-zero - Check if field is zero
./bin/cazt cast field is-zero 0x0000000000000000000000000000000000000000000000000000000000000000

# cast field equals - Compare two fields
./bin/cazt cast field equals 0x01 0x01

# ==============================================================================
# CAST SELECTOR COMMANDS (all work offline)
# ==============================================================================

# cast selector compute - Compute function selector
./bin/cazt cast selector compute "transfer(field,field)"

# cast selector event - Compute event selector
./bin/cazt cast selector event "Transfer(field,field,field)"

# cast selector note - Compute note selector
./bin/cazt cast selector note "ValueNote"

# cast selector from-field - Create selector from field
./bin/cazt cast selector from-field 0x12345678

# cast selector from-string - Create selector from hex string
./bin/cazt cast selector from-string 0x12345678

# cast selector empty - Get empty selector
./bin/cazt cast selector empty

# ==============================================================================
# CAST ABI COMMANDS (all work offline)
# ==============================================================================

# cast abi encode - ABI encode arguments
./bin/cazt cast abi encode '{"abi":[{"kind":"field"}],"args":["0x1234"]}'

# cast abi decode - ABI decode fields
./bin/cazt cast abi decode '{"types":[{"kind":"field"}],"fields":["0x1234"]}'

# cast abi decode-sig - Decode function signature
./bin/cazt cast abi decode-sig '{"name":"transfer","parameters":[{"name":"to","type":{"kind":"field"}}]}'

# ==============================================================================
# CAST NULLIFIER COMMANDS (all work offline)
# ==============================================================================

# cast nullifier silo - Silo nullifier with contract
./bin/cazt cast nullifier silo --contract 0x0000000000000000000000000000000000000000000000000000000000000001 --nullifier 0x0000000000000000000000000000000000000000000000000000000000001234

# cast nullifier l1-to-l2 - Compute L1->L2 message nullifier
./bin/cazt cast nullifier l1-to-l2 --contract 0x0000000000000000000000000000000000000000000000000000000000000001 --message-hash 0x0000000000000000000000000000000000000000000000000000000000001234 --secret 0x0000000000000000000000000000000000000000000000000000000000005678

# ==============================================================================
# CAST NOTE COMMANDS (all work offline)
# ==============================================================================

# cast note hash-nonce - Compute note hash nonce
./bin/cazt cast note hash-nonce --nullifier-zero 0x0000000000000000000000000000000000000000000000000000000000001234 --index 0

# cast note silo-hash - Silo note hash to contract
./bin/cazt cast note silo-hash --contract 0x0000000000000000000000000000000000000000000000000000000000000001 --note-hash 0x0000000000000000000000000000000000000000000000000000000000001234

# cast note unique-hash - Compute unique note hash
./bin/cazt cast note unique-hash --nonce 0x0000000000000000000000000000000000000000000000000000000000001234 --siloed-note-hash 0x0000000000000000000000000000000000000000000000000000000000005678

# ==============================================================================
# CAST ARTIFACT COMMANDS (offline, need artifact file)
# ==============================================================================

# cast artifact load - Load contract artifact
./bin/cazt cast artifact load examples/Token.json

# cast artifact to-buffer - Serialize artifact to buffer
./bin/cazt cast artifact to-buffer examples/Token.json

# ==============================================================================
# CAST MESSAGE COMMANDS (all work offline)
# ==============================================================================

# cast message l2-to-l1-hash - Compute L2->L1 message hash
./bin/cazt cast message l2-to-l1-hash '{"l2Sender":"0x0000000000000000000000000000000000000000000000000000000000000001","l1Recipient":"0x742d35Cc6634C0532925a3b844Bc454e4438f44e","content":"0x1234","rollupVersion":"1","chainId":"31337"}'

# ==============================================================================
# CAST LOG COMMANDS (all work offline)
# ==============================================================================

# cast log silo-private - Silo private log tag
./bin/cazt cast log silo-private --contract 0x0000000000000000000000000000000000000000000000000000000000000001 --tag 0x0000000000000000000000000000000000000000000000000000000000001234

# ==============================================================================
# CAST MISC COMMANDS (all work offline)
# ==============================================================================

# cast calldata-hash - Hash public function calldata
./bin/cazt cast calldata-hash '["0x1234","0x5678"]'

# cast var-args-hash - Hash function arguments
./bin/cazt cast var-args-hash '["0x1234","0x5678"]'

# cast public-data-slot - Compute public data tree slot
./bin/cazt cast public-data-slot --contract 0x0000000000000000000000000000000000000000000000000000000000000001 --slot 0x01

# cast hash-vk - Hash verification key
./bin/cazt cast hash-vk '["0x01","0x02","0x03","0x04","0x05","0x06","0x07","0x08"]'

# cast buffer-as-fields - Convert buffer to fields
./bin/cazt cast buffer-as-fields '{"buffer":"1234567890abcdef","targetLength":2}'

# ==============================================================================
# CONTRACT COMMANDS (offline for artifact operations)
# ==============================================================================

# contract abi - Pretty-print ABI
./bin/cazt contract abi examples/Token.json

# contract artifact info - Show artifact information
./bin/cazt contract artifact info examples/Token.json

# ==============================================================================
# NODE COMMANDS (require network - use --sandbox for local)
# ==============================================================================

# node ready - Check if node is ready
./bin/cazt --sandbox node ready

# node info - Get node information
./bin/cazt --sandbox node info

# node version - Get node version
./bin/cazt --sandbox node version

# node chain-id - Get chain ID
./bin/cazt --sandbox node chain-id

# node l1-addresses - Get L1 contract addresses
./bin/cazt --sandbox node l1-addresses

# node protocol-addresses - Get protocol contract addresses
./bin/cazt --sandbox node protocol-addresses

# node enr - Get node ENR
./bin/cazt --sandbox node enr

# node base-fees - Get current base fees
./bin/cazt --sandbox node base-fees

# node sync-status - Get sync status
./bin/cazt --sandbox node sync-status

# ==============================================================================
# QUERY COMMANDS (require network)
# ==============================================================================

# query public - Read public storage
./bin/cazt --sandbox query public 0x0000000000000000000000000000000000000000000000000000000000000001 0x01

# query nullifiers - Check if nullifier exists
./bin/cazt --sandbox query nullifiers 0x0000000000000000000000000000000000000000000000000000000000001234

# query tx - Get transaction by hash
./bin/cazt --sandbox query tx 0x0000000000000000000000000000000000000000000000000000000000001234

# query logs - Query historical logs
./bin/cazt --sandbox query logs 0x0000000000000000000000000000000000000000000000000000000000000001 --from 0 --to 10

# query block number - Get current block number
./bin/cazt --sandbox query block number

# query block proven-number - Get proven block number
./bin/cazt --sandbox query block proven-number

# query block tips - Get block tips
./bin/cazt --sandbox query block tips

# query block get - Get block by number
./bin/cazt --sandbox query block get 1

# query block range - Get range of blocks
./bin/cazt --sandbox query block range 1 5

# query block header - Get block header
./bin/cazt --sandbox query block header 1

# ==============================================================================
# TX COMMANDS (require network for most)
# ==============================================================================

# tx status - Quick status check
./bin/cazt --sandbox tx status 0x0000000000000000000000000000000000000000000000000000000000001234

# tx receipt - Get full transaction receipt
./bin/cazt --sandbox tx receipt 0x0000000000000000000000000000000000000000000000000000000000001234

# tx analyze - Analyze transaction
./bin/cazt --sandbox tx analyze 0x0000000000000000000000000000000000000000000000000000000000001234

# tx compare - Compare two transactions
./bin/cazt --sandbox tx compare 0x0000000000000000000000000000000000000000000000000000000000001234 0x0000000000000000000000000000000000000000000000000000000000005678

# tx decode - Decode calldata (offline with artifact)
./bin/cazt tx decode 0x1234567890abcdef --artifact examples/Token.json

# ==============================================================================
# CONTRACT COMMANDS (require network for most)
# ==============================================================================

# contract info - Get contract instance details
./bin/cazt --sandbox contract info 0x0000000000000000000000000000000000000000000000000000000000000001

# contract class - Get contract class details
./bin/cazt --sandbox contract class 0x0000000000000000000000000000000000000000000000000000000000000001

# contract storage - Read public storage (with slot)
./bin/cazt --sandbox contract storage 0x0000000000000000000000000000000000000000000000000000000000000001 0x01

# contract storage - Show guidance (without slot)
./bin/cazt contract storage 0x0000000000000000000000000000000000000000000000000000000000000001

# contract events - Query contract events
./bin/cazt --sandbox contract events 0x0000000000000000000000000000000000000000000000000000000000000001 --from 0 --to 10

# contract logs - Query contract logs
./bin/cazt --sandbox contract logs 0x0000000000000000000000000000000000000000000000000000000000000001 --from 0 --to 10

# contract registry list - List registry artifacts
./bin/cazt contract registry list

# contract registry get - Download artifact by class ID
./bin/cazt contract registry get 0x0000000000000000000000000000000000000000000000000000000000000001

# contract registry search - Search artifacts
./bin/cazt contract registry search "Token"

# ==============================================================================
# BRIDGE COMMANDS (require network)
# ==============================================================================

# bridge l1-to-l2-witness - Get L1->L2 message witness
./bin/cazt --sandbox bridge l1-to-l2-witness 0x0000000000000000000000000000000000000000000000000000000000001234

# bridge l1-to-l2-block - Find block containing message
./bin/cazt --sandbox bridge l1-to-l2-block 0x0000000000000000000000000000000000000000000000000000000000001234

# bridge is-l1-to-l2-synced - Check if messages are synced
./bin/cazt --sandbox bridge is-l1-to-l2-synced 1

# bridge l2-to-l1 - Get L2->L1 messages from block
./bin/cazt --sandbox bridge l2-to-l1 1

# bridge status - Check message status
./bin/cazt --sandbox bridge status 0x0000000000000000000000000000000000000000000000000000000000001234

# ==============================================================================
# MONITOR COMMANDS (require network, run indefinitely)
# ==============================================================================

# monitor blocks - Stream new blocks (Ctrl+C to stop)
# ./bin/cazt --sandbox monitor blocks

# monitor blocks --proven - Stream proven blocks only
# ./bin/cazt --sandbox monitor blocks --proven

# monitor address - Watch activity for address
# ./bin/cazt --sandbox monitor address 0x0000000000000000000000000000000000000000000000000000000000000001

# monitor events - Watch contract events
# ./bin/cazt --sandbox monitor events 0x0000000000000000000000000000000000000000000000000000000000000001

# monitor logs - Stream public logs
# ./bin/cazt --sandbox monitor logs

# monitor logs with filter - Stream logs for specific contract
# ./bin/cazt --sandbox monitor logs --contract 0x0000000000000000000000000000000000000000000000000000000000000001

# ==============================================================================
# HELP COMMANDS
# ==============================================================================

# Main help
./bin/cazt --help

# Domain help
./bin/cazt key --help
./bin/cazt wallet --help
./bin/cazt cast --help
./bin/cazt query --help
./bin/cazt node --help
./bin/cazt tx --help
./bin/cazt contract --help
./bin/cazt bridge --help
./bin/cazt monitor --help

# Subcommand help
./bin/cazt key generate --help
./bin/cazt cast hash --help
./bin/cazt query block --help
./bin/cazt contract registry --help
