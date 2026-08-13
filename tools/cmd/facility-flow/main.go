// Command facility-flow exercises the funded Concord facility lifecycle on a
// configured network. It uses the provider keys only to approve and fund their
// already-materialized Child Accords, then uses the treasury key to draw and
// repay. Every transition is checked against onchain state before the next one
// is attempted.
package main

import (
	"context"
	"crypto/ecdsa"
	"encoding/json"
	"flag"
	"fmt"
	"math/big"
	"os"
	"strings"
	"time"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	coretypes "github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
)

const facilityABIJSON = `[
  {
    "inputs": [{"internalType": "bytes32", "name": "", "type": "bytes32"}],
    "name": "rootAccords",
    "outputs": [
      {"internalType": "bytes32", "name": "id", "type": "bytes32"},
      {"internalType": "address", "name": "borrower", "type": "address"},
      {"internalType": "address", "name": "collateralAsset", "type": "address"},
      {"internalType": "address", "name": "liquidityAsset", "type": "address"},
      {"internalType": "uint256", "name": "targetCapacity", "type": "uint256"},
      {"internalType": "uint256", "name": "committedCapacity", "type": "uint256"},
      {"internalType": "uint256", "name": "drawnPrincipal", "type": "uint256"},
      {"internalType": "uint256", "name": "collateralLocked", "type": "uint256"},
      {"internalType": "uint64", "name": "validUntil", "type": "uint64"},
      {"internalType": "bytes32", "name": "policyHash", "type": "bytes32"},
      {"internalType": "bytes32", "name": "syndicationRoundId", "type": "bytes32"},
      {"internalType": "uint8", "name": "state", "type": "uint8"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "bytes32", "name": "", "type": "bytes32"}],
    "name": "childAccords",
    "outputs": [
      {"internalType": "bytes32", "name": "id", "type": "bytes32"},
      {"internalType": "bytes32", "name": "rootId", "type": "bytes32"},
      {"internalType": "bytes32", "name": "allocationId", "type": "bytes32"},
      {"internalType": "address", "name": "provider", "type": "address"},
      {"internalType": "uint256", "name": "selectedCapacity", "type": "uint256"},
      {"internalType": "uint256", "name": "committedCapacity", "type": "uint256"},
      {"internalType": "uint256", "name": "drawnPrincipal", "type": "uint256"},
      {"internalType": "uint32", "name": "feeBps", "type": "uint32"},
      {"internalType": "uint64", "name": "validUntil", "type": "uint64"},
      {"internalType": "bytes32", "name": "termsCommitment", "type": "bytes32"},
      {"internalType": "uint8", "name": "state", "type": "uint8"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "bytes32", "name": "", "type": "bytes32"}],
    "name": "draws",
    "outputs": [
      {"internalType": "bytes32", "name": "id", "type": "bytes32"},
      {"internalType": "bytes32", "name": "rootAccordId", "type": "bytes32"},
      {"internalType": "uint256", "name": "principal", "type": "uint256"},
      {"internalType": "uint256", "name": "repaidPrincipal", "type": "uint256"},
      {"internalType": "uint64", "name": "createdAt", "type": "uint64"},
      {"internalType": "bool", "name": "exists", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "bytes32", "name": "", "type": "bytes32"}],
    "name": "getChildIds",
    "outputs": [{"internalType": "bytes32[]", "name": "", "type": "bytes32[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "bytes32", "name": "", "type": "bytes32"}],
    "name": "getDrawLegIds",
    "outputs": [{"internalType": "bytes32[]", "name": "", "type": "bytes32[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "bytes32", "name": "", "type": "bytes32"}],
    "name": "drawLegs",
    "outputs": [
      {"internalType": "bytes32", "name": "id", "type": "bytes32"},
      {"internalType": "bytes32", "name": "drawId", "type": "bytes32"},
      {"internalType": "bytes32", "name": "childAccordId", "type": "bytes32"},
      {"internalType": "uint256", "name": "principal", "type": "uint256"},
      {"internalType": "uint256", "name": "repaidPrincipal", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "bytes32", "name": "rootId", "type": "bytes32"}],
    "name": "availableCapacity",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "bytes32", "name": "childId", "type": "bytes32"}, {"internalType": "uint256", "name": "amount", "type": "uint256"}],
    "name": "fundChild",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "bytes32", "name": "drawId", "type": "bytes32"}, {"internalType": "bytes32", "name": "rootId", "type": "bytes32"}, {"internalType": "uint256", "name": "amount", "type": "uint256"}],
    "name": "draw",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "bytes32", "name": "drawId", "type": "bytes32"}, {"internalType": "uint256", "name": "amount", "type": "uint256"}],
    "name": "repay",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
]`

