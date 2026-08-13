#!/usr/bin/env bash
# Prepare the existing disposable Codespace with the ignored Coston2 FCC
# runtime configuration, start the official scaffold, and expose only port
# 6674. Secrets are streamed from the caller to the Codespace and never
# written to the repository.
set -euo pipefail

: "${CODESPACE_NAME:?CODESPACE_NAME must be set}"
: "${GH_TOKEN:?GH_TOKEN must be set}"
: "${PROXY_PRIVATE_KEY:?PROXY_PRIVATE_KEY must be set}"
: "${INDEXER_DB_HOST:?INDEXER_DB_HOST must be set}"
: "${INDEXER_DB_NAME:?INDEXER_DB_NAME must be set}"
: "${INDEXER_DB_USER:?INDEXER_DB_USER must be set}"
: "${INDEXER_DB_PASSWORD:?INDEXER_DB_PASSWORD must be set}"

shell_quote() {
    printf '%q' "$1"
}

toml_quote() {
    printf '%s' "$1" | jq -Rs .
}

proxy_key_q="$(shell_quote "$PROXY_PRIVATE_KEY")"
db_host_q="$(toml_quote "$INDEXER_DB_HOST")"
db_name_q="$(toml_quote "$INDEXER_DB_NAME")"
db_user_q="$(toml_quote "$INDEXER_DB_USER")"
db_password_q="$(toml_quote "$INDEXER_DB_PASSWORD")"

gh codespace list --json name,state \
    | jq -e --arg name "$CODESPACE_NAME" '.[] | select(.name == $name) | [.name,.state] | @tsv'

{
    printf '%s\n' 'set -euo pipefail'
    printf '%s\n' 'PROJECT=/workspaces/Concord'
    printf '%s\n' 'umask 077'
    printf '%s\n' 'mkdir -p "$PROJECT/config/proxy"'
    printf '%s\n' "cat > /workspaces/Concord/.env <<'CONCORD_ENV'"
    printf '%s\n' 'CHAIN=coston2'
    printf '%s\n' 'CHAIN_URL=https://coston2-api.flare.network/ext/C/rpc'
    printf '%s\n' 'LOCAL_MODE=false'
    printf '%s\n' 'SIMULATED_TEE=true'
    printf '%s\n' 'EXTENSION_ID=0x000000000000000000000000000000000000000000000000000000000001028c'
    printf '%s\n' 'INITIAL_OWNER=0x1aF42c70837f08c6C89a6FA274EB9eeF040820B3'
    printf '%s\n' 'GOVERNANCE_SIGNERS=0x1aF42c70837f08c6C89a6FA274EB9eeF040820B3'
    printf '%s\n' 'GOVERNANCE_THRESHOLD=1'
    printf '%s\n' 'EXT_PROXY_URL=http://localhost:6674'
    printf '%s\n' 'PROXY_PRIVATE_KEY='"$proxy_key_q"
    printf '%s\n' 'CONCORD_ENV'
    printf '%s\n' "cat > /workspaces/Concord/config/extension.env <<'EXTENSION_ENV'"
    printf '%s\n' 'EXTENSION_ID=0x000000000000000000000000000000000000000000000000000000000001028c'
    printf '%s\n' 'INSTRUCTION_SENDER=0x574b523eA944EFe9143AF9d6c46bfA925beE2968'
    printf '%s\n' 'EXTENSION_ENV'
    printf '%s\n' "cat > /workspaces/Concord/config/proxy/extension_proxy.coston2.docker.toml <<'PROXY_TOML'"
    printf '%s\n' 'redis_port = "redis:6379"'
    printf '%s\n' 'private_key_variable = "PROXY_PRIVATE_KEY"'
    printf '%s\n' 'initial_signing_policy_offset = 2'
    printf '%s\n' 'signing_policy_fetch_interval = "20s"'
    printf '%s\n' ''
    printf '%s\n' 'chain_id = 114'
    printf '%s\n' ''
    printf '%s\n' '[db]'
    printf '%s\n' 'host = '"$db_host_q"
    printf '%s\n' 'port = 3306'
    printf '%s\n' 'database = '"$db_name_q"
    printf '%s\n' 'username = '"$db_user_q"
    printf '%s\n' 'password = '"$db_password_q"
    printf '%s\n' 'log_queries = false'
    printf '%s\n' ''
    printf '%s\n' '[addresses]'
    printf '%s\n' 'flare_systems_manager = "0xA90Db6D10F856799b10ef2A77EBCbF460aC71e52"'
    printf '%s\n' 'relay = "0xa10B672D1c62e5457b17af63d4302add6A99d7dE"'
    printf '%s\n' 'voter_registry = "0x6a0AF07b7972177B176d3D422555cbc98DfDe914"'
    printf '%s\n' ''
    printf '%s\n' '[ports]'
    printf '%s\n' 'internal = "6663"'
    printf '%s\n' 'external = "6664"'
    printf '%s\n' ''
    printf '%s\n' '[info_timing]'
    printf '%s\n' 'cycle_internal = "10s"'
    printf '%s\n' 'cycle_queue_response_wait = "2s"'
    printf '%s\n' ''
    printf '%s\n' '[voting]'
    printf '%s\n' 'proposal_expiration = "12s"'
    printf '%s\n' 'max_pending_request = 10000'
    printf '%s\n' 'PROXY_TOML'
    printf '%s\n' 'cd "$PROJECT"'
    printf '%s\n' './scripts/start-services.sh --chain coston2'
    printf '%s\n' 'gh codespace ports visibility 6674:public -c "$CODESPACE_NAME"'
    printf '%s\n' 'curl --fail --silent --show-error http://localhost:6674/info'
} | gh codespace ssh -c "$CODESPACE_NAME" -- bash -s
