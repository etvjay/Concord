# Concord shared product contract

Status: implementation contract for the first integration phase.

This document is the semantic boundary shared by the web interface, REST API,
SDKs, CLI, MCP server, and future agent integrations. It does not create a
second source of truth. Onchain Accord and facility state, plus verified FCC
evidence where applicable, remain authoritative.

## Canonical relationship

Concord exposes one persistent economic relationship:

```text
Root Accord
  └─ Makkari session
       └─ CoFill allocation
            └─ Child Accords
                 └─ funded commitments
                      └─ Draw
                           └─ DrawLegs
                                └─ Settlement
                                     └─ Repayment
```

The transaction is an event in this graph. It is not the canonical product
object.

## Shared vocabulary

| Canonical term | Plain-language meaning | Authoritative owner |
|---|---|---|
| Root Accord | The one facility relationship between the treasury and its providers | `CapitalFacility` + `AccordRegistry` |
| Makkari session | The bounded private coordination session for one syndication round | FCC extension and round state |
| CoFill allocation | The deterministic answer to which eligible providers supply which portions | FCC result, then verified digest |
| Child Accord | One provider's independently governed relationship under the root | `CapitalFacility` |
| Committed | Capacity actually funded by a provider's successful USDT0 transfer | `CapitalFacility` |
| Available | Committed capacity minus principal currently drawn | Derived from onchain state |
| Draw leg | The portion of one root draw supplied by one child Accord | `CapitalFacility` + `AccordRegistry` |
| Lineage | The causal relationship trail explaining why an action was allowed | `AccordRegistry` |

The UI may use the plain-language labels, but it must preserve the canonical
terms in details, URLs, exports, and machine-readable responses.

## State semantics

### Root Accord

```text
PROPOSED → SYNDICATING → FUNDING → ACTIVE → CLOSED
                         └──────────────→ EXPIRED
                         └──────────────→ FROZEN (exceptional)
```

| State | Meaning | What the interface may offer |
|---|---|---|
| `PROPOSED` | Root exists; collateral has not necessarily been locked | Lock collateral |
| `SYNDICATING` | Collateral is locked and the Makkari round is open | Submit/observe the round; finalize only through the verified flow |
| `FUNDING` | CoFill selected providers; selected capacity is not yet committed | Provider funding |
| `ACTIVE` | Target capacity is fully funded | Draw and observe exposure |
| `CLOSED` | Exposure and commitments are zero; recoverable balances were returned | Read-only history |
| `FROZEN` | Exceptional administrative or safety state | Read-only; no new financial action |
| `EXPIRED` | Validity ended with no outstanding exposure or commitments | Read-only history |

### Child Accord

```text
SELECTED → FUNDED → ACTIVE → CLOSED
     └──────────────→ EXPIRED
     └──────────────→ DEFAULTED (future resolution, not MVP)
```

`SELECTED` is an allocation result. It is never presented as funded or
committed capital. `FUNDED` is reached only after the provider's USDT0
transfer succeeds. `ACTIVE` is reached when the root reaches full funding and
the facility activates the funded children.

### Amount invariants

Every projection and every write-preparation response must preserve:

```text
root.drawnPrincipal <= root.committedCapacity
child.drawnPrincipal <= child.committedCapacity
root.drawnPrincipal == Σ child.drawnPrincipal
root.committedCapacity == Σ funded child commitments
root.availableCapacity = root.committedCapacity - root.drawnPrincipal
```

Amounts are transported as decimal strings in API and SDK payloads. A client
must use the asset decimals supplied by the network configuration; it must not
assume that FXRP and USDT0 use the same decimals.

## Observation and evidence

Every read response carries an observation envelope:

- `observed`: authoritative state was read from the configured source;
- `partial`: some related data was unavailable or could not be traversed;
- `not_observed`: the system has no authoritative observation and must not
  present a zero value as a fact.

The envelope also carries network, chain ID, block number when known, source,
and observation time. “No children” and “children not observed” are different
responses.

FCC evidence is separate from public facility state. A surface may expose
evidence metadata and verification status to an authorized caller, but it must
not expose losing quotes, private provider constraints, or decrypted payloads
as a general API feature.

## Role model

Roles change which actions are visible and which private inputs may be
returned. They do not change the underlying economic semantics.

| Role | Read scope | Write/prepare scope |
|---|---|---|
| Treasury | Root, public round result, children, draws, repayments, lineage, authorized evidence | Root creation, collateral lock, round opening, materialization handoff, draw, repayment, close |
| Provider | Authorized rounds, own quote status, own child Accords, own funding/exposure, public lineage | Own signed quote, own child funding, own close/expiry action |
| Institution/operator | Facilities granted by its organization, evidence and exports allowed by policy | Same actions delegated by an organization; every transaction still requires a signer |
| Auditor/observer | Public relationship state, commitments, exposure, settlements, repayments, lineage, published evidence | None by default |
| Developer/agent | API/MCP scope granted by the caller; public state by default | Prepare unsigned intents; no implicit custody, signing, verifier authority, or broadcast |

An agent is a delegate. It is not a new participant in the Accord and cannot
become the allocation verifier merely because it can call an API.

## Layered surfaces

All surfaces consume this contract through one control plane:

```text
Contracts + FCC evidence
            ↓
Concord read model / intent builder
       ┌────┼──────────┬─────────┐
       ↓    ↓          ↓         ↓
   REST   SDK        MCP       CLI
       └────┴──────────┴─────────┘
                  ↓
             Frontend
```

- REST/OpenAPI is the stable external contract.
- SDKs are typed clients of REST and transaction-intent builders; they do not
  reimplement lifecycle rules.
- MCP exposes read resources and safe preparation tools through the same API;
  it is not a privileged backdoor.
- The CLI is an operator/developer client of the same endpoints and verifier
  commands. It must not silently use a different state model.
- x402, when added, may gate access to API/MCP resources. It cannot bypass
  Accord authority or become the facility's USDT0 settlement rail.

## Transaction intent rules

A write-capable surface returns an unsigned intent containing:

- target contract and chain ID;
- calldata and value;
- the human-readable action and affected relationship IDs;
- preconditions read from the current projection;
- warnings for expiry, availability, or authorization assumptions;
- `requiresExplicitApproval: true`.

The surface does not hold a private key, sign for a user, broadcast a
transaction, or report success before a receipt is observed. The frontend may
hand the intent to a connected wallet; the final result comes from the chain.

## Frontend contract

The primary route is `/facilities/:rootAccordId`. It must answer, in this
order:

1. What relationship is this?
2. Who participates?
3. How much was selected, funded, drawn, and remains available?
4. Which child relationships supplied the current exposure?
5. Why is the next action allowed?
6. What evidence and lineage support the state?

The interface has two disclosure modes over the same data:

- Guided mode: plain-language labels, one next action, warnings, and a short
  relationship explanation.
- Detailed mode: canonical IDs, contract addresses, fee bps, terms
  commitments, block/transaction references, FCC evidence, and lineage.

No screen may show a synthetic “success” state from a local mock when the
authoritative observation is missing.
