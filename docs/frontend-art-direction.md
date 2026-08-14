# Concord frontend art direction and information architecture

Status: first React implementation checkpoint, updated from the supplied
institutional porcelain reference.

This document turns the first visual territory exploration into a complete
product direction. It governs the webapp's visual language, navigation,
responsive behavior, motion, imagery, typography, and user-facing page
architecture. It does not change Concord's product semantics.

## Direction decision

Concord uses a hybrid visual system:

1. **Light Ledger** is the default product mode.
2. **Midnight Treasury** is the optional dark mode.
3. **Signal Atlas** is a supporting language for lineage, evidence, empty
   states, onboarding, and selected marketing moments.

This gives Concord institutional seriousness without making the first-use
experience feel like a terminal. The default interface is bright, calm, and
highly legible. Dark mode is not a separate brand or data model.

The implemented public narrative follows progressive disclosure:

1. outcome: one facility composed from multiple accountable providers;
2. participant value: treasury, provider, and shared understanding;
3. topology: one Root Accord and independently governed Child Accords;
4. journey: creation, private coordination, composition, funding, draw, and
   restored capacity;
5. privacy boundary; and
6. recorded Coston2 proof.

Protocol primitive names never have to disappear, but they arrive after the
human outcome they explain.

The visual territory board is a reference study, not a production asset:
`docs/assets/concord-visual-territories-v1.png`.

## Product feeling

The intended feeling is:

> “I understand what this relationship is, what is happening to the capital,
> and what I can safely do next.”

The product should feel closer to a high-quality institutional treasury
workspace, a modern custody operations console, and an excellent banking
product than to a crypto exchange.

### Qualities to optimize

- calm rather than loud;
- precise rather than technical for its own sake;
- warm rather than sterile;
- globally legible rather than region-specific;
- evidence-aware rather than trust-me;
- beautiful through proportion, typography, and hierarchy rather than effects.

### Explicitly avoid

- generic SaaS dashboard sameness;
- neon DeFi styling;
- candlestick charts and yield theatrics;
- glassmorphism as a substitute for hierarchy;
- giant graphs with unreadable nodes;
- decorative “AI” language;
- stock photographs of traders, skyscrapers, or handshakes;
- fake transaction success, fake zeros, or fake privacy indicators.

## Typography

### Primary recommendation

Use **Inter Variable** for interface, headings, labels, numerals, and body copy,
paired with the platform monospace stack for IDs, hashes, addresses, block
references, and exact base-unit values. Inter is self-hosted in the frontend
bundle; the system fallback remains responsible for scripts outside its
coverage and must be tested before a locale is declared supported.

### Type roles

```text
Inter Variable primary UI, headings, explanations, navigation, buttons
System mono    IDs, hashes, addresses, exact units, technical evidence
System fallback  unavailable font or unsupported glyph fallback
```

Do not add a display font merely to appear premium. Concord's premium quality
should come from rhythm, whitespace, rule placement, and information clarity.

### Type scale

```text
Display       40 / 46   facility title, only on spacious desktop views
Heading 1     28 / 34   page title
Heading 2     20 / 26   section title
Heading 3     16 / 22   card and table group title
Body          15 / 23   explanations and instructions
Body small    13 / 19   supporting metadata
Label         11 / 15   tracked state/eyebrow labels
Data          13 / 18   mono IDs and exact values
```

The scale is a starting token set. It must be tested with long organization
names, large amounts, and translated labels before being frozen.

## Color and material system

### Light Ledger tokens

```css
:root {
  --canvas: #f6f5f1;
  --surface: #ffffff;
  --surface-subtle: #efeee9;
  --ink: #10161d;
  --ink-muted: #66717c;
  --rule: #d8dce0;
  --rule-strong: #b8c0c7;
  --proof: #087d68;
  --proof-surface: #e1f3ed;
  --pending: #a56a00;
  --pending-surface: #fff1d5;
  --blocked: #b8495b;
  --blocked-surface: #fbe7eb;
  --focus: #205cf3;
}
```

### Midnight Treasury tokens

