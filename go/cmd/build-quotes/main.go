// Command build-quotes creates the ephemeral, provider-signed inputs for one
// live Concord Makkari round. It is an operator tool, not part of the FCC
// runtime: provider keys are read from environment variables and never written
// to the repository or included in the output summary.
package main

import (
	"context"
	"crypto/ecdsa"
	"encoding/json"
	"flag"
	"fmt"
	"math/big"
	"os"
	"path/filepath"
	"strings"
	"time"

	"concord/internal/extension"
	"concord/pkg/types"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
)

const roundABIJSON = `[
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
    "inputs": [{"internalType": "bytes32", "name": "", "type": "bytes32"}],
    "name": "getEligibleProviders",
    "outputs": [{"internalType": "address[]", "name": "", "type": "address[]"}],
    "stateMutability": "view",
    "type": "function"
  }
]`

type providerSpec struct {
	label    string
	address  common.Address
	keyEnv   string
	capacity *big.Int
	feeBps   uint32
	nonce    *big.Int
}

func main() {
	if err := run(); err != nil {
		fmt.Fprintf(os.Stderr, "build-quotes: %v\n", err)
		os.Exit(1)
	}
}

func run() error {
	flags := flag.NewFlagSet("build-quotes", flag.ContinueOnError)
	rpcURL := flags.String("rpc", "", "Coston2 RPC URL")
	facilityText := flags.String("facility", "", "CapitalFacility address")
	extensionText := flags.String("extension-id", "", "FCC extension id")
	roundText := flags.String("round-id", "", "Makkari round id")
	rootText := flags.String("root-accord-id", "", "root Accord id")
	outDir := flags.String("out-dir", "", "directory for ephemeral quote and finalize JSON files")
	evaluationText := flags.String("evaluation-time", "", "optional Unix evaluation time; defaults to current time")
	providerA := flags.String("provider-a", "", "provider A address")
	providerB := flags.String("provider-b", "", "provider B address")
	providerC := flags.String("provider-c", "", "provider C address")
	keyEnvA := flags.String("key-env-a", "CONCORD_E2E_PROVIDER_A_PRIVATE_KEY", "environment variable containing provider A key")
	keyEnvB := flags.String("key-env-b", "CONCORD_E2E_PROVIDER_B_PRIVATE_KEY", "environment variable containing provider B key")
	keyEnvC := flags.String("key-env-c", "CONCORD_E2E_PROVIDER_C_PRIVATE_KEY", "environment variable containing provider C key")
	capacityA := flags.String("capacity-a", "3000000", "provider A capacity in base units")
	capacityB := flags.String("capacity-b", "3000000", "provider B capacity in base units")
	capacityC := flags.String("capacity-c", "3000000", "provider C capacity in base units")
	feeA := flags.Uint("fee-a", 610, "provider A fee in basis points")
	feeB := flags.Uint("fee-b", 640, "provider B fee in basis points")
	feeC := flags.Uint("fee-c", 680, "provider C fee in basis points")
	if err := flags.Parse(os.Args[1:]); err != nil {
		return err
	}
	for name, value := range map[string]string{
		"rpc": *rpcURL, "facility": *facilityText, "extension-id": *extensionText,
		"round-id": *roundText, "root-accord-id": *rootText, "out-dir": *outDir,
		"provider-a": *providerA, "provider-b": *providerB, "provider-c": *providerC,
	} {
		if strings.TrimSpace(value) == "" {
			return fmt.Errorf("-%s is required", name)
		}
	}
	if *feeA > 10000 || *feeB > 10000 || *feeC > 10000 {
		return fmt.Errorf("provider fee exceeds 10000 bps")
	}

	facility, err := parseAddress(*facilityText, "facility")
	if err != nil {
		return err
	}
	extensionID, err := parseHash(*extensionText, "extension-id")
	if err != nil {
		return err
	}
	roundID, err := parseHash(*roundText, "round-id")
	if err != nil {
		return err
	}
	rootID, err := parseHash(*rootText, "root-accord-id")
	if err != nil {
		return err
	}
	evaluationTime := uint64(time.Now().Unix())
	if *evaluationText != "" {
		parsed, parseErr := parseUint64(*evaluationText, "evaluation-time")
		if parseErr != nil {
			return parseErr
		}
		evaluationTime = parsed
	}

	parsedCapacityA, err := parsePositive(*capacityA, "capacity-a")
	if err != nil {
		return err
	}
	parsedCapacityB, err := parsePositive(*capacityB, "capacity-b")
	if err != nil {
		return err
	}
	parsedCapacityC, err := parsePositive(*capacityC, "capacity-c")
	if err != nil {
		return err
	}
	providers := []providerSpec{
		{label: "a", address: common.HexToAddress(*providerA), keyEnv: *keyEnvA, capacity: parsedCapacityA, feeBps: uint32(*feeA), nonce: big.NewInt(1)},
		{label: "b", address: common.HexToAddress(*providerB), keyEnv: *keyEnvB, capacity: parsedCapacityB, feeBps: uint32(*feeB), nonce: big.NewInt(2)},
		{label: "c", address: common.HexToAddress(*providerC), keyEnv: *keyEnvC, capacity: parsedCapacityC, feeBps: uint32(*feeC), nonce: big.NewInt(3)},
	}
	for _, provider := range providers {
		if provider.address == (common.Address{}) {
			return fmt.Errorf("provider %s address is zero", provider.label)
		}
	}

	client, err := ethclient.Dial(*rpcURL)
	if err != nil {
		return fmt.Errorf("connect to RPC: %w", err)
	}
	defer client.Close()
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	chainID, err := client.ChainID(ctx)
	if err != nil {
		return fmt.Errorf("read chain id: %w", err)
	}
	if chainID.Uint64() != 114 {
		return fmt.Errorf("expected Coston2 chain id 114, got %s", chainID)
	}
	contractABI, err := abi.JSON(strings.NewReader(roundABIJSON))
	if err != nil {
		return fmt.Errorf("parse CapitalFacility ABI: %w", err)
	}
	roundValues, err := call(ctx, client, contractABI, facility, "rounds", roundID)
	if err != nil {
		return err
	}
	if len(roundValues) != 6 {
		return fmt.Errorf("round getter returned %d values, expected 6", len(roundValues))
	}
	chainRoot, err := hashValue(roundValues[1], "round rootAccordId")
	if err != nil {
		return err
	}
	if chainRoot != rootID {
		return fmt.Errorf("round is bound to root %s, not %s", chainRoot.Hex(), rootID.Hex())
	}
	target, ok := roundValues[2].(*big.Int)
	if !ok || target.Sign() <= 0 {
		return fmt.Errorf("round targetCapacity is invalid")
	}
	maxFee, err := uint32Value(roundValues[3], "round maxFeeBps")
	if err != nil {
		return err
	}
	roundExpiry, err := uint64Value(roundValues[4], "round roundExpiry")
	if err != nil {
		return err
	}
	status, err := uint64Value(roundValues[5], "round status")
	if err != nil {
		return err
	}
	if status != 1 {
		return fmt.Errorf("round is not OPEN; status=%d", status)
	}
	if evaluationTime >= roundExpiry {
		return fmt.Errorf("evaluation time %d is at or after round expiry %d", evaluationTime, roundExpiry)
	}
	if maxFee > 10000 {
		return fmt.Errorf("round maxFeeBps exceeds protocol bound")
	}
	eligibleValues, err := call(ctx, client, contractABI, facility, "getEligibleProviders", roundID)
	if err != nil {
		return err
	}
	eligible, err := addressesValue(eligibleValues, "eligible providers")
	if err != nil {
		return err
	}
	eligibleSet := make(map[common.Address]bool, len(eligible))
	for _, address := range eligible {
		eligibleSet[address] = true
	}
	capacityTotal := new(big.Int)
	quotes := make([]types.QuoteRequest, 0, len(providers))
	for _, provider := range providers {
		if !eligibleSet[provider.address] {
			return fmt.Errorf("provider %s is not eligible for round", provider.address.Hex())
		}
		if provider.feeBps > maxFee {
			return fmt.Errorf("provider %s fee %d exceeds round max %d", provider.address.Hex(), provider.feeBps, maxFee)
		}
		key, keyErr := privateKeyFromEnv(provider.keyEnv)
		if keyErr != nil {
			return fmt.Errorf("provider %s: %w", provider.label, keyErr)
		}
		derived := crypto.PubkeyToAddress(key.PublicKey)
		if derived != provider.address {
			return fmt.Errorf("provider %s key resolves to %s, expected %s", provider.label, derived.Hex(), provider.address.Hex())
		}
		quote := types.QuoteRequest{
			RoundID:      roundID.Hex(),
			RootAccordID: rootID.Hex(),
			Provider:     provider.address.Hex(),
			Capacity:     provider.capacity.String(),
			FeeBps:       provider.feeBps,
			ValidUntil:   roundExpiry,
			Nonce:        provider.nonce.String(),
		}
		quote.ProviderSignature, err = extension.SignQuote(quote, key)
		if err != nil {
			return fmt.Errorf("sign provider %s quote: %w", provider.label, err)
		}
		capacityTotal.Add(capacityTotal, provider.capacity)
		quotes = append(quotes, quote)
	}
	if capacityTotal.Cmp(target) < 0 {
		return fmt.Errorf("quote capacity %s is below target %s", capacityTotal, target)
	}

	finalize := types.FinalizeRoundRequest{
		ExtensionID:       extensionID.Hex(),
		RoundID:           roundID.Hex(),
		RootAccordID:      rootID.Hex(),
		TargetCapacity:    target.String(),
		MaxFeeBps:         maxFee,
		RoundExpiry:       roundExpiry,
		EvaluationTime:    evaluationTime,
		EligibleProviders: eligible,
		Quotes:            quotes,
	}
	if err := os.MkdirAll(*outDir, 0700); err != nil {
		return fmt.Errorf("create output directory: %w", err)
	}
	for _, provider := range providers {
		quote := quotes[providerIndex(providers, provider.label)]
		if err := writeJSON(filepath.Join(*outDir, "quote-"+provider.label+".json"), quote); err != nil {
			return err
		}
	}
	if err := writeJSON(filepath.Join(*outDir, "finalize-round.json"), finalize); err != nil {
		return err
	}
	fmt.Printf("built 3 signed quotes for round %s; target=%s; expiry=%d; output=%s\n", roundID.Hex(), target.String(), roundExpiry, *outDir)
	return nil
}

