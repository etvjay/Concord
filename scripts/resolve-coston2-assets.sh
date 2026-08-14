#!/usr/bin/env bash
# Resolve and validate Concord's Coston2 economic assets.
#
# FXRP is resolved through Flare's ContractRegistry and AssetManagerFXRP.
# USDT0 is not currently exposed by the checked-in Coston2 ContractRegistry
# names, so its centralized network snapshot is validated against live RPC
# metadata before it is used. The product alias is USDT0; the current token's
# on-chain metadata is USD₮0 with six decimals.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CONFIG_FILE="${CONCORD_NETWORK_CONFIG:-$PROJECT_DIR/config/networks/coston2.json}"

die() { echo "resolve-coston2-assets: $*" >&2; exit 1; }
command -v cast >/dev/null 2>&1 || die "cast (Foundry) is required"
command -v jq >/dev/null 2>&1 || die "jq is required"
[[ -f "$CONFIG_FILE" ]] || die "network config not found: $CONFIG_FILE"

RPC_URL="${CHAIN_URL:-$(jq -r '.rpcUrl' "$CONFIG_FILE")}" 
REGISTRY="$(jq -r '.contractRegistry' "$CONFIG_FILE")"
EXPECTED_MANAGER="$(jq -r '.fxrp.assetManager' "$CONFIG_FILE")"
EXPECTED_FXRP="$(jq -r '.fxrp.token' "$CONFIG_FILE")"
USDT0="$(jq -r '.usdt0.token' "$CONFIG_FILE")"
EXPECTED_USDT0_SYMBOL="$(jq -r '.usdt0.onchainSymbol' "$CONFIG_FILE")"
EXPECTED_USDT0_DECIMALS="$(jq -r '.usdt0.decimals' "$CONFIG_FILE")"

[[ "$RPC_URL" != "null" && "$REGISTRY" != "null" ]] || die "incomplete network config"

ASSET_MANAGER="$(cast call "$REGISTRY" 'getContractAddressByName(string)(address)' AssetManagerFXRP --rpc-url "$RPC_URL")"
FXRP_TOKEN="$(cast call "$ASSET_MANAGER" 'fAsset()(address)' --rpc-url "$RPC_URL")"

normalize() { tr '[:upper:]' '[:lower:]' <<<"$1"; }
[[ "$(normalize "$ASSET_MANAGER")" == "$(normalize "$EXPECTED_MANAGER")" ]] || \
    die "ContractRegistry returned AssetManagerFXRP=$ASSET_MANAGER, expected snapshot $EXPECTED_MANAGER; refresh config after checking official sources"
[[ "$(normalize "$FXRP_TOKEN")" == "$(normalize "$EXPECTED_FXRP")" ]] || \
    die "AssetManagerFXRP returned fAsset=$FXRP_TOKEN, expected snapshot $EXPECTED_FXRP; refresh config after checking official sources"

FXRP_CODE="$(cast code "$FXRP_TOKEN" --rpc-url "$RPC_URL")"
USDT0_CODE="$(cast code "$USDT0" --rpc-url "$RPC_URL")"
[[ "$FXRP_CODE" != "0x" ]] || die "FXRP token has no bytecode: $FXRP_TOKEN"
[[ "$USDT0_CODE" != "0x" ]] || die "USDT0 token has no bytecode: $USDT0"

USDT0_SYMBOL="$(cast call "$USDT0" 'symbol()(string)' --rpc-url "$RPC_URL" | tr -d '\"')"
USDT0_DECIMALS="$(cast call "$USDT0" 'decimals()(uint8)' --rpc-url "$RPC_URL")"
[[ "$USDT0_SYMBOL" == "$EXPECTED_USDT0_SYMBOL" ]] || \
    die "configured liquidity token returned on-chain symbol $USDT0_SYMBOL, expected $EXPECTED_USDT0_SYMBOL"
[[ "$USDT0_DECIMALS" == "$EXPECTED_USDT0_DECIMALS" ]] || \
    die "configured USDT0 token returned decimals $USDT0_DECIMALS, expected $EXPECTED_USDT0_DECIMALS"

jq -n \
  --arg network "$(jq -r '.network' "$CONFIG_FILE")" \
  --argjson chainId "$(jq -r '.chainId' "$CONFIG_FILE")" \
  --arg rpcUrl "$RPC_URL" \
  --arg explorerUrl "$(jq -r '.explorerUrl' "$CONFIG_FILE")" \
  --arg contractRegistry "$REGISTRY" \
  --arg assetManager "$ASSET_MANAGER" \
  --arg fxrpToken "$FXRP_TOKEN" \
  --arg usdt0Token "$USDT0" \
  --arg usdt0DisplaySymbol "$(jq -r '.usdt0.symbol' "$CONFIG_FILE")" \
  --arg usdt0Symbol "$USDT0_SYMBOL" \
  --argjson usdt0Decimals "$USDT0_DECIMALS" \
  '{network:$network,chainId:$chainId,rpcUrl:$rpcUrl,explorerUrl:$explorerUrl,contractRegistry:$contractRegistry,fxrp:{assetManager:$assetManager,token:$fxrpToken,decimals:6},usdt0:{token:$usdt0Token,symbol:$usdt0DisplaySymbol,onchainSymbol:$usdt0Symbol,decimals:$usdt0Decimals}}'
