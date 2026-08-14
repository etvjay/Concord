# Concord

Concord is a confidential programmable relationship system for coordinating
capital between independent parties on Flare.

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
  tracks the public receipt without retaining keys.

## Truth boundary

This repository does not claim private FXRP or USDT0 transfers, private EVM
execution, or production hardware-backed confidentiality. Coston2 FCC
development may use the documented simulated TEE path. Public settlement,
root/child exposure, accepted executable capacity, and lineage remain onchain.

The allocation verifier is an explicit boundary: an offchain verifier must
validate the FCC result binding, active machine/signature evidence, operation,
round, root, and digest before calling `markAllocationVerified`. The first
checkpoint does not pretend that an EOA is a native FCC proof verifier.

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
complete active-machine, provider-funding, multi-child settlement, repayment,
and restored-capacity proof is recorded there with transaction and workflow
evidence.

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

The current always-on FCC development-host plan and safe simulated-TEE identity
cutover are in
[docs/fcc-always-on-hosting.md](docs/fcc-always-on-hosting.md). The
judge-ready walkthrough, evidence ledger, claim boundary, and submission copy
are in [docs/DEMO_AND_SUBMISSION.md](docs/DEMO_AND_SUBMISSION.md).

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
