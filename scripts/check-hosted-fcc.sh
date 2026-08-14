#!/usr/bin/env bash
# Read-only health and registry check for an always-on Concord FCC deployment.
set -euo pipefail

PROXY_URL="${1:-${EXT_PROXY_URL:-}}"
EXTENSION_ID="${2:-${CONCORD_EXTENSION_ID:-66188}}"
RPC_URL="${CHAIN_URL:-https://coston2-api.flare.network/ext/C/rpc}"

[[ -n "$PROXY_URL" ]] || { echo "usage: $0 <https-proxy-url> [extension-id]" >&2; exit 2; }
command -v curl >/dev/null || { echo "curl is required" >&2; exit 2; }
command -v jq >/dev/null || { echo "jq is required" >&2; exit 2; }

INFO_JSON="$(curl --fail --silent --show-error --max-time 20 "${PROXY_URL%/}/info")"
OBSERVED_EXTENSION="$(jq -r '.extensionId // empty' <<<"$INFO_JSON")"
[[ -n "$OBSERVED_EXTENSION" ]] || { echo "proxy /info omitted extensionId" >&2; exit 1; }

normalize_extension() {
  local raw="${1#0x}"
  raw="$(sed 's/^0*//' <<<"$raw")"
  [[ -n "$raw" ]] || raw=0
  if [[ "$1" == 0x* ]]; then printf '%d' "0x$raw"; else printf '%d' "$raw"; fi
}

EXPECTED_DECIMAL="$(normalize_extension "$EXTENSION_ID")"
OBSERVED_DECIMAL="$(normalize_extension "$OBSERVED_EXTENSION")"
[[ "$OBSERVED_DECIMAL" == "$EXPECTED_DECIMAL" ]] || {
  echo "proxy extension mismatch: expected $EXTENSION_ID, observed $OBSERVED_EXTENSION" >&2
  exit 1
}

jq '{extensionId, codeHash, platform}' <<<"$INFO_JSON"
echo "proxy binding confirmed for extension $EXPECTED_DECIMAL"

if command -v go >/dev/null && [[ -f tools/go.mod ]]; then
  (
    cd tools
    go run ./cmd/query-tee -rpc "$RPC_URL" -ext "$EXPECTED_DECIMAL"
  )
else
  echo "Go toolchain unavailable; skipped the read-only onchain active-machine query"
fi

echo "Development-path note: SIMULATED_TEE=true is not production hardware-backed execution."
