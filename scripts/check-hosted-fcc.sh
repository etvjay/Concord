#!/usr/bin/env bash
# Read-only health and registry check for an always-on Concord FCC deployment.
set -euo pipefail

PROXY_URL="${1:-${EXT_PROXY_URL:-}}"
EXTENSION_ID="${2:-${CONCORD_EXTENSION_ID:-66188}}"
RPC_URL="${CHAIN_URL:-https://coston2-api.flare.network/ext/C/rpc}"
OLD_TEE_ID="${OLD_TEE_ID:-0xeE39d5e7d1C5043232282e3CC884B41a9Db22c85}"

[[ -n "$PROXY_URL" ]] || { echo "usage: $0 <https-proxy-url> [extension-id]" >&2; exit 2; }
command -v curl >/dev/null || { echo "curl is required" >&2; exit 2; }
command -v jq >/dev/null || { echo "jq is required" >&2; exit 2; }

INFO_JSON="$(curl --fail --silent --show-error --max-time 20 "${PROXY_URL%/}/info")"
OBSERVED_EXTENSION="$(jq -r '.machineData.extensionId // empty' <<<"$INFO_JSON")"
OBSERVED_CODE_HASH="$(jq -r '.machineData.codeHash // empty' <<<"$INFO_JSON")"
OBSERVED_PLATFORM="$(jq -r '.machineData.platform // empty' <<<"$INFO_JSON")"
OBSERVED_PUBLIC_KEY="$(jq -c '.teeInfo.publicKey // empty' <<<"$INFO_JSON")"
OBSERVED_CHAIN_ID="$(jq -r '.teeInfo.chainId // empty' <<<"$INFO_JSON")"
[[ -n "$OBSERVED_EXTENSION" ]] || { echo "proxy /info omitted machineData.extensionId" >&2; exit 1; }
[[ -n "$OBSERVED_CODE_HASH" ]] || { echo "proxy /info omitted machineData.codeHash" >&2; exit 1; }
[[ -n "$OBSERVED_PLATFORM" ]] || { echo "proxy /info omitted machineData.platform" >&2; exit 1; }
[[ -n "$OBSERVED_PUBLIC_KEY" && "$OBSERVED_PUBLIC_KEY" != "null" ]] || { echo "proxy /info omitted teeInfo.publicKey" >&2; exit 1; }
[[ "$OBSERVED_CHAIN_ID" == "114" ]] || { echo "proxy /info chain id '$OBSERVED_CHAIN_ID' is not 114" >&2; exit 1; }

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

jq '{machineData: {extensionId: .machineData.extensionId, codeHash: .machineData.codeHash, platform: .machineData.platform}, teeInfo: {publicKey: .teeInfo.publicKey, chainId: .teeInfo.chainId}}' <<<"$INFO_JSON"
echo "proxy binding confirmed for extension $EXPECTED_DECIMAL"

command -v go >/dev/null || { echo "Go toolchain is required for the registry/identity verification" >&2; exit 2; }
[[ -f tools/go.mod ]] || { echo "tools/go.mod is required for the registry/identity verification" >&2; exit 2; }

TEE_EVIDENCE="$(
  cd tools
  SIMULATED_TEE=true go run ./cmd/inspect-tee-info -proxy "$PROXY_URL" -chain-id 114
)"
printf '%s\n' "$TEE_EVIDENCE"
OBSERVED_TEE_ID="$(jq -r '.teeId' <<<"$TEE_EVIDENCE")"
OBSERVED_TEE_PROXY_ID="$(jq -r '.teeProxyId' <<<"$TEE_EVIDENCE")"
[[ -n "$OBSERVED_TEE_ID" && "$OBSERVED_TEE_ID" != "null" ]] || { echo "could not derive teeId" >&2; exit 1; }
[[ -n "$OBSERVED_TEE_PROXY_ID" && "$OBSERVED_TEE_PROXY_ID" != "null" ]] || { echo "could not derive teeProxyId" >&2; exit 1; }

REGISTRY_EVIDENCE="$(
  cd tools
  go run ./cmd/query-tee -rpc "$RPC_URL" -addresses ../config/coston2/deployed-addresses.json -ext "$EXPECTED_DECIMAL" "$OBSERVED_TEE_ID"
)"
printf '%s\n' "$REGISTRY_EVIDENCE"
ACTIVE_COUNT="$(grep -Ec '^  [0-9]+: ' <<<"$REGISTRY_EVIDENCE" || true)"
[[ "$ACTIVE_COUNT" == "1" ]] || { echo "expected exactly one active machine for extension $EXPECTED_DECIMAL, got $ACTIVE_COUNT" >&2; exit 1; }
ACTIVE_LINE="$(grep -E '^  [0-9]+: ' <<<"$REGISTRY_EVIDENCE")"
ACTIVE_ID="$(sed -E 's/^  [0-9]+: ([^ ]+).*/\1/' <<<"$ACTIVE_LINE")"
ACTIVE_URL="$(sed -E 's/.*url="([^"]*)".*/\1/' <<<"$ACTIVE_LINE")"
[[ "${ACTIVE_ID,,}" == "${OBSERVED_TEE_ID,,}" ]] || { echo "active machine teeId '$ACTIVE_ID' does not match /info-derived '$OBSERVED_TEE_ID'" >&2; exit 1; }
[[ "${ACTIVE_URL%/}" == "${PROXY_URL%/}" ]] || { echo "active machine URL '$ACTIVE_URL' does not match stable proxy '$PROXY_URL'" >&2; exit 1; }
grep -q "getTeeMachineStatus: 2" <<<"$REGISTRY_EVIDENCE" || { echo "active machine is not status 2 (PRODUCTION)" >&2; exit 1; }
if grep -Fqi "$OLD_TEE_ID" <<<"$REGISTRY_EVIDENCE"; then
  echo "stale Codespace identity is still active: $OLD_TEE_ID" >&2
  exit 1
fi

echo "active machine confirmed: teeId=$OBSERVED_TEE_ID teeProxyId=$OBSERVED_TEE_PROXY_ID status=2 url=$ACTIVE_URL"
echo "fresh availability evidence must come from the current official rRap registration result; this read-only check does not create or refresh it"

echo "Development-path note: SIMULATED_TEE=true is not production hardware-backed execution."
