# Coston2 live integration runbook

This is the operator path for the first truthful Concord vertical slice. It is
an execution checklist, not deployment evidence by itself or a substitute for
the recorded deployment evidence. The observed
2026-08-13 Coston2 run is recorded in
`config/coston2/concord-deployment.json` and summarized in
`docs/CONCORD_STATUS.md`. A fresh run must produce its own receipts before it
changes the recorded status.

## Current gate

The first complete credential-gated Coston2 run has passed. The read-only asset
resolver can still run from GitHub Actions or a local Foundry installation, and
the same guarded workflow can be repeated against a newly created disposable
environment. No private key or proxy credential belongs in the repository.

The current development path may use `SIMULATED_TEE=true`. That proves the
documented development integration path only; it is not production
hardware-backed TEE evidence. The Coston2 machine must still reach status `2`
(`PRODUCTION`) with a fresh availability check, a registered `teeId`, and one
stable public HTTPS URL. The extension proxy receives provider delivery on its
external port `6664` (the scaffold's Docker host mapping is `6674`).

## Required inputs

| Input | Why it is required |
|---|---|
| Funded Coston2 deployment key | Pays gas for sender, facility, root, collateral, and lifecycle transactions |
| Treasury and provider accounts | Demonstrate actual USDT0 funding from at least two selected providers |
| Current Flare scaffold registry configuration | Registers the Concord extension against the live Coston2 FCC path |
| Stable named-tunnel `EXT_PROXY_URL` | Lets the official proxy route instructions to the Go extension; rotating quick tunnels are not valid for registration |
| Indexer/proxy configuration | Required by the official scaffold runtime; credentials stay outside Git |
| Three signed Concord quote payloads | Demonstrate the private multi-provider input path |
| One signed finalize payload | Binds the round, root Accord, policy bounds, and eligible providers |

For the immediate hackathon fallback, the stable Worker development relay may
replace the named tunnel URL only after both the Worker and its Codespaces
upstream return the same proxy /info binding. This is an ingress substitution,
not a change to the FCE runtime or Concord product semantics.

Never paste credentials into issues, logs, fixtures, or committed config. Use
ignored environment files or the deployment system secret store.

## Execution order

### 1. Run the read-only preflight

Validate the local config before using any funded account. In offline mode the
command makes no RPC request:

~~~bash
./scripts/coston2-preflight.sh --offline
~~~

After the public addresses and FCC proxy are available, repeat it with live
bindings:

~~~bash
./scripts/coston2-preflight.sh \
  --proxy "$EXT_PROXY_URL" \
  --extension-id "$CONCORD_EXTENSION_ID" \
  --facility "$CAPITAL_FACILITY" \
  --registry "$ACCORD_REGISTRY" \
  --sender "$CONCORD_INSTRUCTION_SENDER"
~~~

It confirms Coston2 chain ID 114, re-runs the current asset resolver, and
optionally checks public bytecode and the proxy `/info` extension binding. It
never signs or broadcasts. If `SIMULATED_TEE=true`, the output is development
path evidence only.
### 2. Resolve current Coston2 assets

Run the resolver before deployment and stop on any mismatch. It obtains the FXRP
manager through Flare's ContractRegistry, resolves `fAsset()`, and validates the
configured USDT0 contract by bytecode, symbol, and decimals.

~~~bash
./scripts/resolve-coston2-assets.sh
~~~

The GitHub workflow named `Coston2 asset resolution` is the same read-only gate.
A successful run may be cited for asset resolution, but it is not deployment or
FCC evidence.

### 3. Configure the official FCE scaffold

Use the current official scaffold sequence and set the Coston2 values explicitly:

~~~bash
export CHAIN=coston2
export CHAIN_URL=https://coston2-api.flare.network/ext/C/rpc
export LOCAL_MODE=false
export SIMULATED_TEE=true
export EXT_PROXY_URL=https://your-public-tunnel.example
export DEPLOYMENT_PRIVATE_KEY=0x...
~~~

The proxy must expose the scaffold port required by the checked-in configuration.
Confirm its `/info` response before sending any Concord instruction.

~~~bash
curl -s "$EXT_PROXY_URL/info" | jq '{extensionId, codeHash, platform}'
~~~

If `platform` is the simulated development value or the code hash is documented
as simulated, preserve that limitation in every demo and release note.

The observed run used
`https://concord-fcc-ingress.microcosm.workers.dev` as the stable Workers.dev
relay, extension `66188`, and simulated TEE id
`0xeE39d5e7d1C5043232282e3CC884B41a9Db22c85`. The relay is a development
fallback backed by the disposable Codespace proxy; it is not a named tunnel or
production ingress claim.

### 4. Deploy and register in two phases

Deploy the instruction sender first. Register the extension through the official
scaffold, call the one-shot `setExtensionId()`, and record the resulting live
extension id. Only then deploy the Accord registry and CapitalFacility with that
id and the configured allocation verifier.

~~~bash
export DEPLOYMENT_OWNER=0x...
export TEE_EXTENSION_REGISTRY=0x...
export TEE_MACHINE_REGISTRY=0x...
DEPLOY_PHASE=sender ./scripts/deploy-coston2.sh

source ./config/extension.env
export CONCORD_EXTENSION_ID=0x...
export ALLOCATION_VERIFIER=0x...
DEPLOY_PHASE=facility ./scripts/deploy-coston2.sh
~~~

Do not fill registry addresses or extension ids from memory. Resolve them from
the current official scaffold/configuration and record the source used.

### 5. Run the relationship lifecycle

1. Treasury creates the FXRP-backed root Accord and locks FXRP.
2. Treasury opens the Makkari syndication round with target, fee, expiry, and
   eligible-provider bounds.
3. At least three independent providers submit signed quote payloads through
   encrypted `SUBMIT_QUOTE` instructions.
4. Submit one `FINALIZE_ROUND` instruction and retain the complete signed FCC
   action-evidence envelope.
5. Verify the signed result offchain against the live extension, round, root,
   policy, eligible providers, active TEE machine, and canonical digest.
6. Use `-mark` only after the read-only verification succeeds and only from the
   configured allocation verifier.
7. Materialize the selected Child Accords. They remain selected until providers
   actually transfer USDT0.
8. Have at least two selected providers fund their exact allocations. Capture
   the ERC-20 transfer receipts before treating commitments as funded.
9. Activate the root only after funded child capacity is sufficient.
10. Draw once across at least two Child Accords and retain every DrawLeg.
11. Repay through the actual USDT0 transfer, then verify child and root exposure
    decrease and available capacity returns.

### 6. Verify and record evidence

Use the committed template as the shape of the final evidence packet:

[coston2-evidence.template.json](templates/coston2-evidence.template.json)

Record only observed values:

- network, chain id, and resolver output;
- AccordRegistry, CapitalFacility, and instruction-sender addresses;
- extension id, active machine identity, round id, instruction ids, and result digest;
- root, child, draw, DrawLeg, funding, repayment, and closure transaction hashes;
- explorer links and timestamps;
- whether the TEE path was simulated or hardware-backed;
- any failure, retry, expiry, or replay result that affects the claim.

For the completed 2026-08-13 run, use the recorded
[facility lifecycle workflow](https://github.com/etvjay/Concord/actions/runs/31734593116),
[facility evidence artifact](https://github.com/etvjay/Concord/actions/runs/31734593116/artifacts/9194681063),
[FCC workflow](https://github.com/etvjay/Concord/actions/runs/31733200629), and
[materialization recovery workflow](https://github.com/etvjay/Concord/actions/runs/31733740564)
as the public CI evidence trail. The exact hashes remain in the deployment JSON.

## Hard stop conditions

- Asset resolver output differs from the centralized config.
- The public proxy `/info` response is unreachable or bound to the wrong extension.
- The machine is not status `2` (`PRODUCTION`) or its availability check is stale.
- More than one active machine is registered for the extension.
- Any quote signature, expiry, fee bound, root binding, or provider eligibility check fails.
- A result is replayed, bound to another round/root/extension, or has no verified digest.
- A selected child is described as committed before the provider's USDT0 transfer succeeds.
- A repayment state change is recorded before the relevant ERC-20 transfer succeeds.
- Any step would require putting a private key or credential in Git.

## Claim boundary

A successful local test or resolver run does not prove the Concord vertical slice.
The MVP is proven only when the causal chain is visible with Coston2 evidence:

~~~text
Root Accord → Makkari → CoFill → Child Accords → funded commitments
→ multi-child draw → real settlement → repayment → restored capacity → lineage
~~~

Do not claim private FXRP transfers, private USDT0 transfers, fully private EVM
execution, or production hardware-backed confidential execution from this path.

## Official references

- [Build Your First FCC Extension](https://dev.flare.network/fcc/guides/getting-started)
- [Coston2 network overview](https://dev.flare.network/network/overview)
- [FXRP address guidance](https://dev.flare.network/fxrp/token-interactions/fxrp-address)
- [Official FCE scaffold](https://github.com/flare-foundation/fce-extension-scaffold)
