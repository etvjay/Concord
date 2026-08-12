package api

import (
	"context"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"regexp"
	"strings"
	"time"

	"concord/tools/pkg/readmodel"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
)

type Server struct {
	Reader          readmodel.Reader
	Network         string
	ChainID         int64
	FacilityAddress common.Address
	RegistryAddress common.Address
	FacilityABI     abi.ABI
	TokenABI        abi.ABI
}

type PrepareRequest struct {
	Action            string   `json:"action"`
	RootAccordID      string   `json:"rootAccordId,omitempty"`
	ChildAccordID     string   `json:"childAccordId,omitempty"`
	DrawID            string   `json:"drawId,omitempty"`
	RoundID           string   `json:"roundId,omitempty"`
	TargetCapacity    string   `json:"targetCapacity,omitempty"`
	Amount            string   `json:"amount,omitempty"`
	ValidUntilUnix    string   `json:"validUntilUnix,omitempty"`
	RoundExpiryUnix   string   `json:"roundExpiryUnix,omitempty"`
	MaxFeeBPS         string   `json:"maxFeeBps,omitempty"`
	EligibleProviders []string `json:"eligibleProviders,omitempty"`
	PolicyHash        string   `json:"policyHash,omitempty"`
	Asset             string   `json:"asset,omitempty"`
	Spender           string   `json:"spender,omitempty"`
	Actor             string   `json:"actor,omitempty"`
}

const prepareABIJSON = `[
  {"inputs":[{"name":"rootId","type":"bytes32"},{"name":"targetCapacity","type":"uint256"},{"name":"validUntil","type":"uint64"},{"name":"policyHash","type":"bytes32"}],"name":"createRootAccord","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"name":"rootId","type":"bytes32"},{"name":"amount","type":"uint256"}],"name":"lockCollateral","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"name":"rootId","type":"bytes32"},{"name":"roundId","type":"bytes32"},{"name":"maxFeeBps","type":"uint32"},{"name":"roundExpiry","type":"uint64"},{"name":"eligibleProviders","type":"address[]"}],"name":"openSyndication","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"name":"childId","type":"bytes32"},{"name":"amount","type":"uint256"}],"name":"fundChild","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"name":"childId","type":"bytes32"}],"name":"closeChild","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"name":"childId","type":"bytes32"}],"name":"expireChild","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"name":"rootId","type":"bytes32"}],"name":"closeRoot","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"name":"rootId","type":"bytes32"}],"name":"expireRoot","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"name":"drawId","type":"bytes32"},{"name":"rootId","type":"bytes32"},{"name":"amount","type":"uint256"}],"name":"draw","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"name":"drawId","type":"bytes32"},{"name":"amount","type":"uint256"}],"name":"repay","outputs":[],"stateMutability":"nonpayable","type":"function"}
]`

const tokenABIJSON = `[
  {"inputs":[{"name":"spender","type":"address"},{"name":"amount","type":"uint256"}],"name":"approve","outputs":[{"name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"}
]`

func NewServer(reader readmodel.Reader, network string, chainID int64, facility, registry common.Address) (*Server, error) {
	facilityABI, err := abi.JSON(strings.NewReader(prepareABIJSON))
	if err != nil {
		return nil, fmt.Errorf("parse transaction ABI: %w", err)
	}
	tokenABI, err := abi.JSON(strings.NewReader(tokenABIJSON))
	if err != nil {
		return nil, fmt.Errorf("parse token ABI: %w", err)
	}
	return &Server{
		Reader:          reader,
		Network:         network,
		ChainID:         chainID,
		FacilityAddress: facility,
		RegistryAddress: registry,
		FacilityABI:     facilityABI,
		TokenABI:        tokenABI,
	}, nil
}

func (s *Server) Handler() http.Handler {
	return http.HandlerFunc(s.serveHTTP)
}

