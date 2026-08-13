# Concord frontend design system

Status: design specification only. This document defines the interface before
the React implementation begins. It must remain subordinate to
[`shared-product-contract.md`](./shared-product-contract.md) and
[`frontend-map.md`](./frontend-map.md).

## Design objective

Concord should feel like a relationship workspace for real people moving
capital, not like a speculative trading dashboard or a generic DeFi pool.

The first screen must let a treasury, provider, institution, auditor, or
developer answer six questions without decoding a graph:

1. What relationship is this?
2. Who participates?
3. What was selected, funded, drawn, and remains available?
4. Which child relationships supplied the current exposure?
5. Why is the next action allowed?
6. What public evidence and lineage support the state?

The interface is a readable relationship ledger. Visual topology supports the
explanation; it never replaces the explanation.

## Governing design decisions

### One product object

The primary object is the Root Accord workspace. A transaction receipt,
provider quote, or draw is a linked event in that workspace, not the home
screen's organizing concept.

### Progressive disclosure

Every screen has two disclosure modes over the same read model:

- **Guided**: plain-language labels, one permitted next action, short
  explanations, and clear warnings.
- **Detailed**: canonical IDs, contract addresses, fee bps, terms commitments,
  block/transaction references, FCC evidence, and full lineage.

Guided mode is the default. Detailed mode is a user-controlled view preference,
not a different data model.

### State before styling

State labels must be derived from the observed projection. The UI must never
turn an unobserved value into `0`, a selected allocation into committed capital,
or a submitted wallet request into a confirmed action.

Use these exact distinctions in copy:

| Machine state | User-facing label | Required explanation |
|---|---|---|
| `SELECTED` | Selected — funding not observed | The provider was selected by CoFill, but its USDT0 transfer has not been observed. |
| `FUNDED` | Funded | The provider's USDT0 commitment transfer was observed. |
| `ACTIVE` | Active | The child relationship is participating in an active facility. |
| `EXPIRED` | Expired | The relationship is no longer valid for new financial actions. |
| `PARTIAL` observation | Partial data | Some linked state could not be observed from the configured source. |
| `NOT_OBSERVED` | Not observed | Concord has no authoritative observation and is not asserting a value. |

### Real-world vocabulary first

Use “facility”, “provider”, “funded”, “draw”, “repay”, and “available” in
headings and actions. Show “Root Accord”, “Child Accord”, “Makkari”, “CoFill”,
and canonical IDs in the relationship spine, detail panels, exports, and API
links. Do not force a new user to know protocol nouns before understanding the
economic relationship.

## Visual direction

### Style lane

**Quiet financial operations / relationship ledger.**

- Light-first neutral canvas with a dark ink text system.
- Dense enough for institutional work, calm enough for a first-time treasury
  user.
- Thin rules and measured containers create structure; they do not become
  decoration.
- One proof accent is reserved for verified/observed states. Pending and
  blocked states use separate semantic colors plus text and icons.
- No rainbow gradients, crypto-market candlesticks, floating neon cards,
  decorative 3D objects, or anonymous “AI” surfaces.
- Elevation is restrained: borders and surface contrast carry hierarchy;
  shadows are soft and rare.

This is an interface for accountable capital coordination. The visual language
should communicate precision and calm, not yield or price excitement.

### Layout constraints

The desktop content container is `1120px` maximum with responsive horizontal
padding:

```css
--container-max: 1120px;
--container-pad: clamp(20px, 4vw, 48px);
```

Use a 12-column grid on desktop, 8 columns on tablet, and a single readable
column on mobile. The main shell has three levels:

```text
global context bar
  └─ relationship header
       ├─ metrics band
       ├─ state explanation / next action
       ├─ relationship spine
       └─ children, activity, evidence
```

Subtle one-pixel vertical container guides may appear at the outer content
edges on desktop and major sections. They must align with the real container,
sit behind content, use `pointer-events: none`, and disappear when they harm
mobile readability. Do not draw lines around every nested card.

### Type hierarchy

The type system is intentionally restrained:

| Level | Use | Treatment |
|---|---|---|
| Display | facility name and one primary amount | strong sans, tight leading, never all caps for a sentence |
| Section | “Relationship”, “Children”, “Evidence” | medium/semibold, compact |
| Label | metric labels, state labels, role labels | small, tracked, sentence case unless canonical state |
| Body | explanations and instructions | readable line height, plain language |
| Data | IDs, hashes, addresses, base units | monospace, copyable, never used as marketing typography |

Do not use more than two font families. The exact font can be chosen during
implementation, but it must prioritize legibility, numeral clarity, and broad
Unicode coverage for international names and organizations.

### Amounts

Every amount block has:

