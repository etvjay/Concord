# Concord canonical reconciliation audit

Status: refreshed for the durable `main` checkpoint on 2026-08-14.

This audit compares the implementation with the following authority order:

1. Canonical Build Handoff — what the MVP must build.
2. Canonical Product Definition Addendum — current product semantics.
3. Concord Whitepaper — architectural thesis and future direction.
4. Current official Flare sources — changing implementation facts.

The whitepaper and Product Definition Addendum were read in full. The supplied
Foundry Skills Pack is now durably installed and its Product Foundry 0.4.3,
Research Foundry 0.2.0, Experiment Foundry 0.1.0, Interface Foundry 0.3.0,
Demo Foundry 0.5.3, and Concord FCC 0.1.0 instructions are loaded as applicable.
The repository's durable source and current official Flare-controlled sources
remain the implementation truth for changing Flare facts.

## Verdict

No contradiction was found between the Build Handoff, Product Definition
Addendum, and whitepaper. The implementation still expresses Concord as a
persistent programmable capital relationship rather than as an RFQ venue,
lending pool, matching engine, or isolated transaction system.

The MVP is not complete. The outstanding blockers are evidence and execution
gates, not a product reinterpretation:

- no live FCC machine, instruction IDs, settlement receipts, or complete
  explorer evidence are recorded;
- the current runner does not contain `forge` or Go, so this audit could not
  re-run the Solidity and Go suites;
- the full frontend remains intentionally unimplemented until the economic and
  FCC path is evidenced.

## Cross-layer reconciliation

| Area | Result | Current truth | Decision |
| --- | --- | --- | --- |
| Product object | PASS | Root Accord is the persistent facility relationship; transactions and FCC actions are lineage nodes. | Preserve. |
| Primitive composition | PASS | Accord, Makkari, CoFill, and Lineage remain separate responsibilities. | Preserve. |
| MVP scope | PASS | The repository implements the FXRP-backed facility slice and does not add receivables, KYC/KYB, FDC, cross-border FX, collections, or legal enforcement. | Keep future capabilities as seams only. |
| Economic states | PASS | `selectedCapacity` is separate from `committedCapacity`; provider funding increases committed capacity only after `transferFrom` succeeds. | Preserve the distinction in every surface. |
| Allocation binding | PASS | Result digest binds extension, round, root, success, expiry, providers, amounts, fees, and terms. Materialization is verifier-gated and replay-protected. | Preserve. |
| Draw model | PASS | A root draw creates explicit DrawLeg objects and consumes multiple child relationships deterministically when capacity requires it. | Preserve; do not flatten draws. |
| Repayment | PASS | ERC-20 transfer occurs before exposure reduction; repayment reduces legs, child exposure, and root exposure. | Preserve. |
| Privacy | PASS | Quote inputs and FCC computation are inside the intended confidential boundary; transfers, exposure, accepted capacity, and lineage are not claimed private. | Keep claim language bounded. |
| API / SDK / MCP / CLI | PASS | Read surfaces share one read model; write surfaces prepare unsigned intents and do not custody, sign, broadcast, or become the verifier. | Preserve. |
| Frontend design | PASS / DESIGN ONLY | The design is relationship-first, progressive-disclosure, role-aware, and explicit about observed versus unavailable state. | Implement only after the live economic path. |
| Future authority | GAP / INTENTIONAL | General parent-delegated authority and external evidence fields are not yet modeled. | Roadmap seam; do not add to this MVP. |
| Live Coston2 proof | BLOCKER | Facility/root/provider funding evidence exists, but no active FCC machine, instruction IDs, or settlement receipts are recorded. | Required before completion claims. |
| Local validation | BLOCKER | `forge` and the recorded Go toolchain are absent from this runner. | Restore toolchain, then rerun the suites. |

## Implementation evidence

### Solidity

`contracts/ConcordTypes.sol` contains the Root Accord, Child Accord, round,
and allocation shapes required by the handoff. `contracts/CapitalFacility.sol`
owns collateral, provider funding, activation, deterministic multi-child draws,
DrawLegs, repayment, exposure, expiry, and close rules. It rejects:

- root or child overdraw;
- provider funding above selected capacity;
- materialization without a configured verifier authorization;
- duplicate allocation materialization;
- allocation results bound to another extension, round, or root;
- draws above available capacity;
- provider capital return while that child has exposure;
- collateral return while the root has exposure or commitments.

`contracts/AccordRegistry.sol` records the causal chain:

```text
ROOT_ACCORD
  → MAKKARI_SESSION
    → COFILL_ALLOCATION
      → CHILD_ACCORD
        → DRAW
          → DRAW_LEG
            → SETTLEMENT
              → REPAYMENT
```

The registry currently enforces parent-node existence and facility authority.
It does not yet implement the whitepaper's future generalized delegated
authority model. That is an intentional MVP boundary, not a contradiction.

### FCC / Makkari / CoFill

The Go extension remains inside the official FCE scaffold. It requires an
encrypted payload and calls the TEE decrypt endpoint; its local tests inject a
decrypt function only for unit isolation. Signed provider quotes are validated
with EIP-191 recovery. CoFill validates round/root/eligibility/fee/expiry
bounds, sorts by fee then provider address then nonce, permits a partial final
allocation, and fails explicitly when capacity is insufficient.

