package readmodel

import (
	"context"
	"fmt"
	"math/big"
	"reflect"
	"strings"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/ethclient"
)

// ChainReader is a read-only projection adapter. It never signs, broadcasts,
// or infers state when the configured chain did not return it.
type ChainReader struct {
	client          *ethclient.Client
	facilityABI     abi.ABI
	registryABI     abi.ABI
	facilityAddress common.Address
	registryAddress common.Address
	collateralAsset Asset
	liquidityAsset  Asset
	chainID         int64
	network         string
}

type ChainReaderConfig struct {
	RPCURL          string
	Network         string
	ChainID         int64
	FacilityAddress common.Address
	RegistryAddress common.Address
	CollateralAsset Asset
	LiquidityAsset  Asset
}

type rawRoot struct {
	ID                 [32]byte       `abi:"id"`
	Borrower           common.Address `abi:"borrower"`
	CollateralAsset    common.Address `abi:"collateralAsset"`
	LiquidityAsset     common.Address `abi:"liquidityAsset"`
	TargetCapacity     *big.Int       `abi:"targetCapacity"`
	CommittedCapacity  *big.Int       `abi:"committedCapacity"`
	DrawnPrincipal     *big.Int       `abi:"drawnPrincipal"`
	CollateralLocked   *big.Int       `abi:"collateralLocked"`
	ValidUntil         uint64         `abi:"validUntil"`
	PolicyHash         [32]byte       `abi:"policyHash"`
	SyndicationRoundID [32]byte       `abi:"syndicationRoundId"`
	State              uint8          `abi:"state"`
}

type rawChild struct {
	ID                [32]byte       `abi:"id"`
	RootID            [32]byte       `abi:"rootId"`
	AllocationID      [32]byte       `abi:"allocationId"`
	Provider          common.Address `abi:"provider"`
	SelectedCapacity  *big.Int       `abi:"selectedCapacity"`
	CommittedCapacity *big.Int       `abi:"committedCapacity"`
	DrawnPrincipal    *big.Int       `abi:"drawnPrincipal"`
	FeeBPS            uint32         `abi:"feeBps"`
	ValidUntil        uint64         `abi:"validUntil"`
	TermsCommitment   [32]byte       `abi:"termsCommitment"`
	State             uint8          `abi:"state"`
}

type rawRound struct {
	ID             [32]byte `abi:"id"`
	RootAccordID   [32]byte `abi:"rootAccordId"`
	TargetCapacity *big.Int `abi:"targetCapacity"`
	MaxFeeBPS      uint32   `abi:"maxFeeBps"`
	RoundExpiry    uint64   `abi:"roundExpiry"`
	Status         uint8    `abi:"status"`
}

type rawDraw struct {
	ID              [32]byte `abi:"id"`
	RootAccordID    [32]byte `abi:"rootAccordId"`
	Principal       *big.Int `abi:"principal"`
	RepaidPrincipal *big.Int `abi:"repaidPrincipal"`
	CreatedAt       uint64   `abi:"createdAt"`
	Exists          bool     `abi:"exists"`
}

type rawDrawLeg struct {
	ID              [32]byte `abi:"id"`
	DrawID          [32]byte `abi:"drawId"`
	ChildAccordID   [32]byte `abi:"childAccordId"`
	Principal       *big.Int `abi:"principal"`
	RepaidPrincipal *big.Int `abi:"repaidPrincipal"`
}

type rawNode struct {
	ID        [32]byte `abi:"id"`
	ParentID  [32]byte `abi:"parentId"`
	Kind      uint8    `abi:"kind"`
	CreatedAt uint64   `abi:"createdAt"`
	Exists    bool     `abi:"exists"`
}

