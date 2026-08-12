#!/usr/bin/env bash
# Deploy Concord's Solidity relationship and facility contracts to Coston2.
# This only prepares and broadcasts deployment transactions; it does not claim
# that FCC registration or a live facility flow has completed.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CONFIG_FILE="${CONCORD_NETWORK_CONFIG:-$PROJECT_DIR/config/networks/coston2.json}"
DEPLOY_PHASE="${DEPLOY_PHASE:-facility}"

die() { echo "deploy-coston2: $*" >&2; exit 1; }
command -v forge >/dev/null 2>&1 || die "forge (Foundry) is required"
command -v jq >/dev/null 2>&1 || die "jq is required"

export CHAIN_URL="${CHAIN_URL:-$(jq -r '.rpcUrl' "$CONFIG_FILE")}"
: "${DEPLOYMENT_OWNER:?DEPLOYMENT_OWNER must be set to the broadcasting address}"
: "${DEPLOYMENT_PRIVATE_KEY:?DEPLOYMENT_PRIVATE_KEY must be set in the ignored environment}"

cd "$PROJECT_DIR"
FORGE_ARGS=(--rpc-url "$CHAIN_URL" --broadcast --private-key "$DEPLOYMENT_PRIVATE_KEY")

case "$DEPLOY_PHASE" in
  sender)
    : "${TEE_EXTENSION_REGISTRY:?TEE_EXTENSION_REGISTRY must be set for sender deployment}"
    : "${TEE_MACHINE_REGISTRY:?TEE_MACHINE_REGISTRY must be set for sender deployment}"
    forge script script/DeployCoston2.s.sol:DeployCoston2 \
      --sig "runSender()" "${FORGE_ARGS[@]}"
    ;;
  facility)
    : "${ALLOCATION_VERIFIER:?ALLOCATION_VERIFIER must be set to the verifier address}"
    : "${CONCORD_EXTENSION_ID:?CONCORD_EXTENSION_ID must be set to the registered FCC extension id}"
    ASSETS_JSON="$($SCRIPT_DIR/resolve-coston2-assets.sh)"
    export FXRP_TOKEN="$(jq -r '.fxrp.token' <<<"$ASSETS_JSON")"
    export USDT0_TOKEN="$(jq -r '.usdt0.token' <<<"$ASSETS_JSON")"
    forge script script/DeployCoston2.s.sol:DeployCoston2 \
      --sig "runFacility()" "${FORGE_ARGS[@]}"
    ;;
  *)
    die "DEPLOY_PHASE must be sender or facility"
    ;;
esac