func providerIndex(providers []providerSpec, label string) int {
	for index, provider := range providers {
		if provider.label == label {
			return index
		}
	}
	return -1
}

func privateKeyFromEnv(name string) (*ecdsa.PrivateKey, error) {
	value := strings.TrimSpace(os.Getenv(name))
	if value == "" {
		return nil, fmt.Errorf("%s is not set", name)
	}
	value = strings.TrimPrefix(strings.TrimPrefix(value, "0x"), "0X")
	key, err := crypto.HexToECDSA(value)
	if err != nil {
		return nil, fmt.Errorf("decode %s: %w", name, err)
	}
	return key, nil
}

func writeJSON(path string, value any) error {
	data, err := json.MarshalIndent(value, "", "  ")
	if err != nil {
		return fmt.Errorf("encode %s: %w", path, err)
	}
	data = append(data, '\n')
	if err := os.WriteFile(path, data, 0600); err != nil {
		return fmt.Errorf("write %s: %w", path, err)
	}
	return nil
}

func call(ctx context.Context, client *ethclient.Client, contractABI abi.ABI, address common.Address, method string, args ...any) ([]any, error) {
	input, err := contractABI.Pack(method, args...)
	if err != nil {
		return nil, fmt.Errorf("pack %s: %w", method, err)
	}
	output, err := client.CallContract(ctx, ethereum.CallMsg{To: &address, Data: input}, nil)
	if err != nil {
		return nil, fmt.Errorf("call %s: %w", method, err)
	}
	values, err := contractABI.Unpack(method, output)
	if err != nil {
		return nil, fmt.Errorf("decode %s: %w", method, err)
	}
	return values, nil
}

