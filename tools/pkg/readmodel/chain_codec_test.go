package readmodel

import (
	"math/big"
	"strings"
	"testing"

	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
)

func TestCapitalFacilityTupleCodec(t *testing.T) {
	parsed, err := abi.JSON(strings.NewReader(capitalFacilityABIJSON))
	if err != nil {
		t.Fatal(err)
	}
	want := rawRoot{
		ID:                 common.HexToHash("0x" + strings.Repeat("1", 64)),
		Borrower:           common.HexToAddress("0x" + strings.Repeat("2", 40)),
		CollateralAsset:    common.HexToAddress("0x" + strings.Repeat("3", 40)),
		LiquidityAsset:     common.HexToAddress("0x" + strings.Repeat("4", 40)),
		TargetCapacity:     big.NewInt(100),
		CommittedCapacity:  big.NewInt(90),
		DrawnPrincipal:     big.NewInt(10),
		CollateralLocked:   big.NewInt(7),
		ValidUntil:         123,
		PolicyHash:         common.HexToHash("0x" + strings.Repeat("5", 64)),
		SyndicationRoundID: common.HexToHash("0x" + strings.Repeat("6", 64)),
		State:              4,
	}
	encoded, err := parsed.Methods["getRoot"].Outputs.Pack(want)
	if err != nil {
		t.Fatal(err)
	}
	values, err := parsed.Unpack("getRoot", encoded)
	if err != nil {
		t.Fatal(err)
	}
	got := abi.ConvertType(values[0], new(rawRoot)).(*rawRoot)
	if got.Borrower != want.Borrower || got.TargetCapacity.Cmp(want.TargetCapacity) != 0 || got.State != want.State {
		t.Fatalf("decoded root mismatch: got %+v want %+v", got, want)
	}
}
