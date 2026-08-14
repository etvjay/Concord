// Package types contains the wire types shared by Concord's FCC extension and
// external integration tools. Amounts are decimal strings so uint256 values
// are not truncated by JSON number implementations.
package types

import "github.com/ethereum/go-ethereum/common"

type QuoteRequest struct {
	RoundID           string `json:"roundId"`
	RootAccordID      string `json:"rootAccordId"`
	Provider          string `json:"provider"`
	Capacity          string `json:"capacity"`
	FeeBps            uint32 `json:"feeBps"`
	ValidUntil        uint64 `json:"validUntil"`
	Nonce             string `json:"nonce"`
	ProviderSignature string `json:"providerSignature"`
}

type SubmitQuoteResponse struct {
	Accepted    bool   `json:"accepted"`
	QuoteDigest string `json:"quoteDigest"`
}

type FinalizeRoundRequest struct {
	ExtensionID       string         `json:"extensionId"`
	RoundID           string         `json:"roundId"`
	RootAccordID      string         `json:"rootAccordId"`
	TargetCapacity    string         `json:"targetCapacity"`
	MaxFeeBps         uint32         `json:"maxFeeBps"`
	RoundExpiry       uint64         `json:"roundExpiry"`
	EvaluationTime    uint64         `json:"evaluationTime"`
	EligibleProviders []string       `json:"eligibleProviders"`
	Quotes            []QuoteRequest `json:"quotes"`
}

type Allocation struct {
	Provider          string `json:"provider"`
	AllocatedCapacity string `json:"allocatedCapacity"`
	AcceptedFeeBps    uint32 `json:"acceptedFeeBps"`
	TermsCommitment   string `json:"termsCommitment"`
}

type FinalizeRoundResponse struct {
	Success           bool     `json:"success"`
	ExtensionID       string   `json:"extensionId"`
	RoundID           string   `json:"roundId"`
	RootAccordID      string   `json:"rootAccordId"`
	SelectedProviders []string `json:"selectedProviders"`
	AllocatedCapacity []string `json:"allocatedCapacity"`
	AcceptedFeeBps    []uint32 `json:"acceptedFeeBps"`
	TermsCommitments  []string `json:"termsCommitments"`
	RoundExpiry       uint64   `json:"roundExpiry"`
	ResultDigest      string   `json:"resultDigest"`
}

type State struct {
	QuoteCount      int `json:"quoteCount"`
	FinalizedRounds int `json:"finalizedRounds"`
}

type StateResponse struct {
	StateVersion common.Hash `json:"stateVersion"`
	State        State       `json:"state"`
}
