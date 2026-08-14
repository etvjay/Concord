# Concord demo and submission handoff

This runbook presents the verified Concord MVP without making privacy or
deployment claims beyond the evidence. The canonical story is one persistent
capital relationship:

```text
Root Accord → Makkari → CoFill → Child Accords → funding
→ multi-provider draw → public settlement → repayment → restored capacity
```

## One-sentence product explanation

Concord lets a treasury form one FXRP-backed facility from multiple independent
USDT0 providers, coordinate eligible offers through Flare Confidential Compute,
and preserve explicit onchain lineage for every funded commitment, draw leg,
settlement, and repayment.

## Four-minute demo

### 0:00–0:35 — Start with the outcome

Open the landing page and say:

> A treasury needs one reusable facility, but its capital may come from several
> independent providers. Concord makes the facility the persistent object and
> keeps every provider commitment and movement attributable.

Open **Explore the facility record**. Point out that the page is rendering a
recorded Coston2 proof, not invented dashboard data. The frontend is a local or
preview presentation surface until a public host has been independently
verified.

### 0:35–1:15 — Explain the relationship

On **Overview**, show:

- one active Root Accord;
- 1 FXRP locked as collateral;
- 9 USDT0 committed by three providers;
- zero current exposure; and
- 9 USDT0 restored capacity after repayment.

Use the in-place Root Accord explanation. Do not describe a Root Accord as one
transaction; it is the relationship that persists across the lifecycle.

### 1:15–1:55 — Show private coordination and public commitments

Open **Funding**. Explain that Makkari is the bounded FCC funding session and
CoFill is the deterministic allocation. Three signed provider offers were
selected at 610, 640, and 680 bps for 3 USDT0 each.

State the boundary precisely: losing quotes and private provider constraints are
withheld; accepted commitments, token transfers, exposure, and lineage are
public on Coston2.

### 1:55–2:35 — Follow the capital

Open **Activity**, then the 4 USDT0 draw. Show the two explicit Draw Legs:

- Provider 1 supplied 3 USDT0.
- Provider 2 supplied 1 USDT0.

Show the repayment entry and return to Overview to connect repayment with the
restored 9 USDT0 capacity.

### 2:35–3:10 — Show verifiable evidence

Open **Evidence** and explain:

- FCC extension 66188 produced the signed allocation result;
- the verifier checked TEE identity/signature and chain, extension, round, root,
  and digest binding before materialization;
- the Coston2 run used the documented simulated development TEE path; and
- Concord does not claim private EVM execution, private token transfers, or
  production hardware-backed TEE security.

Open one explorer receipt and one GitHub Actions evidence run from the ledger
below.

### 3:10–4:00 — Show the action boundary

Return to Overview and select **Prepare a draw**.

1. The app reads live available capacity from the canonical CapitalFacility.
2. Connect the recorded treasury borrower and switch to Coston2.
3. Enter an amount and select **Prepare unsigned intent**.
4. Inspect chain 114, contract, Root Accord, amount, Draw ID, native value,
   preconditions, warnings, and full calldata.
5. Stop before **Approve in wallet** for a non-mutating demo.

If a fresh testnet transaction is intentionally required, the treasury must
approve it in the wallet. The presenter should then wait for the Coston2 receipt
and show the explorer link. Never use a provider or unrelated wallet for the
draw.

## Evidence ledger

