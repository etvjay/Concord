package main

import (
	"bytes"
	"context"
	"encoding/binary"
	"encoding/json"
	"flag"
	"fmt"
	"math/big"
	"os"
	"strings"
	"time"

	ethereum "github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/common/hexutil"
	coretypes "github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
	teeTypes "github.com/flare-foundation/tee-node/pkg/types"

	"concord/tools/pkg/configs"
	"concord/tools/pkg/fccutils"
	"concord/tools/pkg/support"
)

type allocationResult struct {
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

type actionEvidence struct {
	InstructionID string                          `json:"instructionId"`
	Response      *teeTypes.ActionResponse        `json:"response"`
	TeeInfo       *teeTypes.SignedTeeInfoResponse `json:"teeInfo"`
	TeeID         string                          `json:"teeId"`
	ProxyID       string                          `json:"proxyId"`
	VerifiedAt    string                          `json:"verifiedAt"`
}

const facilityABIJSON = `[
  {
    "inputs": [],
    "name": "extensionId",
    "outputs": [{"internalType": "bytes32", "name": "", "type": "bytes32"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "allocationVerifier",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "bytes32", "name": "", "type": "bytes32"}],
    "name": "rounds",
    "outputs": [
      {"internalType": "bytes32", "name": "id", "type": "bytes32"},
      {"internalType": "bytes32", "name": "rootAccordId", "type": "bytes32"},
      {"internalType": "uint256", "name": "targetCapacity", "type": "uint256"},
      {"internalType": "uint32", "name": "maxFeeBps", "type": "uint32"},
      {"internalType": "uint64", "name": "roundExpiry", "type": "uint64"},
      {"internalType": "uint8", "name": "status", "type": "uint8"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "bytes32", "name": "", "type": "bytes32"},
      {"internalType": "address", "name": "", "type": "address"}
    ],
    "name": "eligibleProvider",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "bytes32", "name": "resultDigest", "type": "bytes32"}],
    "name": "markAllocationVerified",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
]`

const teeRegistryABIJSON = `[
  {
    "inputs": [{"internalType": "uint256", "name": "_extensionId", "type": "uint256"}],
    "name": "getActiveTeeMachines",
    "outputs": [
      {"internalType": "address[]", "name": "_teeIds", "type": "address[]"},
      {"internalType": "string[]", "name": "_urls", "type": "string[]"}
    ],
    "stateMutability": "view",
    "type": "function"
  }
]`

func main() {
	if err := run(); err != nil {
		fmt.Fprintf(os.Stderr, "verify-allocation: %v\n", err)
		os.Exit(1)
	}
}

func run() error {
	chainURL := flag.String("c", configs.ChainNodeURL, "chain RPC URL")
	facilityFlag := flag.String("facility", "", "CapitalFacility address")
	resultFile := flag.String("result", "", "JSON file produced by run-test")
	extensionFlag := flag.String("extensionId", "", "expected FCC extension id")
	roundFlag := flag.String("roundId", "", "expected Makkari round id")
	rootFlag := flag.String("rootAccordId", "", "expected root Accord id")
	teeRegistryFlag := flag.String("teeRegistry", "", "FlareTeeManager diamond address for active-machine verification")
	mark := flag.Bool("mark", false, "broadcast markAllocationVerified after local verification")
	evidenceFile := flag.String("out", "", "optional JSON evidence output path")
	flag.Parse()

	if *facilityFlag == "" || *resultFile == "" || *extensionFlag == "" || *roundFlag == "" || *rootFlag == "" {
		return fmt.Errorf("--facility, --result, --extensionId, --roundId, and --rootAccordId are required")
	}
	if !common.IsHexAddress(*facilityFlag) || common.HexToAddress(*facilityFlag) == (common.Address{}) {
		return fmt.Errorf("facility must be a non-zero EVM address")
	}
	facility := common.HexToAddress(*facilityFlag)
	expectedExtension, err := parseBytes32(*extensionFlag, "extensionId", false)
	if err != nil {
		return err
	}
	expectedRound, err := parseBytes32(*roundFlag, "roundId", false)
	if err != nil {
		return err
	}
	expectedRoot, err := parseBytes32(*rootFlag, "rootAccordId", false)
	if err != nil {
		return err
	}

	payload, err := os.ReadFile(*resultFile)
	if err != nil {
		return fmt.Errorf("read result: %w", err)
	}
	result, signedEvidence, err := decodeEvidence(payload)
	if err != nil {
		return err
	}

	facilityABI, err := abi.JSON(strings.NewReader(facilityABIJSON))
	if err != nil {
		return fmt.Errorf("parse CapitalFacility ABI: %w", err)
	}
	client, err := ethclient.Dial(*chainURL)
	if err != nil {
		return fmt.Errorf("connect to chain: %w", err)
	}
	defer client.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()
	chainID, err := client.ChainID(ctx)
	if err != nil {
		return fmt.Errorf("read chain id: %w", err)
	}
	var evidenceTeeID, evidenceProxyID common.Address
	if signedEvidence != nil {
		evidenceTeeID, evidenceProxyID, err = fccutils.VerifyActionResponse(
			signedEvidence.Response, signedEvidence.TeeInfo, chainID.Uint64(),
		)
		if err != nil {
			return err
		}
		if signedEvidence.TeeInfo.MachineData.ExtensionID != expectedExtension {
			return fmt.Errorf("TEE machine evidence is bound to extension %s, not %s", signedEvidence.TeeInfo.MachineData.ExtensionID.Hex(), expectedExtension.Hex())
		}
	} else if *mark {
		return fmt.Errorf("-mark requires signed action evidence from run-test; raw allocation JSON cannot authorize materialization")
	}
	digest, verifier, err := verifyResult(
		ctx,
		client,
		facilityABI,
		facility,
		result,
		expectedExtension,
		expectedRound,
		expectedRoot,
	)
	if err != nil {
		return err
	}
	fmt.Printf("local allocation verification passed: digest=%s facility=%s\n", digest.Hex(), facility.Hex())

	evidence := map[string]any{
		"broadcast":    false,
		"facility":     facility.Hex(),
		"extensionId":  expectedExtension.Hex(),
		"roundId":      expectedRound.Hex(),
		"rootAccordId": expectedRoot.Hex(),
		"resultDigest": digest.Hex(),
		"verifier":     verifier.Hex(),
		"verifiedAt":   time.Now().UTC().Format(time.RFC3339),
	}
	if signedEvidence != nil {
		evidence["signedAction"] = true
		evidence["teeId"] = evidenceTeeID.Hex()
		evidence["proxyId"] = evidenceProxyID.Hex()
	} else {
		evidence["signedAction"] = false
	}
	if !*mark {
		if *evidenceFile != "" {
			if err := writeEvidence(*evidenceFile, evidence); err != nil {
				return err
			}
		}
		fmt.Println("not broadcast: rerun with -mark to call markAllocationVerified")
		return nil
	}
	if *teeRegistryFlag == "" || !common.IsHexAddress(*teeRegistryFlag) || common.HexToAddress(*teeRegistryFlag) == (common.Address{}) {
		return fmt.Errorf("-mark requires a non-zero -teeRegistry address for active-machine verification")
	}
	if signedEvidence == nil {
		return fmt.Errorf("-mark requires signed action evidence from run-test")
	}
	if err := verifyActiveMachine(ctx, client, common.HexToAddress(*teeRegistryFlag), expectedExtension, evidenceTeeID); err != nil {
		return err
	}

	privateKey, err := support.DefaultPrivateKey()
	if err != nil {
		return err
	}
	signer := crypto.PubkeyToAddress(privateKey.PublicKey)
	if signer != verifier {
		return fmt.Errorf("DEPLOYMENT_PRIVATE_KEY resolves to %s, but facility allocationVerifier is %s", signer.Hex(), verifier.Hex())
	}
	opts, err := bind.NewKeyedTransactorWithChainID(privateKey, chainID)
	if err != nil {
		return fmt.Errorf("create transactor: %w", err)
	}
	opts.Context = ctx
	bound := bind.NewBoundContract(facility, facilityABI, client, client, client)
	tx, err := bound.Transact(opts, "markAllocationVerified", digest)
	if err != nil {
		return fmt.Errorf("send markAllocationVerified: %w", err)
	}
	receipt, err := bind.WaitMined(ctx, client, tx)
	if err != nil {
		return fmt.Errorf("wait for markAllocationVerified %s: %w", tx.Hash().Hex(), err)
	}
	if receipt.Status != coretypes.ReceiptStatusSuccessful {
		return fmt.Errorf("markAllocationVerified reverted in transaction %s", tx.Hash().Hex())
	}
	evidence["broadcast"] = true
	evidence["txHash"] = tx.Hash().Hex()
	if receipt.BlockNumber != nil {
		evidence["blockNumber"] = receipt.BlockNumber.String()
	}
	if *evidenceFile != "" {
		if err := writeEvidence(*evidenceFile, evidence); err != nil {
			return err
		}
	}
	fmt.Printf("allocation digest marked verified: tx=%s\n", tx.Hash().Hex())
	return nil
}

func decodeEvidence(payload []byte) (allocationResult, *actionEvidence, error) {
	var envelope actionEvidence
	if err := json.Unmarshal(payload, &envelope); err == nil && envelope.Response != nil {
		if envelope.TeeInfo == nil {
			return allocationResult{}, nil, fmt.Errorf("signed action evidence is missing teeInfo")
		}
		if envelope.Response.Result.Status != 1 {
			return allocationResult{}, nil, fmt.Errorf("signed FCC action status is %d", envelope.Response.Result.Status)
		}
		var result allocationResult
		if err := json.Unmarshal(envelope.Response.Result.Data, &result); err != nil {
			return allocationResult{}, nil, fmt.Errorf("decode allocation data from signed action evidence: %w", err)
		}
		return result, &envelope, nil
	}

	var result allocationResult
	if err := json.Unmarshal(payload, &result); err != nil {
		return allocationResult{}, nil, fmt.Errorf("decode allocation result: %w", err)
	}
	return result, nil, nil
}

func verifyActiveMachine(
	ctx context.Context,
	client *ethclient.Client,
	registry common.Address,
	extensionID common.Hash,
	teeID common.Address,
) error {
	registryABI, err := abi.JSON(strings.NewReader(teeRegistryABIJSON))
	if err != nil {
		return fmt.Errorf("parse TEE registry ABI: %w", err)
	}
	values, err := callMethod(
		ctx,
		client,
		registry,
		registryABI,
		"getActiveTeeMachines",
		new(big.Int).SetBytes(extensionID.Bytes()),
	)
	if err != nil {
		return err
	}
	if len(values) != 2 {
		return fmt.Errorf("getActiveTeeMachines returned %d values, expected 2", len(values))
	}
	teeIDs, ok := values[0].([]common.Address)
	if !ok {
		return fmt.Errorf("getActiveTeeMachines returned unexpected tee id type %T", values[0])
	}
	for _, activeID := range teeIDs {
		if activeID == teeID {
			return nil
		}
	}
	return fmt.Errorf("TEE %s is not active for extension %s", teeID.Hex(), extensionID.Hex())
}

func verifyResult(
	ctx context.Context,
	client *ethclient.Client,
	facilityABI abi.ABI,
	facility common.Address,
	result allocationResult,
	expectedExtension common.Hash,
	expectedRound common.Hash,
	expectedRoot common.Hash,
) (common.Hash, common.Address, error) {
	if !result.Success {
		return common.Hash{}, common.Address{}, fmt.Errorf("FCC allocation result is not successful")
	}
	extensionID, err := parseBytes32(result.ExtensionID, "result extensionId", false)
	if err != nil {
		return common.Hash{}, common.Address{}, err
	}
	roundID, err := parseBytes32(result.RoundID, "result roundId", false)
	if err != nil {
		return common.Hash{}, common.Address{}, err
	}
	rootID, err := parseBytes32(result.RootAccordID, "result rootAccordId", false)
	if err != nil {
		return common.Hash{}, common.Address{}, err
	}
	resultDigest, err := parseBytes32(result.ResultDigest, "resultDigest", false)
	if err != nil {
		return common.Hash{}, common.Address{}, err
	}
	if extensionID != expectedExtension || roundID != expectedRound || rootID != expectedRoot {
		return common.Hash{}, common.Address{}, fmt.Errorf("result is not bound to the requested extension, round, and root")
	}
	if len(result.SelectedProviders) == 0 ||
		len(result.SelectedProviders) != len(result.AllocatedCapacity) ||
		len(result.SelectedProviders) != len(result.AcceptedFeeBps) ||
		len(result.SelectedProviders) != len(result.TermsCommitments) {
		return common.Hash{}, common.Address{}, fmt.Errorf("allocation arrays are empty or have different lengths")
	}

	extensionValues, err := callMethod(ctx, client, facility, facilityABI, "extensionId")
	if err != nil {
		return common.Hash{}, common.Address{}, err
	}
	chainExtension, err := hashValue(extensionValues, "facility extensionId")
	if err != nil {
		return common.Hash{}, common.Address{}, err
	}
	if chainExtension != extensionID {
		return common.Hash{}, common.Address{}, fmt.Errorf("facility extensionId %s does not match result %s", chainExtension.Hex(), extensionID.Hex())
	}

	verifierValues, err := callMethod(ctx, client, facility, facilityABI, "allocationVerifier")
	if err != nil {
		return common.Hash{}, common.Address{}, err
	}
	verifier, err := addressValue(verifierValues, "facility allocationVerifier")
	if err != nil {
		return common.Hash{}, common.Address{}, err
	}
	if verifier == (common.Address{}) {
		return common.Hash{}, common.Address{}, fmt.Errorf("facility allocationVerifier is zero")
	}

	roundValues, err := callMethod(ctx, client, facility, facilityABI, "rounds", roundID)
	if err != nil {
		return common.Hash{}, common.Address{}, err
	}
	if len(roundValues) != 6 {
		return common.Hash{}, common.Address{}, fmt.Errorf("facility rounds getter returned %d values, expected 6", len(roundValues))
	}
	chainRoundRoot, err := hashValue(roundValues[1:2], "round rootAccordId")
	if err != nil {
		return common.Hash{}, common.Address{}, err
	}
	target, ok := roundValues[2].(*big.Int)
	if !ok || target.Sign() <= 0 {
		return common.Hash{}, common.Address{}, fmt.Errorf("facility round targetCapacity is invalid")
	}
	maxFee, err := uint64Value(roundValues[3], "round maxFeeBps")
	if err != nil {
		return common.Hash{}, common.Address{}, err
	}
	roundExpiry, err := uint64Value(roundValues[4], "round roundExpiry")
	if err != nil {
		return common.Hash{}, common.Address{}, err
	}
	status, err := uint64Value(roundValues[5], "round status")
	if err != nil {
		return common.Hash{}, common.Address{}, err
	}
	if chainRoundRoot != rootID {
		return common.Hash{}, common.Address{}, fmt.Errorf("round is bound to root %s, not %s", chainRoundRoot.Hex(), rootID.Hex())
	}
	if status != 1 {
		return common.Hash{}, common.Address{}, fmt.Errorf("round is not open; status=%d", status)
	}
	if result.RoundExpiry != roundExpiry {
		return common.Hash{}, common.Address{}, fmt.Errorf("result expiry %d does not match round expiry %d", result.RoundExpiry, roundExpiry)
	}
	if maxFee > 10000 {
		return common.Hash{}, common.Address{}, fmt.Errorf("round maxFeeBps exceeds the protocol bound")
	}

	sum := new(big.Int)
	seen := make(map[common.Address]bool, len(result.SelectedProviders))
	for i, providerText := range result.SelectedProviders {
		provider, err := parseAddress(providerText, fmt.Sprintf("selectedProviders[%d]", i))
		if err != nil {
			return common.Hash{}, common.Address{}, err
		}
		if seen[provider] {
			return common.Hash{}, common.Address{}, fmt.Errorf("provider %s appears more than once", provider.Hex())
		}
		seen[provider] = true
		if uint64(result.AcceptedFeeBps[i]) > maxFee {
			return common.Hash{}, common.Address{}, fmt.Errorf("provider %s exceeds the round fee bound", provider.Hex())
		}
		amount, err := parsePositiveUint256(result.AllocatedCapacity[i], fmt.Sprintf("allocatedCapacity[%d]", i))
		if err != nil {
			return common.Hash{}, common.Address{}, err
		}
		if _, err := parseBytes32(result.TermsCommitments[i], fmt.Sprintf("termsCommitments[%d]", i), true); err != nil {
			return common.Hash{}, common.Address{}, err
		}
		eligibleValues, err := callMethod(ctx, client, facility, facilityABI, "eligibleProvider", roundID, provider)
		if err != nil {
			return common.Hash{}, common.Address{}, err
		}
		if len(eligibleValues) != 1 {
			return common.Hash{}, common.Address{}, fmt.Errorf("eligibleProvider returned an unexpected result")
		}
		eligible, ok := eligibleValues[0].(bool)
		if !ok || !eligible {
			return common.Hash{}, common.Address{}, fmt.Errorf("provider %s is not eligible for the round", provider.Hex())
		}
		sum.Add(sum, amount)
	}
	if sum.Cmp(target) != 0 {
		return common.Hash{}, common.Address{}, fmt.Errorf("allocation total %s does not equal round target %s", sum, target)
	}

	computed, err := allocationResultDigest(result, extensionID, roundID, rootID)
	if err != nil {
		return common.Hash{}, common.Address{}, err
	}
	if computed != resultDigest {
		return common.Hash{}, common.Address{}, fmt.Errorf("resultDigest %s does not match recomputed digest %s", resultDigest.Hex(), computed.Hex())
	}
	return computed, verifier, nil
}

func callMethod(
	ctx context.Context,
	client *ethclient.Client,
	contract common.Address,
	contractABI abi.ABI,
	method string,
	args ...interface{},
) ([]interface{}, error) {
	input, err := contractABI.Pack(method, args...)
	if err != nil {
		return nil, fmt.Errorf("pack %s: %w", method, err)
	}
	output, err := client.CallContract(ctx, ethereum.CallMsg{To: &contract, Data: input}, nil)
	if err != nil {
		return nil, fmt.Errorf("call %s: %w", method, err)
	}
	values, err := contractABI.Unpack(method, output)
	if err != nil {
		return nil, fmt.Errorf("decode %s: %w", method, err)
	}
	return values, nil
}

func allocationResultDigest(result allocationResult, extensionID, roundID, rootID common.Hash) (common.Hash, error) {
	var encoded bytes.Buffer
	encoded.Write(extensionID.Bytes())
	encoded.Write(roundID.Bytes())
	encoded.Write(rootID.Bytes())
	if result.Success {
		encoded.WriteByte(1)
	} else {
		encoded.WriteByte(0)
	}
	var expiry [8]byte
	binary.BigEndian.PutUint64(expiry[:], result.RoundExpiry)
	encoded.Write(expiry[:])
	for i := range result.SelectedProviders {
		provider, err := parseAddress(result.SelectedProviders[i], fmt.Sprintf("selectedProviders[%d]", i))
		if err != nil {
			return common.Hash{}, err
		}
		amount, err := parsePositiveUint256(result.AllocatedCapacity[i], fmt.Sprintf("allocatedCapacity[%d]", i))
		if err != nil {
			return common.Hash{}, err
		}
		terms, err := parseBytes32(result.TermsCommitments[i], fmt.Sprintf("termsCommitments[%d]", i), true)
		if err != nil {
			return common.Hash{}, err
		}
		encoded.Write(provider.Bytes())
		amountBytes := make([]byte, 32)
		amount.FillBytes(amountBytes)
		encoded.Write(amountBytes)
		var fee [4]byte
		binary.BigEndian.PutUint32(fee[:], result.AcceptedFeeBps[i])
		encoded.Write(fee[:])
		encoded.Write(terms.Bytes())
	}
	return crypto.Keccak256Hash(encoded.Bytes()), nil
}

func parseBytes32(value, name string, allowZero bool) (common.Hash, error) {
	raw, err := hexutil.Decode(value)
	if err != nil || len(raw) != 32 {
		return common.Hash{}, fmt.Errorf("%s must be a 32-byte 0x-prefixed value", name)
	}
	hash := common.BytesToHash(raw)
	if !allowZero && hash == (common.Hash{}) {
		return common.Hash{}, fmt.Errorf("%s must be non-zero", name)
	}
	return hash, nil
}

func parseAddress(value, name string) (common.Address, error) {
	if !common.IsHexAddress(value) {
		return common.Address{}, fmt.Errorf("%s must be a valid EVM address", name)
	}
	address := common.HexToAddress(value)
	if address == (common.Address{}) {
		return common.Address{}, fmt.Errorf("%s must be non-zero", name)
	}
	return address, nil
}

func parsePositiveUint256(value, name string) (*big.Int, error) {
	if value == "" || strings.HasPrefix(value, "-") {
		return nil, fmt.Errorf("%s must be a positive uint256", name)
	}
	number, ok := new(big.Int).SetString(value, 10)
	if !ok || number.Sign() <= 0 || number.BitLen() > 256 {
		return nil, fmt.Errorf("%s must be a positive uint256", name)
	}
	return number, nil
}

func hashValue(values []interface{}, name string) (common.Hash, error) {
	if len(values) != 1 {
		return common.Hash{}, fmt.Errorf("%s returned an unexpected value count", name)
	}
	switch value := values[0].(type) {
	case [32]byte:
		return common.BytesToHash(value[:]), nil
	case common.Hash:
		return value, nil
	case []byte:
		if len(value) != 32 {
			return common.Hash{}, fmt.Errorf("%s is not bytes32", name)
		}
		return common.BytesToHash(value), nil
	default:
		return common.Hash{}, fmt.Errorf("%s has unexpected type %T", name, values[0])
	}
}

func addressValue(values []interface{}, name string) (common.Address, error) {
	if len(values) != 1 {
		return common.Address{}, fmt.Errorf("%s returned an unexpected value count", name)
	}
	switch value := values[0].(type) {
	case common.Address:
		return value, nil
	case [20]byte:
		return common.BytesToAddress(value[:]), nil
	default:
		return common.Address{}, fmt.Errorf("%s has unexpected type %T", name, values[0])
	}
}

func uint64Value(value interface{}, name string) (uint64, error) {
	switch typed := value.(type) {
	case uint8:
		return uint64(typed), nil
	case uint16:
		return uint64(typed), nil
	case uint32:
		return uint64(typed), nil
	case uint64:
		return typed, nil
	case *big.Int:
		if typed.Sign() < 0 || !typed.IsUint64() {
			return 0, fmt.Errorf("%s is outside uint64", name)
		}
		return typed.Uint64(), nil
	default:
		return 0, fmt.Errorf("%s has unexpected type %T", name, value)
	}
}

func writeEvidence(path string, evidence map[string]any) error {
	data, err := json.MarshalIndent(evidence, "", "  ")
	if err != nil {
		return fmt.Errorf("encode evidence: %w", err)
	}
	data = append(data, '\n')
	if err := os.WriteFile(path, data, 0600); err != nil {
		return fmt.Errorf("write evidence: %w", err)
	}
	fmt.Printf("verification evidence written to %s\n", path)
	return nil
}