const tokenABIJSON = `[
  {
    "inputs": [{"internalType": "address", "name": "spender", "type": "address"}, {"internalType": "uint256", "name": "amount", "type": "uint256"}],
    "name": "approve",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  }
]`

type rootView struct {
	ID        common.Hash
	Borrower  common.Address
	Target    *big.Int
	Committed *big.Int
	Drawn     *big.Int
	State     uint8
}

type childView struct {
	ID        common.Hash
	Provider  common.Address
	Selected  *big.Int
	Committed *big.Int
	Drawn     *big.Int
	State     uint8
}

type drawView struct {
	ID       common.Hash
	Principal *big.Int
	Repaid   *big.Int
	Exists   bool
}

type txEvidence struct {
	Label string `json:"label"`
	Hash  string `json:"hash"`
}

type childEvidence struct {
	ID        string `json:"id"`
	Provider  string `json:"provider"`
	Selected  string `json:"selected"`
	Committed string `json:"committed"`
	Drawn     string `json:"drawn"`
	State     uint8  `json:"state"`
}

type flowEvidence struct {
	Network         string          `json:"network"`
	Facility        string          `json:"facility"`
	LiquidityAsset  string          `json:"liquidityAsset"`
	RootAccordID    string          `json:"rootAccordId"`
	DrawID          string          `json:"drawId"`
	DrawAmount      string          `json:"drawAmount"`
	Funding         []txEvidence    `json:"funding"`
	Draw            *txEvidence     `json:"draw,omitempty"`
	Repayment       *txEvidence     `json:"repayment,omitempty"`
	Children        []childEvidence `json:"children"`
	DrawLegCount    int             `json:"drawLegCount"`
	RootStateAfter  uint8           `json:"rootStateAfter"`
	CommittedAfter  string          `json:"committedAfter"`
	DrawnAfter      string          `json:"drawnAfter"`
	AvailableAfter  string          `json:"availableAfter"`
	Invariants      map[string]bool `json:"invariants"`
	CompletedAt     string          `json:"completedAt"`
}

type providerKey struct {
	Name string
	Env  string
	Key  *ecdsa.PrivateKey
}

func main() {
	if err := run(); err != nil {
		fmt.Fprintf(os.Stderr, "facility-flow: %v\n", err)
		os.Exit(1)
	}
}

