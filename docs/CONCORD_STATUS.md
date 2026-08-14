# Concord status

Updated 2026-08-14 after read-only verification of the Northflank FCC runtime
and reconciliation of the public repository branch. The complete observed
Coston2 lifecycle remains the canonical economic proof. The hosted runtime is
now reachable as a development checkpoint, but its newly generated simulated
TEE identity is not yet registered on Coston2 and no new Coston2 write was made
in this pass.

- The fresh source snapshot used for this checkpoint is [source-snapshot-2026-08-14.yaml](source-snapshot-2026-08-14.yaml). It records the current official Coston2 FCC development path and the Northflank/Railway availability decision.
- The deployment-attempt source refresh is [source-snapshot-2026-08-14-deployment.yaml](source-snapshot-2026-08-14-deployment.yaml). It records the current official source revisions, verified development values, and access blockers.
- The follow-up live blocker check is [source-snapshot-2026-08-14-live-blocker.yaml](source-snapshot-2026-08-14-live-blocker.yaml). It is retained as a historical record of the stopped-Codespace attempt and is superseded for current reachability by [current-runtime.md](current-runtime.md).

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
- Hosted `/info` consumers now read the official nested
  `machineData.extensionId`, `machineData.codeHash`, `machineData.platform`,
  `teeInfo.publicKey`, and `teeInfo.chainId` fields. The read-only registry
  query derives `FlareTeeManager` from `config/coston2/deployed-addresses.json`
  unless an explicit override is supplied.
- The React/Vite frontend now implements the outcome-led institutional landing page,
  facility register, Root Accord workspace, funding, activity, evidence,
  lineage, child, and draw views from the recorded Coston2 deployment and the
  shared TypeScript SDK types. Injected-wallet connection, Coston2 switching,
  native balance reads, the official faucet link, live capacity reads, local
  draw-intent generation, explicit wallet submission, and receipt tracking are live.
  The `/demo` route is a deterministic six-stage local walkthrough with no
  wallet or RPC writes. The `/borrower` route prepares a fresh wallet-bound
  `createRootAccord` intent and stops at explicit approval; it does not reuse
  the recorded facility or claim a public coordinator runner. Its build and
  fifteen semantic, invariant, learning, and wayfinding tests pass locally. The
  shell now exposes a single product-level destination, stable facility tabs,
  plain parent breadcrumbs, canonical terms with in-place definitions, and an
  optional first-use tour plus persistent glossary. Forced Back/Next journey
  controls and duplicate mobile navigation were removed.
- `docs/DEMO_AND_SUBMISSION.md` provides a four-minute evidence-led demo,
  exact Coston2 receipt ledger, submission copy, and recording/claim gates.
- `infra/northflank/`, `infra/railway/`, and
  `docs/fcc-always-on-hosting.md` package the official two-service plus Redis
  FCC topology. Northflank is the primary continuously running hackathon
  development host; paid Railway is the fallback. The Northflank proxy, the
  simulated TEE, and private Redis are currently deployed, but no new hosted
  machine has been registered yet.

## Current hosted runtime

The latest hosted-runtime checkpoint is [current-runtime.md](current-runtime.md).
The following is the compact claim boundary for it:

- Northflank project `concord` is running in `europe-west` with
  `concord-fcc-proxy`, `concord-fcc-tee`, and private Redis `concord-redis`.
  Both services have completed builds/deployments and Redis is running.
- The proxy keeps `/healthy` private on port `6663` and exposes FCC traffic on
  public port `6664`. The Cloudflare Worker
  `https://concord-fcc-ingress.microcosm.workers.dev` relays to that
  Northflank public port.
- Direct and relayed `/info` checks return HTTP `200`, extension `66188`, and
  Coston2 chain ID `114`, with matching code/governance/platform bindings and a
  proxy signature.
- The current simulated identity is
  `0xb1e7a4c1930f1f3c4905b34fafc9c1b8359029a5`. It is ephemeral and has not
  been registered or availability-checked onchain.
- Read-only Systems Explorer inspection found the pre-existing records
  `0x65721B35EAF2648Fd061aB6901e1355ec2eCffd2` (`INITIALIZED`) and
  `0xeE39d5e7d1C5043232282e3CC884B41a9Db22c85` (`PRODUCTION`) for the same
  owner/extension. The latter is the historical active machine; it has not
  been paused.
- No registration, availability, pause, dispatch, or other Coston2 broadcast
  was made for the current Northflank identity. Those actions remain
  confirmation-gated.

The Vercel frontend still has no public deployment URL. Its existing build and
tests remain documented, but frontend cleanup/deployment is deliberately a
separate next pass.

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
- The canonical root is now `ACTIVE` with three `ACTIVE` child Accords, each
  funded with `3 USDT0` base units (`3,000,000` at six decimals). The final
  observed root state, child lineage, allocation digest, and lifecycle receipts
  are recorded in the deployment file.

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

## Historical Coston2 vertical slice evidenced

- The recorded run used one simulated development TEE machine for extension
  `66188` at
  status `2` (`PRODUCTION`): tee id
  `0xeE39d5e7d1C5043232282e3CC884B41a9Db22c85`. Its registered stable HTTPS
  URL is `https://concord-fcc-ingress.microcosm.workers.dev`, a narrow
  Cloudflare Workers.dev relay to the disposable Codespace proxy. The setup
  workflow obtained the availability proof and verified the on-chain machine
  record at that time. Current reachability is tracked separately above and is
  not inferred from this historical record.
