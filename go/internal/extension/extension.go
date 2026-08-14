package extension

import (
	"bytes"
	"crypto/ecdsa"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"io"
	"math/big"
	"net/http"
	"sort"
	"strings"
	"sync"
	"time"

	"concord/internal/config"
	"concord/pkg/types"

	"github.com/ethereum/go-ethereum/accounts"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/common/hexutil"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/flare-foundation/go-flare-common/pkg/tee/instruction"
	"github.com/flare-foundation/tee-node/pkg/processorutils"
	teetypes "github.com/flare-foundation/tee-node/pkg/types"
	teeutils "github.com/flare-foundation/tee-node/pkg/utils"
)

type Extension struct {
	mu              sync.RWMutex
	Server          *http.Server
	signPort        int
	quotes          map[string]map[string]types.QuoteRequest
	finalized       map[string]bool
	finalizing      map[string]bool
	quoteCount      int
	finalizedRounds int
	decrypt         func([]byte) ([]byte, error)
}

func New(extensionPort, signPort int) *Extension {
	e := &Extension{
		signPort:   signPort,
		quotes:     make(map[string]map[string]types.QuoteRequest),
		finalized:  make(map[string]bool),
		finalizing: make(map[string]bool),
	}
	e.decrypt = e.decryptPayload

	mux := http.NewServeMux()
	mux.HandleFunc("GET /state", e.stateHandler)
	mux.HandleFunc("POST /action", e.actionHandler)
	e.Server = &http.Server{Addr: fmt.Sprintf(":%d", extensionPort), Handler: mux}
	return e
}

func (e *Extension) stateHandler(w http.ResponseWriter, _ *http.Request) {
	e.mu.RLock()
	state := types.StateResponse{
		StateVersion: teeutils.ToHash(config.Version),
		State: types.State{
			QuoteCount:      e.quoteCount,
			FinalizedRounds: e.finalizedRounds,
		},
	}
	e.mu.RUnlock()
	if err := json.NewEncoder(w).Encode(state); err != nil {
		http.Error(w, fmt.Sprintf("sending response: %v", err), http.StatusInternalServerError)
	}
}

func (e *Extension) actionHandler(w http.ResponseWriter, r *http.Request) {
	var action teetypes.Action
	if err := json.NewDecoder(r.Body).Decode(&action); err != nil {
		http.Error(w, fmt.Sprintf("decoding action: %v", err), http.StatusBadRequest)
		return
	}
	status, body := e.processAction(action)
	w.WriteHeader(status)
	_, _ = w.Write(body)
}

func (e *Extension) processAction(action teetypes.Action) (int, []byte) {
	dataFixed, err := processorutils.Parse[instruction.DataFixed](action.Data.Message)
	if err != nil {
		return http.StatusBadRequest, []byte(fmt.Sprintf("decoding fixed data: %v", err))
	}
	if dataFixed.OPType != teeutils.ToHash(config.OPTypeConcord) {
		return http.StatusNotImplemented, []byte(fmt.Sprintf(
			"unsupported op type: received %s, expected %s (%s)",
			dataFixed.OPType.Hex(), teeutils.ToHash(config.OPTypeConcord).Hex(), config.OPTypeConcord,
		))
	}

	decrypted, err := e.decrypt(dataFixed.OriginalMessage)
	if err != nil {
		return http.StatusOK, marshalActionResult(action, dataFixed, nil, 0, fmt.Errorf("decrypting Concord payload: %w", err))
	}

	switch {
	case dataFixed.OPCommand == teeutils.ToHash(config.OPCommandSubmitQuote):
		return http.StatusOK, e.processSubmitQuote(action, dataFixed, decrypted)
	case dataFixed.OPCommand == teeutils.ToHash(config.OPCommandFinalizeRound):
		return http.StatusOK, e.processFinalizeRound(action, dataFixed, decrypted)
	default:
		return http.StatusNotImplemented, []byte(fmt.Sprintf(
			"unsupported op command: received %s, expected one of [%s (%s), %s (%s)]",
			dataFixed.OPCommand.Hex(),
			teeutils.ToHash(config.OPCommandSubmitQuote).Hex(), config.OPCommandSubmitQuote,
			teeutils.ToHash(config.OPCommandFinalizeRound).Hex(), config.OPCommandFinalizeRound,
		))
	}
}