func parseAddress(value, name string) (common.Address, error) {
	if !common.IsHexAddress(value) || common.HexToAddress(value) == (common.Address{}) {
		return common.Address{}, fmt.Errorf("%s must be a non-zero EVM address", name)
	}
	return common.HexToAddress(value), nil
}

func parseHash(value, name string) (common.Hash, error) {
	if !strings.HasPrefix(value, "0x") || len(value) != 66 {
		return common.Hash{}, fmt.Errorf("%s must be a 32-byte 0x-prefixed value", name)
	}
	hash := common.HexToHash(value)
	if hash == (common.Hash{}) {
		return common.Hash{}, fmt.Errorf("%s must be non-zero", name)
	}
	return hash, nil
}

func parsePositive(value, name string) (*big.Int, error) {
	number, ok := new(big.Int).SetString(value, 10)
	if !ok || number.Sign() <= 0 {
		return nil, fmt.Errorf("%s must be a positive decimal integer", name)
	}
	return number, nil
}

func parseUint64(value, name string) (uint64, error) {
	number, ok := new(big.Int).SetString(value, 10)
	if !ok || number.Sign() < 0 || !number.IsUint64() {
		return 0, fmt.Errorf("%s must be a uint64", name)
	}
	return number.Uint64(), nil
}

func hashValue(value any, name string) (common.Hash, error) {
	switch typed := value.(type) {
	case [32]byte:
		return common.BytesToHash(typed[:]), nil
	case common.Hash:
		return typed, nil
	case []byte:
		if len(typed) != 32 {
			return common.Hash{}, fmt.Errorf("%s is not bytes32", name)
		}
		return common.BytesToHash(typed), nil
	default:
		return common.Hash{}, fmt.Errorf("%s has unexpected type %T", name, value)
	}
}

func uint32Value(value any, name string) (uint32, error) {
	switch typed := value.(type) {
	case uint8:
		return uint32(typed), nil
	case uint16:
		return uint32(typed), nil
	case uint32:
		return typed, nil
	case uint64:
		if typed > 1<<32-1 {
			return 0, fmt.Errorf("%s exceeds uint32", name)
		}
		return uint32(typed), nil
	case *big.Int:
		if typed.Sign() < 0 || !typed.IsUint64() || typed.Uint64() > 1<<32-1 {
			return 0, fmt.Errorf("%s exceeds uint32", name)
		}
		return uint32(typed.Uint64()), nil
	default:
		return 0, fmt.Errorf("%s has unexpected type %T", name, value)
	}
}

func uint64Value(value any, name string) (uint64, error) {
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

func addressesValue(values []any, name string) ([]common.Address, error) {
	if len(values) != 1 {
		return nil, fmt.Errorf("%s returned %d values, expected one", name, len(values))
	}
	addresses, ok := values[0].([]common.Address)
	if !ok {
		return nil, fmt.Errorf("%s has unexpected type %T", name, values[0])
	}
	return addresses, nil
}