const capitalFacilityABIJSON = `[
  {"inputs":[{"name":"rootId","type":"bytes32"}],"name":"getRoot","outputs":[{"components":[{"name":"id","type":"bytes32"},{"name":"borrower","type":"address"},{"name":"collateralAsset","type":"address"},{"name":"liquidityAsset","type":"address"},{"name":"targetCapacity","type":"uint256"},{"name":"committedCapacity","type":"uint256"},{"name":"drawnPrincipal","type":"uint256"},{"name":"collateralLocked","type":"uint256"},{"name":"validUntil","type":"uint64"},{"name":"policyHash","type":"bytes32"},{"name":"syndicationRoundId","type":"bytes32"},{"name":"state","type":"uint8"}],"name":"","type":"tuple"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"name":"childId","type":"bytes32"}],"name":"getChild","outputs":[{"components":[{"name":"id","type":"bytes32"},{"name":"rootId","type":"bytes32"},{"name":"allocationId","type":"bytes32"},{"name":"provider","type":"address"},{"name":"selectedCapacity","type":"uint256"},{"name":"committedCapacity","type":"uint256"},{"name":"drawnPrincipal","type":"uint256"},{"name":"feeBps","type":"uint32"},{"name":"validUntil","type":"uint64"},{"name":"termsCommitment","type":"bytes32"},{"name":"state","type":"uint8"}],"name":"","type":"tuple"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"name":"roundId","type":"bytes32"}],"name":"rounds","outputs":[{"components":[{"name":"id","type":"bytes32"},{"name":"rootAccordId","type":"bytes32"},{"name":"targetCapacity","type":"uint256"},{"name":"maxFeeBps","type":"uint32"},{"name":"roundExpiry","type":"uint64"},{"name":"status","type":"uint8"}],"name":"","type":"tuple"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"name":"rootId","type":"bytes32"}],"name":"getChildIds","outputs":[{"name":"","type":"bytes32[]"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"name":"roundId","type":"bytes32"}],"name":"getEligibleProviders","outputs":[{"name":"","type":"address[]"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"name":"drawId","type":"bytes32"}],"name":"draws","outputs":[{"components":[{"name":"id","type":"bytes32"},{"name":"rootAccordId","type":"bytes32"},{"name":"principal","type":"uint256"},{"name":"repaidPrincipal","type":"uint256"},{"name":"createdAt","type":"uint64"},{"name":"exists","type":"bool"}],"name":"","type":"tuple"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"name":"drawId","type":"bytes32"}],"name":"getDrawLegIds","outputs":[{"name":"","type":"bytes32[]"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"name":"legId","type":"bytes32"}],"name":"drawLegs","outputs":[{"components":[{"name":"id","type":"bytes32"},{"name":"drawId","type":"bytes32"},{"name":"childAccordId","type":"bytes32"},{"name":"principal","type":"uint256"},{"name":"repaidPrincipal","type":"uint256"}],"name":"","type":"tuple"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"collateralAsset","outputs":[{"name":"","type":"address"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"liquidityAsset","outputs":[{"name":"","type":"address"}],"stateMutability":"view","type":"function"}
]`

const registryABIJSON = `[
  {"inputs":[{"name":"id","type":"bytes32"}],"name":"nodes","outputs":[{"components":[{"name":"id","type":"bytes32"},{"name":"parentId","type":"bytes32"},{"name":"kind","type":"uint8"},{"name":"createdAt","type":"uint64"},{"name":"exists","type":"bool"}],"name":"","type":"tuple"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"name":"parentId","type":"bytes32"}],"name":"getChildren","outputs":[{"name":"","type":"bytes32[]"}],"stateMutability":"view","type":"function"}
]`

func NewChainReader(ctx context.Context, cfg ChainReaderConfig) (*ChainReader, error) {
	if cfg.RPCURL == "" || cfg.Network == "" || cfg.ChainID == 0 {
		return nil, fmt.Errorf("rpc URL, network, and chain ID are required")
	}
	if cfg.FacilityAddress == (common.Address{}) || cfg.RegistryAddress == (common.Address{}) {
		return nil, fmt.Errorf("facility and registry addresses are required")
	}
	if cfg.CollateralAsset.Address == "" || cfg.LiquidityAsset.Address == "" {
		return nil, fmt.Errorf("collateral and liquidity asset metadata are required")
	}
	client, err := ethclient.DialContext(ctx, cfg.RPCURL)
	if err != nil {
		return nil, fmt.Errorf("dial chain: %w", err)
	}
	chainID, err := client.ChainID(ctx)
	if err != nil {
		client.Close()
		return nil, fmt.Errorf("read chain ID: %w", err)
	}
	if !chainID.IsInt64() || chainID.Int64() != cfg.ChainID {
		client.Close()
		return nil, fmt.Errorf("chain ID mismatch: configured %d, RPC returned %s", cfg.ChainID, chainID.String())
	}
	facilityABI, err := abi.JSON(strings.NewReader(capitalFacilityABIJSON))
	if err != nil {
		client.Close()
		return nil, fmt.Errorf("parse facility ABI: %w", err)
	}
	registryABI, err := abi.JSON(strings.NewReader(registryABIJSON))
	if err != nil {
		client.Close()
		return nil, fmt.Errorf("parse registry ABI: %w", err)
	}
	return &ChainReader{
		client:          client,
		facilityABI:     facilityABI,
		registryABI:     registryABI,
		facilityAddress: cfg.FacilityAddress,
		registryAddress: cfg.RegistryAddress,
		collateralAsset: cfg.CollateralAsset,
		liquidityAsset:  cfg.LiquidityAsset,
		chainID:         cfg.ChainID,
		network:         cfg.Network,
	}, nil
}

