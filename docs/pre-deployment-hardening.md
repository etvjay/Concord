# Pre-deployment hardening

Status: active implementation phase

This document defines the work that can be completed before Concord has live
Coston2 contracts, funded accounts, or a verified FCC result. It is a delivery
and repository gate; it does not change Concord Product Truth or expand the MVP.

## Protected product boundary

The MVP remains:

```text
FXRP-backed Root Accord
  → private provider offers through Makkari / FCC
  → deterministic CoFill allocation
  → Root + Child Accords
  → actual USDT0 funding
  → active facility
  → multi-child draw with DrawLegs
  → repayment
  → restored capacity and queryable lineage
```

Selected capacity is not committed capacity. A child becomes funded only after
the provider USDT0 transfer succeeds. Public settlement and relationship state
remain distinct from confidential provider inputs and FCC evidence.

## Gates that can run immediately

### Repository and toolchain

- GitHub Actions runs the Solidity, Go extension, Go tooling, TypeScript SDK,
  shell syntax, dependency-pin, and documentation checks.
- Go is set to 1.25.1, matching the repository modules and official scaffold
  baseline.
- The Coston2 asset resolver is available as a manual workflow because it is a
  live RPC check, not a deterministic unit test.

### Contract and extension correctness

- Solidity tests cover Root Accord creation, FXRP collateral, verified and
  replay-protected allocation materialization, selected versus funded child
  capacity, multi-child draws, DrawLegs, repayment, exposure, closure, and
  balance recovery.
- Go tests cover strict payload decoding, provider signature validation,
  expiry and policy rejection, deterministic ordering, partial allocation, and
  explicit insufficient-capacity failure.
- The verifier remains an offchain evidence boundary. A local test actor is not
  treated as a native FCC proof.

### Shared control plane

REST/OpenAPI, the TypeScript SDK, MCP, CLI, and frontend must consume the same
read model and intent rules documented in
[shared-product-contract.md](shared-product-contract.md). Write-capable surfaces
prepare unsigned intents and require explicit user approval. They do not hold
keys, sign, broadcast, or report success before an authoritative receipt is
observed.

### Product surface preparation

The frontend may be fully designed during this phase: routes, role journeys,
guided and detailed disclosure modes, state explanations, error states,
lineage presentation, accessibility, and motion. Full implementation against
live state remains downstream of the contract/FCC evidence gate.

## Deployment-gated work

The following cannot be truthfully completed by local tests alone:

- FCC extension registration and a supported proxy/TEE run;
- signed provider offers entering the live Coston2 confidential path;
- verified allocation materialization on deployed Concord contracts;
- actual USDT0 provider funding and root activation;
- a multi-child draw, ERC-20 settlement, repayment, and restored capacity;
- deployment addresses, instruction IDs, transaction hashes, result digests,
  and explorer evidence.

The official Flare FCE scaffold and current Flare documentation remain the
authority for that runtime path. A simulated development TEE must not be
described as production hardware-backed confidential execution.

## Exit condition for this phase

This phase is complete when the CI workflow is green, the documentation gate
describes Concord rather than inherited scaffold examples, contract and Go
tests run in a clean environment, SDK compilation succeeds, and the live
evidence checklist is ready to receive Coston2 artifacts.

It does not constitute the final hackathon completion gate. That still requires
the funded Coston2 causal chain recorded in `docs/CONCORD_STATUS.md`.
