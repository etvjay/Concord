#!/usr/bin/env bash
# judge-check.sh — read-only judge preflight for the recorded Concord proof.
#
# This command never signs, broadcasts, registers a TEE, pauses a machine, or
# changes the repository. It verifies the clean-checkout gates, the recorded
# Coston2 evidence, and (by default) the public FCC /info binding.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROXY_URL="${CONCORD_JUDGE_PROXY_URL:-https://concord-fcc-ingress.microcosm.workers.dev}"
EXTENSION_ID="${CONCORD_JUDGE_EXTENSION_ID:-66188}"
CHECK_PUBLIC=true
CHECK_REGISTRY=false

usage() {
  cat <<'EOF'
Usage: scripts/judge-check.sh [options]

Read-only verification for a Concord checkout and its recorded Coston2 proof.

Options:
  --proxy URL       check this public FCC proxy /info URL
  --extension-id ID require this FCC extension id (default: 66188)
  --no-public       skip the public FCC /info request
  --registry        also run the Go-based hosted registry check
  -h, --help        show this help

The default path needs only bash, curl, jq, and git. The optional --registry
path also needs Go and queries the live TEE registry without writing to it.
EOF
}

die() { echo "judge-check: $*" >&2; exit 1; }
pass() { echo "judge-check: $*"; }

while (($#)); do
  case "$1" in
    --proxy) shift; (($#)) || die "--proxy requires a URL"; PROXY_URL="$1" ;;
    --extension-id) shift; (($#)) || die "--extension-id requires an id"; EXTENSION_ID="$1" ;;
    --no-public) CHECK_PUBLIC=false ;;
    --registry) CHECK_REGISTRY=true ;;
    -h|--help) usage; exit 0 ;;
    *) die "unknown argument: $1" ;;
  esac
  shift
done

command -v jq >/dev/null 2>&1 || die "jq is required"
command -v git >/dev/null 2>&1 || die "git is required"

cd "$PROJECT_DIR"

git diff --quiet || die "working tree has unstaged changes"
git diff --cached --quiet || die "index has staged changes"
pass "clean checkout: $(git rev-parse --short HEAD)"

bash "$SCRIPT_DIR/coston2-preflight.sh" --offline
bash "$SCRIPT_DIR/check-docs.sh" >/dev/null
bash "$SCRIPT_DIR/check-evidence-template.sh"
pass "repository gates passed"

DEPLOYMENT_FILE="$PROJECT_DIR/config/coston2/concord-deployment.json"
[[ -f "$DEPLOYMENT_FILE" ]] || die "deployment evidence file is missing"
jq -e '
  .network == "Coston2"
  and .chainId == 114
  and .status.canonicalFacilityDeployed == true
  and .status.extensionRegistered == true
  and .status.fccRoundExecuted == true
  and .status.childrenMaterialized == true
  and .status.facilityFunded == true
  and .status.drawSettled == true
  and .status.repaid == true
  and .rootRound.rootState == "ACTIVE"
  and .rootRound.verifiedOnchain.drawnPrincipal == "0"
' "$DEPLOYMENT_FILE" >/dev/null || die "recorded Coston2 proof is incomplete"
pass "recorded Coston2 lifecycle evidence is complete"

if [[ "$CHECK_PUBLIC" == true ]]; then
  command -v curl >/dev/null 2>&1 || die "curl is required for public checks"
  info_json="$(curl --fail --silent --show-error --max-time 20 "${PROXY_URL%/}/info")" \
    || die "public FCC /info request failed: $PROXY_URL"
  observed_extension="$(jq -r '.machineData.extensionId // empty' <<<"$info_json")"
  observed_chain="$(jq -r '.teeInfo.chainId // empty' <<<"$info_json")"
  observed_code="$(jq -r '.machineData.codeHash // empty' <<<"$info_json")"
  observed_platform="$(jq -r '.machineData.platform // empty' <<<"$info_json")"
  observed_key="$(jq -c '.teeInfo.publicKey // empty' <<<"$info_json")"
  [[ -n "$observed_extension" ]] || die "public /info omitted machineData.extensionId"
  [[ "$observed_chain" == "114" ]] || die "public /info reported chain $observed_chain, expected 114"
  [[ -n "$observed_code" && -n "$observed_platform" ]] || die "public /info omitted code/platform binding"
  [[ -n "$observed_key" && "$observed_key" != "null" ]] || die "public /info omitted TEE public key"
  observed_decimal="$(sed 's/^0x//' <<<"$observed_extension" | sed 's/^0*//' | { read -r hex || true; [[ -n "$hex" ]] || hex=0; printf '%d' "0x$hex"; })"
  expected_decimal="$(sed 's/^0x//' <<<"$EXTENSION_ID" | sed 's/^0*//' | { read -r hex || true; [[ -n "$hex" ]] || hex=0; if [[ "$EXTENSION_ID" == 0x* ]]; then printf '%d' "0x$hex"; else printf '%d' "$hex"; fi; })"
  [[ "$observed_decimal" == "$expected_decimal" ]] || die "public /info extension mismatch: $observed_extension"
  pass "public FCC binding: extension=$observed_decimal chain=$observed_chain code=$observed_code platform=$observed_platform"
else
  pass "public FCC binding skipped"
fi

if [[ "$CHECK_REGISTRY" == true ]]; then
  bash "$SCRIPT_DIR/check-hosted-fcc.sh" "$PROXY_URL" "$EXTENSION_ID"
else
  pass "live registry check skipped; use --registry only during an agreed judge window"
fi

cat <<EOF

Judge path:
  Recorded proof: config/coston2/concord-deployment.json
  Demo/evidence guide: docs/DEMO_AND_SUBMISSION.md
  Live FCC endpoint: $PROXY_URL
  Extension: $EXTENSION_ID (development-path evidence; not hardware-TEE evidence)

No private credentials are required for this command.
EOF
