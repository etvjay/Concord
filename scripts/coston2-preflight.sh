#!/usr/bin/env bash
# Read-only Coston2 preflight for the Concord operator path.
# It validates configuration and public runtime bindings; it never signs or broadcasts.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CONFIG_FILE="${CONCORD_NETWORK_CONFIG:-$PROJECT_DIR/config/networks/coston2.json}"
OFFLINE=false
PROXY_URL="${EXT_PROXY_URL:-}"
EXPECTED_EXTENSION_ID="${CONCORD_EXTENSION_ID:-}"
FACILITY_ADDRESS="${CAPITAL_FACILITY:-}"
REGISTRY_ADDRESS="${ACCORD_REGISTRY:-}"
SENDER_ADDRESS="${CONCORD_INSTRUCTION_SENDER:-}"

usage() {
  cat <<'EOF'
Usage: scripts/coston2-preflight.sh [options]

Read-only validation for the Coston2 Concord deployment and FCC operator path.

Options:
  --offline             validate local Coston2 configuration without RPC access
  --proxy URL           validate the official FCC proxy /info response
  --extension-id ID     require /info to report this extension id
  --facility ADDRESS    require deployed CapitalFacility bytecode
  --registry ADDRESS    require deployed AccordRegistry bytecode
  --sender ADDRESS      require deployed ConcordInstructionSender bytecode
  -h, --help            show this help

Environment overrides:
  CONCORD_NETWORK_CONFIG, CHAIN_URL, EXT_PROXY_URL, CONCORD_EXTENSION_ID,
  CAPITAL_FACILITY, ACCORD_REGISTRY, CONCORD_INSTRUCTION_SENDER, SIMULATED_TEE
EOF
}

die() { echo "coston2-preflight: $*" >&2; exit 1; }
info() { echo "coston2-preflight: $*"; }

