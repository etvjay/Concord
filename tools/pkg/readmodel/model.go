package readmodel

import (
	"context"
	"fmt"
	"math/big"
	"time"
)

const APIVersion = "v1"

type ObservationStatus string

const (
	Observed    ObservationStatus = "observed"
	Partial     ObservationStatus = "partial"
	NotObserved ObservationStatus = "not_observed"
)

type ObservationSource string

const (
	SourceOnchain     ObservationSource = "onchain"
	SourceFCCEvidence ObservationSource = "fcc_evidence"
	SourceDerived     ObservationSource = "derived"
)

type Observation struct {
	Status      ObservationStatus `json:"status"`
	Source      ObservationSource `json:"source"`
	Network     string            `json:"network"`
	ChainID     int64             `json:"chainId"`
	BlockNumber string            `json:"blockNumber,omitempty"`
	ObservedAt  time.Time         `json:"observedAt"`
	Warning     string            `json:"warning,omitempty"`
}

type Meta struct {
	Observation Observation `json:"observation"`
	APIVersion  string      `json:"apiVersion"`
}

type Envelope[T any] struct {
	Data T    `json:"data"`
	Meta Meta `json:"meta"`
}

type ErrorBody struct {
	Code    string         `json:"code"`
	Message string         `json:"message"`
	Details map[string]any `json:"details,omitempty"`
}

type ErrorResponse struct {
	Error ErrorBody `json:"error"`
	Meta  Meta      `json:"meta"`
}

type RootState string

const (
	RootNone        RootState = "NONE"
	RootProposed    RootState = "PROPOSED"
	RootSyndicating RootState = "SYNDICATING"
	RootFunding     RootState = "FUNDING"
	RootActive      RootState = "ACTIVE"
	RootClosed      RootState = "CLOSED"
	RootFrozen      RootState = "FROZEN"
	RootExpired     RootState = "EXPIRED"
)

type ChildState string

const (
	ChildNone      ChildState = "NONE"
	ChildSelected  ChildState = "SELECTED"
	ChildFunded    ChildState = "FUNDED"
	ChildActive    ChildState = "ACTIVE"
	ChildClosed    ChildState = "CLOSED"
	ChildExpired   ChildState = "EXPIRED"
	ChildDefaulted ChildState = "DEFAULTED"
)

type RoundStatus string

const (
	RoundNone      RoundStatus = "NONE"
	RoundOpen      RoundStatus = "OPEN"
	RoundFinalized RoundStatus = "FINALIZED"
	RoundExpired   RoundStatus = "EXPIRED"
)

type LineageKind string

const (
	KindRootAccord       LineageKind = "ROOT_ACCORD"
	KindMakkariSession   LineageKind = "MAKKARI_SESSION"
	KindCoFillAllocation LineageKind = "COFILL_ALLOCATION"
	KindChildAccord      LineageKind = "CHILD_ACCORD"
	KindDraw             LineageKind = "DRAW"
	KindDrawLeg          LineageKind = "DRAW_LEG"
	KindSettlement       LineageKind = "SETTLEMENT"
	KindRepayment        LineageKind = "REPAYMENT"
)

type StateCopy struct {
	State       string `json:"state"`
	Label       string `json:"label"`
	Explanation string `json:"explanation"`
}

type Asset struct {
	Address  string `json:"address"`
	Symbol   string `json:"symbol"`
	Decimals uint8  `json:"decimals"`
}

type ChildAccord struct {
	ID                string     `json:"id"`
	RootAccordID      string     `json:"rootAccordId"`
	AllocationID      string     `json:"allocationId"`
	Provider          string     `json:"provider"`
	SelectedCapacity  string     `json:"selectedCapacity"`
	CommittedCapacity string     `json:"committedCapacity"`
	DrawnPrincipal    string     `json:"drawnPrincipal"`
	AvailableCapacity string     `json:"availableCapacity"`
	FeeBPS            uint32     `json:"feeBps"`
	ValidUntil        time.Time  `json:"validUntil"`
	ValidUntilUnix    string     `json:"validUntilUnix"`
	TermsCommitment   string     `json:"termsCommitment"`
	State             ChildState `json:"state"`
	StateCopy         StateCopy  `json:"stateCopy"`
}