- The three disposable provider wallets and the treasury now each hold 10
  units of the current six-decimal `USDT0 test` token. Each provider also has
  105 C2FLR after the guarded gas-funding step, so approval and funding
  transactions can proceed.
- The replacement facility has the current root Accord and Makkari round:
  root `0x6e03af…cfddd`, round `0x732328…76ce`, 1 FXRP locked, and a 9 USDT0
  target at 6 decimals. The round is finalized and the root is now `ACTIVE`;
  the creation, FCC, funding, draw, and repayment receipts are in the
  deployment file.
- The old facility's live round remains historical only because it uses the
  superseded 18-decimal liquidity token.
- Three signed provider quotes entered the confidential flow, CoFill finalized
  the deterministic allocation, and the verified result digest is
  `0xf17a292655b898d8b00c9794565972ed838cd3de2812f6fa59d877d6963c88ec`.
  The signed action evidence, active TEE binding, and recovery materialization
  run are linked from the deployment file.
- Child Accords were materialized for providers A, B, and C. Each provider then
  transferred its exact `3,000,000` base-unit allocation, moving the root from
  `FUNDING` to `ACTIVE` and increasing committed capacity to `9,000,000`.
- The treasury executed draw
  `0x85f634b07d8dfd83fe0f0f1a9b34504973e5e2d5e1e3886656bfb072c26f56ec` for
  `4,000,000` base units across two DrawLegs, then repaid the draw through a
  real USDT0 transfer. Final observed state is root `ACTIVE`, committed
  `9,000,000`, drawn `0`, and available `9,000,000`.
- The complete funding/draw/repayment job passed in
  [GitHub Actions run 31734593116](https://github.com/etvjay/Concord/actions/runs/31734593116),
  with the public evidence artifact at
  [9194681063](https://github.com/etvjay/Concord/actions/runs/31734593116/artifacts/9194681063).
- The FCC round and materialization receipts are preserved in the earlier
  [FCC run 31733200629](https://github.com/etvjay/Concord/actions/runs/31733200629),
  its [signed action artifact 9194157272](https://github.com/etvjay/Concord/actions/runs/31733200629/artifacts/9194157272),
  and the [materialization recovery run 31733740564](https://github.com/etvjay/Concord/actions/runs/31733740564).
- The Coston2 indexer configuration is stored as encrypted GitHub Actions
  secrets. The recorded FCC registration and instruction path used the stable
  Workers.dev relay as a development ingress fallback, not a named Cloudflare
  Tunnel or production hardware-TEE claim.

## Not yet evidenced / intentionally bounded

- Production hardware-backed TEE execution has not been claimed; the hosted
  runtime uses the documented Coston2 simulated development TEE path.
- A named Cloudflare Tunnel or custom-domain ingress has not been provisioned;
  the current Workers.dev relay is a development Worker forwarding to
  Northflank, not a production ingress claim.
- The current public `/info` binding is evidenced by the credential-free
  `scripts/judge-check.sh` path. The optional live registry check remains
  intentionally pending until the current simulated identity is deliberately
  registered and a fresh availability proof exists.
- The institutional frontend now builds canonical draw calldata locally,
  requires the recorded treasury borrower on Coston2, shows the unsigned intent
  before a separate wallet-approval action, and waits for a public receipt.
  The Borrower Sandbox can also prepare the first fresh-facility
  `createRootAccord` intent, where `msg.sender` becomes the borrower. It does
  not yet surface collateral approval, provider funding, verifier, or
  automatic runner actions; those remain explicit team-operated boundaries.
  The canonical evidence above still comes from the contract/FCC runners and
  explorer receipts; browser-submitted transactions are reported separately.
- The Northflank runtime bundle is deployed and reproducible. The fresh hosted
  simulated TEE identity must still be registered and the stale machine paused
  before it can be presented as the active onchain machine. No endpoint is
  called continuously available or used for a new FCC dispatch until those
  gates are complete.

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

- Current handoff commit `155c05ea41262ae391ed3426ada5cb677092203b` passed the
  [Concord verification run](https://github.com/etvjay/Concord/actions/runs/31792244127),
  including Solidity/Foundry, Go extension and tooling, TypeScript SDK, and
  repository/documentation gates.
- The same commit passed the read-only
  [Coston2 asset-resolution run](https://github.com/etvjay/Concord/actions/runs/31792244126)
  and the manually dispatched
  [frontend workflow](https://github.com/etvjay/Concord/actions/runs/31792436520),
  including the production frontend Docker build.

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
- That setup run proves registration and live FCC ingress. The later FCC
  recovery and facility lifecycle runs below extend the evidence to quote
  submission, CoFill finalization, provider funding, draw settlement,
  repayment, and restored capacity.
- The live FCC round, signed-result verification, Child Accord materialization,
  provider funding, two-leg draw, real USDT0 repayment, and restored-capacity
  assertions passed in the [FCC recovery run](https://github.com/etvjay/Concord/actions/runs/31733740564)
  and the [complete facility lifecycle run](https://github.com/etvjay/Concord/actions/runs/31734593116).
  This is Coston2 simulated-development-TEE evidence with public settlement
  receipts; it is not production hardware-TEE evidence.