func run() error {
	flags := flag.NewFlagSet("facility-flow", flag.ContinueOnError)
	rpcURL := flags.String("rpc", "", "chain RPC URL")
	facilityText := flags.String("facility", "", "CapitalFacility address")
	tokenText := flags.String("token", "", "USDT0 address")
	rootText := flags.String("root-accord-id", "", "root Accord id")
	drawText := flags.String("draw-id", "", "draw id; defaults to a deterministic Concord test id")
	drawAmountText := flags.String("draw-amount", "4000000", "draw amount in token base units")
	outFile := flags.String("out", "", "JSON evidence output path")
	if err := flags.Parse(os.Args[1:]); err != nil {
		return err
	}
	for name, value := range map[string]string{"rpc": *rpcURL, "facility": *facilityText, "token": *tokenText, "root-accord-id": *rootText, "out": *outFile} {
		if strings.TrimSpace(value) == "" {
			return fmt.Errorf("-%s is required", name)
		}
	}
	facility, err := parseAddress(*facilityText, "facility")
	if err != nil {
		return err
	}
	token, err := parseAddress(*tokenText, "token")
	if err != nil {
		return err
	}
	rootID, err := parseHash(*rootText, "root-accord-id")
	if err != nil {
		return err
	}
	drawAmount, err := positive(*drawAmountText, "draw-amount")
	if err != nil {
		return err
	}
	drawID := common.HexToHash(*drawText)
	if *drawText == "" {
		drawID = crypto.Keccak256Hash([]byte("CONCORD_C2_E2E_DRAW_01"))
	} else if drawID == (common.Hash{}) {
		return fmt.Errorf("draw-id must be a non-zero bytes32 value")
	}

	client, err := ethclient.Dial(*rpcURL)
	if err != nil {
		return fmt.Errorf("connect to RPC: %w", err)
	}
	defer client.Close()
	ctx, cancel := context.WithTimeout(context.Background(), 12*time.Minute)
	defer cancel()
	chainID, err := client.ChainID(ctx)
	if err != nil {
		return fmt.Errorf("read chain id: %w", err)
	}
	if chainID.Uint64() != 114 {
		return fmt.Errorf("expected Coston2 chain id 114, got %s", chainID)
	}
	facilityABI, err := abi.JSON(strings.NewReader(facilityABIJSON))
	if err != nil {
		return fmt.Errorf("parse facility ABI: %w", err)
	}
	tokenABI, err := abi.JSON(strings.NewReader(tokenABIJSON))
	if err != nil {
		return fmt.Errorf("parse token ABI: %w", err)
	}
	providerKeys := []providerKey{
		{Name: "provider_a", Env: "CONCORD_E2E_PROVIDER_A_PRIVATE_KEY"},
		{Name: "provider_b", Env: "CONCORD_E2E_PROVIDER_B_PRIVATE_KEY"},
		{Name: "provider_c", Env: "CONCORD_E2E_PROVIDER_C_PRIVATE_KEY"},
	}
	for index := range providerKeys {
		providerKeys[index].Key, err = privateKeyFromEnv(providerKeys[index].Env)
		if err != nil {
			return fmt.Errorf("%s: %w", providerKeys[index].Name, err)
		}
	}

	root, err := readRoot(ctx, client, facilityABI, facility, rootID)
	if err != nil {
		return err
	}
	if root.State != 3 && root.State != 4 {
		return fmt.Errorf("root must be FUNDING or ACTIVE before facility flow; state=%d", root.State)
	}
	childIDs, err := readHashArray(ctx, client, facilityABI, facility, "getChildIds", rootID)
	if err != nil {
		return err
	}
	if len(childIDs) < 2 {
		return fmt.Errorf("root has %d children; at least two are required for the draw", len(childIDs))
	}
	children := make([]childView, 0, len(childIDs))
	for _, childID := range childIDs {
		child, childErr := readChild(ctx, client, facilityABI, facility, childID)
		if childErr != nil {
			return childErr
		}
		children = append(children, child)
	}

	evidence := flowEvidence{
		Network:        "Coston2",
		Facility:       facility.Hex(),
		LiquidityAsset: token.Hex(),
		RootAccordID:   rootID.Hex(),
		DrawID:         drawID.Hex(),
		DrawAmount:     drawAmount.String(),
		Funding:        []txEvidence{},
		Children:       []childEvidence{},
		Invariants:     map[string]bool{},
	}
	for _, child := range children {
		key, found := keyForProvider(providerKeys, child.Provider)
		if !found {
			return fmt.Errorf("no configured provider key matches child %s provider %s", child.ID.Hex(), child.Provider.Hex())
		}
		if child.Committed.Cmp(child.Selected) > 0 {
			return fmt.Errorf("child %s is overfunded", child.ID.Hex())
		}
		remaining := new(big.Int).Sub(child.Selected, child.Committed)
		if remaining.Sign() > 0 {
			approveHash, approveErr := transact(ctx, client, tokenABI, token, key.Key, "approve", facility, child.Selected)
			if approveErr != nil {
				return fmt.Errorf("approve %s: %w", key.Name, approveErr)
			}
			evidence.Funding = append(evidence.Funding, txEvidence{Label: key.Name + " approve", Hash: approveHash.Hex()})
			fundHash, fundErr := transact(ctx, client, facilityABI, facility, key.Key, "fundChild", child.ID, remaining)
			if fundErr != nil {
				return fmt.Errorf("fund child %s: %w", child.ID.Hex(), fundErr)
			}
			evidence.Funding = append(evidence.Funding, txEvidence{Label: key.Name + " fundChild", Hash: fundHash.Hex()})
		}
	}

	root, err = readRoot(ctx, client, facilityABI, facility, rootID)
	if err != nil {
		return err
	}
	if root.Committed.Cmp(root.Target) != 0 || root.State != 4 {
		return fmt.Errorf("root did not activate after funding: state=%d committed=%s target=%s", root.State, root.Committed, root.Target)
	}

	draw, err := readDraw(ctx, client, facilityABI, facility, drawID)
	if err != nil {
		return err
	}
	if !draw.Exists {
		drawHash, drawErr := transact(ctx, client, facilityABI, facility, privateKeyFromTreasury(), "draw", drawID, rootID, drawAmount)
		if drawErr != nil {
			return fmt.Errorf("draw: %w", drawErr)
		}
		evidence.Draw = &txEvidence{Label: "treasury draw", Hash: drawHash.Hex()}
	} else if draw.Principal.Cmp(drawAmount) != 0 {
		return fmt.Errorf("existing draw %s has principal %s, expected %s", drawID.Hex(), draw.Principal, drawAmount)
	}

	draw, err = readDraw(ctx, client, facilityABI, facility, drawID)
	if err != nil {
		return err
	}
	legIDs, err := readHashArray(ctx, client, facilityABI, facility, "getDrawLegIds", drawID)
	if err != nil {
		return err
	}
	if len(legIDs) < 2 {
		return fmt.Errorf("draw %s has %d legs; expected at least two", drawID.Hex(), len(legIDs))
	}
	evidence.DrawLegCount = len(legIDs)

	treasuryKey := privateKeyFromTreasury()
	outstanding := new(big.Int).Sub(draw.Principal, draw.Repaid)
	if outstanding.Sign() > 0 {
		approveHash, approveErr := transact(ctx, client, tokenABI, token, treasuryKey, "approve", facility, outstanding)
		if approveErr != nil {
			return fmt.Errorf("treasury repayment approval: %w", approveErr)
		}
		evidence.Funding = append(evidence.Funding, txEvidence{Label: "treasury repay approve", Hash: approveHash.Hex()})
		repayHash, repayErr := transact(ctx, client, facilityABI, facility, treasuryKey, "repay", drawID, outstanding)
		if repayErr != nil {
			return fmt.Errorf("repay: %w", repayErr)
		}
		evidence.Repayment = &txEvidence{Label: "treasury repay", Hash: repayHash.Hex()}
	}

	root, err = readRoot(ctx, client, facilityABI, facility, rootID)
	if err != nil {
		return err
	}
	children, err = readChildren(ctx, client, facilityABI, facility, childIDs)
	if err != nil {
		return err
	}
	available, err := readUint(ctx, client, facilityABI, facility, "availableCapacity", rootID)
	if err != nil {
		return err
	}
	childrenDrawn := new(big.Int)
	committedChildren := new(big.Int)
	for _, child := range children {
		childrenDrawn.Add(childrenDrawn, child.Drawn)
		if child.State != 5 && child.State != 6 {
			committedChildren.Add(committedChildren, child.Committed)
		}
		evidence.Children = append(evidence.Children, childEvidence{
			ID: child.ID.Hex(), Provider: child.Provider.Hex(), Selected: child.Selected.String(),
			Committed: child.Committed.String(), Drawn: child.Drawn.String(), State: child.State,
		})
	}
	draw, err = readDraw(ctx, client, facilityABI, facility, drawID)
	if err != nil {
		return err
	}
	evidence.RootStateAfter = root.State
	evidence.CommittedAfter = root.Committed.String()
	evidence.DrawnAfter = root.Drawn.String()
	evidence.AvailableAfter = available.String()
	evidence.Invariants = map[string]bool{
		"rootActive":              root.State == 4,
		"rootCommittedEqualsChild": root.Committed.Cmp(committedChildren) == 0,
		"rootDrawnEqualsChildren":  root.Drawn.Cmp(childrenDrawn) == 0,
		"rootDrawnZeroAfterRepay":  root.Drawn.Sign() == 0,
		"drawFullyRepaid":          draw.Repaid.Cmp(draw.Principal) == 0,
		"capacityRestored":         available.Cmp(root.Committed) == 0,
		"multiChildDraw":            evidence.DrawLegCount >= 2,
	}
	for name, ok := range evidence.Invariants {
		if !ok {
			return fmt.Errorf("facility invariant failed: %s", name)
		}
	}
	evidence.CompletedAt = time.Now().UTC().Format(time.RFC3339)
	if err := writeJSON(*outFile, evidence); err != nil {
		return err
	}
	fmt.Printf("facility flow complete: draw=%s legs=%d available=%s evidence=%s\n", drawID.Hex(), evidence.DrawLegCount, available.String(), *outFile)
	return nil
}