type Round struct {
	ID                    string      `json:"id"`
	RootAccordID          string      `json:"rootAccordId"`
	TargetCapacity        string      `json:"targetCapacity"`
	MaxFeeBPS             uint32      `json:"maxFeeBps"`
	RoundExpiry           time.Time   `json:"roundExpiry"`
	RoundExpiryUnix       string      `json:"roundExpiryUnix"`
	Status                RoundStatus `json:"status"`
	StateCopy             StateCopy   `json:"stateCopy"`
	EligibleProviderCount int         `json:"eligibleProviderCount"`
	PrivateQuoteData      string      `json:"privateQuoteData"`
}

type Facility struct {
	ID                 string        `json:"id"`
	Borrower           string        `json:"borrower"`
	CollateralAsset    Asset         `json:"collateralAsset"`
	LiquidityAsset     Asset         `json:"liquidityAsset"`
	TargetCapacity     string        `json:"targetCapacity"`
	CommittedCapacity  string        `json:"committedCapacity"`
	DrawnPrincipal     string        `json:"drawnPrincipal"`
	CollateralLocked   string        `json:"collateralLocked"`
	AvailableCapacity  string        `json:"availableCapacity"`
	ValidUntil         time.Time     `json:"validUntil"`
	ValidUntilUnix     string        `json:"validUntilUnix"`
	PolicyHash         string        `json:"policyHash"`
	SyndicationRoundID string        `json:"syndicationRoundId"`
	State              RootState     `json:"state"`
	StateCopy          StateCopy     `json:"stateCopy"`
	Round              *Round        `json:"round,omitempty"`
	Children           []ChildAccord `json:"children"`
	Invariants         Invariants    `json:"invariants"`
}

type Invariants struct {
	RootDrawWithinCommitment       bool `json:"rootDrawWithinCommitment"`
	ChildDrawWithinCommitment      bool `json:"childDrawWithinCommitment"`
	RootExposureMatchesChildren    bool `json:"rootExposureMatchesChildren"`
	CommittedMatchesFundedChildren bool `json:"committedMatchesFundedChildren"`
}

type LineageNode struct {
	ID        string      `json:"id"`
	ParentID  string      `json:"parentId"`
	Kind      LineageKind `json:"kind"`
	CreatedAt time.Time   `json:"createdAt"`
	Children  []string    `json:"children"`
}

type Lineage struct {
	RootAccordID string        `json:"rootAccordId"`
	Nodes        []LineageNode `json:"nodes"`
}

type DrawLeg struct {
	ID                   string `json:"id"`
	DrawID               string `json:"drawId"`
	ChildAccordID        string `json:"childAccordId"`
	Provider             string `json:"provider"`
	Principal            string `json:"principal"`
	RepaidPrincipal      string `json:"repaidPrincipal"`
	OutstandingPrincipal string `json:"outstandingPrincipal"`
}

type Draw struct {
	ID                   string    `json:"id"`
	RootAccordID         string    `json:"rootAccordId"`
	Principal            string    `json:"principal"`
	RepaidPrincipal      string    `json:"repaidPrincipal"`
	OutstandingPrincipal string    `json:"outstandingPrincipal"`
	CreatedAt            time.Time `json:"createdAt"`
	Legs                 []DrawLeg `json:"legs"`
}

type Evidence struct {
	ResultDigest  string `json:"resultDigest"`
	Status        string `json:"status"`
	Disclosure    string `json:"disclosure"`
	ExtensionID   string `json:"extensionId,omitempty"`
	RoundID       string `json:"roundId,omitempty"`
	RootAccordID  string `json:"rootAccordId,omitempty"`
	InstructionID string `json:"instructionId,omitempty"`
	Source        string `json:"source"`
	Warning       string `json:"warning,omitempty"`
}

type Health struct {
	Service         string `json:"service"`
	Network         string `json:"network"`
	ChainID         int64  `json:"chainId"`
	Configured      bool   `json:"configured"`
	ReadModel       string `json:"readModel"`
	FacilityAddress string `json:"facilityAddress,omitempty"`
	RegistryAddress string `json:"registryAddress,omitempty"`
}

type TransactionIntent struct {
	Action                   string   `json:"action"`
	ChainID                  int64    `json:"chainId"`
	To                       string   `json:"to"`
	Data                     string   `json:"data"`
	Value                    string   `json:"value"`
	Summary                  string   `json:"summary"`
	RequiresExplicitApproval bool     `json:"requiresExplicitApproval"`
	Preconditions            []string `json:"preconditions"`
	Warnings                 []string `json:"warnings,omitempty"`
}

