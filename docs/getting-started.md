# Getting started

The durable source checkout is /workspace/Concord in this build environment.
The runtime foundation is the official Flare FCE scaffold; the Concord
implementation is the Go extension under go/.

## Local verification

Use Foundry and Go from the installed toolchain or your own equivalent:

~~~bash
export PATH=/workspace/tooling/foundry:/workspace/tooling/go/bin:$PATH
export FOUNDRY_SOLC=/workspace/tooling/solc-0.8.27

forge test
(cd go && GOTOOLCHAIN=local go test ./...)
(cd tools && GOTOOLCHAIN=local go test ./...)
~~~

The Solidity flow test covers root creation, FXRP collateral, a verified
allocation, two funded child Accords, a multi-child draw, repayment, restored
capacity, child closure and root closure. The Go tests cover encrypted-action
dispatch, signed quote validation, deterministic ordering, partial final
allocation, invalid signatures and insufficient capacity.

Generate the instruction-sender binding after changing its ABI:

~~~bash
./scripts/generate-bindings.sh
~~~

## Coston2 asset resolution

The current target is Coston2, chain ID 114. Resolve and validate live asset
metadata before deployment:

~~~bash
./scripts/resolve-coston2-assets.sh
~~~

The resolver obtains AssetManagerFXRP from Flare's ContractRegistry and then
calls fAsset(). USDT0 is kept in the centralized Coston2 network config and
validated by live symbol, decimals and bytecode because it is not currently a
named entry in the checked-in Flare ContractRegistry package.

## Deployment inputs

Concord deployment is intentionally two-phase: the FCC instruction sender is
deployed and registered first, then the economic facility is deployed with
the resulting extension id. Do not deploy the facility with a guessed id.

The official scaffold lifecycle remains available through pre-build.sh.
It deploys the Concord instruction sender with the configured scaffold
registries, registers the extension, and writes the live values to
config/extension.env:

~~~bash
export CHAIN=coston2
export DEPLOYMENT_PRIVATE_KEY=0x...
./scripts/pre-build.sh
source ./config/extension.env
~~~

For a standalone Foundry sender deployment, use the explicit sender phase
and complete FCC registration through the official scaffold tooling before
running the facility phase:

~~~bash
export DEPLOYMENT_OWNER=0x...
export DEPLOYMENT_PRIVATE_KEY=0x...
export TEE_EXTENSION_REGISTRY=0x...
export TEE_MACHINE_REGISTRY=0x...
DEPLOY_PHASE=sender ./scripts/deploy-coston2.sh
~~~

After registration, set CONCORD_EXTENSION_ID to the registered extension
id and deploy the Accord/facility contracts:

~~~bash
export DEPLOYMENT_OWNER=0x...
export DEPLOYMENT_PRIVATE_KEY=0x...
export ALLOCATION_VERIFIER=0x...
export CONCORD_EXTENSION_ID=0x...
DEPLOY_PHASE=facility ./scripts/deploy-coston2.sh
~~~

The TEE registry values are normally the Coston2 FlareTeeManager diamond
address used by the official scaffold tooling. The script does not guess
them. Keep private keys in an ignored .env, never in source or compose
defaults.

## FCC sequence

Registration and proxy setup follow the current Flare FCE scaffold sequence:

~~~text
register extension → start official proxy/TEE scaffold → submit encrypted quotes
→ finalize encrypted round → verify result offchain → mark digest → materialize children
~~~

The runner writes the raw successful FCC allocation response with `-out`.
The verifier then checks the response against the deployed facility allocation
verifier boundary: extension id, open round, root binding, target capacity,
fee limits, eligible providers, and the canonical result digest. It is
read-only unless `-mark` is supplied:

~~~bash
cd tools
go run ./cmd/verify-allocation -c https://coston2-api.flare.network/ext/C/rpc -facility 0x... -result ../evidence/allocation.json -extensionId 0x... -roundId 0x... -rootAccordId 0x... -out ../evidence/allocation-verification.json

# Only after the local checks pass, with DEPLOYMENT_PRIVATE_KEY set to
# the facility allocationVerifier address:
go run ./cmd/verify-allocation -c https://coston2-api.flare.network/ext/C/rpc -facility 0x... -result ../evidence/allocation.json -extensionId 0x... -roundId 0x... -rootAccordId 0x... -mark -out ../evidence/allocation-verification.json
~~~

No live FCC or facility deployment is claimed by local tests alone. See
CONCORD_STATUS.md for the current evidence boundary.
