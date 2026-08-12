// Command run-test sends Concord's encrypted FCC operations through the
// official scaffold path and verifies the returned ActionResult envelopes.
// It deliberately does not materialize an allocation: that step belongs to
// the onchain CapitalFacility verifier boundary.
package main

import (
	"encoding/json"
	"flag"
	"os"
	"strings"
	"time"

	"concord/tools/pkg/configs"
	"concord/tools/pkg/fccutils"
	"concord/tools/pkg/support"
	instrutils "concord/tools/pkg/utils"

	"github.com/ethereum/go-ethereum/common"
	"github.com/flare-foundation/go-flare-common/pkg/logger"
	teeTypes "github.com/flare-foundation/tee-node/pkg/types"
	"github.com/pkg/errors"
)

func main() {
	addressesFile := flag.String("a", configs.AddressesFile, "file with deployed addresses")
	chainURL := flag.String("c", configs.ChainNodeURL, "chain RPC URL")
	proxyURL := flag.String("p", configs.ExtensionProxyURL, "extension proxy URL")
	instructionSender := flag.String("instructionSender", "", "ConcordInstructionSender address")
	quoteFiles := flag.String("quotes", "", "comma-separated JSON files containing signed QuoteRequest payloads")
	finalizeFile := flag.String("finalize", "", "JSON file containing FinalizeRoundRequest; quotes may be omitted when stored in the TEE")
	outFile := flag.String("out", "", "write the verified finalization response to this file")
	flag.Parse()

	if *instructionSender == "" || *quoteFiles == "" || *finalizeFile == "" {
		logger.Fatal("--instructionSender, --quotes, and --finalize are required")
	}

	s, err := support.DefaultSupport(*addressesFile, *chainURL)
	if err != nil {
		fccutils.FatalWithCause(err)
	}
	sender := common.HexToAddress(*instructionSender)
	if err := instrutils.SetExtensionId(s, sender); err != nil && !strings.Contains(strings.ToLower(err.Error()), "already set") {
		fccutils.FatalWithCause(errors.Errorf("setExtensionId failed: %s", err))
	}

	for _, path := range strings.Split(*quoteFiles, ",") {
		path = strings.TrimSpace(path)
		payload, err := os.ReadFile(path)
		if err != nil {
			fccutils.FatalWithCause(errors.Errorf("read quote %s: %s", path, err))
		}
		encrypted, err := fccutils.EncryptForTEE(*proxyURL, payload)
		if err != nil {
			fccutils.FatalWithCause(err)
		}
		instructionID, txHash, err := instrutils.SendSubmitQuote(s, sender, encrypted)
		if err != nil {
			fccutils.FatalWithCause(err)
		}
		logger.Infof("SUBMIT_QUOTE sent: instruction=%s tx=%s", instructionID.Hex(), txHash.Hex())
		if _, err := verifyAction(*proxyURL, instructionID); err != nil {
			fccutils.FatalWithCause(err)
		}
	}

	finalizePayload, err := os.ReadFile(*finalizeFile)
	if err != nil {
		fccutils.FatalWithCause(err)
	}
	encrypted, err := fccutils.EncryptForTEE(*proxyURL, finalizePayload)
	if err != nil {
		fccutils.FatalWithCause(err)
	}
	instructionID, txHash, err := instrutils.SendFinalizeRound(s, sender, encrypted)
	if err != nil {
		fccutils.FatalWithCause(err)
	}
	logger.Infof("FINALIZE_ROUND sent: instruction=%s tx=%s", instructionID.Hex(), txHash.Hex())
	response, err := verifyAction(*proxyURL, instructionID)
	if err != nil {
		fccutils.FatalWithCause(err)
	}
	if *outFile != "" {
		if err := os.WriteFile(*outFile, response.Result.Data, 0600); err != nil {
			fccutils.FatalWithCause(err)
		}
		logger.Infof("verified FCC allocation response written to %s", *outFile)
	}
}

func verifyAction(proxyURL string, instructionID common.Hash) (*teeTypes.ActionResponse, error) {
	response, err := fccutils.ActionResult(proxyURL, instructionID)
	if err != nil {
		return nil, err
	}
	if response.Result.Status == 2 {
		return nil, errors.New("FCC action remained pending after polling")
	}
	if response.Result.Status == 0 {
		return nil, errors.Errorf("FCC action failed: %s", response.Result.Log)
	}
	if len(response.Result.Data) == 0 {
		return nil, errors.New("FCC action returned no data")
	}
	var probe map[string]any
	if err := json.Unmarshal(response.Result.Data, &probe); err != nil {
		return nil, errors.Errorf("FCC result data is not JSON: %s", err)
	}
	logger.Infof("FCC action verified at %s: %d fields", time.Now().UTC().Format(time.RFC3339), len(probe))
	return response, nil
}
