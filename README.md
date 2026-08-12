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
PATH=/workspace/tooling/foundry:/workspace/tooling/go/bin:$PATH \
FOUNDRY_SOLC=/workspace/tooling/solc-0.8.27 \
forge test

(cd go && GOTOOLCHAIN=local go test ./...)
(cd tools && GOTOOLCHAIN=local go test ./...)
```

Generate deployment bindings after changing the instruction sender:

```bash
./scripts/generate-bindings.sh
```

The current Coston2 FCC sequence remains the official scaffold sequence:

```text
pre-build → start-services --chain coston2 → post-build → run-test
```

Concord's facility deployment and full Coston2 evidence are not claimed until
the necessary funded account, public proxy, provider offers, and transaction
receipts are available. See [docs/CONCORD_STATUS.md](docs/CONCORD_STATUS.md).

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