func (r *ChainReader) Close() { r.client.Close() }

func (r *ChainReader) ChainID() int64 { return r.chainID }

func (r *ChainReader) Network() string { return r.network }

func (r *ChainReader) call(ctx context.Context, contractABI abi.ABI, contractAddress common.Address, method string, dest interface{}, args ...interface{}) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	data, err := contractABI.Pack(method, args...)
	if err != nil {
		return fmt.Errorf("pack %s: %w", method, err)
	}
	output, err := r.client.CallContract(ctx, ethereum.CallMsg{To: &contractAddress, Data: data}, nil)
	if err != nil {
		return fmt.Errorf("call %s: %w", method, err)
	}
	values, err := contractABI.Unpack(method, output)
	if err != nil {
		return fmt.Errorf("unpack %s: %w", method, err)
	}
	if len(values) != 1 {
		return fmt.Errorf("unpack %s: expected one projected output, got %d", method, len(values))
	}
	converted := reflect.ValueOf(abi.ConvertType(values[0], dest))
	destination := reflect.ValueOf(dest)
	if !converted.IsValid() || !destination.IsValid() || converted.Type() != destination.Type() {
		return fmt.Errorf("unpack %s: output type %T cannot be assigned to %T", method, values[0], dest)
	}
	destination.Elem().Set(converted.Elem())
	return nil
}

// The wrappers below keep the call sites readable and avoid exposing ABI
// plumbing to the API and MCP layers.
func (r *ChainReader) facilityCall(ctx context.Context, method string, dest interface{}, args ...interface{}) error {
	return r.call(ctx, r.facilityABI, r.facilityAddress, method, dest, args...)
}

func (r *ChainReader) registryCall(ctx context.Context, method string, dest interface{}, args ...interface{}) error {
	return r.call(ctx, r.registryABI, r.registryAddress, method, dest, args...)
}