func (s *Server) serveHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if r.Method == http.MethodGet && r.URL.Path == "/v1/health" {
		s.writeJSON(w, http.StatusOK, readmodel.Envelope[readmodel.Health]{
			Data: readmodel.Health{
				Service:         "concord-api",
				Network:         s.Network,
				ChainID:         s.ChainID,
				Configured:      s.Reader != nil && s.FacilityAddress != (common.Address{}) && s.RegistryAddress != (common.Address{}),
				ReadModel:       map[bool]string{s.Reader != nil: "chain", false: "unavailable"}[s.Reader != nil],
				FacilityAddress: s.FacilityAddress.Hex(),
				RegistryAddress: s.RegistryAddress.Hex(),
			},
			Meta: s.meta(r.Context(), readmodel.Observed, readmodel.SourceDerived, ""),
		})
		return
	}

	if r.Method == http.MethodPost && r.URL.Path == "/v1/transactions/prepare" {
		s.prepare(w, r)
		return
	}
	if r.Method != http.MethodGet {
		s.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "only GET and POST are supported")
		return
	}

	parts := splitPath(r.URL.Path)
	if len(parts) == 3 && parts[0] == "v1" && parts[1] == "facilities" {
		rootID, err := parseBytes32(parts[2])
		if err != nil {
			s.writeError(w, http.StatusBadRequest, "invalid_root_accord_id", err.Error())
			return
		}
		facility, err := s.Reader.Facility(r.Context(), rootID)
		if err != nil {
			s.writeError(w, http.StatusNotFound, "not_observed", err.Error())
			return
		}
		s.writeJSON(w, http.StatusOK, readmodel.Envelope[readmodel.Facility]{Data: facility, Meta: s.meta(r.Context(), readmodel.Observed, readmodel.SourceOnchain, "")})
		return
	}
	if len(parts) == 4 && parts[0] == "v1" && parts[1] == "facilities" && parts[3] == "lineage" {
		rootID, err := parseBytes32(parts[2])
		if err != nil {
			s.writeError(w, http.StatusBadRequest, "invalid_root_accord_id", err.Error())
			return
		}
		lineage, err := s.Reader.Lineage(r.Context(), rootID)
		if err != nil {
			s.writeError(w, http.StatusNotFound, "not_observed", err.Error())
			return
		}
		s.writeJSON(w, http.StatusOK, readmodel.Envelope[readmodel.Lineage]{Data: lineage, Meta: s.meta(r.Context(), readmodel.Observed, readmodel.SourceOnchain, "")})
		return
	}
	if len(parts) == 3 && parts[0] == "v1" && parts[1] == "rounds" {
		id, err := parseBytes32(parts[2])
		if err != nil {
			s.writeError(w, http.StatusBadRequest, "invalid_round_id", err.Error())
			return
		}
		round, err := s.Reader.Round(r.Context(), id)
		if err != nil {
			s.writeError(w, http.StatusNotFound, "not_observed", err.Error())
			return
		}
		s.writeJSON(w, http.StatusOK, readmodel.Envelope[readmodel.Round]{Data: round, Meta: s.meta(r.Context(), readmodel.Observed, readmodel.SourceOnchain, "")})
		return
	}
	if len(parts) == 3 && parts[0] == "v1" && parts[1] == "draws" {
		id, err := parseBytes32(parts[2])
		if err != nil {
			s.writeError(w, http.StatusBadRequest, "invalid_draw_id", err.Error())
			return
		}
		draw, err := s.Reader.Draw(r.Context(), id)
		if err != nil {
			s.writeError(w, http.StatusNotFound, "not_observed", err.Error())
			return
		}
		s.writeJSON(w, http.StatusOK, readmodel.Envelope[readmodel.Draw]{Data: draw, Meta: s.meta(r.Context(), readmodel.Observed, readmodel.SourceOnchain, "")})
		return
	}
	if len(parts) == 3 && parts[0] == "v1" && parts[1] == "evidence" {
		s.writeError(w, http.StatusNotFound, "not_observed", "FCC evidence storage is not configured for this API instance")
		return
	}
	s.writeError(w, http.StatusNotFound, "not_found", "route not found")
}

func (s *Server) prepare(w http.ResponseWriter, r *http.Request) {
	var req PrepareRequest
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&req); err != nil {
		s.writeError(w, http.StatusBadRequest, "invalid_request", fmt.Sprintf("decode request: %v", err))
		return
	}
	intent, err := s.buildIntent(r.Context(), req)
	if err != nil {
		s.writeError(w, http.StatusBadRequest, "invalid_intent", err.Error())
		return
	}
	s.writeJSON(w, http.StatusOK, readmodel.Envelope[readmodel.TransactionIntent]{Data: intent, Meta: s.meta(r.Context(), readmodel.Observed, readmodel.SourceDerived, "unsigned intent only")})
}