The offchain `verify-allocation` command is deliberately a separate evidence
boundary. It checks the returned action envelope, signed TEE information,
active machine binding, extension/round/root binding, round state and bounds,
eligibility, canonical digest, and facility verifier address before its
optional `markAllocationVerified` broadcast. Local Solidity actors are not
presented as native FCC proof verification.

### Layered surfaces

The following surfaces use the shared contract in
`docs/shared-product-contract.md`:

- REST/OpenAPI: observed facilities, rounds, draws, lineage, evidence status,
  health, and unsigned transaction intents;
- TypeScript SDK: typed REST client and decimal-safe formatting;
- MCP: read resources and safe preparation tools over REST;
- CLI: doctor, API, MCP, and FCC/deployment operator commands;
- frontend boundary: relationship workspace and role-aware disclosure,
  without a second state model.

x402 is not implemented in this checkpoint. The shared contract correctly
keeps it as a future access-gating layer; it must not become a settlement rail
or bypass Accord authority.

## Gaps that do not change MVP semantics

These items are real follow-up work, but none authorizes broadening the MVP:

1. The live verifier and Coston2 deployment need to be executed and evidenced.
2. The failure-focused Experiment Foundry phase has not been run in this
   environment. The next test pass must cover expiry, replay, unauthorized
   materialization, reentrancy/ERC-20 behavior, provider withdrawal limits,
   collateral recovery limits, and invariant divergence.
3. The current round record stores `OPEN`/`FINALIZED`; a read model should
   explicitly represent an elapsed open round as expired or document that the
   expiry is derived from `roundExpiry`. Allocation materialization already
   rejects an elapsed round, and the FCC path rejects expired quotes.
4. Future evidence references (`evidenceRef`, `evidenceRoot`, and related
   policy/authorization evidence) and generalized delegated child authority
   remain architectural seams only.
5. The full React application, visual prototypes, and browser QA are not yet
   present. The design documents are the current interface contract, not a
   claim that the webapp has been built.

## Repository-truth corrections in this checkpoint

- Removed workspace-specific `/workspace/tooling` paths from the durable build
  and testing instructions. Tool locations are now environment-specific.
- Marked inherited Hello World/Orderbook scaffold pages as reference-only in
  the documentation index. Concord-specific documents remain authoritative for
  product semantics and runbooks.
- No Solidity or product primitive was renamed or broadened as part of this
  audit.

## Current FCC credential gate

The current DevHub guide was refreshed on 2026-08-13. Its Coston2 indexer
configuration is host `34.38.42.208`, port `3306`, database `indexer`; the
username and password are stored only as encrypted GitHub Actions secrets.
The repository does not record their values. The stable public extension URL
and named-tunnel token are still absent, so the guarded FCC setup workflow has
not been dispatched.

## Validation record

Completed during this audit:

- static source and documentation inspection across Solidity, Go, REST,
  TypeScript SDK, MCP, CLI, and frontend design files;
- `git diff --check` passed in the local source checkout.

Not re-run because the current runner lacks the required binaries:

- `forge test` — `forge` was not found;
- `(cd go && go test ./...)` — the recorded Go binary path was absent and no
  system `go` binary was available;
- `(cd tools && go test ./...)` — same toolchain blocker;
- live Coston2 asset resolver and FCC lifecycle — no live deployment inputs or
  toolchain were available.

Earlier test statements in `docs/CONCORD_STATUS.md` describe the prior durable
checkpoint; they are retained as historical evidence and are not relabeled as
fresh results from this audit.

## Official Flare sources refreshed

- [Build Your First FCC Extension](https://dev.flare.network/fcc/guides/getting-started)
  — current Coston2 FCC development sequence and simulated-TEE boundary.
- [Coston2 network overview](https://dev.flare.network/network/overview)
  — chain ID `114`, RPC, explorer, and testnet assets.
- [Get FXRP Address](https://dev.flare.network/fxrp/token-interactions/fxrp-address)
  — resolve FXRP through `AssetManager.fAsset()` rather than scattering a
  guessed token address.
- [Get FXRP Asset Manager Address](https://dev.flare.network/fassets/developer-guides/fassets-asset-manager-address-contracts-registry)
  — Contract Registry resolution rule.
- [Official FCE scaffold](https://github.com/flare-foundation/fce-extension-scaffold)
  — runtime and registration foundation.
- [Official Flare Foundry periphery package](https://github.com/flare-foundation/flare-foundry-periphery-package)
  — current official interface and network-package source.

The Flare Developer Hub MCP was not available among the connected tools in
this runner. The official web and GitHub sources above were used for the
source refresh; any material deployment-path change must be checked again
before execution.

## Completion gate

Concord remains in the implementation-and-integration phase. The next
authoritative milestone is not another product design pass:

```text
restore toolchain
  → run contract/FCC/tooling tests
  → register the current FCC extension path
  → deploy Concord contracts on Coston2
  → execute funded three-provider flow
  → record signed evidence and transaction hashes
  → then implement and QA the frontend
```
