# Concord status

Updated 2026-08-12.

## Works in the durable checkpoint

- AccordRegistry, CapitalFacility, ConcordInstructionSender and shared Concord
  types compile with Solidity 0.8.27.
- Foundry flow tests pass locally, including the two-child draw and repayment
  lifecycle.
- The Go Concord extension compiles and tests signed quotes and deterministic
  CoFill inside the official FCE scaffold structure.
- Deployment tooling generates a binding for ConcordInstructionSender and has
  no embedded private-key fallback.
- Coston2 asset resolution is centralized in config/networks/coston2.json and
  validated by scripts/resolve-coston2-assets.sh.

## Not yet evidenced

- No Concord contracts are claimed as deployed from this checkpoint.
- No funded Coston2 treasury/provider accounts, FCC registration, instruction
  IDs, settlement receipts or end-to-end explorer evidence are recorded yet.
- The configured allocationVerifier is an explicit offchain integration
  boundary. A local test actor is not a live FCC proof.

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

When the live slice is run, append:

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
