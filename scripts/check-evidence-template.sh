#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
TEMPLATE="$PROJECT_DIR/docs/templates/coston2-evidence.template.json"

command -v jq >/dev/null 2>&1 || { echo "check-evidence-template: jq is required" >&2; exit 1; }
[[ -f "$TEMPLATE" ]] || { echo "check-evidence-template: template missing" >&2; exit 1; }

jq -e '
  .status == "not_observed"
  and .network.name == "coston2"
  and .network.chainId == 114
  and .assets.fxrp.resolutionStatus == "not_observed"
  and .assets.usdt0.resolutionStatus == "not_observed"
  and .deployment.extensionId == null
  and .syndication.resultDigest == null
' "$TEMPLATE" >/dev/null

if grep -Eiq '0x[0-9a-fA-F]{64}' "$TEMPLATE"; then
  echo "check-evidence-template: possible private key or secret found" >&2
  exit 1
fi

echo "Concord evidence template: OK"