func (r *ChainReader) Facility(ctx context.Context, rootID [32]byte) (Facility, error) {
	var root rawRoot
	if err := r.facilityCall(ctx, "getRoot", &root, rootID); err != nil {
		return Facility{}, fmt.Errorf("read root Accord %s: %w", bytes32String(rootID), err)
	}
	childIDs := [][32]byte{}
	if err := r.facilityCall(ctx, "getChildIds", &childIDs, rootID); err != nil {
		return Facility{}, fmt.Errorf("read child Accords: %w", err)
	}
	children := make([]ChildAccord, 0, len(childIDs))
	for _, childID := range childIDs {
		child, err := r.child(ctx, childID)
		if err != nil {
			return Facility{}, err
		}
		children = append(children, child)
	}

	rootState := stateFromRoot(root.State)
	if !strings.EqualFold(root.CollateralAsset.Hex(), r.collateralAsset.Address) {
		return Facility{}, fmt.Errorf("facility collateral asset %s does not match configured %s", root.CollateralAsset.Hex(), r.collateralAsset.Address)
	}
	if !strings.EqualFold(root.LiquidityAsset.Hex(), r.liquidityAsset.Address) {
		return Facility{}, fmt.Errorf("facility liquidity asset %s does not match configured %s", root.LiquidityAsset.Hex(), r.liquidityAsset.Address)
	}
	committedChildren := big.NewInt(0)
	childExposure := big.NewInt(0)
	for _, child := range children {
		if child.State != ChildClosed && child.State != ChildExpired {
			committedChildren.Add(committedChildren, mustBig(child.CommittedCapacity))
		}
		childExposure.Add(childExposure, mustBig(child.DrawnPrincipal))
	}
	available := new(big.Int).Sub(root.CommittedCapacity, root.DrawnPrincipal)
	return Facility{
		ID:                 bytes32String(root.ID),
		Borrower:           root.Borrower.Hex(),
		CollateralAsset:    r.collateralAsset,
		LiquidityAsset:     r.liquidityAsset,
		TargetCapacity:     amount(root.TargetCapacity),
		CommittedCapacity:  amount(root.CommittedCapacity),
		DrawnPrincipal:     amount(root.DrawnPrincipal),
		CollateralLocked:   amount(root.CollateralLocked),
		AvailableCapacity:  amount(available),
		ValidUntil:         timestamp(root.ValidUntil),
		ValidUntilUnix:     amount(new(big.Int).SetUint64(root.ValidUntil)),
		PolicyHash:         bytes32String(root.PolicyHash),
		SyndicationRoundID: bytes32String(root.SyndicationRoundID),
		State:              rootState,
		StateCopy:          rootCopy(rootState),
		Round:              r.roundIfPresent(ctx, root.SyndicationRoundID),
		Children:           children,
		Invariants: Invariants{
			RootDrawWithinCommitment:       root.DrawnPrincipal.Cmp(root.CommittedCapacity) <= 0,
			ChildDrawWithinCommitment:      allChildrenWithinCommitment(children),
			RootExposureMatchesChildren:    root.DrawnPrincipal.Cmp(childExposure) == 0,
			CommittedMatchesFundedChildren: root.CommittedCapacity.Cmp(committedChildren) == 0,
		},
	}, nil
}

func (r *ChainReader) child(ctx context.Context, childID [32]byte) (ChildAccord, error) {
	var child rawChild
	if err := r.facilityCall(ctx, "getChild", &child, childID); err != nil {
		return ChildAccord{}, fmt.Errorf("read child Accord %s: %w", bytes32String(childID), err)
	}
	state := stateFromChild(child.State)
	available := new(big.Int).Sub(child.CommittedCapacity, child.DrawnPrincipal)
	return ChildAccord{
		ID:                bytes32String(child.ID),
		RootAccordID:      bytes32String(child.RootID),
		AllocationID:      bytes32String(child.AllocationID),
		Provider:          child.Provider.Hex(),
		SelectedCapacity:  amount(child.SelectedCapacity),
		CommittedCapacity: amount(child.CommittedCapacity),
		DrawnPrincipal:    amount(child.DrawnPrincipal),
		AvailableCapacity: amount(available),
		FeeBPS:            child.FeeBPS,
		ValidUntil:        timestamp(child.ValidUntil),
		ValidUntilUnix:    amount(new(big.Int).SetUint64(child.ValidUntil)),
		TermsCommitment:   bytes32String(child.TermsCommitment),
		State:             state,
		StateCopy:         childCopy(state),
	}, nil
}

func (r *ChainReader) Round(ctx context.Context, roundID [32]byte) (Round, error) {
	var raw rawRound
	if err := r.facilityCall(ctx, "rounds", &raw, roundID); err != nil {
		return Round{}, fmt.Errorf("read round %s: %w", bytes32String(roundID), err)
	}
	providers := []common.Address{}
	if err := r.facilityCall(ctx, "getEligibleProviders", &providers, roundID); err != nil {
		return Round{}, fmt.Errorf("read eligible provider count: %w", err)
	}
	status := stateFromRound(raw.Status)
	return Round{
		ID:                    bytes32String(raw.ID),
		RootAccordID:          bytes32String(raw.RootAccordID),
		TargetCapacity:        amount(raw.TargetCapacity),
		MaxFeeBPS:             raw.MaxFeeBPS,
		RoundExpiry:           timestamp(raw.RoundExpiry),
		RoundExpiryUnix:       amount(new(big.Int).SetUint64(raw.RoundExpiry)),
		Status:                status,
		StateCopy:             roundCopy(status),
		EligibleProviderCount: len(providers),
		PrivateQuoteData:      "withheld",
	}, nil
}

func (r *ChainReader) roundIfPresent(ctx context.Context, roundID [32]byte) *Round {
	if roundID == ([32]byte{}) {
		return nil
	}
	round, err := r.Round(ctx, roundID)
	if err != nil {
		return nil
	}
	return &round
}