```css
[data-theme="dark"] {
  --canvas: #0a0e12;
  --surface: #121820;
  --surface-subtle: #19212a;
  --ink: #f4f1ea;
  --ink-muted: #aeb8c0;
  --rule: #2b353e;
  --rule-strong: #52606c;
  --proof: #7ee8c3;
  --proof-surface: #14392f;
  --pending: #e8b451;
  --pending-surface: #3a2e17;
  --blocked: #ee7a8b;
  --blocked-surface: #3c2028;
  --focus: #75a9ff;
}
```

Proof color means an observed/verified state only. It must not be reused for
primary buttons, decoration, or generic links everywhere. Pending and blocked
states always include text and icon cues in addition to color.

### Surface rules

- Use one main canvas, one raised surface, and one subtle surface.
- Prefer borders and contrast to heavy shadows.
- Use radius sparingly: `8px` for controls, `12px` for major panels, no
  pill-shaped everything.
- Use corner details and container lines only at page/section scale.
- Avoid background textures in data-dense screens.
- Any grain or atlas texture belongs in onboarding/marketing, not the facility
  ledger where it reduces contrast.

## Global navigation

### Desktop header

Use one 72px global header. Do not add a permanent left sidebar to the first
version; it creates a second hierarchy and makes the product feel like an
internal admin tool.

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Concord    Facilities   Activity   Evidence          Coston2  Wallet  │
└──────────────────────────────────────────────────────────────────────┘
```

#### Header zones

Left:

- Concord wordmark;
- active product area: `Facilities`.

Center:

- `Facilities`;
- `Activity`;
- `Evidence` (visible to authorized users; advanced users can pin it);
- no protocol primitive names in the primary nav.

Right:

- network status: `Coston2` with observation indicator;
- connected wallet or organization identity;
- compact help/preferences menu.

The header must remain stable across roles. The content and available actions
change by authorization, not the global navigation vocabulary.

### Facility-local navigation

Inside a facility, use a local sub-navigation row below the relationship
header:

```text
Overview   Funding   Activity   Evidence
```

`Overview` is the default. `Funding` contains the Makkari/CoFill/child
formation context. `Activity` contains public lifecycle history. `Evidence`
contains sources and verification. Draws and child relationships open from
the relevant rows/cards and do not need to become global nav items.

### Mobile header and hamburger menu

The mobile header is 64px:

```text
☰   Concord                                  wallet/status
```

The hamburger button is a 44px accessible target using Heroicons `bars-3`.
It opens a left-side navigation drawer with a scrim. It is not a “more” menu
and it must not contain the primary facility action.

#### Drawer structure

```text
Concord                                      [close]

WORKSPACE
  Facilities
  Activity

TRUST & EVIDENCE
  Evidence
  Network status

ACCOUNT
  Wallet / organization
  Appearance
  Language and region
  Help
```

Rules:

- keep the drawer one level deep;
- show the active destination with label, icon, and a left rule;
- close on navigation, Escape, scrim click, or close button;
- trap focus while open;
- preserve scroll position when closing;
- keep the facility's next action outside the drawer;
- respect reduced-motion preferences;
- never put hidden protocol settings in the ordinary user menu.

### Footer

The authenticated application footer is quiet and functional. It is not a
marketing block at the end of every screen.

```text
Concord                                  Coston2 · chain 114 · Observed
Status   Documentation   Source   Privacy / disclosure
```

On public onboarding or future marketing pages, the footer can expand into
product, developers, evidence, and legal columns. Those pages must not imply
production readiness or privacy guarantees that the implementation does not
prove.

## Page architecture

### Public and entry pages

#### `/welcome`

Purpose: explain Concord in one screen before wallet connection.

```text
Coordinate one treasury need across independent capital providers.

One facility. Multiple providers. Visible obligations.