| Claim | Evidence |
| --- | --- |
| Canonical contracts | [AccordRegistry](https://coston2-explorer.flare.network/address/0x68b19a3967760489b57341669cd7ea960b5f7367), [CapitalFacility](https://coston2-explorer.flare.network/address/0xfaff601a18a9fca33378953515aa0f3ef9286ecd) |
| Root created | [Transaction](https://coston2-explorer.flare.network/tx/0xd6e0e48abdf3e7cd3efc336df9d616f10c923ad69d0f6dbcfddbbe79f43cca71) |
| 1 FXRP collateral locked | [Transaction](https://coston2-explorer.flare.network/tx/0x618097ee2b6ab99e6eee868c596876e9cadf9b409335f7741d6fab8acbc77297) |
| Makkari round opened | [Transaction](https://coston2-explorer.flare.network/tx/0x393174832b260cdd34a91a3df24f23066ac3672a64f1b0bcf25468236b7314c8) |
| FCC result verified | [Verification transaction](https://coston2-explorer.flare.network/tx/0xb77400b70e8d54157fdb455b47797d5c583a387968afeb699319fe13fae95544), [FCC run](https://github.com/etvjay/Concord/actions/runs/31733200629) |
| Three Child Accords materialized | [Transaction](https://coston2-explorer.flare.network/tx/0x4cdd56ca3a80f83b6333e4e0434d4f202fcb9cf5ad5dd3ced820a53779a7559a) |
| 9 USDT0 funded | [Final provider funding transaction](https://coston2-explorer.flare.network/tx/0xfbb3fa72ab3294807697a6aa973247c786f85021f30d41568f2300dc27b0be0c) |
| 4 USDT0, two-leg draw | [Transaction](https://coston2-explorer.flare.network/tx/0xea0348757169428b73dbbc20eca7f2faf267c29941e5f0c0291bc3923b12cbe5) |
| Principal repaid; capacity restored | [Transaction](https://coston2-explorer.flare.network/tx/0xe2146fb4c498964754b5754a1dd91992c62e29d3d627cd6fb0ebba6432d8c46c), [lifecycle run](https://github.com/etvjay/Concord/actions/runs/31734593116) |
| Repository verification | [Full verification](https://github.com/etvjay/Concord/actions/runs/31792244127), [frontend verification](https://github.com/etvjay/Concord/actions/runs/31792436520) |

The machine-readable source of truth is
[`config/coston2/concord-deployment.json`](../config/coston2/concord-deployment.json).
It records the complete identifiers, receipts, blocks, warnings, and evidence
artifacts.

## Submission copy

### Approved voiceover

Use this version for the recording. It preserves the product thesis while
stating the privacy and development-TEE boundary precisely:

> Money is easy to transfer. Trust between institutions is much harder to
> coordinate.
>
> Today, capital coordination is fragmented across legal agreements, manual
> reviews, and intermediaries. Public blockchains make settlement visible, but
> institutions still need sensitive terms and constraints to remain private.
>
> Concord is a confidential programmable relationship system built on Flare.
> It treats the capital relationship—not a one-off transaction—as the primary
> object.
>
> Our first implementation is an FXRP-backed syndicated capital facility. One
> treasury creates a Root Accord that defines the borrower, collateral, target,
> policy, participants, and expiry. The treasury locks 1 FXRP, then opens a
> Makkari funding round for a 9 USDT0 target.
>
> Independent providers submit signed offers with capacity, pricing, and
> constraints. Concord's CoFill extension evaluates those offers through the
> Flare Confidential Compute development path. The provider inputs and losing
> terms remain within the intended confidential boundary while the result is
> deterministic and signed.
>
> A verifier checks the result against the active extension, round, Root Accord,
> chain, and allocation digest. Only then are Child Accords materialized—one
> explicit relationship per provider. Each provider transfers its 3 USDT0
> allocation, and the Root Accord becomes active with 9 USDT0 of committed
> capacity.
>
> Now follow one draw. A 4 USDT0 draw is split across two Child Accords: 3 USDT0
> from Provider 1 and 1 USDT0 from Provider 2. Those Draw Legs preserve exactly
> who funded each portion. The draw is settled publicly on Coston2, then repaid
> through the same facility. Exposure returns to zero and all 9 USDT0 of
> capacity is available again.
>
> This is a recorded Coston2 proof using the documented simulated development
> TEE path. Concord does not claim private FXRP or USDT0 transfers, private EVM
> state, or production hardware-backed TEE security. Its claim is narrower and
> more useful: confidential coordination can produce a verifiable public
> commitment, and that commitment can remain a living relationship through
> funding, draws, repayment, and restored capacity.

### Short description

Concord is a confidential programmable relationship system for syndicated
capital on Flare. Its MVP creates one FXRP-backed Root Accord, coordinates
signed provider offers through a Makkari FCC session, deterministically composes
eligible capacity with CoFill, materializes funded Child Accords, and records
multi-provider Draw Legs, public settlement, repayment, restored capacity, and
lineage. The observed Coston2 proof funded 9 USDT0 from three providers, drew 4
USDT0 across two commitments, repaid it, and restored all capacity.

### What is technically distinctive

- The persistent economic relationship—not a one-off transaction—is the primary
  object.
- Confidential coordination outputs are bound to public execution by a verifier
  checking signed FCC evidence and exact chain/extension/round/root/digest
  context.
- Selected capacity does not become committed capacity until the provider's
  USDT0 transfer succeeds.
- Every draw is decomposed into onchain provider Draw Legs; repayment reduces
  those same obligations and restores capacity.
- User actions retain a hard authority boundary: Concord prepares transparent
  unsigned intents; the institution's wallet reviews, signs, and broadcasts.

## Recording checklist

- Use the canonical branch and a green commit.
- Record at 1440p or higher with browser zoom between 90% and 100%.
- Keep the connected address visible when demonstrating the wallet boundary.
- Use the recorded facility for the main story; do not create a second facility
  for presentation convenience.
- Do not submit a fresh draw unless a subsequent repayment is also planned and
  the resulting receipts will be added to the deployment evidence.
- Show at least one Coston2 explorer receipt and one GitHub Actions evidence run.
- State “simulated development TEE” once, clearly.
- Add the final public frontend URL to the submission form only after its host
  and exact commit have been verified.
- Run `scripts/judge-check.sh` from the clean submission commit to verify the
  recorded proof and current public `/info` binding without credentials.
- The current Northflank/Worker runtime may be described as a reachable
  development checkpoint, not as a registered active machine, until
  `scripts/judge-check.sh --registry` passes during an explicitly approved
  live window.
- Do not dispatch a new Coston2 instruction or submit a new lifecycle
  transaction as part of a demo without recording the resulting receipts and
  obtaining the separate operator confirmation.
