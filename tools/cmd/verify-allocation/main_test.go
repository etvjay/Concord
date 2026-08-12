package main

import (
	"testing"

	"github.com/ethereum/go-ethereum/common"
)

func TestAllocationResultDigestIsStableAndBoundToTerms(t *testing.T) {
	result := allocationResult{
		Success:           true,
		SelectedProviders: []string{"0x0000000000000000000000000000000000000001"},
		AllocatedCapacity: []string{"250"},
		AcceptedFeeBps:    []uint32{610},
		TermsCommitments:  []string{"0x0100000000000000000000000000000000000000000000000000000000000000"},
		RoundExpiry:       12345,
	}
	extensionID := common.HexToHash("0x01")
	roundID := common.HexToHash("0x02")
	rootID := common.HexToHash("0x03")

	first, err := allocationResultDigest(result, extensionID, roundID, rootID)
	if err != nil {
		t.Fatal(err)
	}
	second, err := allocationResultDigest(result, extensionID, roundID, rootID)
	if err != nil {
		t.Fatal(err)
	}
	if first != second {
		t.Fatalf("digest is not stable: %s != %s", first.Hex(), second.Hex())
	}

	result.TermsCommitments[0] = "0x0200000000000000000000000000000000000000000000000000000000000000"
	changed, err := allocationResultDigest(result, extensionID, roundID, rootID)
	if err != nil {
		t.Fatal(err)
	}
	if first == changed {
		t.Fatal("digest did not bind terms commitment")
	}
}

func TestParseBytes32RejectsMalformedValues(t *testing.T) {
	if _, err := parseBytes32("0x01", "digest", false); err == nil {
		t.Fatal("short bytes32 value accepted")
	}
	if _, err := parseBytes32("0x0000000000000000000000000000000000000000000000000000000000000000", "digest", false); err == nil {
		t.Fatal("zero digest accepted")
	}
	if _, err := parseBytes32("0x0000000000000000000000000000000000000000000000000000000000000000", "terms", true); err != nil {
		t.Fatalf("zero terms commitment rejected: %v", err)
	}
}
