#!/usr/bin/env bash
# Deploy Concord's Solidity relationship and facility contracts to Coston2.
# This only prepares and broadcasts deployment transactions; it does not claim
# that FCC registration or a live facility flow has completed.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CONFIG_FILE="${CONCORD_NETWORK_CONFIG:-$PROJECT_DIR/config/networks/coston2.json}"

die() { echo "deploy-coston2: $*" >&2; exit 1; }
command -v forge >/dev/null 2>&1 || die "forge (Foundry) is required"
command -v jq >/dev/null 2>&1 || die "jq is required"

ASSETS_JSON="$($SCRIPT_DIR/resolve-coston2-assets.sh)"
export CHAIN_URL="${CHAIN_URL:-$(jq -r '.rpcUrl' "$CONFIG_FILE")}"
export FXRP_TOKEN="$(jq -r '.fxrp.token' <<<"$ASSETS_JSON")"
export USDT0_TOKEN="$(jq -r '.usdt0.token' <<<"$ASSETS_JSON")"

: "${DEPLOYMENT_OWNER:?DEPLOYMENT_OWNER must be set to the broadcasting address}"
: "${ALLOCATION_VERIFIER:?ALLOCATION_VERIFIER must be set to the verifier address}"
: "${CONCORD_EXTENSION_ID:?CONCORD_EXTENSION_ID must be set to the registered FCC extension id}"
: "${TEE_EXTENSION_REGISTRY:?TEE_EXTENSION_REGISTRY must be set; on Coston2 this is normally the FlareTeeManager diamond}"
: "${TEE_MACHINE_REGISTRY:?TEE_MACHINE_REGISTRY must be set; on Coston2 this is normally the FlareTeeManager diamond}"

cd "$PROJECT_DIR"
forge script script/DeployCoston2.s.sol:DeployCoston2 \
  --rpc-url "$CHAIN_URL" \
  --broadcast
