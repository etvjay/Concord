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
	"github.com/ethereum/go-ethereum/common/hexutil"
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

func actionResult(t *testing.T, body []byte) (status uint8, data []byte, log string) {
	t.Helper()
	var result struct {
		Status uint8         `json:"status"`
		Data   hexutil.Bytes `json:"data"`
		Log    string        `json:"log"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		t.Fatal(err)
	}
	return result.Status, []byte(result.Data), result.Log
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

func TestCoFillEnforcesZeroFeeCap(t *testing.T) {
	key, _ := crypto.GenerateKey()
	provider := crypto.PubkeyToAddress(key.PublicKey).Hex()
	quote := quoteFixture(t, key, provider, 1, "100")
	req := types.FinalizeRoundRequest{
		ExtensionID:       "0x0300000000000000000000000000000000000000000000000000000000000000",
		RoundID:           quote.RoundID,
		RootAccordID:      quote.RootAccordID,
		TargetCapacity:    "100",
		MaxFeeBps:         0,
		RoundExpiry:       uint64(time.Now().Unix()) + 7200,
		EvaluationTime:    uint64(time.Now().Unix()),
		EligibleProviders: []string{provider},
		Quotes:            []types.QuoteRequest{quote},
	}
	if _, err := CoFill(req); err == nil || !strings.Contains(err.Error(), "exceeds maxFeeBps") {
		t.Fatalf("non-zero fee passed a zero-fee round: %v", err)
	}
}

func TestActionRequiresTEEDecryption(t *testing.T) {
	e := New(0, 1)
	status, body := e.processAction(buildAction(config.OPCommandSubmitQuote, []byte("not-plaintext")))
	if status != 200 || !strings.Contains(string(body), "decrypting Concord payload") {
		t.Fatalf("expected encrypted payload boundary, got status=%d body=%s", status, body)
	}
}

func TestFinalizationUsesOnlySubmittedQuotesAndCannotReplay(t *testing.T) {
	e := New(0, 1)
	e.decrypt = func(payload []byte) ([]byte, error) { return payload, nil }

	keyA, _ := crypto.GenerateKey()
	providerA := crypto.PubkeyToAddress(keyA.PublicKey).Hex()
	submitted := quoteFixture(t, keyA, providerA, 610, "100")

	payload, _ := json.Marshal(submitted)
	status, body := e.processAction(buildAction(config.OPCommandSubmitQuote, payload))
	if status != 200 {
		t.Fatalf("submit returned HTTP %d", status)
	}
	submitStatus, _, submitLog := actionResult(t, body)
	if submitStatus != 1 {
		t.Fatalf("submit failed: status=%d log=%s", submitStatus, submitLog)
	}

	keyB, _ := crypto.GenerateKey()
	providerB := crypto.PubkeyToAddress(keyB.PublicKey).Hex()
	unsubmitted := quoteFixture(t, keyB, providerB, 620, "100")
	finalize := types.FinalizeRoundRequest{
		ExtensionID:       "0x0300000000000000000000000000000000000000000000000000000000000000",
		RoundID:           submitted.RoundID,
		RootAccordID:      submitted.RootAccordID,
		TargetCapacity:    "100",
		MaxFeeBps:         700,
		RoundExpiry:       uint64(time.Now().Unix()) + 7200,
		EvaluationTime:    uint64(time.Now().Unix()),
		EligibleProviders: []string{providerA, providerB},
		Quotes:            []types.QuoteRequest{unsubmitted},
	}
	payload, _ = json.Marshal(finalize)
	status, body = e.processAction(buildAction(config.OPCommandFinalizeRound, payload))
	if status != 200 {
		t.Fatalf("mismatched finalization returned HTTP %d", status)
	}
	finalizeStatus, _, finalizeLog := actionResult(t, body)
	if finalizeStatus != 0 || !strings.Contains(finalizeLog, "do not match submitted") {
		t.Fatalf("unsubmitted quote was accepted: status=%d log=%s", finalizeStatus, finalizeLog)
	}

	finalize.Quotes = nil
	finalize.EligibleProviders = []string{providerA}
	payload, _ = json.Marshal(finalize)
	status, body = e.processAction(buildAction(config.OPCommandFinalizeRound, payload))
	if status != 200 {
		t.Fatalf("valid finalization returned HTTP %d", status)
	}
	finalizeStatus, data, finalizeLog := actionResult(t, body)
	if finalizeStatus != 1 {
		t.Fatalf("valid finalization failed: status=%d log=%s", finalizeStatus, finalizeLog)
	}
	var result types.FinalizeRoundResponse
	if err := json.Unmarshal(data, &result); err != nil {
		t.Fatal(err)
	}
	if len(result.SelectedProviders) != 1 || !strings.EqualFold(result.SelectedProviders[0], providerA) {
		t.Fatalf("finalization did not use submitted quote: %+v", result)
	}

	status, body = e.processAction(buildAction(config.OPCommandFinalizeRound, payload))
	if status != 200 {
		t.Fatalf("replayed finalization returned HTTP %d", status)
	}
	finalizeStatus, _, finalizeLog = actionResult(t, body)
	if finalizeStatus != 0 || !strings.Contains(finalizeLog, "already been finalized") {
		t.Fatalf("finalization replay was accepted: status=%d log=%s", finalizeStatus, finalizeLog)
	}
}