func (e *Extension) processSubmitQuote(action teetypes.Action, df *instruction.DataFixed, payload []byte) []byte {
	var req types.QuoteRequest
	if err := decodeStrict(payload, &req); err != nil {
		return marshalActionResult(action, df, nil, 0, fmt.Errorf("decoding quote: %w", err))
	}
	if err := validateQuote(req, uint64(time.Now().Unix()), 0, false, 0, false, nil); err != nil {
		return marshalActionResult(action, df, nil, 0, err)
	}

	digest, err := quoteDigest(req)
	if err != nil {
		return marshalActionResult(action, df, nil, 0, err)
	}
	provider := strings.ToLower(common.HexToAddress(req.Provider).Hex())
	e.mu.Lock()
	key := roundKey(req.RoundID)
	if e.quotes[key] == nil {
		e.quotes[key] = make(map[string]types.QuoteRequest)
	}
	e.quotes[key][provider] = req
	e.quoteCount++
	e.mu.Unlock()

	data, _ := json.Marshal(types.SubmitQuoteResponse{Accepted: true, QuoteDigest: digest.Hex()})
	return marshalActionResult(action, df, data, 1, nil)
}

func (e *Extension) processFinalizeRound(action teetypes.Action, df *instruction.DataFixed, payload []byte) []byte {
	var req types.FinalizeRoundRequest
	if err := decodeStrict(payload, &req); err != nil {
		return marshalActionResult(action, df, nil, 0, fmt.Errorf("decoding finalization: %w", err))
	}
	if req.EvaluationTime == 0 {
		req.EvaluationTime = uint64(time.Now().Unix())
	}

	round := roundKey(req.RoundID)
	e.mu.Lock()
	if e.finalized[round] {
		e.mu.Unlock()
		return marshalActionResult(action, df, nil, 0, fmt.Errorf("round has already been finalized"))
	}
	if e.finalizing[round] {
		e.mu.Unlock()
		return marshalActionResult(action, df, nil, 0, fmt.Errorf("round finalization is already in progress"))
	}

	storedQuotes := make([]types.QuoteRequest, 0, len(e.quotes[round]))
	for _, quote := range e.quotes[round] {
		storedQuotes = append(storedQuotes, quote)
	}
	if len(storedQuotes) == 0 {
		e.mu.Unlock()
		return marshalActionResult(action, df, nil, 0, fmt.Errorf("round has no submitted quotes"))
	}

	// FINALIZE_ROUND may repeat the submitted set for auditability, but it may
	// not introduce a new quote. Compare provider -> quote digest against the
	// stored SUBMIT_QUOTE set, then always run CoFill over the stored snapshot.
	if len(req.Quotes) != 0 {
		storedDigests, err := quoteDigestSet(storedQuotes)
		if err != nil {
			e.mu.Unlock()
			return marshalActionResult(action, df, nil, 0, err)
		}
		requestDigests, err := quoteDigestSet(req.Quotes)
		if err != nil {
			e.mu.Unlock()
			return marshalActionResult(action, df, nil, 0, err)
		}
		if !sameQuoteSet(storedDigests, requestDigests) {
			e.mu.Unlock()
			return marshalActionResult(action, df, nil, 0, fmt.Errorf("finalization quotes do not match submitted quotes"))
		}
	}
	req.Quotes = storedQuotes
	e.finalizing[round] = true
	e.mu.Unlock()

	result, err := CoFill(req)
	e.mu.Lock()
	delete(e.finalizing, round)
	if err == nil {
		e.finalized[round] = true
		e.finalizedRounds++
	}
	e.mu.Unlock()
	if err != nil {
		return marshalActionResult(action, df, nil, 0, err)
	}
	data, _ := json.Marshal(result)
	return marshalActionResult(action, df, data, 1, nil)
}

