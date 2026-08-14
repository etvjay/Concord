// Command inspect-tee-info performs a read-only inspection of a signed FCC
// proxy /info response. It deliberately does not load a private key or write
// to Coston2.
package main

import (
	"concord/tools/pkg/fccutils"
	"encoding/json"
	"flag"
	"fmt"
	"os"

	"github.com/ethereum/go-ethereum/common"
)

type evidence struct {
	TeeID              string      `json:"teeId"`
	TeeProxyID         string      `json:"teeProxyId"`
	ExtensionID        string      `json:"extensionId"`
	CodeHash           string      `json:"codeHash"`
	Platform           string      `json:"platform"`
	ChainID            uint64      `json:"chainId"`
	PublicKey          interface{} `json:"publicKey"`
	MachineData        interface{} `json:"machineData"`
	TeeInfoHash        string      `json:"teeInfoHash"`
	ProxySignatureSize int         `json:"proxySignatureBytes"`
}

func main() {
	proxyURL := flag.String("proxy", "", "FCC proxy base URL")
	expectedChainID := flag.Uint64("chain-id", 114, "expected TEE chain id")
	flag.Parse()
	if *proxyURL == "" {
		fmt.Fprintln(os.Stderr, "-proxy is required")
		os.Exit(2)
	}

	info, err := fccutils.TeeInfo(*proxyURL)
	if err != nil {
		fmt.Fprintf(os.Stderr, "read proxy /info: %v\n", err)
		os.Exit(1)
	}
	if info.TeeInfo.ChainID != *expectedChainID {
		fmt.Fprintf(os.Stderr, "proxy /info chain id %d does not match expected %d\n", info.TeeInfo.ChainID, *expectedChainID)
		os.Exit(1)
	}

	teeID, proxyID, err := fccutils.TeeProxyId(info)
	if err != nil {
		fmt.Fprintf(os.Stderr, "derive TEE identities: %v\n", err)
		os.Exit(1)
	}
	hash, err := info.TeeInfo.Hash()
	if err != nil {
		fmt.Fprintf(os.Stderr, "hash tee info: %v\n", err)
		os.Exit(1)
	}

	// The public key is intentionally retained as public identity evidence; no
	// signing material is read or emitted.
	result := evidence{
		TeeID:              teeID.Hex(),
		TeeProxyID:         proxyID.Hex(),
		ExtensionID:        fmt.Sprintf("%d", info.MachineData.ExtensionID.Big()),
		CodeHash:           info.MachineData.CodeHash.Hex(),
		Platform:           info.MachineData.Platform.Hex(),
		ChainID:            info.TeeInfo.ChainID,
		PublicKey:          info.TeeInfo.PublicKey,
		MachineData:        info.MachineData,
		TeeInfoHash:        common.Bytes2Hex(hash),
		ProxySignatureSize: len(info.ProxySignature),
	}
	encoded, err := json.MarshalIndent(result, "", "  ")
	if err != nil {
		fmt.Fprintf(os.Stderr, "encode evidence: %v\n", err)
		os.Exit(1)
	}
	fmt.Println(string(encoded))
}