// The treasury key is deliberately read at the final signing boundary from
// the same environment contract used by the rest of the Coston2 tools.
func privateKeyFromTreasury() *ecdsa.PrivateKey {
	key, err := privateKeyFromEnv("DEPLOYMENT_PRIVATE_KEY")
	if err != nil {
		panic(err)
	}
	return key
}

func keyForProvider(keys []providerKey, address common.Address) (providerKey, bool) {
	for _, key := range keys {
		if crypto.PubkeyToAddress(key.Key.PublicKey) == address {
			return key, true
		}
	}
	return providerKey{}, false
}

func readRoot(ctx context.Context, client *ethclient.Client, contractABI abi.ABI, facility common.Address, rootID common.Hash) (rootView, error) {
	values, err := call(ctx, client, contractABI, facility, "rootAccords", rootID)
	if err != nil {
		return rootView{}, err
	}
	if len(values) != 12 {
		return rootView{}, fmt.Errorf("rootAccords returned %d values, expected 12", len(values))
	}
	id, err := hashValue(values[0], "root id")
	if err != nil {
		return rootView{}, err
	}
	borrower, err := addressValue(values[1], "root borrower")
	if err != nil {
		return rootView{}, err
	}
	state, err := uint8Value(values[11], "root state")
	if err != nil {
		return rootView{}, err
	}
	target, ok := values[4].(*big.Int)
	if !ok {
		return rootView{}, fmt.Errorf("root target has type %T", values[4])
	}
	committed, ok := values[5].(*big.Int)
	if !ok {
		return rootView{}, fmt.Errorf("root committed has type %T", values[5])
	}
	drawn, ok := values[6].(*big.Int)
	if !ok {
		return rootView{}, fmt.Errorf("root drawn has type %T", values[6])
	}
	return rootView{ID: id, Borrower: borrower, Target: target, Committed: committed, Drawn: drawn, State: state}, nil
}

