# Concord frontend map

This is the frontend implementation map for the current product phase. It is a
map over the shared product contract, not a second protocol design. The
recorded evidence view, local Guided Demo, and wallet-bound Borrower Sandbox
are intentionally separate surfaces.

## Product shell

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Concord   Facilities   Docs                      Help  Network  Wallet │
├──────────────────────────────────────────────────────────────────────┤
│ Back to parent · Facilities / Current facility / Current detail       │
├──────────────────────────────────────────────────────────────────────┤
│ Root Accord · state · FXRP collateral · committed · drawn · available │
│ expiry · plain-language state · next permitted action                 │
├──────────────────────────────────────────────────────────────────────┤
│ Relationship spine: Root → Makkari → CoFill → children → draw legs    │
├──────────────────────────────────────────────────────────────────────┤
│ Child Accords · provider · selected · funded · drawn · available      │
├──────────────────────────────────────────────────────────────────────┤
│ Activity · evidence · action review                                   │
└──────────────────────────────────────────────────────────────────────┘
```

The first version uses one global header and no permanent desktop sidebar.
Facilities is the sole product-level destination; Docs and Help are supporting
utilities. A simple in-content parent return and breadcrumb state where the
user is. Once inside a facility, stable tabs expose Overview, Funding,
Activity, Evidence, and Lineage. There are no global Next/Previous controls and
no mobile bottom navigation duplicating those tabs. On mobile, the header
collapses into an accessible hamburger drawer and the parent return remains
visible.

Human-first page titles carry a smaller canonical label such as `ROOT ACCORD`,
`MAKKARI SESSION`, or `DRAW · DRAW LEGS`. Definitions are available in place
through an information control. A dismissible first-use primer, optional
five-step tour, and persistent Help/glossary menu teach the product without
interrupting repeat use.

The relationship view is the primary screen. A chart or graph is subordinate
to readable relationship cards and exact amounts; the graph is not decoration
and cannot be the only way to understand causality.

## Routes

| Route | Purpose | Required contract data |
|---|---|---|
| `/` | Outcome-first product story, wallet entry, and public proof | recorded evidence, network identity |
| `/demo` | Deterministic six-stage team walkthrough with no writes | local scenario state, recorded terminology |
| `/borrower` | Fresh wallet-bound borrower lifecycle boundary | Coston2 contract/assets, connected wallet, unsigned Root, collateral, and session intents |
| `/docs` | Deployed documentation hub for the demo, proof, and truth boundary | repository-backed links and frontend routes |
| `/facilities` | Facility register | accessible/recorded facilities and current state |
| `/facilities/:rootAccordId` | Primary Root Accord workspace | facility, round, children, invariants |
| `/facilities/:rootAccordId/funding` | Formation and funded Child Accords | round, allocation, funded children |
| `/facilities/:rootAccordId/activity` | Causally ordered lifecycle activity | facility events and receipts |
| `/facilities/:rootAccordId/evidence` | Facility verification boundary | FCC and public-chain evidence |
| `/facilities/:rootAccordId/lineage` | Full causal relationship trail | lineage, linked public actions |
| `/rounds/:roundId` | Makkari/CoFill status | round, authorization-scoped evidence |
| `/children/:childAccordId` | Provider relationship view | child, root summary, funding/exposure |
| `/draws/:drawId` | One draw and its explicit legs | draw, child/provider links, settlements |
| `/evidence/:resultDigest` | Verification and disclosure boundary | evidence metadata, source, warning |
| `/settings` | Network/assets and disclosure settings | network config, asset decimals |

## Wayfinding contract

The facility workspace has one stable hierarchy:

```text
Facilities → Facility → {Overview | Funding | Activity | Evidence | Lineage}
```

Detail objects return to the section that owns them: rounds and Child Accords
return to Funding, draws return to Activity, and allocation results return to
Evidence. Each detail exposes a breadcrumb and labelled parent return. There is
no forced lifecycle tour in normal navigation; users choose the facility tab
that answers their question. Route changes reset the document to the top so the
destination title and context are never hidden by a previous page's scroll
position.

## Components

```text
AppShell
├─ RoleContext
├─ NetworkStatus
├─ WalletBoundary
├─ FacilityList
└─ FacilityWorkspace
   ├─ RelationshipHeader
   ├─ FacilityMetrics
   ├─ StateExplanation
   ├─ NextActionCard
   ├─ RelationshipTopology
   │  ├─ RootAccordNode
   │  ├─ MakkariNode
   │  ├─ CoFillNode
   │  ├─ ChildAccordNode[]
   │  └─ DrawLegNode[]
   ├─ ChildAccordTable
   ├─ ActivityTimeline
   ├─ EvidencePanel
   └─ ActionReviewModal
      ├─ HumanSummary
      ├─ Preconditions
      ├─ ContractTarget
      ├─ WalletRequest
      └─ ReceiptResult
