# Concord status

Updated 2026-08-12.

## Works in the durable checkpoint

- AccordRegistry, CapitalFacility, ConcordInstructionSender and shared Concord
  types compile with Solidity 0.8.27.
- Foundry flow tests pass locally, including the two-child draw and repayment
  lifecycle.
- The Go Concord extension compiles and tests signed quotes and deterministic
  CoFill inside the official FCE scaffold structure, including exact zero-fee
  round bounds.
- `tools/cmd/run-test` preserves the complete signed FCC action response and
  signed TEE-info envelope instead of reducing the result to unverified JSON.
- `tools/cmd/verify-allocation` independently checks the action signature,
  proxy-signed TEE identity, chain/extension binding, facility round/digest,
  and—before `-mark`—the active TEE machine for the extension.
- Deployment tooling generates a binding for ConcordInstructionSender and has
  no embedded private-key fallback.
- Coston2 asset resolution is centralized in config/networks/coston2.json and
  validated by scripts/resolve-coston2-assets.sh.
- REST/OpenAPI, the TypeScript SDK, MCP, and CLI share unsigned lifecycle intent
  vocabulary for round opening and relationship close/expiry; allocation
  materialization remains verifier-gated.
- `scripts/coston2-preflight.sh` provides a read-only offline/live operator gate,
  and the adversarial cases are recorded in
  `docs/experiments/coston2-failure-matrix.md`.

## Not yet evidenced

- No Concord contracts are claimed as deployed from this checkpoint.
- No funded Coston2 treasury/provider accounts, FCC registration, instruction
  IDs, settlement receipts or end-to-end explorer evidence are recorded yet.
- The configured allocationVerifier is an explicit offchain integration
  boundary. A local test actor is not a live FCC proof. The `-mark` path is
  deliberately restricted to signed action evidence plus an active machine
  lookup; it has not been run against a deployed Concord facility in this
  checkpoint.

## Privacy truth

The implementation does not claim private FXRP transfers, private USDT0
transfers, private EVM execution, or production hardware-backed TEE security.
The FCC development path may use the documented simulated TEE. Provider terms,
losing quotes and allocation computation are intended for the confidential
boundary; accepted capacity, exposure, transfers and lineage are public where
the facility requires them.

## Current Flare inputs

- Coston2 chain ID: 114.
- FXRP manager is resolved from ContractRegistry under AssetManagerFXRP.
- FXRP token is resolved from that manager's fAsset().
- USDT0 is the current validated Coston2 liquidity-token snapshot in the
  network config; the resolver checks symbol USDT0, decimals 18, and code.

The authoritative implementation/docs links are kept in the root README. If
the official Flare registry, scaffold or FCC behaviour changes, update the
affected configuration and record the contradiction before continuing.

## Deployment evidence template

When the live slice is run, copy
`docs/templates/coston2-evidence.template.json` to an ignored local evidence
file and fill only observed values. Until then, leave deployment fields empty
rather than inferring them from local tests:

~~~text
Network:
AccordRegistry:
CapitalFacility:
ConcordInstructionSender:
FCC extension id:
Makkari round:
SUBMIT_QUOTE instruction ids:
FINALIZE_ROUND instruction id:
allocation result digest:
root / child / draw / repayment transaction hashes:
Explorer links:
~~~

## Durable CI evidence

- Commit `039460c65b98eb02ccf577bcd92a02827ebb000e` passed the deterministic
  [GitHub Actions verification run](https://github.com/etvjay/Concord/actions/runs/31633719358).
- The passing jobs were Solidity/Foundry lifecycle tests, Go extension and
  tooling tests, TypeScript SDK compilation, and repository/documentation gates.
- The Coston2 asset resolver passed on commit `8cc4eff4fe76e08d672c56bbd5021fc9e5270ce6` in the read-only
  [Coston2 asset-resolution run](https://github.com/etvjay/Concord/actions/runs/31640930512).
- The resolver artifact recorded ContractRegistry/FXRP resolution and USDT0 metadata checks. This is
  asset-resolution evidence only, not contract deployment or FCC lifecycle evidence.
- The same commit passed the complete deterministic
  [Concord verification run](https://github.com/etvjay/Concord/actions/runs/31640930525) across Solidity,
  Go, TypeScript SDK, and repository/documentation gates.
- Green CI confirms repository-level correctness checks only. It does not prove
  deployed contracts, FCC registration, funded provider accounts, settlement,
  repayment, or production hardware-backed confidential execution.

- The hardening commit `35b756b38a6b97b7f63dc08074dd1c4ff8a52ccc` passed the full
  [push verification run](https://github.com/etvjay/Concord/actions/runs/31646160590)
  and the equivalent [PR verification run](https://github.com/etvjay/Concord/actions/runs/31646164208),
  including lifecycle expiry demotion, partial repayment, API/SDK/MCP intent
  parity, and the read-only preflight gate.
- The same commit passed the read-only
  [Coston2 asset-resolution run](https://github.com/etvjay/Concord/actions/runs/31646160617).