```text
formatted amount + token symbol
human label
network / decimals on demand
exact base-unit value in the detail drawer
```

Never infer FXRP and USDT0 decimals from one another. Do not display a local
currency conversion as if it were an onchain value. If a fiat estimate is
added later, it must be explicitly labeled as an estimate with its source and
timestamp.

## Screen composition

### 1. Facility list `/`

Purpose: orient the user without pretending the list is a portfolio analytics
product.

```text
Concord                                              Network · Wallet
Your facilities                                      [Create Root Accord]
Short explanation of what a facility relationship is.

[Search] [Role / state filter] [Guided · Detailed]

Facility name        State       Committed       Drawn       Available  Open
Treasury working cap Active      600,000 USDT0   400,000    200,000    →
...
```

Each row shows observation status and network. If the list is not observed,
show a non-zero loading/unknown state rather than an empty list that implies
there are no facilities.

### 2. Root Accord workspace `/facilities/:rootAccordId`

This is the canonical first screen.

#### Header

```text
ROOT ACCORD                                  ACTIVE · Observed
Treasury working capital facility
Root ID 0x…                                   [Copy] [Detailed]
FXRP-backed · USDT0 liquidity · expires 12 Aug 2026
                                                     [Next action]
```

The primary action is state-derived. Examples: “Prepare FXRP lock”, “Review
selected providers”, “Fund your allocation”, “Prepare draw”, or “Prepare
repayment”. Never use a generic “Continue” button when the protocol knows the
specific next action.

#### Metrics band

Use four primary metrics in this order:

```text
Target       Committed       Drawn       Available
1,000,000    600,000         400,000     200,000 USDT0
```

Under `Committed`, show `600,000 funded` and, when relevant, a separate
`250,000 selected · not funded` figure. The selected figure must not be added
to committed capacity.

#### State explanation

A short sentence explains the observed state and the reason for the next
action. Example:

> This facility is active. Three child relationships have funded 600,000
> USDT0; 400,000 is currently drawn, leaving 200,000 available.

If an invariant is not observed or fails, this area becomes a prominent
warning with a link to evidence. It must not be hidden in a developer panel.

#### Relationship spine

Use a horizontal stepper on wide screens and a vertical sequence on narrow
screens:

```text
Root Accord → Makkari → CoFill → Child Accords → Draw → Repayment
```

Each node is a compact, expandable relationship card:

- what this node means in plain language;
- current state;
- observed timestamp/block;
- number of linked records;
- “View details” affordance.

The Child Accords node expands into provider cards. The Draw node expands into
explicit DrawLegs. Do not draw arbitrary edges between every record; the
causal order is the visual hierarchy.

#### Child table

Columns in Guided mode:

```text
Provider        State                         Funded       Drawn     Available
Provider A      Funded · Active               250,000      250,000   0
Provider B      Selected · funding pending    —            —         —
Provider C      Funded · Active               350,000      150,000   200,000
```

Detailed mode adds child ID, fee bps, terms commitment, valid-until, funding
transaction, and source block. Losing quotes and private constraints remain
withheld unless the role is authorized to see them.

#### Activity and evidence

Use two adjacent sections rather than a single undifferentiated feed:

- **Activity**: human-readable lifecycle events ordered by time.
- **Evidence**: source, observation status, transaction/hash links, FCC result
  digest, and disclosure boundary.

An activity item always links back to the relationship node that authorized it.

### 3. Makkari / CoFill round `/rounds/:roundId`

This screen explains confidential coordination without exposing confidential
inputs by default.

```text
SYNDICATION ROUND
Objective       Fill 1,000,000 USDT0
Policy          Maximum fee 680 bps
Expiry          12 Aug 2026
Status          Allocation verified

Makkari session → CoFill result → materialization handoff

Selected capacity     Funded capacity     Quotes withheld / visible by role
```

Authorized provider view: its own quote and status. Treasury view: accepted
providers, accepted executable capacity, terms commitments, and verification
metadata. Observer view: public result and disclosure notice. No role gets a
visualized “losing quote” by accident.

### 4. Child Accord `/children/:childAccordId`

Provider-focused but still rooted in the parent relationship:

```text
CHILD ACCORD
Provider relationship under Treasury working capital facility
Parent Root Accord → [open]

Your allocation     Funded       Drawn       Available      Valid until
250,000 USDT0       250,000      250,000     0              12 Aug 2026

[Funding / exposure timeline]
[Terms and evidence]
```

The provider must see a clear boundary between an allocation offer and a
successful funding transfer.

### 5. Draw `/draws/:drawId`

The draw screen must make split supply obvious:

```text
DRAW D-01                                  400,000 USDT0
Authorized by Root Accord                   Active · Observed

Draw legs
├─ Child Accord A / Provider A              250,000
└─ Child Accord C / Provider C              150,000

Principal remaining · settlement receipt · repayment preparation
```

Never flatten the draw into a single provider or a single anonymous transfer.

### 6. Evidence `/evidence/:resultDigest`

Evidence is a provenance view, not a claim of private execution.

Show:

- result digest and linked round/root IDs;
- verification status and verifier contract/source;
- network, chain ID, block, and transaction references where observed;
- what is public, what is withheld, and what was not observed;
- simulated/development TEE labeling where applicable.

Do not use a shield icon alone to imply “private” or “secure”. The disclosure
boundary must be written in text.

## Role and permission behavior

The role selector is a view of authorized scope, not a cosmetic theme switch.
In production, role context comes from the caller's wallet/organization
authorization. A demo-only role switch must be visibly labeled as a preview.

| Role | Default landing emphasis | Visible actions |
|---|---|---|
| Treasury | facility lifecycle and available capacity | prepare authorized root, draw, repay, close actions |
| Provider | eligible rounds and own child relationships | submit own quote, fund own child, inspect own exposure |
| Institution/operator | approvals, evidence, multiple facilities | delegated preparation within granted scope |
| Auditor/observer | public state, evidence, lineage | read-only |
| Developer/agent | structured projection and intent details | read and prepare unsigned intents; never sign/broadcast |

Disabled actions must explain the missing precondition. Do not hide an action
when its existence helps explain the lifecycle; disable it with a reason when
the caller can see the relationship but cannot act.

## Action review pattern

Every write uses the same review surface. It is a side panel on desktop and a
full-screen sheet on mobile.

```text
1. What will happen?
   Prepare a 250,000 USDT0 funding transfer for Child Accord …

2. Why is it allowed?
   Selected allocation observed; amount is within the selected capacity.

3. What will the wallet receive?
   Network · chain ID · target contract · value · calldata disclosure

4. What must still be verified?
   Wallet signature, transaction receipt, and indexed state observation.

                   [Cancel] [Review in wallet]
```

After approval, show `Awaiting signature`, `Submitted`, `Confirmed`,
`Reverted`, or `Not observed`. “Confirmed” requires an observed receipt and
the relevant state read; a wallet callback alone is not confirmation.

## Heroicons usage rules

Heroicons is the single icon family for the first frontend. Use the React
library rather than copying arbitrary SVG markup into components. Keep icons
supportive and labeled; the product's meaning comes from text and state.

### Style and sizing

- Outline icons for navigation, buttons, metadata, and relationship actions.
- Solid icons only for compact status markers where the adjacent text remains
  visible.
- Default control size: `20px`; standard relationship/status size: `24px`;
  empty-state illustration maximum: `32px`.
- Use one icon per action. Do not stack multiple decorative icons beside a
  short label.
- Icon-only controls require an accessible name and a visible tooltip or
  adjacent context; primary actions are always text-labelled.
- Do not use token-specific currency icons. Keep `FXRP` and `USDT0` as text
  symbols with asset metadata.

### Concord icon matrix

| Meaning | Heroicon | Variant / use |
|---|---|---|
| Facility / relationship | `rectangle-group` | outline, Root Accord header |
| Parent-child lineage | `share` | outline, lineage affordance |
| Provider group | `user-group` | outline, participant summary |
| Confidential boundary | `lock-closed` | outline, Makkari explanation; never privacy proof by itself |
| Allocation / composition | `squares-2x2` | outline, CoFill node |
| Selected / queued | `queue-list` | outline, selected but not funded |
| Funded / committed | `banknotes` | outline, funded capacity label |
| Draw | `arrow-down-tray` | outline, liquidity entering treasury |
| Repayment | `arrow-up-tray` | outline, liquidity returning |
| Verified evidence | `shield-check` | solid/outline with text “Verified” |
| Public receipt | `receipt-percent` | outline, settlement/fee evidence |
| Partial observation | `ellipsis-horizontal-circle` | outline plus “Partial data” |
| Not observed / withheld | `eye-slash` | outline plus explicit text |
| Warning / invariant issue | `exclamation-triangle` | outline plus sentence-level warning |
| Expiry | `clock` | outline, valid-until metadata |
| Frozen / unavailable | `pause-circle` | outline plus reason |
| Copy ID | `document-duplicate` | outline, accessible label “Copy Root Accord ID” |
| External explorer | `arrow-top-right-on-square` | outline, external link |
| Network settings | `server-stack` | outline, network context |
| Wallet boundary | `wallet` | outline, connection/approval context |

Status meaning is always encoded by icon + label + shape/placement. Color is a
secondary cue only.

## Responsive behavior

### Desktop