func (r *ChainReader) Draw(ctx context.Context, drawID [32]byte) (Draw, error) {
	var raw rawDraw
	if err := r.facilityCall(ctx, "draws", &raw, drawID); err != nil {
		return Draw{}, fmt.Errorf("read draw %s: %w", bytes32String(drawID), err)
	}
	if !raw.Exists {
		return Draw{}, fmt.Errorf("draw %s was not observed", bytes32String(drawID))
	}
	legIDs := [][32]byte{}
	if err := r.facilityCall(ctx, "getDrawLegIds", &legIDs, drawID); err != nil {
		return Draw{}, fmt.Errorf("read draw legs: %w", err)
	}
	legs := make([]DrawLeg, 0, len(legIDs))
	for _, legID := range legIDs {
		var leg rawDrawLeg
		if err := r.facilityCall(ctx, "drawLegs", &leg, legID); err != nil {
			return Draw{}, fmt.Errorf("read draw leg %s: %w", bytes32String(legID), err)
		}
		child, err := r.child(ctx, leg.ChildAccordID)
		if err != nil {
			return Draw{}, err
		}
		outstanding := new(big.Int).Sub(leg.Principal, leg.RepaidPrincipal)
		legs = append(legs, DrawLeg{
			ID:                   bytes32String(leg.ID),
			DrawID:               bytes32String(leg.DrawID),
			ChildAccordID:        bytes32String(leg.ChildAccordID),
			Provider:             child.Provider,
			Principal:            amount(leg.Principal),
			RepaidPrincipal:      amount(leg.RepaidPrincipal),
			OutstandingPrincipal: amount(outstanding),
		})
	}
	outstanding := new(big.Int).Sub(raw.Principal, raw.RepaidPrincipal)
	return Draw{
		ID:                   bytes32String(raw.ID),
		RootAccordID:         bytes32String(raw.RootAccordID),
		Principal:            amount(raw.Principal),
		RepaidPrincipal:      amount(raw.RepaidPrincipal),
		OutstandingPrincipal: amount(outstanding),
		CreatedAt:            timestamp(raw.CreatedAt),
		Legs:                 legs,
	}, nil
}

func (r *ChainReader) Lineage(ctx context.Context, rootID [32]byte) (Lineage, error) {
	seen := map[[32]byte]bool{}
	nodes := make([]LineageNode, 0)
	var visit func([32]byte, int) error
	visit = func(id [32]byte, depth int) error {
		if depth > 256 {
			return fmt.Errorf("lineage exceeds traversal depth")
		}
		if seen[id] {
			return nil
		}
		seen[id] = true
		var node rawNode
		if err := r.registryCall(ctx, "nodes", &node, id); err != nil {
			return err
		}
		if !node.Exists {
			return fmt.Errorf("lineage node %s was not observed", bytes32String(id))
		}
		children := [][32]byte{}
		if err := r.registryCall(ctx, "getChildren", &children, id); err != nil {
			return err
		}
		childStrings := make([]string, 0, len(children))
		for _, child := range children {
			childStrings = append(childStrings, bytes32String(child))
		}
		nodes = append(nodes, LineageNode{
			ID:        bytes32String(node.ID),
			ParentID:  bytes32String(node.ParentID),
			Kind:      kindFromRegistry(node.Kind),
			CreatedAt: timestamp(node.CreatedAt),
			Children:  childStrings,
		})
		for _, child := range children {
			if err := visit(child, depth+1); err != nil {
				return err
			}
		}
		return nil
	}
	if err := visit(rootID, 0); err != nil {
		return Lineage{}, fmt.Errorf("read lineage: %w", err)
	}
	return Lineage{RootAccordID: bytes32String(rootID), Nodes: nodes}, nil
}

func allChildrenWithinCommitment(children []ChildAccord) bool {
	for _, child := range children {
		if mustBig(child.DrawnPrincipal).Cmp(mustBig(child.CommittedCapacity)) > 0 {
			return false
		}
	}
	return true
}

func mustBig(value string) *big.Int {
	v, ok := new(big.Int).SetString(value, 10)
	if !ok {
		return big.NewInt(0)
	}
	return v
}
