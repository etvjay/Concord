package extension

import (
	"crypto/ecdsa"
	"encoding/hex"
	"encoding/json"
	"strings"
	"testing"
	"time"

	"concord/internal/config"
	"concord/pkg/types"

	"github.com/ethereum/go-ethereum/accounts"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/flare-foundation/go-flare-common/pkg/tee/instruction"
	teetypes "github.com/flare-foundation/tee-node/pkg/types"
	teeutils "github.com/flare-foundation/tee-node/pkg/utils"
)

func signQuote(t *testing.T, key *ecdsa.PrivateKey, quote types.QuoteRequest) string {
	t.Helper()
	packed, err := quotePacked(quote)
	if err != nil {
		t.Fatal(err)
	}
	sig, err := crypto.Sign(accounts.TextHash(crypto.Keccak256(packed)), key)
	if err != nil {
		t.Fatal(err)
	}
	return "0x" + hex.EncodeToString(sig)
}

func quoteFixture(t *testing.T, key *ecdsa.PrivateKey, provider string, fee uint32, capacity string) types.QuoteRequest {
	t.Helper()
	q := types.QuoteRequest{
		RoundID:      "0x0100000000000000000000000000000000000000000000000000000000000000",
		RootAccordID: "0x0200000000000000000000000000000000000000000000000000000000000000",
		Provider:     provider,
		Capacity:     capacity,
		FeeBps:       fee,
		ValidUntil:   uint64(time.Now().Unix()) + 3600,
		Nonce:        "1",
	}
	q.ProviderSignature = signQuote(t, key, q)
	return q
}

func buildAction(opCommand string, payload []byte) teetypes.Action {
	data := instruction.DataFixed{
		OPType:          teeutils.ToHash(config.OPTypeConcord),
		OPCommand:       teeutils.ToHash(opCommand),
		OriginalMessage: payload,
	}
	b, _ := json.Marshal(data)
	return teetypes.Action{Data: teetypes.ActionData{ID: common.HexToHash("0x1234"), Message: b}}
}

func TestCoFillDeterministicPartialAllocation(t *testing.T) {
	keys := make([]*ecdsa.PrivateKey, 3)
	quotes := make([]types.QuoteRequest, 3)
	providers := make([]string, 3)
	for i := range keys {
		keys[i], _ = crypto.GenerateKey()
		providers[i] = crypto.PubkeyToAddress(keys[i].PublicKey).Hex()
	}
	quotes[0] = quoteFixture(t, keys[0], providers[0], 640, "450")
	quotes[1] = quoteFixture(t, keys[1], providers[1], 610, "250")
	quotes[2] = quoteFixture(t, keys[2], providers[2], 680, "600")
	req := types.FinalizeRoundRequest{
		ExtensionID:       "0x0300000000000000000000000000000000000000000000000000000000000000",
		RoundID:           quotes[0].RoundID,
		RootAccordID:      quotes[0].RootAccordID,
		TargetCapacity:    "1000",
		MaxFeeBps:         700,
		RoundExpiry:       uint64(time.Now().Unix()) + 7200,
		EvaluationTime:    uint64(time.Now().Unix()),
		EligibleProviders: providers,
		Quotes:            quotes,
	}
	first, err := CoFill(req)
	if err != nil {
		t.Fatal(err)
	}
	second, err := CoFill(req)
	if err != nil {
		t.Fatal(err)
	}
	if first.ResultDigest != second.ResultDigest || first.AllocatedCapacity[0] != "250" || first.AllocatedCapacity[1] != "450" || first.AllocatedCapacity[2] != "300" {
		t.Fatalf("CoFill was not deterministic or partial allocation was wrong: %+v / %+v", first, second)
	}
}

func TestCoFillRejectsInvalidSignatureAndInsufficientCapacity(t *testing.T) {
	key, _ := crypto.GenerateKey()
	provider := crypto.PubkeyToAddress(key.PublicKey).Hex()
	quote := quoteFixture(t, key, provider, 600, "100")
	quote.ProviderSignature = "0x" + strings.Repeat("00", 65)
	req := types.FinalizeRoundRequest{
		ExtensionID:       "0x0300000000000000000000000000000000000000000000000000000000000000",
		RoundID:           quote.RoundID,
		RootAccordID:      quote.RootAccordID,
		TargetCapacity:    "1000",
		MaxFeeBps:         700,
		RoundExpiry:       uint64(time.Now().Unix()) + 7200,
		EvaluationTime:    uint64(time.Now().Unix()),
		EligibleProviders: []string{provider},
		Quotes:            []types.QuoteRequest{quote},
	}
	if _, err := CoFill(req); err == nil {
		t.Fatal("invalid signature accepted")
	}
	quote.ProviderSignature = signQuote(t, key, quote)
	req.Quotes[0] = quote
	if _, err := CoFill(req); err == nil {
		t.Fatal("insufficient capacity accepted")
	}
}

func TestActionRequiresTEEDecryption(t *testing.T) {
	e := New(0, 1)
	status, body := e.processAction(buildAction(config.OPCommandSubmitQuote, []byte("not-plaintext")))
	if status != 200 || !strings.Contains(string(body), "decrypting Concord payload") {
		t.Fatalf("expected encrypted payload boundary, got status=%d body=%s", status, body)
	}
}
