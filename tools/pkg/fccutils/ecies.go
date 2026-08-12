package fccutils

import (
	"github.com/ethereum/go-ethereum/crypto"
	teetypes "github.com/flare-foundation/tee-node/pkg/types"
	teeutils "github.com/flare-foundation/tee-node/pkg/utils"
	"github.com/pkg/errors"
)

// EncryptForTEE fetches the current machine public key from the configured
// extension proxy and applies the exact ECIES parameters used by the official
// tee-node. The resulting bytes are safe to pass as the InstructionSender
// message; the extension decrypts them only inside the TEE.
func EncryptForTEE(proxyURL string, plaintext []byte) ([]byte, error) {
	if len(plaintext) == 0 {
		return nil, errors.New("cannot encrypt an empty FCC payload")
	}
	info, err := TeeInfo(proxyURL)
	if err != nil {
		return nil, errors.Errorf("fetching TEE info: %s", err)
	}
	publicKey, err := teetypes.ParsePubKey(info.MachineData.PublicKey)
	if err != nil {
		return nil, errors.Errorf("parsing TEE public key: %s", err)
	}
	return teeutils.Encrypt(plaintext, publicKey)
}

// MachineAddress derives the address represented by a TEE public key. It is
// useful for recording which machine key encrypted a submitted instruction.
func MachineAddress(proxyURL string) (string, error) {
	info, err := TeeInfo(proxyURL)
	if err != nil {
		return "", err
	}
	publicKey, err := teetypes.ParsePubKey(info.MachineData.PublicKey)
	if err != nil {
		return "", err
	}
	return crypto.PubkeyToAddress(*publicKey).Hex(), nil
}
