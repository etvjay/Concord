# Coston2 and lifecycle failure matrix

Status: active pre-deployment experiment plan

This matrix applies Experiment Foundry discipline to Concord's MVP. It tests
whether every state-changing path either rejects an invalid action or waits for
an authoritative onchain/FCC observation before describing the action as
successful. It does not expand Concord beyond the FXRP-backed syndicated
facility vertical slice.

## Hypothesis

Concord's contract, FCC extension, verifier, API, SDK, CLI, and MCP boundaries
preserve the same relationship semantics under malformed input, replay, expiry,
partial funding, insufficient capacity, and missing live evidence. No client
surface can turn an unsigned intent, local test actor, or simulated development
result into a committed capital, settlement, or production-confidentiality
claim.

## Automated cases

| Area | Failure or invariant case | Expected observation |
|---|---|---|
| FCC | invalid provider signature | quote rejected; no allocation slot |
| FCC | expired quote | quote rejected deterministically |
| FCC | fee above round policy | quote rejected deterministically |
| FCC | malformed action payload | strict decode failure |
| FCC | duplicate provider or nonce ambiguity | explicit failure or deterministic rejection |
| CoFill | equal fees and provider tie | same sorted result for repeated input |
| CoFill | partial final provider allocation | allocated capacity stops exactly at target |
| CoFill | insufficient eligible capacity | explicit failure; no partial success |
| Verifier | wrong root, round, extension, digest, or TEE binding | verification fails before materialization |
| Contract | repeated allocation result | replay rejected |
| Contract | selected child before provider transfer | root committed capacity remains unchanged |
| Contract | provider overfunds selected allocation | transfer rejected |
| Contract | draw over available capacity | draw rejected; exposure unchanged |
| Contract | draw across two children | explicit DrawLegs sum to draw principal |
| Contract | partial repayment | draw-leg, child, and root exposure decrease together |
| Contract | active child expires with commitment below target | root demotes from ACTIVE to FUNDING |
| Contract | provider withdrawal while exposure exists | withdrawal rejected |
| Contract | collateral recovery while exposure exists | recovery rejected |
| Control plane | agent/API/SDK/MCP prepare action | unsigned intent only; explicit approval remains true |
| Control plane | no observed read model | response is not_observed; no success claim |

## Commands

Run the deterministic suites from a clean checkout:

~~~bash
forge test -vvv
(cd go && GOTOOLCHAIN=local go test ./...)
(cd tools && GOTOOLCHAIN=local go test ./...)
(cd sdk/typescript && npm install --ignore-scripts --no-audit --no-fund && npm run build)
./scripts/coston2-preflight.sh --offline
~~~

The shell and documentation gates also run in GitHub Actions. The preflight
offline mode validates the centralized Coston2 configuration without reaching
the network.

## Live-gated cases

These cases require current Coston2 credentials and a reachable official Flare
FCC scaffold/proxy. They are not claimed by local tests:

- `/info` identifies the intended Concord extension and reports its code hash;
- the extension is registered and an active TEE machine is observed;
- signed `SUBMIT_QUOTE` and `FINALIZE_ROUND` instructions produce a verified
  result bound to the intended root, round, extension, and digest;
- at least two selected providers transfer actual Coston2 USDT0;
- the root activates, a multi-child draw settles, and repayment restores
  capacity;
- explorer receipts make the full relationship lineage queryable.

## Evidence handling

Record only observed values in the evidence packet: transaction hashes,
instruction IDs, result digest, extension ID, machine identity, asset
resolution, state transitions, and explorer links. Keep private quote contents,
provider constraints, signing keys, proxy credentials, and decrypted FCC
inputs out of GitHub, logs, fixtures, and screenshots.

A simulated TEE may be used for development-path evidence when the current Flare
scaffold requires it. It must be labeled simulated development execution, not
production hardware-backed confidential execution. No test in this matrix
proves private FXRP transfers, private USDT0 transfers, or private EVM
settlement.

## Decision rule

The implementation may advance from this phase only when the automated cases
pass and the live-gated cases have real Coston2 artifacts. A green unit test,
frontend render, or mock FCC response is not sufficient to declare Concord's
vertical slice complete.

## Related records

- [Coston2 live runbook](../coston2-live-runbook.md)
- [Pre-deployment hardening](../pre-deployment-hardening.md)
- [Concord status](../CONCORD_STATUS.md)