func readChild(ctx context.Context, client *ethclient.Client, contractABI abi.ABI, facility common.Address, childID common.Hash) (childView, error) {
	values, err := call(ctx, client, contractABI, facility, "childAccords", childID)
	if err != nil {
		return childView{}, err
	}
	if len(values) != 11 {
		return childView{}, fmt.Errorf("childAccords returned %d values, expected 11", len(values))
	}
	id, err := hashValue(values[0], "child id")
	if err != nil {
		return childView{}, err
	}
	provider, err := addressValue(values[3], "child provider")
	if err != nil {
		return childView{}, err
	}
	selected, ok := values[4].(*big.Int)
	if !ok {
		return childView{}, fmt.Errorf("child selected has type %T", values[4])
	}
	committed, ok := values[5].(*big.Int)
	if !ok {
		return childView{}, fmt.Errorf("child committed has type %T", values[5])
	}
	drawn, ok := values[6].(*big.Int)
	if !ok {
		return childView{}, fmt.Errorf("child drawn has type %T", values[6])
	}
	state, err := uint8Value(values[10], "child state")
	if err != nil {
		return childView{}, err
	}
	return childView{ID: id, Provider: provider, Selected: selected, Committed: committed, Drawn: drawn, State: state}, nil
}

func readChildren(ctx context.Context, client *ethclient.Client, contractABI abi.ABI, facility common.Address, ids []common.Hash) ([]childView, error) {
	children := make([]childView, 0, len(ids))
	for _, id := range ids {
		child, err := readChild(ctx, client, contractABI, facility, id)
		if err != nil {
			return nil, err
		}
		children = append(children, child)
	}
	return children, nil
}

