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
- The earlier facility pair was deployed successfully, but it is bound
  immutably to a different 18-decimal ERC-20 deployment and is now retained
  only as historical evidence. It must not be used for the current faucet
  balance or the canonical flow.
- The replacement pair is now deployed with the current Coston2 `USDT0 test`
  token: `AccordRegistry 0x68b19a3967760489b57341669cd7ea960b5f7367` and
  `CapitalFacility 0xfaff601a18a9fca33378953515aa0f3ef9286ecd`. The deployment
  receipts and registry-link transaction are in the evidence file.

## Asset binding correction

The earlier checkpoint used `0x479854495cefBc8D12B971A3Ec4d18E6dbcE81a3` and
18 decimals. Live Coston2 RPC verification confirms that the current faucet
asset is `USDT0 test` at
`0xC1A5B41512496B80903D1f32d6dEa3a73212E71F`, with on-chain symbol `USD₮0`
and 6 decimals. The [official Coston2 explorer token list](https://coston2-explorer.flare.network/tokens)
is the recorded address source. Because `CapitalFacility.liquidityAsset` is immutable, this
is a deployment contradiction, not a config-only change; the old facility and
its 18-decimal root round are superseded. The replacement facility is now
bound to the current token, and its current root round is recorded below.

## Not yet evidenced

- One simulated development TEE machine is active for extension `66188` at
  status `2` (`PRODUCTION`): tee id
  `0xeE39d5e7d1C5043232282e3CC884B41a9Db22c85`. Its registered stable HTTPS
  URL is `https://concord-fcc-ingress.microcosm.workers.dev`, a narrow
  Cloudflare Workers.dev relay to the disposable Codespace proxy. The setup
  workflow obtained the availability proof and verified the on-chain machine
  record.
- The three disposable provider wallets and the treasury now each hold 10
  units of the current six-decimal `USDT0 test` token. Each provider also has
  105 C2FLR after the guarded gas-funding step, so approval and funding
  transactions can proceed.
- The replacement facility has a current SYNDICATING root Accord and OPEN
  Makkari round: root `0x6e03af…cfddd`, round
  `0x732328…76ce`, 1 FXRP locked, and a 9 USDT0 target at 6 decimals. The
  four transaction receipts and workflow run are in the evidence file.
- The old facility's live round remains historical only because it uses the
  superseded 18-decimal liquidity token.
- No FCC quote/finalize instruction, allocation verification, child Accord, draw,
  settlement, repayment, or restored-capacity receipt has been observed.
- The current Coston2 indexer configuration is stored as encrypted GitHub
  Actions secrets using the current DevHub values. FCC registration is now
  evidenced through the stable Workers.dev relay. This is a development ingress
  fallback, not a named Cloudflare Tunnel or production hardware-TEE claim.

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
- USDT0 is centralized in the network config as the current Coston2 `USDT0
  test` deployment; the resolver checks bytecode, on-chain symbol `USD₮0`, and
  6 decimals. The product-facing alias remains USDT0.

The authoritative implementation/docs links are kept in the root README. If
the official Flare registry, scaffold or FCC behaviour changes, update the
affected configuration and record the contradiction before continuing.

## Deployment evidence template

The observed deployment and root/round values are recorded in
`config/coston2/concord-deployment.json`. Use the template below only for
lifecycle fields that have not yet produced live receipts; do not infer them
from local tests:

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
- Commit `e36cea5bde63bde58bbcbb19ede7f43b82e558eb` passed the guarded
  [Coston2 FCC setup run](https://github.com/etvjay/Concord/actions/runs/31731326000):
  the official scaffold remained running, the Codespace proxy port was made
  public, the Worker relay was verified, the simulated TEE availability proof
  was obtained, and the machine was promoted to status `2`.
- This run proves registration and live FCC ingress only. It does not prove
  quote submission, CoFill finalization, provider funding, draw settlement,
  repayment, or restored capacity.
