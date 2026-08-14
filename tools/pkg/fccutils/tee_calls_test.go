package fccutils

import (
	"testing"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
	csigning "github.com/flare-foundation/go-flare-common/pkg/signing"
	teeTypes "github.com/flare-foundation/tee-node/pkg/types"
	teeutils "github.com/flare-foundation/tee-node/pkg/utils"
)

func TestVerifyActionResponseChecksTEEAndProxySignatures(t *testing.T) {
	teeKey, err := crypto.GenerateKey()
	if err != nil {
		t.Fatal(err)
	}
	proxyKey, err := crypto.GenerateKey()
	if err != nil {
		t.Fatal(err)
	}
	teeInfo := &teeTypes.SignedTeeInfoResponse{
		TeeInfoResponse: teeTypes.TeeInfoResponse{
			TeeInfo: teeTypes.TeeInfo{
				PublicKey: teeTypes.PublicKey{
					X: common.BytesToHash(teeKey.PublicKey.X.Bytes()),
					Y: common.BytesToHash(teeKey.PublicKey.Y.Bytes()),
				},
				ChainID: 114,
			},
		},
	}
	infoHash, err := teeInfo.TeeInfo.Hash()
	if err != nil {
		t.Fatal(err)
	}
	proxySignHash, err := csigning.NewPayload(
		csigning.ProxyTeeInfo,
		teeInfo.TeeInfo.ChainID,
		common.BytesToHash(infoHash),
	).Hash()
	if err != nil {
		t.Fatal(err)
	}
	teeInfo.ProxySignature, err = teeutils.Sign(proxySignHash[:], proxyKey)
	if err != nil {
		t.Fatal(err)
	}

	result := teeTypes.ActionResult{
		ID:   common.HexToHash("0x01"),
		Data: []byte("{\"success\":true}"),
	}
	actionSignHash, err := csigning.NewPayload(
		csigning.TEEActionResult,
		teeInfo.TeeInfo.ChainID,
		common.BytesToHash(result.Hash()),
	).Hash()
	if err != nil {
		t.Fatal(err)
	}
	signature, err := teeutils.Sign(actionSignHash[:], teeKey)
	if err != nil {
		t.Fatal(err)
	}
	response := &teeTypes.ActionResponse{Result: result, Signature: signature}

	teeID, proxyID, err := VerifyActionResponse(response, teeInfo, 114)
	if err != nil {
		t.Fatal(err)
	}
	if teeID != crypto.PubkeyToAddress(teeKey.PublicKey) {
		t.Fatalf("TEE id mismatch: got %s", teeID.Hex())
	}
	if proxyID != crypto.PubkeyToAddress(proxyKey.PublicKey) {
		t.Fatalf("proxy id mismatch: got %s", proxyID.Hex())
	}

	response.Signature[0] ^= 1
	if _, _, err := VerifyActionResponse(response, teeInfo, 114); err == nil {
		t.Fatal("tampered action signature accepted")
	}
}