func readDraw(ctx context.Context, client *ethclient.Client, contractABI abi.ABI, facility common.Address, drawID common.Hash) (drawView, error) {
	values, err := call(ctx, client, contractABI, facility, "draws", drawID)
	if err != nil {
		return drawView{}, err
	}
	if len(values) != 6 {
		return drawView{}, fmt.Errorf("draws returned %d values, expected 6", len(values))
	}
	id, err := hashValue(values[0], "draw id")
	if err != nil {
		return drawView{}, err
	}
	principal, ok := values[2].(*big.Int)
	if !ok {
		return drawView{}, fmt.Errorf("draw principal has type %T", values[2])
	}
	repaid, ok := values[3].(*big.Int)
	if !ok {
		return drawView{}, fmt.Errorf("draw repaid has type %T", values[3])
	}
	exists, ok := values[5].(bool)
	if !ok {
		return drawView{}, fmt.Errorf("draw exists has type %T", values[5])
	}
	return drawView{ID: id, Principal: principal, Repaid: repaid, Exists: exists}, nil
}

func readUint(ctx context.Context, client *ethclient.Client, contractABI abi.ABI, facility common.Address, method string, arg common.Hash) (*big.Int, error) {
	values, err := call(ctx, client, contractABI, facility, method, arg)
	if err != nil {
		return nil, err
	}
	if len(values) != 1 {
		return nil, fmt.Errorf("%s returned %d values, expected one", method, len(values))
	}
	value, ok := values[0].(*big.Int)
	if !ok {
		return nil, fmt.Errorf("%s returned %T", method, values[0])
	}
	return value, nil
}

func readHashArray(ctx context.Context, client *ethclient.Client, contractABI abi.ABI, facility common.Address, method string, arg common.Hash) ([]common.Hash, error) {
	values, err := call(ctx, client, contractABI, facility, method, arg)
	if err != nil {
		return nil, err
	}
	if len(values) != 1 {
		return nil, fmt.Errorf("%s returned %d values, expected one", method, len(values))
	}
	result := []common.Hash{}
	switch typed := values[0].(type) {
	case [][32]byte:
		for _, value := range typed {
			result = append(result, common.BytesToHash(value[:]))
		}
	case []common.Hash:
		result = append(result, typed...)
	default:
		return nil, fmt.Errorf("%s returned %T", method, values[0])
	}
	return result, nil
}

func transact(ctx context.Context, client *ethclient.Client, contractABI abi.ABI, address common.Address, key *ecdsa.PrivateKey, method string, args ...any) (common.Hash, error) {
	chainID, err := client.ChainID(ctx)
	if err != nil {
		return common.Hash{}, err
	}
	opts, err := bind.NewKeyedTransactorWithChainID(key, chainID)
	if err != nil {
		return common.Hash{}, err
	}
	opts.Context = ctx
	bound := bind.NewBoundContract(address, contractABI, client, client, client)
	tx, err := bound.Transact(opts, method, args...)
	if err != nil {
		return common.Hash{}, err
	}
	receipt, err := bind.WaitMined(ctx, client, tx)
	if err != nil {
		return common.Hash{}, err
	}
	if receipt.Status != coretypes.ReceiptStatusSuccessful {
		return common.Hash{}, fmt.Errorf("transaction %s reverted", tx.Hash().Hex())
	}
	return tx.Hash(), nil
}