func (e *Extension) decryptPayload(encrypted []byte) ([]byte, error) {
	if len(encrypted) == 0 {
		return nil, fmt.Errorf("encrypted payload is empty")
	}
	reqBody, err := json.Marshal(struct {
		EncryptedMessage []byte `json:"encryptedMessage"`
	}{EncryptedMessage: encrypted})
	if err != nil {
		return nil, err
	}
	client := &http.Client{Timeout: 15 * time.Second}
	url := fmt.Sprintf("http://localhost:%d/decrypt", e.signPort)
	resp, err := client.Post(url, "application/json", bytes.NewReader(reqBody))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("TEE decrypt endpoint returned HTTP %d", resp.StatusCode)
	}
	var decoded struct {
		DecryptedMessage []byte `json:"decryptedMessage"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&decoded); err != nil {
		return nil, err
	}
	if len(decoded.DecryptedMessage) == 0 {
		return nil, fmt.Errorf("TEE returned an empty decrypted payload")
	}
	return decoded.DecryptedMessage, nil
}

func decodeStrict(data []byte, target any) error {
	dec := json.NewDecoder(bytes.NewReader(data))
	dec.DisallowUnknownFields()
	if err := dec.Decode(target); err != nil {
		return err
	}
	var extra any
	if err := dec.Decode(&extra); err != io.EOF {
		if err == nil {
			return fmt.Errorf("payload contains trailing JSON")
		}
		return fmt.Errorf("invalid trailing payload: %w", err)
	}
	return nil
}

func marshalActionResult(action teetypes.Action, df *instruction.DataFixed, data []byte, status uint8, err error) []byte {
	result := buildResult(action, df, data, status, err)
	encoded, _ := json.Marshal(result)
	return encoded
}

func buildResult(a teetypes.Action, df *instruction.DataFixed, data []byte, status uint8, err error) teetypes.ActionResult {
	result := teetypes.ActionResult{
		ID:            a.Data.ID,
		SubmissionTag: a.Data.SubmissionTag,
		Version:       config.Version,
		OPType:        df.OPType,
		OPCommand:     df.OPCommand,
		Data:          data,
		Status:        status,
	}
	if status == 0 {
		result.Log = fmt.Sprintf("error: %v", err)
	} else if status == 1 {
		result.Log = "ok"
	} else {
		result.Log = "pending"
	}
	return result
}

func validBytes32(value string) bool {
	return strings.HasPrefix(value, "0x") && len(value) == 66 && common.HexToHash(value) != (common.Hash{})
}

func roundKey(value string) string {
	return strings.ToLower(value)
}

func quoteDigestSet(quotes []types.QuoteRequest) (map[string]string, error) {
	digests := make(map[string]string, len(quotes))
	for _, quote := range quotes {
		provider := strings.ToLower(common.HexToAddress(quote.Provider).Hex())
		if _, exists := digests[provider]; exists {
			return nil, fmt.Errorf("duplicate provider quote")
		}
		digest, err := quoteDigest(quote)
		if err != nil {
			return nil, err
		}
		digests[provider] = digest.Hex()
	}
	return digests, nil
}

func sameQuoteSet(left, right map[string]string) bool {
	if len(left) != len(right) {
		return false
	}
	for provider, digest := range left {
		if right[provider] != digest {
			return false
		}
	}
	return true
}

func validateQuote(
	q types.QuoteRequest,
	now uint64,
	maxFee uint32,
	enforceMaxFee bool,
	roundExpiry uint64,
	enforceRoundExpiry bool,
	eligible map[string]bool,
) error {
	if !validBytes32(q.RoundID) || !validBytes32(q.RootAccordID) {
		return fmt.Errorf("roundId and rootAccordId must be non-zero bytes32 values")
	}
	if !common.IsHexAddress(q.Provider) || common.HexToAddress(q.Provider) == (common.Address{}) {
		return fmt.Errorf("provider must be a non-zero EVM address")
	}
	capacity, err := parseUint256(q.Capacity)
	if err != nil || capacity.Sign() <= 0 {
		return fmt.Errorf("capacity must be a positive uint256")
	}
	nonce, err := parseUint256(q.Nonce)
	if err != nil || nonce.Sign() < 0 {
		return fmt.Errorf("nonce must be a uint256")
	}
	if q.ValidUntil <= now {
		return fmt.Errorf("quote is expired")
	}
	if enforceMaxFee && q.FeeBps > maxFee {
		return fmt.Errorf("quote fee exceeds maxFeeBps")
	}
	if enforceRoundExpiry && q.ValidUntil > roundExpiry {
		return fmt.Errorf("quote validity exceeds round expiry")
	}
	if eligible != nil && !eligible[strings.ToLower(common.HexToAddress(q.Provider).Hex())] {
		return fmt.Errorf("provider is not eligible for the round")
	}
	if _, err := verifyQuoteSignature(q); err != nil {
		return err
	}
	return nil
}

func parseUint256(value string) (*big.Int, error) {
	if value == "" || strings.HasPrefix(value, "-") {
		return nil, fmt.Errorf("empty or negative uint256")
	}
	n := new(big.Int)
	if _, ok := n.SetString(value, 10); !ok || n.Sign() < 0 || n.BitLen() > 256 {
		return nil, fmt.Errorf("invalid uint256")
	}
	return n, nil
}

var quoteABI = func() abi.Arguments {
	bytes32Type, _ := abi.NewType("bytes32", "", nil)
	addressType, _ := abi.NewType("address", "", nil)
	uint256Type, _ := abi.NewType("uint256", "", nil)
	uint32Type, _ := abi.NewType("uint32", "", nil)
	uint64Type, _ := abi.NewType("uint64", "", nil)
	return abi.Arguments{
		{Type: bytes32Type}, {Type: bytes32Type}, {Type: addressType},
		{Type: uint256Type}, {Type: uint32Type}, {Type: uint64Type}, {Type: uint256Type},
	}
}()

func quotePacked(q types.QuoteRequest) ([]byte, error) {
	capacity, err := parseUint256(q.Capacity)
	if err != nil {
		return nil, err
	}
	nonce, err := parseUint256(q.Nonce)
	if err != nil {
		return nil, err
	}
	return quoteABI.Pack(
		common.HexToHash(q.RoundID), common.HexToHash(q.RootAccordID), common.HexToAddress(q.Provider),
		capacity, q.FeeBps, q.ValidUntil, nonce,
	)
}

func quoteDigest(q types.QuoteRequest) (common.Hash, error) {
	packed, err := quotePacked(q)
	if err != nil {
		return common.Hash{}, err
	}
	sig, err := hexutil.Decode(q.ProviderSignature)
	if err != nil {
		return common.Hash{}, fmt.Errorf("invalid provider signature: %w", err)
	}
	return crypto.Keccak256Hash(append(packed, sig...)), nil
}

// SignQuote creates the provider signature for the canonical QuoteRequest
// encoding. It is exposed for the operator-side fixture builder; the runtime
// extension never receives provider private keys.
func SignQuote(q types.QuoteRequest, key *ecdsa.PrivateKey) (string, error) {
	packed, err := quotePacked(q)
	if err != nil {
		return "", err
	}
	signature, err := crypto.Sign(accounts.TextHash(crypto.Keccak256(packed)), key)
	if err != nil {
		return "", err
	}
	return hexutil.Encode(signature), nil
}

func verifyQuoteSignature(q types.QuoteRequest) (common.Address, error) {
	packed, err := quotePacked(q)
	if err != nil {
		return common.Address{}, err
	}
	sig, err := hexutil.Decode(q.ProviderSignature)
	if err != nil || len(sig) != 65 {
		return common.Address{}, fmt.Errorf("providerSignature must be a 65-byte hex signature")
	}
	if sig[64] >= 27 {
		sig[64] -= 27
	}
	if sig[64] > 1 {
		return common.Address{}, fmt.Errorf("providerSignature has invalid recovery id")
	}
	digest := accounts.TextHash(crypto.Keccak256(packed))
	pub, err := crypto.SigToPub(digest, sig)
	if err != nil {
		return common.Address{}, fmt.Errorf("providerSignature recovery failed: %w", err)
	}
	recovered := crypto.PubkeyToAddress(*pub)
	if !strings.EqualFold(recovered.Hex(), common.HexToAddress(q.Provider).Hex()) {
		return common.Address{}, fmt.Errorf("providerSignature does not recover provider")
	}
	return recovered, nil
}

// CoFill validates quotes and deterministically fills the facility target.
// Ordering is lowest fee, then provider address, then nonce. The final quote
// may be partially allocated. Identical inputs produce identical output.
func CoFill(req types.FinalizeRoundRequest) (types.FinalizeRoundResponse, error) {
	if !validBytes32(req.ExtensionID) {
		return types.FinalizeRoundResponse{}, fmt.Errorf("extensionId must be a non-zero bytes32 hex value")
	}
	if !validBytes32(req.RoundID) || !validBytes32(req.RootAccordID) {
		return types.FinalizeRoundResponse{}, fmt.Errorf("roundId and rootAccordId must be non-zero bytes32 values")
	}
	target, err := parseUint256(req.TargetCapacity)
	if err != nil || target.Sign() <= 0 {
		return types.FinalizeRoundResponse{}, fmt.Errorf("targetCapacity must be a positive uint256")
	}
	if req.MaxFeeBps > 10_000 || req.RoundExpiry <= req.EvaluationTime {
		return types.FinalizeRoundResponse{}, fmt.Errorf("invalid round bounds")
	}
	eligible := make(map[string]bool, len(req.EligibleProviders))
	for _, provider := range req.EligibleProviders {
		if !common.IsHexAddress(provider) || common.HexToAddress(provider) == (common.Address{}) {
			return types.FinalizeRoundResponse{}, fmt.Errorf("eligible provider is invalid")
		}
		eligible[strings.ToLower(common.HexToAddress(provider).Hex())] = true
	}
	quotes := append([]types.QuoteRequest(nil), req.Quotes...)
	for i := range quotes {
		if err := validateQuote(quotes[i], req.EvaluationTime, req.MaxFeeBps, true, req.RoundExpiry, true, eligible); err != nil {
			return types.FinalizeRoundResponse{}, fmt.Errorf("quote %d rejected: %w", i, err)
		}
		if !strings.EqualFold(quotes[i].RoundID, req.RoundID) || !strings.EqualFold(quotes[i].RootAccordID, req.RootAccordID) {
			return types.FinalizeRoundResponse{}, fmt.Errorf("quote %d is bound to a different round or root", i)
		}
	}
	sort.Slice(quotes, func(i, j int) bool {
		if quotes[i].FeeBps != quotes[j].FeeBps {
			return quotes[i].FeeBps < quotes[j].FeeBps
		}
		left := common.HexToAddress(quotes[i].Provider)
		right := common.HexToAddress(quotes[j].Provider)
		if bytes.Compare(left.Bytes(), right.Bytes()) != 0 {
			return bytes.Compare(left.Bytes(), right.Bytes()) < 0
		}
		ln, _ := parseUint256(quotes[i].Nonce)
		rn, _ := parseUint256(quotes[j].Nonce)
		return ln.Cmp(rn) < 0
	})

	result := types.FinalizeRoundResponse{
		ExtensionID:       req.ExtensionID,
		RoundID:           req.RoundID,
		RootAccordID:      req.RootAccordID,
		RoundExpiry:       req.RoundExpiry,
		SelectedProviders: make([]string, 0, len(quotes)),
		AllocatedCapacity: make([]string, 0, len(quotes)),
		AcceptedFeeBps:    make([]uint32, 0, len(quotes)),
		TermsCommitments:  make([]string, 0, len(quotes)),
	}
	remaining := new(big.Int).Set(target)
	seen := make(map[string]bool)
	for _, quote := range quotes {
		provider := strings.ToLower(common.HexToAddress(quote.Provider).Hex())
		if seen[provider] {
			return types.FinalizeRoundResponse{}, fmt.Errorf("duplicate provider quote")
		}
		seen[provider] = true
		capacity, _ := parseUint256(quote.Capacity)
		if capacity.Sign() == 0 || remaining.Sign() == 0 {
			continue
		}
		allocated := new(big.Int).Set(capacity)
		if allocated.Cmp(remaining) > 0 {
			allocated.Set(remaining)
		}
		qdigest, err := quoteDigest(quote)
		if err != nil {
			return types.FinalizeRoundResponse{}, err
		}
		result.SelectedProviders = append(result.SelectedProviders, provider)
		result.AllocatedCapacity = append(result.AllocatedCapacity, allocated.String())
		result.AcceptedFeeBps = append(result.AcceptedFeeBps, quote.FeeBps)
		result.TermsCommitments = append(result.TermsCommitments, qdigest.Hex())
		remaining.Sub(remaining, allocated)
	}
	if remaining.Sign() != 0 {
		return types.FinalizeRoundResponse{}, fmt.Errorf("insufficient eligible capacity: short %s", remaining.String())
	}
	result.Success = true
	result.ResultDigest = allocationResultDigest(result).Hex()
	return result, nil
}

func allocationResultDigest(result types.FinalizeRoundResponse) common.Hash {
	var encoded bytes.Buffer
	encoded.Write(common.HexToHash(result.ExtensionID).Bytes())
	encoded.Write(common.HexToHash(result.RoundID).Bytes())
	encoded.Write(common.HexToHash(result.RootAccordID).Bytes())
	encoded.WriteByte(1)
	var expiry [8]byte
	binary.BigEndian.PutUint64(expiry[:], result.RoundExpiry)
	encoded.Write(expiry[:])
	for i, provider := range result.SelectedProviders {
		encoded.Write(common.HexToAddress(provider).Bytes())
		amount, _ := parseUint256(result.AllocatedCapacity[i])
		amountBytes := make([]byte, 32)
		amount.FillBytes(amountBytes)
		encoded.Write(amountBytes)
		var fee [4]byte
		binary.BigEndian.PutUint32(fee[:], result.AcceptedFeeBps[i])
		encoded.Write(fee[:])
		encoded.Write(common.HexToHash(result.TermsCommitments[i]).Bytes())
	}
	return crypto.Keccak256Hash(encoded.Bytes())
}