while (($#)); do
  case "$1" in
    --offline) OFFLINE=true ;;
    --proxy) shift; (($#)) || die "--proxy requires a URL"; PROXY_URL="$1" ;;
    --extension-id) shift; (($#)) || die "--extension-id requires an id"; EXPECTED_EXTENSION_ID="$1" ;;
    --facility) shift; (($#)) || die "--facility requires an address"; FACILITY_ADDRESS="$1" ;;
    --registry) shift; (($#)) || die "--registry requires an address"; REGISTRY_ADDRESS="$1" ;;
    --sender) shift; (($#)) || die "--sender requires an address"; SENDER_ADDRESS="$1" ;;
    -h|--help) usage; exit 0 ;;
    *) die "unknown argument: $1" ;;
  esac
  shift
done

command -v jq >/dev/null 2>&1 || die "jq is required"
[[ -f "$CONFIG_FILE" ]] || die "network config not found: $CONFIG_FILE"

NETWORK="$(jq -r '.network // empty' "$CONFIG_FILE")"
CHAIN_ID="$(jq -r '.chainId // empty' "$CONFIG_FILE")"
RPC_URL="${CHAIN_URL:-$(jq -r '.rpcUrl // empty' "$CONFIG_FILE")}"
CONTRACT_REGISTRY="$(jq -r '.contractRegistry // empty' "$CONFIG_FILE")"
FXRP_MANAGER="$(jq -r '.fxrp.assetManager // empty' "$CONFIG_FILE")"
FXRP_TOKEN="$(jq -r '.fxrp.token // empty' "$CONFIG_FILE")"
USDT0_TOKEN="$(jq -r '.usdt0.token // empty' "$CONFIG_FILE")"

[[ "$NETWORK" == "coston2" ]] || die "network config must identify coston2, got '$NETWORK'"
[[ "$CHAIN_ID" == "114" ]] || die "Coston2 chain ID must be 114, got '$CHAIN_ID'"
[[ -n "$RPC_URL" && "$RPC_URL" != "null" ]] || die "RPC URL is missing"

is_address() { [[ "$1" =~ ^0x[0-9a-fA-F]{40}$ ]]; }
for pair in "contractRegistry:$CONTRACT_REGISTRY" "fxrpManager:$FXRP_MANAGER" "fxrpToken:$FXRP_TOKEN" "usdt0Token:$USDT0_TOKEN"; do
  label="${pair%%:*}"
  address="${pair#*:}"
  is_address "$address" || die "$label is not a 20-byte hex address: $address"
done

info "configuration is valid: network=$NETWORK chainId=$CHAIN_ID"
info "RPC: $RPC_URL"
info "FXRP manager and token are centralized in the network config; live resolver will re-check both"
info "USDT0 snapshot is centralized in the network config; live resolver will re-check bytecode, symbol, and decimals"

if [[ "$OFFLINE" == true ]]; then
  info "offline mode: no RPC, proxy, bytecode, signing, or broadcast checks were attempted"
  exit 0
fi

command -v cast >/dev/null 2>&1 || die "cast (Foundry) is required for live checks"
command -v curl >/dev/null 2>&1 || die "curl is required for live checks"

RPC_CHAIN_ID="$(cast chain-id --rpc-url "$RPC_URL" | tr -d '[:space:]')"
[[ "$RPC_CHAIN_ID" == "114" ]] || die "RPC reported chain ID '$RPC_CHAIN_ID', expected 114"
info "RPC chain ID confirmed: 114"

"$SCRIPT_DIR/resolve-coston2-assets.sh"
check_code() {
  local label="$1"
  local address="$2"
  is_address "$address" || die "$label is not a 20-byte hex address: $address"
  local code
  code="$(cast code "$address" --rpc-url "$RPC_URL")"
  [[ "$code" != "0x" ]] || die "$label has no deployed bytecode at $address"
  info "$label bytecode present at $address"
}

[[ -z "$FACILITY_ADDRESS" ]] || check_code "CapitalFacility" "$FACILITY_ADDRESS"
[[ -z "$REGISTRY_ADDRESS" ]] || check_code "AccordRegistry" "$REGISTRY_ADDRESS"
[[ -z "$SENDER_ADDRESS" ]] || check_code "ConcordInstructionSender" "$SENDER_ADDRESS"

if [[ -n "$PROXY_URL" ]]; then
  INFO_JSON="$(curl --fail --silent --show-error --max-time 20 "$PROXY_URL/info")" || die "FCC proxy /info request failed"
  jq -e 'type == "object"' >/dev/null <<<"$INFO_JSON" || die "FCC proxy /info did not return a JSON object"
  PROXY_EXTENSION_ID="$(jq -r '.machineData.extensionId // empty' <<<"$INFO_JSON")"
  PROXY_PLATFORM="$(jq -r '.machineData.platform // "unknown"' <<<"$INFO_JSON")"
  PROXY_CODE_HASH="$(jq -r '.machineData.codeHash // "unknown"' <<<"$INFO_JSON")"
  PROXY_CHAIN_ID="$(jq -r '.teeInfo.chainId // empty' <<<"$INFO_JSON")"
  PROXY_PUBLIC_KEY="$(jq -c '.teeInfo.publicKey // empty' <<<"$INFO_JSON")"
  [[ -n "$PROXY_EXTENSION_ID" ]] || die "FCC proxy /info omitted machineData.extensionId"
  [[ -n "$PROXY_PUBLIC_KEY" && "$PROXY_PUBLIC_KEY" != "null" ]] || die "FCC proxy /info omitted teeInfo.publicKey"
  [[ "$PROXY_CHAIN_ID" == "114" ]] || die "FCC proxy /info reported chain id '$PROXY_CHAIN_ID', expected 114"
  if [[ -n "$EXPECTED_EXTENSION_ID" && "$PROXY_EXTENSION_ID" != "$EXPECTED_EXTENSION_ID" ]]; then
    die "FCC proxy extensionId '$PROXY_EXTENSION_ID' does not match expected '$EXPECTED_EXTENSION_ID'"
  fi
  info "FCC proxy /info confirmed: machineData.extensionId=$PROXY_EXTENSION_ID machineData.platform=$PROXY_PLATFORM machineData.codeHash=$PROXY_CODE_HASH teeInfo.chainId=$PROXY_CHAIN_ID"
  if [[ "${SIMULATED_TEE:-false}" == true ]]; then
    info "SIMULATED_TEE=true: this is development-path evidence, not production hardware-backed TEE evidence"
  fi
else
  info "no FCC proxy supplied: skipped /info binding check"
fi

info "preflight passed; no transaction was signed or broadcast"