```

The `ActionReviewModal` never displays “completed” merely because a wallet
request was submitted. Its states are `draft`, `awaiting_signature`,
`submitted`, `confirmed`, `reverted`, and `not_observed`.

## Role surfaces

### Treasury

The treasury sees the facility lifecycle in order:

1. Create Root Accord.
2. Lock FXRP collateral.
3. Open the Makkari round.
4. Review the verified CoFill allocation.
5. Monitor selected versus funded children.
6. Draw only within available capacity.
7. Repay and verify restored capacity.

The primary call-to-action is derived from the authoritative root state, not a
generic “continue” button.

### Provider

The provider sees eligible rounds, its own confidential quote workflow, and its
own child relationships. A selected card must say “selected, not funded” until
the USDT0 transfer succeeds. Provider data must never disclose losing quotes or
another provider's confidential constraints.

### Institution/operator

The institution view adds organization context, approvals, evidence export,
and activity filtering. It uses the same Root Accord, Child Accord, exposure,
and lineage fields as the treasury view.

### Auditor/observer

The observer view is read-only and emphasizes public commitments, transfers,
exposure, transaction receipts, and lineage. Private quote fields are visibly
marked `withheld`, not shown as empty or zero.

### Developer/agent

The agent surface is a compact API/MCP-oriented view. It can inspect the same
projection, explain why an action is available, and prepare an unsigned intent.
It must show the human approval boundary before handing anything to a wallet.

## State-to-action map

| Observed state | Guided explanation | Primary action |
|---|---|---|
| `PROPOSED` | “Your facility exists. Collateral is the next requirement.” | Prepare FXRP lock |
| `SYNDICATING` | “Providers are privately offering capacity.” | Monitor round / authorized quote action |
| `FUNDING` | “Providers were selected; funding is still being transferred.” | Provider funding / monitor |
| `ACTIVE` | “The facility is fully funded.” | Prepare draw |
| Draw outstanding | “This draw is supplied by these child relationships.” | Prepare repayment |
| Repaid | “Exposure fell and capacity returned.” | Review receipt / next draw |
| `CLOSED` | “The relationship is complete.” | View lineage and evidence |
| `EXPIRED` or `FROZEN` | “New financial actions are unavailable.” | View reason and evidence |

## Global and accessible behavior

- Use the user's locale for dates and number grouping, while retaining exact
  base-unit values in detail and copy-to-clipboard controls.
- Display token symbol, decimals, network, and contract address together when
  an amount could be misunderstood.
- Never rely on color alone for state; use text, icons with labels, and status
  announcements.
- Support keyboard navigation, reduced motion, readable contrast, zoom, and
  narrow screens. The target is WCAG 2.2 AA where the chosen component stack
  supports it.
- Use human-readable labels first and canonical IDs on demand. Do not shorten
  two different identifiers to the same visible prefix in the same view.
- Surface stale, partial, and not-observed data as explicit states.
- Avoid regional assumptions in currency formatting, date order, language, and
  legal or institutional terminology.

## Frontend implementation boundary

The eventual React/TypeScript app should consume `@concord-protocol/sdk` and
never call contract methods directly from arbitrary components. Wallet calls
are made from an action boundary after the API/SDK returns an unsigned intent.
This keeps the same semantics across web, CLI, REST, MCP, and institution
integrations.

The current wallet foundation keeps the write boundary explicit. It connects
an injected wallet, switches to Coston2, reads the native balance, prepares
unsigned Root Accord and draw intents locally, and submits only after a
separate wallet approval. The recorded facility draw is restricted to its
observed borrower. The Borrower Sandbox binds a new Root Accord to the wallet
that calls `createRootAccord`, then prepares explicit FXRP approval,
`lockCollateral`, and bounded `openSyndication` intents for that same wallet.
It does not infer authority for the recorded facility, fabricate provider or
FCC evidence, automatically fund providers, or silently broadcast runner
actions.
