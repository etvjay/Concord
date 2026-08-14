# Concord documentation

Concord documentation is split between product semantics, implementation
guidance, interface contracts, and evidence boundaries. Start with the status
record before making a deployment or privacy claim.

## Product and protocol

- [architecture.md](architecture.md) — Accord, Makkari, CoFill, and lifecycle.
- [lineage.md](lineage.md) — queryable parent-child causal graph.
- [shared-product-contract.md](shared-product-contract.md) — shared semantics
  for the web interface, REST, SDK, MCP, CLI, and agent integrations.
- [frontend-map.md](frontend-map.md) — routes, role surfaces, and state-to-action
  behavior for the eventual webapp.
- [frontend-design-system.md](frontend-design-system.md) — visual system and
  component direction.
- [frontend-art-direction.md](frontend-art-direction.md) — visual narrative
  and motion direction.

## Build, test, and deployment

- [getting-started.md](getting-started.md) — local checks, asset resolution,
  deployment inputs, and the FCC sequence.
- [testing.md](testing.md) — contract, extension, and tooling tests.
- [testing-against-coston2.md](testing-against-coston2.md) — Coston2 test path.
- [coston2-live-runbook.md](coston2-live-runbook.md) — credential-gated live
  integration sequence and evidence checklist.
- [cloudflared.md](cloudflared.md) — proxy exposure guidance.
- [fcc-always-on-hosting.md](fcc-always-on-hosting.md) — Northflank topology,
  identity cutover, and deployment blockers.
- [cli.md](cli.md) — unified CLI, API, and MCP entry points.
- [pre-deployment-hardening.md](pre-deployment-hardening.md) — immediate CI,
  correctness, and productization gates before live proof.
- [experiments/coston2-failure-matrix.md](experiments/coston2-failure-matrix.md)
  — adversarial contract, FCC, control-plane, and live-evidence cases.

## Evidence and truth

- [CONCORD_STATUS.md](CONCORD_STATUS.md) — what is and is not evidenced.
- [current-runtime.md](current-runtime.md) — latest Northflank, Worker, and
  simulated-TEE checkpoint (including the registration boundary).
- [source-snapshot-2026-08-14-deployment.yaml](source-snapshot-2026-08-14-deployment.yaml)
- [source-snapshot-2026-08-14-live-blocker.yaml](source-snapshot-2026-08-14-live-blocker.yaml)
  — current FCC source refresh and deployment-attempt boundary.
- [JUDGES.md](JUDGES.md) — five-minute evaluation path, public evidence, and
  live-verification boundaries.
- `../scripts/judge-check.sh` — credential-free, read-only judge preflight.
- [templates/coston2-evidence.template.json](templates/coston2-evidence.template.json)
  — blank evidence shape with `not_observed` defaults.
- [canonical-reconciliation-audit.md](canonical-reconciliation-audit.md) —
  reconciliation of the handoff, addendum, whitepaper, and implementation.
- [skills-foundry-pack-ingestion.md](skills-foundry-pack-ingestion.md) — durable
  record of the supplied Foundry skills pack and validator status.
- [source-snapshot-2026-08-13.yaml](source-snapshot-2026-08-13.yaml) — dated official Flare/FCC source snapshot and live-gate inputs.

## Official Flare runtime references

The official Flare FCE scaffold, Flare AI skills, and Developer Hub remain the
technical authority for changing FCC, Coston2, FAssets, and network behavior.
Concord-specific documents preserve product semantics but do not replace those
current Flare sources.

- [Build Your First FCC Extension](https://dev.flare.network/fcc/guides/getting-started)
- [Coston2 network configuration](https://dev.flare.network/network/overview)
- [FXRP address guidance](https://dev.flare.network/fxrp/token-interactions/fxrp-address)
- [Official FCE scaffold](https://github.com/flare-foundation/fce-extension-scaffold)
