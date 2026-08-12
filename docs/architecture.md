# Concord architecture

Concord coordinates one persistent economic relationship: an FXRP-backed
syndicated capital facility. The canonical object is the relationship, not an
individual transaction.

~~~text
Root Accord
    ↓
Makkari session (confidential FCC boundary)
    ↓
CoFill allocation
    ↓
Child Accords
    ↓
funded commitments → Draw → DrawLegs → Settlement → Repayment
~~~

## Onchain responsibilities

| Component | Responsibility |
|---|---|
| AccordRegistry | Relationship identity, parent-child links, lineage nodes, settlement and repayment references. |
| CapitalFacility | FXRP collateral, USDT0 commitments, child funding, exposure, deterministic multi-child draws, repayment, expiry and close rules. |
| ConcordInstructionSender | Encrypted SUBMIT_QUOTE and FINALIZE_ROUND instruction submission through the official FCC registry path. |
| ConcordTypes | Root Accord, Child Accord, round and allocation data shapes. |

The facility does not run CoFill. It accepts a verified, bound allocation
result and materializes each selected provider as a child relationship.

## Makkari and CoFill

The Go extension is built inside the official Flare FCE scaffold. It requires
the instruction payload to be encrypted to the active TEE machine and calls
the scaffold's decrypt endpoint. It validates provider signatures, quote
expiry, fee policy, provider eligibility and round/root binding.

CoFill sorts by lowest fee, then provider address, then quote nonce. It permits
a partial final allocation and fails explicitly when eligible capacity is
insufficient. The returned digest binds the extension, round, root, expiry,
providers, amounts, fees and terms commitments.

## Economic state

Provider capacity is intentionally distinct from provider quotes:

~~~text
quoted → selected → funded → active → closed
~~~

selectedCapacity is the FCC result. committedCapacity increases only after the
provider's USDT0 transferFrom succeeds. Root committed capacity is the sum of
actual child commitments, not the sum of selected quotes.

Draws are not flattened. A root draw creates one Draw node and one DrawLeg per
child relationship consumed. Repayment reduces the draw leg, child and root
exposures only after the ERC-20 transfer succeeds.

## Trust and privacy boundary

The current checkpoint does not claim private FXRP or USDT0 transfers, private
EVM execution, or production hardware-backed TEE security. FCC development may
use the documented simulated TEE path. Settlement, accepted executable
capacity, exposure, and lineage are public where the facility requires them.

allocationVerifier is an explicit integration boundary. It must verify the FCC
result's operation, active machine/signature evidence, extension, round, root
and digest before calling markAllocationVerified. The Solidity tests use a
verifier actor; that is not proof that the live Coston2 verifier has been
deployed.