func (s *Server) buildIntent(ctx context.Context, req PrepareRequest) (readmodel.TransactionIntent, error) {
	if req.Actor == "agent" {
		// Agents can prepare, but this explicit marker makes the approval boundary
		// visible in logs and downstream UI. It does not grant authority.
	}
	var data []byte
	var to common.Address
	var summary string
	preconditions := []string{"The connected wallet or institution signer must review and approve this unsigned intent."}
	var amountValue *big.Int
	var err error
	switch req.Action {
	case "lock_collateral", "approve_asset", "fund_child", "draw", "repay":
		amountValue, err = parseBig(req.Amount, "amount")
		if err != nil {
			return readmodel.TransactionIntent{}, err
		}
	}
	switch req.Action {
	case "create_root":
		rootID, err := parseBytes32(req.RootAccordID)
		if err != nil {
			return readmodel.TransactionIntent{}, err
		}
		target, err := parseBig(req.TargetCapacity, "targetCapacity")
		if err != nil {
			return readmodel.TransactionIntent{}, err
		}
		validUntil, err := parseUint64(req.ValidUntilUnix, "validUntilUnix")
		if err != nil {
			return readmodel.TransactionIntent{}, err
		}
		policyHash, err := parseBytes32(req.PolicyHash)
		if err != nil {
			return readmodel.TransactionIntent{}, err
		}
		if validUntil <= uint64(time.Now().Unix()) {
			return readmodel.TransactionIntent{}, fmt.Errorf("validUntilUnix must be in the future")
		}
		data, err = s.FacilityABI.Pack("createRootAccord", rootID, target, validUntil, policyHash)
		summary = "Create a new Root Accord with the supplied target, expiry, and policy commitment."
		preconditions = append(preconditions, "The root Accord ID must not already exist.", "The expiry must be in the future.")
	case "open_syndication":
		rootID, err := parseBytes32(req.RootAccordID)
		if err != nil {
			return readmodel.TransactionIntent{}, err
		}
		roundID, err := parseBytes32(req.RoundID)
		if err != nil {
			return readmodel.TransactionIntent{}, err
		}
		if roundID == ([32]byte{}) {
			return readmodel.TransactionIntent{}, fmt.Errorf("roundId must not be zero")
		}
		maxFeeBPS, err := parseUint32(req.MaxFeeBPS, "maxFeeBps")
		if err != nil {
			return readmodel.TransactionIntent{}, err
		}
		if maxFeeBPS > 10000 {
			return readmodel.TransactionIntent{}, fmt.Errorf("maxFeeBps must not exceed 10000")
		}
		roundExpiry, err := parseUint64(req.RoundExpiryUnix, "roundExpiryUnix")
		if err != nil {
			return readmodel.TransactionIntent{}, err
		}
		if roundExpiry <= uint64(time.Now().Unix()) {
			return readmodel.TransactionIntent{}, fmt.Errorf("roundExpiryUnix must be in the future")
		}
		if len(req.EligibleProviders) == 0 {
			return readmodel.TransactionIntent{}, fmt.Errorf("eligibleProviders must contain at least one provider")
		}
		providers := make([]common.Address, len(req.EligibleProviders))
		seenProviders := make(map[common.Address]struct{}, len(req.EligibleProviders))
		for i, raw := range req.EligibleProviders {
			provider, parseErr := parseAddress(raw, fmt.Sprintf("eligibleProviders[%d]", i))
			if parseErr != nil {
				return readmodel.TransactionIntent{}, parseErr
			}
			if _, exists := seenProviders[provider]; exists {
				return readmodel.TransactionIntent{}, fmt.Errorf("eligibleProviders contains duplicate address %s", provider.Hex())
			}
			seenProviders[provider] = struct{}{}
			providers[i] = provider
		}
		data, err = s.FacilityABI.Pack("openSyndication", rootID, roundID, maxFeeBPS, roundExpiry, providers)
		summary = "Open a Makkari syndication round under the Root Accord."
		preconditions = append(preconditions, "The signer must be the Root Accord borrower.", "The Root Accord must be PROPOSED with FXRP collateral locked.", "Private quote payloads remain withheld from this public transaction intent.")
	case "lock_collateral":
		rootID, err := parseBytes32(req.RootAccordID)
		if err != nil {
			return readmodel.TransactionIntent{}, err
		}
		data, err = s.FacilityABI.Pack("lockCollateral", rootID, amountValue)
		summary = "Lock FXRP collateral under the Root Accord."
		preconditions = append(preconditions, "The signer must be the Root Accord borrower.", "The Root Accord must be PROPOSED.", "The FXRP allowance and balance must cover the amount.")
	case "approve_asset":
		asset, err := parseAddress(req.Asset, "asset")
		if err != nil {
			return readmodel.TransactionIntent{}, err
		}
		spender, err := parseAddress(req.Spender, "spender")
		if err != nil {
			return readmodel.TransactionIntent{}, err
		}
		data, err = s.TokenABI.Pack("approve", spender, amountValue)
		to = asset
		summary = "Approve the facility contract to use the specified token amount."
		preconditions = append(preconditions, "Review the token, spender, and allowance amount before signing.")
	case "fund_child":
		childID, err := parseBytes32(req.ChildAccordID)
		if err != nil {
			return readmodel.TransactionIntent{}, err
		}
		data, err = s.FacilityABI.Pack("fundChild", childID, amountValue)
		summary = "Fund the selected Child Accord with USDT0."
		preconditions = append(preconditions, "The signer must be the selected provider.", "The child must be SELECTED or FUNDED.", "The amount must not exceed selected capacity.")
	case "draw":
		rootID, err := parseBytes32(req.RootAccordID)
		if err != nil {
			return readmodel.TransactionIntent{}, err
		}
		drawID, err := parseBytes32(req.DrawID)
		if err != nil {
			return readmodel.TransactionIntent{}, err
		}
		if s.Reader != nil {
			facility, readErr := s.Reader.Facility(ctx, rootID)
			if readErr != nil {
				return readmodel.TransactionIntent{}, fmt.Errorf("read draw preconditions: %w", readErr)
			}
			available := mustBig(facility.AvailableCapacity)
			if amountValue.Cmp(available) > 0 {
				return readmodel.TransactionIntent{}, fmt.Errorf("draw amount %s exceeds observed available capacity %s", amountValue, available)
			}
			preconditions = append(preconditions, fmt.Sprintf("Observed available capacity: %s.", facility.AvailableCapacity))
		}
		data, err = s.FacilityABI.Pack("draw", drawID, rootID, amountValue)
		summary = "Draw USDT0 from the active Root Accord."
		preconditions = append(preconditions, "The signer must be the treasury borrower.", "The Root Accord must be ACTIVE.", "The draw consumes explicit child DrawLegs onchain.")
	case "repay":
		drawID, err := parseBytes32(req.DrawID)
		if err != nil {
			return readmodel.TransactionIntent{}, err
		}
		if s.Reader != nil {
			draw, readErr := s.Reader.Draw(ctx, drawID)
			if readErr != nil {
				return readmodel.TransactionIntent{}, fmt.Errorf("read repayment preconditions: %w", readErr)
			}
			outstanding := mustBig(draw.OutstandingPrincipal)
			if amountValue.Cmp(outstanding) > 0 {
				return readmodel.TransactionIntent{}, fmt.Errorf("repayment amount %s exceeds observed outstanding principal %s", amountValue, outstanding)
			}
			preconditions = append(preconditions, fmt.Sprintf("Observed outstanding principal: %s.", draw.OutstandingPrincipal))
		}
		data, err = s.FacilityABI.Pack("repay", drawID, amountValue)
		summary = "Repay principal on the Root Accord draw."
		preconditions = append(preconditions, "The signer must be the treasury borrower.", "The liquidity-token allowance and balance must cover the amount.", "Capacity returns only after the ERC-20 transfer succeeds.")
	case "close_child":
		childID, err := parseBytes32(req.ChildAccordID)
		if err != nil {
			return readmodel.TransactionIntent{}, err
		}
		data, err = s.FacilityABI.Pack("closeChild", childID)
		summary = "Close a Child Accord after its exposure is cleared."
		preconditions = append(preconditions, "The signer must be authorized by the Child Accord.", "The child must have no outstanding exposure.")
	case "expire_child":
		childID, err := parseBytes32(req.ChildAccordID)
		if err != nil {
			return readmodel.TransactionIntent{}, err
		}
		data, err = s.FacilityABI.Pack("expireChild", childID)
		summary = "Expire an eligible Child Accord after its validity boundary."
		preconditions = append(preconditions, "The child must be past its validity boundary and eligible under onchain expiry rules.")
	case "close_root":
		rootID, err := parseBytes32(req.RootAccordID)
		if err != nil {
			return readmodel.TransactionIntent{}, err
		}
		data, err = s.FacilityABI.Pack("closeRoot", rootID)
		summary = "Close the Root Accord after the facility is fully settled."
		preconditions = append(preconditions, "The signer must be the Root Accord borrower.", "The facility must have no outstanding exposure and no active child obligations.")
	case "expire_root":
		rootID, err := parseBytes32(req.RootAccordID)
		if err != nil {
			return readmodel.TransactionIntent{}, err
		}
		data, err = s.FacilityABI.Pack("expireRoot", rootID)
		summary = "Expire the Root Accord after its validity boundary."
		preconditions = append(preconditions, "The Root Accord must be past its validity boundary and eligible under onchain expiry rules.")
	default:
		return readmodel.TransactionIntent{}, fmt.Errorf("unsupported action %q", req.Action)
	}
	if err != nil {
		return readmodel.TransactionIntent{}, fmt.Errorf("encode %s: %w", req.Action, err)
	}
	if to == (common.Address{}) {
		to = s.FacilityAddress
	}
	return readmodel.TransactionIntent{
		Action:                   req.Action,
		ChainID:                  s.ChainID,
		To:                       to.Hex(),
		Data:                     "0x" + fmt.Sprintf("%x", data),
		Value:                    "0",
		Summary:                  summary,
		RequiresExplicitApproval: true,
		Preconditions:            preconditions,
	}, nil
}