- One stable global header for facilities, activity, evidence, network, wallet,
  and settings; no permanent left sidebar in the first version.
- Relationship workspace uses the full container; metrics stay above the
  fold.
- Relationship spine is horizontal; child table remains tabular.

### Tablet

- Collapse left navigation into a top navigation row.
- Keep the metric band in two rows if needed; never shrink numbers below
  readable size to preserve one row.
- Relationship spine may wrap to two rows but retains left-to-right causal
  order.

### Mobile

- One column, with a sticky relationship header containing state and the next
  action.
- Metrics become stacked cards with `Available` first when a draw is active.
- Relationship spine becomes a vertical numbered sequence.
- Child rows become provider cards; DrawLegs remain individually visible.
- Action review becomes a full-screen sheet with the final wallet action fixed
  to the bottom safe area.
- Never hide evidence or lineage behind a graph-only interaction.

## Motion

Motion is functional and bounded:

- 150–220ms for state changes and panel transitions;
- no perpetual shimmer after data has loaded;
- no animation that changes the apparent amount or state without an explicit
  observation update;
- respect `prefers-reduced-motion`;
- use a one-time reveal for the causal spine only when it helps the user read
  order, not as a branded spectacle.

## Accessibility and international use

- Target WCAG 2.2 AA for the implemented component stack.
- Keyboard access for every disclosure, filter, table action, and wallet step.
- Visible focus indicator independent of the semantic state color.
- Screen-reader labels include relationship type and ID where needed.
- Use locale-aware grouping and dates, but expose the exact base unit and
  decimals in details.
- Do not assume USD, English date order, a two-party relationship, or a
  borrower/lender vocabulary in generic components.
- Support long organization names, non-Latin names, right-to-left locale
  testing, and narrow screens before launch.

## First design review gate

Before any frontend implementation, the design review must show static
wireframes or a design prototype for:

1. an active Root Accord with three children and a two-child Draw;
2. a selected-but-not-funded provider;
3. a partial/not-observed read response;
4. a repayment action review and receipt state;
5. the same facility in Guided and Detailed modes;
6. desktop, tablet, and mobile layouts.

Acceptance means a reviewer can trace:

```text
Root Accord → Makkari → CoFill → Child Accord → DrawLeg → Repayment
```

without opening a developer console, and can distinguish selected capacity
from funded committed capacity without reading protocol documentation.

## Design-first prompt card

Use this as the fixed prompt for future visual prototypes and iterations:

```text
GOAL
Design the Concord Root Accord relationship workspace for a treasury and its
independent liquidity providers. Make the persistent relationship legible
before showing transaction detail.

FORMAT
Desktop 1440px first; responsive tablet and mobile variants.
Content max 1120px; safe horizontal padding clamp(20px, 4vw, 48px).

LAYOUT
Global context → Root Accord header → metrics band → state explanation and
next action → causal relationship spine → child relationships → activity and
evidence. Use a 12-column editorial grid and quiet 1px container guides.

TYPE
Legible sans for headings/body; monospace only for IDs, hashes, addresses, and
exact base units. Tight headings, readable body copy, tracked small labels.

COLOR + MATERIAL
Neutral light canvas, dark ink text, restrained borders, one proof accent,
explicit pending and blocked states. No rainbow gradient, no glassmorphism,
no speculative-trading visual language.

ICONOGRAPHY
Heroicons React outline icons at 20–24px, one icon per action, always paired
with a label. Use the Concord icon matrix; do not invent token icons.

COPY
Use “Selected — funding not observed”, never “Committed” before USDT0 funding.
Use “Not observed” instead of zero when authoritative state is unavailable.

CONSTRAINTS
RELATIONSHIP-FIRST · GUIDED-BY-DEFAULT · EVIDENCE-VISIBLE · WALLET-APPROVAL-EXPLICIT

NEGATIVE PROMPT
No fake dashboard metrics, no generic “Continue”, no flattened provider pool,
no private-transfer claims, no hidden losing quotes, no decorative graph that
cannot explain causal authorization, no text baked into generated imagery.
```

## Sources and skill application

- [Heroicons](https://heroicons.com/) — current catalog/version, MIT license,
  and React/Vue library availability.
- [MengTo Skills](https://github.com/MengTo/Skills) — public skill collection
  and design-first principle of explicit specs, constraints, hierarchy, and
  one-variable iteration.
- [Concord shared product contract](./shared-product-contract.md) — source of
  truth for lifecycle, roles, amounts, observations, and intent boundaries.
- [Concord frontend map](./frontend-map.md) — route and component baseline.

The exact Interface Foundry package and the local MengTo package are not
currently present in the pruned workspace. This document records the design
decisions so the frontend remains reproducible instead of depending on
ephemeral skill files.