[Start as treasury] [Provide capital] [View a facility]
```

The page uses a restrained relationship animation or generated abstract visual,
not a fake screenshot of a live facility.

#### `/connect`

Purpose: establish wallet/organization context and network.

Show:

- what connecting enables;
- selected network;
- supported asset names and decimals;
- data disclosure boundary;
- wallet/organization approval step.

Do not ask users to understand chain IDs before showing the human reason for
connection.

### Core application pages

#### `/`

Facilities home. Show active and relevant facilities, a plain-language
explanation, search/filter, and one role-appropriate creation or participation
action.

#### `/facilities/new`

Treasury setup wizard. Four steps maximum:

1. facility need: target liquidity, asset, expiry;
2. collateral and policy;
3. provider coordination settings;
4. review and wallet approval.

Each step has a short “why we ask” explanation. Canonical IDs and policy hashes
are available in Detailed mode, not in the first form view.

#### `/facilities/:rootAccordId`

The primary relationship workspace. The first viewport shows:

```text
facility identity → state → committed/drawn/available → next action
```

The causal relationship spine begins below the primary facts and can be
expanded. This page is not a graph explorer.

#### `/facilities/:rootAccordId/funding`

Funding view for the round, selected allocations, funded children, and
provider-specific actions. It clearly separates:

```text
selected capacity ≠ funded commitment
```

#### `/facilities/:rootAccordId/activity`

Chronological public lifecycle events, each linked to the relationship node
that authorized it.

#### `/facilities/:rootAccordId/evidence`

Evidence and disclosure page. It shows public source, observation state,
transaction references, FCC result metadata, and what remains withheld. It
does not claim private transfers or production TEE security.

### Contextual detail pages

These exist for deep linking, exports, and agents, but are reached from the
workspace rather than promoted as primary nav:

- `/children/:childAccordId` — one provider relationship;
- `/draws/:drawId` — one root draw with explicit DrawLegs;
- `/rounds/:roundId` — Makkari/CoFill round detail;
- `/evidence/:resultDigest` — direct evidence lookup.

### Settings and support

`/settings` contains:

- network and asset configuration;
- wallet/organization context;
- appearance and reduced-motion preference;
- language/region/number formatting;
- notification preferences;
- developer/API access where authorized.

Do not build a separate admin console for MVP. Institutional approval and
organization controls should appear as role-scoped panels inside the same
relationship workspace until a demonstrated need requires separation.

## Core screen behavior

### Above-the-fold contract

Every facility workspace must show, without scrolling:

1. facility name and relationship identity;
2. current root state and observation state;
3. committed, drawn, and available liquidity;
4. expiry;
5. one next action or a reason no action is available.

### Progressive disclosure layers

```text
Layer 1  human facts and next action
Layer 2  relationship explanation and provider allocation
Layer 3  activity, receipts, and evidence
Layer 4  canonical IDs, calldata, fee bps, hashes, and block references
```

The interface should feel simple because the layers are ordered, not because
the protocol is falsely simplified.

### Empty, loading, and error states

Every page needs distinct states for:

- loading/connecting;
- no facilities found;
- no facilities observed;
- partial related data;
- not observed;
- expired/frozen;
- wallet rejected;
- transaction submitted but not yet confirmed;
- receipt observed but projection not yet indexed;
- invariant failure.

Never show a blank card or `$0`/`0 USDT0` when the value is unavailable.

## Motion system

Motion should explain relationship and state. It must never perform spectacle
around capital.

### Motion primitives

| Interaction | Motion | Purpose |
|---|---:|---|
| Drawer open/close | 180ms | establish navigation context |
| Local tab transition | 160ms | preserve page continuity |
| Expand relationship node | 220ms | reveal causal detail |
| New observed state | 240ms | acknowledge source update |
| Evidence receipt reveal | 320ms | guide the eye to provenance |
| Toast/notification | 180ms in, 160ms out | confirm UI state only |

Use a standard ease-out curve for entry and ease-in for exit. No perpetual
movement, no auto-advancing carousel, no number animation from fake zero, and no
animation that suggests a transfer happened before the chain observation.

### First-visit relationship animation

On `/welcome`, a thin line can form:

```text
treasury need → provider contributions → shared facility → repayment return
```

It should play once, finish quickly, and be replaceable by a static diagram for
reduced-motion users. The facility workspace uses a static or user-triggered
version of the same causal line.

### Motion accessibility

- respect `prefers-reduced-motion`;
- never communicate state through motion alone;
- allow keyboard users to reach every expanded state without animation;
- keep the action-review panel usable if all transitions are disabled.

## Image and visual asset policy

### Where images belong

Images are appropriate for:

- `/welcome` and onboarding;
- empty states;
- future education pages;
- a carefully constrained public product overview.

Images do not belong behind dense facility metrics, child tables, or evidence
rows.

### Visual language

Use generated or commissioned abstract visuals built from:

- relationship lines;
- measured grids;
- paper/metal/glass only when materially useful;
- restrained light and shadow;
- global, non-geographic abstractions;
- no token logos or financial clichés.

The visual territory board is for selection and critique. Any final raster
asset must be generated or sourced only after its intended placement, crop,
contrast, alt text, loading cost, and licensing are documented.

### Accessibility and performance

- every meaningful image has alt text;
- decorative images use empty alt text and do not compete with content;
- first-load visuals must not block facility state;
- use responsive sizes and modern formats;
- motion/video must have a static poster and reduced-motion alternative;
- no text is baked into generated imagery when the text is part of the product
  interface.

## User-friendliness contract

### Language

Write like a careful human operator explaining capital movement:

- “Your allocation was selected. Funding has not been observed yet.”
- “This draw uses 250,000 from Provider A and 150,000 from Provider C.”
- “The wallet request is ready. Nothing has been signed yet.”

Avoid:

- “Execute” when the user is only preparing a transaction;
- “Committed” for selected but unfunded capital;
- “Private” as a blanket claim;
- “Success” before a receipt and state observation;
- “Continue” when the next action is known.

### Forms

- one decision per step;
- show unit, token, decimals, and expiry near the input;
- show impact before wallet approval;
- preserve entered values after validation errors;
- explain rejection in plain language;
- provide a detailed view without forcing it on first-time users.

### Trust cues

Trust is expressed through:

- source and observation timestamps;
- explicit public/withheld data labels;
- readable receipts;
- relationship lineage;
- invariant warnings;
- an unmistakable wallet approval boundary.

Badges, shields, and green checkmarks are secondary cues only.

## Institutional completeness gate

The design is not complete until static prototypes demonstrate:

1. treasury onboarding from `/welcome` to `/facilities/new`;
2. active facility overview with three child relationships;
3. selected-but-not-funded provider state;
4. multi-child draw with explicit DrawLegs;
5. repayment and restored capacity;
6. evidence and partial/not-observed states;
7. wallet action review and rejected/confirmed/not-observed outcomes;
8. provider view with another provider's private data withheld;
9. auditor read-only view;
10. developer/agent unsigned intent view;
11. mobile hamburger drawer and facility-local navigation;
12. light mode, dark mode, keyboard navigation, reduced motion, and long
    localized strings.

Reviewers must be able to complete the core journey without knowing the words
Accord, Makkari, or CoFill first. Reviewers must still be able to reach those
canonical concepts when they need to inspect lineage or evidence.

## Design workflow from here

```text
1. Select/adjust the hybrid visual direction
2. Freeze type, color, spacing, radius, and icon tokens
3. Produce static wireframes for the required states
4. Produce high-fidelity screen compositions
5. Define motion clips and reduced-motion alternatives
6. Run usability and semantic review against the contract
7. Only then implement React components
```

The first high-fidelity prototype should be the Root Accord workspace in
Light Ledger mode, with the mobile variant and action-review sheet designed in
the same pass. The first generated hero/onboarding image should remain outside
the core facility screen until the information hierarchy has passed review.

## Source notes

- [IBM Plex repository](https://github.com/IBM/plex) — UI-oriented family,
  script coverage, and OFL licensing.
- [IBM Design Language typography](https://www.ibm.com/design/language/typography/typeface/)
  — official distribution and licensing guidance.
- [Heroicons](https://heroicons.com/) — icon family and React/Vue library.
- [MengTo Skills](https://github.com/MengTo/Skills) — explicit design
  constraints, hierarchy, and controlled iteration.
- [`shared-product-contract.md`](./shared-product-contract.md) — product and
  authority semantics.
- [`frontend-design-system.md`](./frontend-design-system.md) — prior
  component-level design and icon decisions.