func (s *Server) meta(ctx context.Context, status readmodel.ObservationStatus, source readmodel.ObservationSource, warning string) readmodel.Meta {
	return readmodel.Meta{
		APIVersion: readmodel.APIVersion,
		Observation: readmodel.Observation{
			Status:     status,
			Source:     source,
			Network:    s.Network,
			ChainID:    s.ChainID,
			ObservedAt: time.Now().UTC(),
			Warning:    warning,
		},
	}
}

func (s *Server) writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}

func (s *Server) writeError(w http.ResponseWriter, status int, code, message string) {
	s.writeJSON(w, status, readmodel.ErrorResponse{
		Error: readmodel.ErrorBody{Code: code, Message: message},
		Meta:  s.meta(context.Background(), readmodel.NotObserved, readmodel.SourceDerived, "no authoritative success was observed"),
	})
}

var bytes32Pattern = regexp.MustCompile(`^0x[0-9a-fA-F]{64}$`)
var addressPattern = regexp.MustCompile(`^0x[0-9a-fA-F]{40}$`)

func parseBytes32(value string) ([32]byte, error) {
	if !bytes32Pattern.MatchString(value) {
		return [32]byte{}, fmt.Errorf("expected a 32-byte 0x-prefixed hex value")
	}
	return common.HexToHash(value), nil
}