type Reader interface {
	Facility(ctx context.Context, rootID [32]byte) (Facility, error)
	Round(ctx context.Context, roundID [32]byte) (Round, error)
	Draw(ctx context.Context, drawID [32]byte) (Draw, error)
	Lineage(ctx context.Context, rootID [32]byte) (Lineage, error)
}

func amount(v *big.Int) string {
	if v == nil {
		return "0"
	}
	return v.String()
}

func timestamp(v uint64) time.Time {
	return time.Unix(int64(v), 0).UTC()
}

func bytes32String(v [32]byte) string {
	return fmt.Sprintf("0x%x", v[:])
}

func rootCopy(state RootState) StateCopy {
	switch state {
	case RootProposed:
		return StateCopy{string(state), "Draft facility", "The treasury relationship exists and can be prepared for collateral."}
	case RootSyndicating:
		return StateCopy{string(state), "Collecting private offers", "The bounded Makkari session is open for provider coordination."}
	case RootFunding:
		return StateCopy{string(state), "Waiting for provider funding", "CoFill selected children; selected capacity is not committed until USDT0 arrives."}
	case RootActive:
		return StateCopy{string(state), "Ready for draw", "The target capacity is funded and the treasury can draw within available capacity."}
	case RootClosed:
		return StateCopy{string(state), "Closed", "Exposure and commitments are zero and recoverable balances were returned."}
	case RootFrozen:
		return StateCopy{string(state), "Frozen", "New financial actions are not available while this relationship is frozen."}
	case RootExpired:
		return StateCopy{string(state), "Expired", "The relationship validity ended without outstanding exposure or commitments."}
	default:
		return StateCopy{string(state), "Unknown", "No authoritative state description is available."}
	}
}

func childCopy(state ChildState) StateCopy {
	switch state {
	case ChildSelected:
		return StateCopy{string(state), "Selected", "CoFill selected this provider; no capital is committed yet."}
	case ChildFunded:
		return StateCopy{string(state), "Funded", "This provider has transferred part or all of its selected USDT0 capacity."}
	case ChildActive:
		return StateCopy{string(state), "Active", "This provider relationship is participating in the active facility."}
	case ChildClosed:
		return StateCopy{string(state), "Closed", "The provider relationship has no outstanding exposure."}
	case ChildExpired:
		return StateCopy{string(state), "Expired", "The provider relationship validity ended."}
	case ChildDefaulted:
		return StateCopy{string(state), "Defaulted", "A future default-resolution path would be required; it is outside the MVP."}
	default:
		return StateCopy{string(state), "Unknown", "No authoritative child-state description is available."}
	}
}

func roundCopy(state RoundStatus) StateCopy {
	switch state {
	case RoundOpen:
		return StateCopy{string(state), "Open", "Eligible providers may submit bounded private offers."}
	case RoundFinalized:
		return StateCopy{string(state), "Finalized", "The verified allocation has been materialized or is ready for that handoff."}
	case RoundExpired:
		return StateCopy{string(state), "Expired", "The round expiry boundary has passed."}
	default:
		return StateCopy{string(state), "Unknown", "No authoritative round-state description is available."}
	}
}

func stateFromRoot(v uint8) RootState {
	states := []RootState{RootNone, RootProposed, RootSyndicating, RootFunding, RootActive, RootClosed, RootFrozen, RootExpired}
	if int(v) >= len(states) {
		return RootNone
	}
	return states[v]
}

func stateFromChild(v uint8) ChildState {
	states := []ChildState{ChildNone, ChildSelected, ChildFunded, ChildActive, ChildClosed, ChildExpired, ChildDefaulted}
	if int(v) >= len(states) {
		return ChildNone
	}
	return states[v]
}

func stateFromRound(v uint8) RoundStatus {
	states := []RoundStatus{RoundNone, RoundOpen, RoundFinalized, RoundExpired}
	if int(v) >= len(states) {
		return RoundNone
	}
	return states[v]
}

func kindFromRegistry(v uint8) LineageKind {
	kinds := []LineageKind{KindRootAccord, KindMakkariSession, KindCoFillAllocation, KindChildAccord, KindDraw, KindDrawLeg, KindSettlement, KindRepayment}
	if int(v) >= len(kinds) {
		return LineageKind(fmt.Sprintf("UNKNOWN_%d", v))
	}
	return kinds[v]
}
