# Concord status

Updated 2026-08-13.

- The fresh source snapshot used for this checkpoint is [source-snapshot-2026-08-13.yaml](source-snapshot-2026-08-13.yaml). It records the current official Coston2 FCC development path, including simulated-TEE labeling, public HTTPS proxy exposure, and current indexer-credential requirements.

## Works in the durable checkpoint

- AccordRegistry, CapitalFacility, ConcordInstructionSender and shared Concord
  types compile with Solidity 0.8.27.
- Foundry flow tests pass locally, including the two-child draw, repayment,
  expiry-demotion, and malicious ERC-20 callback lifecycle.
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

## Observed Coston2 deployment

The following values were read from the live Coston2 RPC and explorer on
2026-08-13 and are recorded in
[config/coston2/concord-deployment.json](../config/coston2/concord-deployment.json).

- `ConcordInstructionSender` deployed at `0x574b523eA944EFe9143AF9d6c46bfA925beE2968`; transaction
  [0x85e605…77612](https://coston2-explorer.flare.network/tx/0x85e6056f410be261830f5e4e8e35b172886b915ea977ad0fba46953c19577612).
- FCC extension `0x…1028c` (decimal `66188`) registered against that sender;
  registration and allowlist/key-type transactions succeeded. The primary
  registration receipt is
  [0x20e1bf…16ca](https://coston2-explorer.flare.network/tx/0x20e1bf7f6e14d93fd5c06bd35b2d3eda93e711b46dff0ecf2433da121dac16ca).
- The later successful facility deployment is the canonical pair for the
  next test flow: `AccordRegistry 0x9A5663519C3D4B36ef155A4AE0e2d8Be2E7a89cF` and
  `CapitalFacility 0x0AcBb062BE75491b5992dddD59aEf64a4f4Cc8b8`.
- A second manual dispatch also deployed a valid pair before the first result
  was observed. It is explicitly marked superseded in the evidence file and
  will not be used for the canonical flow.

## Not yet evidenced

- No active TEE machine is registered for extension `66188` (the live registry
  query returned zero active machines), so the OPEN round has not yet produced a
  live FCC instruction result.
- The three disposable provider wallets are currently unfunded; the treasury
  has 86.338238475 C2FLR and 10 FXRP but 0 USDT0. No provider commitment has
  therefore occurred. The exact public addresses and observed balances are in
  the deployment evidence file.
- The canonical facility now has a live SYNDICATING root Accord and OPEN Makkari
  round: 1 FXRP locked, 9 USDT0 target, 700 bps maximum fee, and three eligible
  provider addresses. The four transaction hashes and read-back state are in the
  deployment evidence file.
- No FCC quote/finalize instruction, allocation verification, child Accord, draw,
  settlement, repayment, or restored-capacity receipt has been observed.
- The current FCC path still needs a reachable extension proxy and the
  scaffold's current Coston2 indexer database credentials before the machine
  registration and instruction flow can run.

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
