package readmodel

import (
	"context"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
)

func TestChainReaderProjectsFacilityFromRPC(t *testing.T) {
	parsed, err := abi.JSON(strings.NewReader(capitalFacilityABIJSON))
	if err != nil {
		t.Fatal(err)
	}
	rootID := common.HexToHash("0x" + strings.Repeat("1", 64))
	childID := common.HexToHash("0x" + strings.Repeat("2", 64))
	collateral := common.HexToAddress("0x" + strings.Repeat("3", 40))
	liquidity := common.HexToAddress("0x" + strings.Repeat("4", 40))
	root := rawRoot{
		ID:                rootID,
		Borrower:          common.HexToAddress("0x" + strings.Repeat("5", 40)),
		CollateralAsset:   collateral,
		LiquidityAsset:    liquidity,
		TargetCapacity:    big.NewInt(100),
		CommittedCapacity: big.NewInt(100),
		DrawnPrincipal:    big.NewInt(25),
		CollateralLocked:  big.NewInt(50),
		ValidUntil:        200,
		PolicyHash:        common.HexToHash("0x" + strings.Repeat("6", 64)),
		State:             4,
	}
	child := rawChild{
		ID:                childID,
		RootID:            rootID,
		AllocationID:      common.HexToHash("0x" + strings.Repeat("7", 64)),
		Provider:          common.HexToAddress("0x" + strings.Repeat("8", 40)),
		SelectedCapacity:  big.NewInt(100),
		CommittedCapacity: big.NewInt(100),
		DrawnPrincipal:    big.NewInt(25),
		ValidUntil:        150,
		State:             3,
	}
	childParsed, err := abi.JSON(strings.NewReader(capitalFacilityABIJSON))
	if err != nil {
		t.Fatal(err)
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var request struct {
			ID     any               `json:"id"`
			Method string            `json:"method"`
			Params []json.RawMessage `json:"params"`
		}
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			t.Errorf("decode RPC request: %v", err)
			return
		}
		result := "0x72"
		if request.Method == "eth_call" && len(request.Params) > 0 {
			var call struct {
				Data  string `json:"data"`
				Input string `json:"input"`
			}
			if err := json.Unmarshal(request.Params[0], &call); err != nil {
				t.Errorf("decode eth_call: %v", err)
				return
			}
			if call.Data == "" {
				call.Data = call.Input
			}
			if len(call.Data) < 10 {
				t.Errorf("eth_call data too short: %q", call.Data)
			} else {
				switch strings.ToLower(call.Data[:10]) {
				case fmt.Sprintf("0x%x", parsed.Methods["getRoot"].ID):
					encoded, packErr := parsed.Methods["getRoot"].Outputs.Pack(root)
					if packErr != nil {
						t.Errorf("pack root: %v", packErr)
						return
					}
					result = "0x" + fmt.Sprintf("%x", encoded)
				case fmt.Sprintf("0x%x", parsed.Methods["getChildIds"].ID):
					encoded, packErr := parsed.Methods["getChildIds"].Outputs.Pack([][32]byte{childID})
					if packErr != nil {
						t.Errorf("pack child IDs: %v", packErr)
						return
					}
					result = "0x" + fmt.Sprintf("%x", encoded)
				case fmt.Sprintf("0x%x", childParsed.Methods["getChild"].ID):
					encoded, packErr := childParsed.Methods["getChild"].Outputs.Pack(child)
					if packErr != nil {
						t.Errorf("pack child: %v", packErr)
						return
					}
					result = "0x" + fmt.Sprintf("%x", encoded)
				}
			}
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = fmt.Fprintf(w, `{"jsonrpc":"2.0","id":%v,"result":%q}`, request.ID, result)
	}))
	defer server.Close()

	reader, err := NewChainReader(context.Background(), ChainReaderConfig{
		RPCURL:          server.URL,
		Network:         "coston2",
		ChainID:         114,
		FacilityAddress: common.HexToAddress("0x" + strings.Repeat("9", 40)),
		RegistryAddress: common.HexToAddress("0x" + strings.Repeat("a", 40)),
		CollateralAsset: Asset{Address: collateral.Hex(), Symbol: "FXRP", Decimals: 6},
		LiquidityAsset:  Asset{Address: liquidity.Hex(), Symbol: "USDT0", Decimals: 18},
	})
	if err != nil {
		t.Fatal(err)
	}
	defer reader.Close()
	facility, err := reader.Facility(context.Background(), rootID)
	if err != nil {
		t.Fatal(err)
	}
	if facility.State != RootActive || facility.AvailableCapacity != "75" || len(facility.Children) != 1 {
		t.Fatalf("unexpected facility projection: %+v", facility)
	}
	if !facility.Invariants.RootExposureMatchesChildren || !facility.Invariants.CommittedMatchesFundedChildren {
		t.Fatalf("invariants were not preserved: %+v", facility.Invariants)
	}
}
