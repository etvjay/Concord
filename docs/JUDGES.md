# Concord judge quickstart

This page is the shortest truthful path for evaluating Concord. A live Docker
endpoint is not required to inspect the completed Coston2 proof. The live FCC
runtime is an optional, scheduled verification path and must not be confused
with the recorded onchain evidence.

## What Concord is

Concord coordinates one FXRP-backed capital facility across independent
providers. A treasury creates a root Accord, provider terms enter a Makkari /
Flare Confidential Compute session, CoFill determines the allocation, and the
selected providers become independently governed child Accords. Funding, a
multi-child draw, repayment, and restored capacity remain queryable through the
root-child lineage.

## Five-minute evaluation path

1. Read the [current status](CONCORD_STATUS.md) and the
   [deployment record](../config/coston2/concord-deployment.json).
2. Open the [complete facility lifecycle run](https://github.com/etvjay/Concord/actions/runs/31734593116)
   and its [public evidence artifact](https://github.com/etvjay/Concord/actions/runs/31734593116/artifacts/9194681063).
3. Inspect the [FCC round run](https://github.com/etvjay/Concord/actions/runs/31733200629),
   [signed action evidence](https://github.com/etvjay/Concord/actions/runs/31733200629/artifacts/9194157272),
   and [materialization recovery run](https://github.com/etvjay/Concord/actions/runs/31733740564).
4. Verify the public Coston2 contract and settlement receipts in the
   [Coston2 explorer](https://coston2-explorer.flare.network):
   `CapitalFacility 0xfaff601a18a9fca33378953515aa0f3ef9286ecd` and
   `AccordRegistry 0x68b19a3967760489b57341669cd7ea960b5f7367`.
5. Review the contract lifecycle tests and the deterministic CoFill tests in
   `contracts/test/`, `go/`, and `tools/`.

## Observed result

The completed Coston2 flow used the six-decimal Coston2 USDT0 test token and
one FXRP collateral unit:

| Stage | Observed result |
|---|---|
| Root Accord | `ACTIVE`; `9,000,000` base units committed |
| FCC / CoFill | Three signed provider offers; digest `0xf17a292655b898d8b00c9794565972ed838cd3de2812f6fa59d877d6963c88ec` |
| Child Accords | Three children, `3,000,000` selected and funded per provider |
| Draw | `4,000,000` base units across two DrawLegs |
| Repayment | Real USDT0 repayment transaction completed |
| Final capacity | `9,000,000` committed, `0` drawn, `9,000,000` available |

The exact child IDs, transaction hashes, and invariant results are in the
deployment record and evidence artifact.

## Live verification boundary

Concord's recorded proof does not depend on a continuously running public app.
If a live FCC rerun is requested, the team must start the disposable Codespace
runtime, confirm the stable Workers.dev relay `/info` binding, and use the
credential-gated workflow. The runtime may be available only during a scheduled
judge window.

The relay used by the recorded run was:

`https://concord-fcc-ingress.microcosm.workers.dev`

It is a development ingress fallback backed by the Codespace proxy. It is not a
named Cloudflare Tunnel, permanent production hosting, or a production
hardware-backed TEE. As of the latest checkpoint, its `/info` endpoint is not
reachable because the backing Codespaces are shut down. Do not present it as a
live endpoint until `scripts/check-hosted-fcc.sh` passes against a fresh public
URL. Restarting the simulated TEE can require a new identity and fresh
registration, so no restart should be made immediately before a planned live
window without re-running the registration checks.

## What is and is not claimed

Claimed:

- Concord coordinates persistent capital relationships on Flare Coston2.
- Multiple providers contribute to one facility through child Accords.
- FXRP is used as root-facility collateral.
- FCC is used for confidential provider coordination.
- Public settlement and lineage receipts verify the economic lifecycle.

Not claimed:

- private FXRP or USDT0 transfers;
- fully private EVM execution;
- continuous public availability;
- production hardware-backed TEE security;
- production institutional readiness.

Never send private keys, indexer credentials, GitHub tokens, or tunnel tokens to
judges. They are not required to inspect the recorded proof.

## Reproducibility levels

- **Repository level:** contract, Go, tooling, and documentation checks can be
  run from a clean checkout.
- **Recorded-chain level:** judges can inspect the Coston2 transactions,
  workflow runs, allocation digest, child lineage, draw, and repayment without
  any private credential.
- **Live-FCC level:** a new confidential round requires the team-operated
  credential-gated runtime and an agreed live verification window.

The submission should be judged primarily from the first two levels. The third
level is an optional demonstration convenience, not a reason to claim that the
runtime is permanently hosted.
