#!/usr/bin/env bash
# check-docs.sh — validate Concord-specific documentation and truth boundaries.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DOCS="$(cd "$SCRIPT_DIR/.." && pwd)/docs"

RED="\033[0;31m"; YELLOW="\033[0;33m"; GREEN="\033[0;32m"; NC="\033[0m"
fail=0
err()  { echo -e "${RED}FAIL${NC}  $*"; fail=1; }
warn() { echo -e "${YELLOW}WARN${NC}  $*"; }
ok()   { echo -e "${GREEN}ok${NC}    $*"; }

# These are the Concord documents that must exist in a clean checkout.
REQUIRED="architecture.md getting-started.md testing.md testing-against-coston2.md cloudflared.md CONCORD_STATUS.md JUDGES.md shared-product-contract.md frontend-map.md cli.md coston2-live-runbook.md experiments/coston2-failure-matrix.md"
MAX_LINES=500

echo "docs: $DOCS"
echo

for f in $REQUIRED; do
    p="$DOCS/$f"
    if [[ ! -f "$p" ]]; then
        err "$f missing (required)"
        continue
    fi
    n=$(wc -l <"$p")
    if (( n < 20 )); then
        err "$f is only $n lines — stub?"
        continue
    fi
    (( n > MAX_LINES )) && warn "$f is $n lines (>$MAX_LINES) — trim or split"
    ok "$f ($n lines)"
done

check() {
    local file="$1" label="$2" needle="$3"
    if [[ ! -f "$DOCS/$file" ]]; then
        err "$file missing while checking $label"
    elif grep -qiF -- "$needle" "$DOCS/$file"; then
        ok "$file: $label"
    else
        err "$file: missing $label (looked for \"$needle\")"
    fi
}

echo
check "getting-started.md" "two-phase deployment" "DEPLOY_PHASE"
check "getting-started.md" "simulated TEE disclosure" "SIMULATED_TEE"
check "getting-started.md" "verified-result gate" "-mark"
check "CONCORD_STATUS.md" "live-evidence boundary" "Not yet evidenced"
check "CONCORD_STATUS.md" "privacy boundary" "private FXRP"
check "shared-product-contract.md" "selected versus funded" "selected"
check "shared-product-contract.md" "unsigned intent boundary" "requiresExplicitApproval"
check "frontend-map.md" "not-observed state" "not-observed"
check "coston2-live-runbook.md" "credential gate" "not deployment evidence"
check "experiments/coston2-failure-matrix.md" "failure matrix hypothesis" "Hypothesis"

if [[ -f "$DOCS/README.md" ]]; then
    ok "docs/README.md index present"
else
    err "docs/README.md index missing"
fi

if [[ -f "$DOCS/templates/coston2-evidence.template.json" ]]; then
    ok "Coston2 evidence template present"
else
    err "Coston2 evidence template missing"
fi

if (( fail )); then
    echo -e "${RED}Concord documentation gate: FAILED${NC}"
else
    echo -e "${GREEN}Concord documentation gate: OK${NC}"
fi
exit "$fail"