func parseAddress(value, name string) (common.Address, error) {
	if !addressPattern.MatchString(value) {
		return common.Address{}, fmt.Errorf("%s must be a 20-byte 0x-prefixed hex address", name)
	}
	return common.HexToAddress(value), nil
}

func parseBig(value, name string) (*big.Int, error) {
	if value == "" {
		return nil, fmt.Errorf("%s is required", name)
	}
	parsed, ok := new(big.Int).SetString(value, 10)
	if !ok || parsed.Sign() < 0 {
		return nil, fmt.Errorf("%s must be a non-negative base-10 integer", name)
	}
	if parsed.Sign() == 0 {
		return nil, fmt.Errorf("%s must be greater than zero", name)
	}
	return parsed, nil
}

func parseUint64(value, name string) (uint64, error) {
	parsed, ok := new(big.Int).SetString(value, 10)
	if !ok || parsed.Sign() < 0 || !parsed.IsUint64() {
		return 0, fmt.Errorf("%s must be a non-negative uint64 in base-10 notation", name)
	}
	return parsed.Uint64(), nil
}

func parseUint32(value, name string) (uint32, error) {
	parsed, err := parseUint64(value, name)
	if err != nil || parsed > uint64(^uint32(0)) {
		return 0, fmt.Errorf("%s must be a non-negative uint32 in base-10 notation", name)
	}
	return uint32(parsed), nil
}

func splitPath(path string) []string {
	trimmed := strings.Trim(path, "/")
	if trimmed == "" {
		return nil
	}
	parts := strings.Split(trimmed, "/")
	return parts
}

func mustBig(value string) *big.Int {
	parsed, ok := new(big.Int).SetString(value, 10)
	if !ok {
		return big.NewInt(0)
	}
	return parsed
}
