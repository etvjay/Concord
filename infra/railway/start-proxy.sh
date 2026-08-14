#!/bin/sh
set -eu

: "${PROXY_PRIVATE_KEY:?PROXY_PRIVATE_KEY is required}"
: "${REDIS_ENDPOINT:?REDIS_ENDPOINT is required, for example concord-redis.railway.internal:6379}"
: "${INDEXER_DB_HOST:?INDEXER_DB_HOST is required}"
: "${INDEXER_DB_NAME:?INDEXER_DB_NAME is required}"
: "${INDEXER_DB_USER:?INDEXER_DB_USER is required}"
: "${INDEXER_DB_PASSWORD:?INDEXER_DB_PASSWORD is required}"

toml_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

mkdir -p /app/config

cat > /app/config/config.toml <<EOF
redis_port = "$(toml_escape "$REDIS_ENDPOINT")"
private_key_variable = "PROXY_PRIVATE_KEY"
initial_signing_policy_offset = 2
signing_policy_fetch_interval = "20s"

chain_id = 114

[db]
host = "$(toml_escape "$INDEXER_DB_HOST")"
port = ${INDEXER_DB_PORT:-3306}
database = "$(toml_escape "$INDEXER_DB_NAME")"
username = "$(toml_escape "$INDEXER_DB_USER")"
password = "$(toml_escape "$INDEXER_DB_PASSWORD")"
log_queries = false

[addresses]
flare_systems_manager = "${FLARE_SYSTEMS_MANAGER:-0xA90Db6D10F856799b10ef2A77EBCbF460aC71e52}"
relay = "${FLARE_RELAY:-0xa10B672D1c62e5457b17af63d4302add6A99d7dE}"
voter_registry = "${VOTER_REGISTRY:-0x6a0AF07b7972177B176d3D422555cbc98DfDe914}"

[ports]
internal = "6663"
external = "6664"

[info_timing]
cycle_internal = "10s"
cycle_queue_response_wait = "2s"

[voting]
proposal_expiration = "12s"
max_pending_request = 10000
EOF

exec /app/tee-proxy