func call(ctx context.Context, client *ethclient.Client, contractABI abi.ABI, address common.Address, method string, args ...any) ([]any, error) {
	input, err := contractABI.Pack(method, args...)
	if err != nil {
		return nil, fmt.Errorf("pack %s: %w", method, err)
	}
	output, err := client.CallContract(ctx, ethereum.CallMsg{To: &address, Data: input}, nil)
	if err != nil {
		return nil, fmt.Errorf("call %s: %w", method, err)
	}
	values, err := contractABI.Unpack(method, output)
	if err != nil {
		return nil, fmt.Errorf("decode %s: %w", method, err)
	}
	return values, nil
}

func privateKeyFromEnv(name string) (*ecdsa.PrivateKey, error) {
	value := strings.TrimSpace(os.Getenv(name))
	if value == "" {
		return nil, fmt.Errorf("%s is not set", name)
	}
	value = strings.TrimPrefix(strings.TrimPrefix(value, "0x"), "0X")
	key, err := crypto.HexToECDSA(value)
	if err != nil {
		return nil, fmt.Errorf("decode %s: %w", name, err)
	}
	return key, nil
}

func writeJSON(path string, value any) error {
	data, err := json.MarshalIndent(value, "", "  ")
	if err != nil {
		return err
	}
	data = append(data, '\n')
	return os.WriteFile(path, data, 0600)
}

func parseAddress(value, name string) (common.Address, error) {
	if !common.IsHexAddress(value) || common.HexToAddress(value) == (common.Address{}) {
		return common.Address{}, fmt.Errorf("%s must be a non-zero address", name)
	}
	return common.HexToAddress(value), nil
}

func parseHash(value, name string) (common.Hash, error) {
	if !strings.HasPrefix(value, "0x") || len(value) != 66 {
		return common.Hash{}, fmt.Errorf("%s must be a 32-byte 0x value", name)
	}
	hash := common.HexToHash(value)
	if hash == (common.Hash{}) {
		return common.Hash{}, fmt.Errorf("%s must be non-zero", name)
	}
	return hash, nil
}

func positive(value, name string) (*big.Int, error) {
	number, ok := new(big.Int).SetString(value, 10)
	if !ok || number.Sign() <= 0 {
		return nil, fmt.Errorf("%s must be a positive decimal integer", name)
	}
	return number, nil
}

func hashValue(value any, name string) (common.Hash, error) {
	switch typed := value.(type) {
	case [32]byte:
		return common.BytesToHash(typed[:]), nil
	case common.Hash:
		return typed, nil
	case []byte:
		if len(typed) != 32 {
			return common.Hash{}, fmt.Errorf("%s is not bytes32", name)
		}
		return common.BytesToHash(typed), nil
	default:
		return common.Hash{}, fmt.Errorf("%s has type %T", name, value)
	}
}

func addressValue(value any, name string) (common.Address, error) {
	address, ok := value.(common.Address)
	if !ok || address == (common.Address{}) {
		return common.Address{}, fmt.Errorf("%s has type %T or is zero", name, value)
	}
	return address, nil
}

func uint8Value(value any, name string) (uint8, error) {
	switch typed := value.(type) {
	case uint8:
		return typed, nil
	case uint16:
		if typed > 255 {
			return 0, fmt.Errorf("%s exceeds uint8", name)
		}
		return uint8(typed), nil
	case uint32:
		if typed > 255 {
			return 0, fmt.Errorf("%s exceeds uint8", name)
		}
		return uint8(typed), nil
	case *big.Int:
		if typed.Sign() < 0 || !typed.IsUint64() || typed.Uint64() > 255 {
			return 0, fmt.Errorf("%s exceeds uint8", name)
		}
		return uint8(typed.Uint64()), nil
	default:
		return 0, fmt.Errorf("%s has type %T", name, value)
	}
}
