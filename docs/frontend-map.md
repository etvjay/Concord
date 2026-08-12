# Concord frontend map

This is the frontend implementation map for the first product phase. It is a
map over the shared product contract, not a second protocol design. Full UI
implementation follows the live contract/FCC integration evidence gate.

## Product shell

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Concord   Facilities   Activity   Evidence            Network  Wallet │
├───────────────┬──────────────────────────────────────────────────────┤
│ role switcher  │ Root Accord                                         │
│                │ FXRP collateral · committed · drawn · available     │
│ Treasury       │ expiry · state explanation · next permitted action   │
│ Provider       ├──────────────────────────────────────────────────────┤
│ Institution    │ Relationship map                                    │
│ Auditor        │ Root → Makkari → CoFill → children → draw legs      │
│ Observer       ├──────────────────────────────────────────────────────┤
│                │ Child Accords                                       │
│ guided/detail  │ provider · selected · funded · drawn · available     │
│                ├──────────────────────────────────────────────────────┤
│                │ Activity / evidence / action review                 │
└───────────────┴──────────────────────────────────────────────────────┘
```

The relationship view is the primary screen. A chart or graph is subordinate
to readable relationship cards and exact amounts; the graph is not decoration
and cannot be the only way to understand causality.

## Routes

| Route | Purpose | Required contract data |
|---|---|---|
| `/` | Role-aware entry and facility list | health, accessible facilities, role context |
| `/facilities/:rootAccordId` | Primary Root Accord workspace | facility, round, children, invariants |
| `/facilities/:rootAccordId/lineage` | Full causal relationship trail | lineage, linked public actions |
| `/rounds/:roundId` | Makkari/CoFill status | round, authorization-scoped evidence |
| `/children/:childAccordId` | Provider relationship view | child, root summary, funding/exposure |
| `/draws/:drawId` | One draw and its explicit legs | draw, child/provider links, settlements |
| `/evidence/:resultDigest` | Verification and disclosure boundary | evidence metadata, source, warning |
| `/settings/network` | Network/assets and disclosure settings | network config, asset decimals |

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
