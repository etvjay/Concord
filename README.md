# Concord

**Demo video:** [Watch the Concord demo on Loom](https://www.loom.com/share/7094452a68b04aac8bb07386acb25ade)<br>
**Website:** [Open the live Concord website](https://concord-flare.pages.dev/) · [Run the guided demo](https://concord-flare.pages.dev/demo)

Concord is a confidential coordination and execution layer for programmable
multi-party capital relationships on Flare.

The MVP is an FXRP-backed syndicated capital facility:

```text
Root Accord
  └─ Makkari session
       └─ CoFill allocation
            └─ Child Accords
                 └─ funded commitments
                      └─ multi-child draw and DrawLegs
                           └─ repayment and restored capacity
```

The persistent economic relationship is the canonical object. Transactions,
FCC sessions, allocations, child relationships, draws, legs, settlements, and
repayments are explicit nodes in its lineage.

> Concord makes the relationship that governs capital programmable.

This is intentionally narrower than “blockchain syndicated lending.” Concord
is not a complete loan-servicing or agent-bank replacement. The MVP demonstrates
a relationship primitive and one recorded facility lifecycle that existing
financial infrastructure could eventually sit around or above.

## Start here

The frontend has explicit paths for the evaluator and the team:

| Path | Purpose | Write boundary |
|---|---|---|
| / | Product story and evidence boundary | None |
| /demo | Six-stage deterministic Guided Demo | No wallet, RPC, or Coston2 writes |
| /facilities/0x6e03af41b0194c5a369a50629474090cfc5b041a712144855e6efb1a574cfddd | Recorded Coston2 facility | Read presentation of recorded evidence |
| /borrower | Fresh wallet-bound borrower lifecycle sandbox | Explicit wallet approval for Root, FXRP approval, collateral lock, and provider-session opening |
| /docs | Deployed documentation hub | None |

For the fastest walkthrough:

~~~bash
cd frontend
npm ci --ignore-scripts --no-audit --no-fund
npm run dev
~~~

Open http://localhost:5173/demo. The Guided Demo is a deterministic scenario
replay, not additional chain evidence. Use the recorded facility and the
evidence ledger for the observed proof.

## Why the relationship primitive matters

Concord's distinct design choice is to keep the shared capital relationship
alive across the lifecycle instead of flattening it into a loan record or one
anonymous liquidity balance:

1. **Relationship-native architecture.** Root Accord is canonical; transactions
   are consequences in its lineage.
2. **Private formation, verifiable consequence.** Provider terms are coordinated
   inside the intended FCC confidentiality boundary, while the accepted result
   is bound to public execution context.
3. **Selection is not commitment.** An allocation does not become liquidity
   until the provider's transfer succeeds.
4. **Child-level exposure.** The facility aggregates capacity without erasing
   which provider funded each draw leg.
5. **Bounded authority and evidence.** The verifier, borrower, provider, wallet,
   and runtime have distinct responsibilities; missing or simulated evidence
   is not presented as production proof.

The first vertical is therefore a concrete test of a more reusable primitive:
a parent relationship that coordinates independent capital providers while
retaining their terms, exposure, authority, and settlement lineage.

## Current implementation

- Solidity `AccordRegistry` stores relationship identity and parent-child
  lineage.
- `CapitalFacility` enforces FXRP collateral, USDT0 funding, selected versus
  funded capacity, deterministic multi-child draws, exposure accounting,
  repayment, expiry, and close rules.
- `ConcordInstructionSender` submits encrypted `SUBMIT_QUOTE` and
  `FINALIZE_ROUND` instructions through the official Flare FCC scaffold.
- The Go extension validates signed provider quotes and runs deterministic
  lowest-fee-first CoFill with a partial final allocation.
- The FCC extension requires ECIES-encrypted payloads through the TEE decrypt
  endpoint. Local unit tests inject a decrypt function; they do not turn the
  production handler into a plaintext path.
- The React frontend renders the recorded Coston2 Root Accord, Makkari/CoFill
  formation, three funded Child Accords, explicit draw legs, repayment,
  restored capacity, and evidence boundary through one shared SDK model. It
  connects injected wallets, switches to Coston2, reads live capacity, prepares
  canonical draw calldata locally, requires a separate wallet approval, and
  tracks the public receipt without retaining keys. It also provides a
  transaction-free six-step Guided Demo and a separate wallet-bound Borrower
  Sandbox that can create a fresh Root Accord, approve and lock 1 FXRP, and
  open a bounded provider session without reusing the recorded facility. The
  sandbox stops before provider quotes, FCC/CoFill evidence, Child Accord
  materialization, provider funding, draw, or repayment.

## Truth boundary

This repository does not claim private FXRP or USDT0 transfers, private EVM
execution, or production hardware-backed confidentiality. Coston2 FCC
development may use the documented simulated TEE path. Public settlement,
root/child exposure, accepted executable capacity, and lineage remain onchain.

The allocation verifier is an explicit boundary: an offchain verifier must
validate the FCC result binding, active machine/signature evidence, operation,
round, root, and digest before calling `markAllocationVerified`. The first
checkpoint does not pretend that an EOA is a native FCC proof verifier.

## Architecture in plain language

| Term | Plain-language meaning |
|---|---|
| Accord | A persistent economic relationship recorded onchain. |
| Root Accord | The facility-level relationship: collateral, capacity, exposure, and lifecycle. |
| Child Accord | One provider's governed commitment inside the root relationship. |
| Makkari session | The bounded FCC session where provider terms are coordinated confidentially. |
| CoFill | The deterministic allocator that chooses the lowest-fee eligible offers. |
| FCC proxy | The HTTPS doorway that receives FCC traffic and forwards it to the private runtime. |
| TEE | The service that decrypts and signs FCC development responses; here it is simulated, not hardware-backed. |
| Redis | Private queue/state support for the proxy; it is not the economic source of truth. |

The public economic truth is on Coston2: accepted capacity, funding, draws,
repayment, and parent-child lineage. The hosted proxy/TEE is an operational
development path around that onchain relationship.

## Build and test

The canonical extension runtime is the current Flare FCE scaffold, with Go as
the Concord implementation language. Install Foundry and Go 1.25.1+, then:

```bash
forge test

(cd go && GOTOOLCHAIN=local go test ./...)
(cd tools && GOTOOLCHAIN=local go test ./...)
```

Use an installed Foundry/Go toolchain, or set `PATH` and `FOUNDRY_SOLC` to
your own toolchain locations. The repository does not depend on a
workspace-specific tool path.

Generate deployment bindings after changing the instruction sender:

```bash
./scripts/generate-bindings.sh
```

The current Coston2 FCC sequence remains the official scaffold sequence:

```text
pre-build → start-services --chain coston2 → post-build → run-test
```

The observed Coston2 sender, FCC extension registration, and facility deployment
receipts are recorded in [docs/CONCORD_STATUS.md](docs/CONCORD_STATUS.md). The
complete provider-funding, multi-child settlement, repayment, and
restored-capacity proof is recorded there with transaction and workflow
evidence. The latest hosted development checkpoint is recorded in
[docs/current-runtime.md](docs/current-runtime.md); it has a fresh public
`/info` check, but its newly generated simulated TEE identity is not yet an
onchain-registered machine.

Build the frontend from its exact lockfile:

```bash
(cd frontend && npm ci --ignore-scripts --no-audit --no-fund)
(cd frontend && npm run build && npm test)
```

The root [`vercel.json`](vercel.json) deploys the same frontend from the
repository root so the shared SDK and recorded Coston2 deployment remain
available to the build. It also applies the single-page application fallback
for direct facility, funding, evidence, child, and draw URLs. Vercel Deployment
Protection must be disabled for the production URL before it is described as
public.

The 2026-08-14 checkpoint has no public Vercel frontend URL yet: the connected
team rejected Production deployment with HTTP 403 until the integration is
granted Production Deploy permission. The Vercel project must also have
Settings → Deployment Protection → Vercel Authentication disabled for
Production. The FCC development runtime is now running on Northflank with the
Cloudflare Worker relay; see the [current status](docs/CONCORD_STATUS.md) and
[current runtime checkpoint](docs/current-runtime.md) before making a
hosting or registration claim.

The current always-on FCC development-host plan and safe simulated-TEE identity
cutover are in
[docs/fcc-always-on-hosting.md](docs/fcc-always-on-hosting.md). The
judge-ready walkthrough, evidence ledger, claim boundary, and submission copy
are in [docs/DEMO_AND_SUBMISSION.md](docs/DEMO_AND_SUBMISSION.md).
From a clean checkout, run `./scripts/judge-check.sh` for the credential-free,
read-only judge preflight. Use `--registry` only after the current simulated
TEE has been deliberately registered and its availability has been verified.

## Repository map

```text
contracts/
  AccordRegistry.sol
  CapitalFacility.sol
  ConcordInstructionSender.sol
  ConcordTypes.sol
  interfaces/
  test/
go/                         FCC extension and CoFill
tools/                      deployment, FCC verification, and test commands
config/                     network and proxy configuration templates
docs/                       product, architecture, truth, and runbooks
scripts/                    scaffold lifecycle and binding commands
api/                        REST/OpenAPI integration contract
sdk/typescript/             typed read and unsigned-intent client
frontend/                   frontend boundary and implementation map
infra/northflank/           Northflank FCC proxy/TEE/Redis deployment contract
infra/railway/              long-running FCC proxy/TEE deployment config
```

## Shared surfaces

The shared product contract is documented in
[docs/shared-product-contract.md](docs/shared-product-contract.md). The
frontend map is in [docs/frontend-map.md](docs/frontend-map.md), and the
machine-readable REST contract is [api/openapi.yaml](api/openapi.yaml).

The unified CLI can check the environment and run the read-only API/MCP
surfaces:

```bash
./scripts/concord doctor --offline
./scripts/concord api -facility 0x... -registry 0x...
./scripts/concord mcp -api-url http://127.0.0.1:8080
```

These surfaces prepare unsigned transaction intents only. They do not custody,
sign, broadcast, or grant FCC verifier authority.

## Official Flare sources

- [Build Your First FCC Extension](https://dev.flare.network/fcc/guides/getting-started)
- [Coston2 network configuration](https://dev.flare.network/network/overview)
- [FXRP address guidance](https://dev.flare.network/fxrp/token-interactions/fxrp-address)
- [Official FCE scaffold](https://github.com/flare-foundation/fce-extension-scaffold)
- [Official Foundry periphery package](https://github.com/flare-foundation/flare-foundry-periphery-package)
