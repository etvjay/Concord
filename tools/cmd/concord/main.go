package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"concord/tools/pkg/api"
	"concord/tools/pkg/mcpserver"
	"concord/tools/pkg/readmodel"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/ethclient"
)

const version = "0.1.0"

type networkConfig struct {
	Network string      `json:"network"`
	ChainID int64       `json:"chainId"`
	RPCURL  string      `json:"rpcUrl"`
	FXRP    assetConfig `json:"fxrp"`
	USDT0   assetConfig `json:"usdt0"`
}

type assetConfig struct {
	Token    string `json:"token"`
	Symbol   string `json:"symbol"`
	Decimals uint8  `json:"decimals"`
}

func main() {
	if len(os.Args) < 2 {
		usage()
		os.Exit(2)
	}
	switch os.Args[1] {
	case "doctor":
		exitIfError(runDoctor(os.Args[2:]))
	case "api":
		exitIfError(runAPI(os.Args[2:]))
	case "mcp":
		exitIfError(runMCP(os.Args[2:]))
	case "version", "--version", "-v":
		fmt.Println("concord", version)
	case "help", "--help", "-h":
		usage()
	default:
		fmt.Fprintf(os.Stderr, "concord: unknown command %q\n\n", os.Args[1])
		usage()
		os.Exit(2)
	}
}

func usage() {
	fmt.Println(`Concord operator/developer CLI

Usage:
  concord doctor [flags]   Check local tools, network config, and optional contracts
  concord api [flags]      Serve the read-only REST API and intent builder
  concord mcp [flags]      Serve the MCP adapter over stdin/stdout
  concord version          Print the CLI version

The CLI never stores keys, signs transactions, broadcasts transactions, or
authorizes FCC allocation results. Use the existing deployment/FCC commands
for those explicitly bounded operations.`)
}

func runDoctor(args []string) error {
	flags := flag.NewFlagSet("concord doctor", flag.ContinueOnError)
	configPath := flags.String("config", defaultNetworkConfig(), "network JSON configuration")
	rpcOverride := flags.String("rpc", "", "override RPC URL")
	facility := flags.String("facility", "", "optional CapitalFacility address to check")
	registry := flags.String("registry", "", "optional AccordRegistry address to check")
	offline := flags.Bool("offline", false, "skip the live RPC check and validate local configuration only")
	jsonOutput := flags.Bool("json", false, "emit machine-readable checks")
	if err := flags.Parse(args); err != nil {
		return err
	}

	checks := []map[string]any{}
	add := func(name string, ok bool, detail string) {
		checks = append(checks, map[string]any{"name": name, "ok": ok, "detail": detail})
	}

	config, err := loadNetworkConfig(*configPath)
	if err != nil {
		add("network_config", false, err.Error())
		return printDoctor(checks, *jsonOutput)
	}
	add("network_config", config.Network != "" && config.ChainID != 0 && config.RPCURL != "" && config.FXRP.Token != "" && config.USDT0.Token != "", fmt.Sprintf("%s chain %d; FXRP=%s USDT0=%s", config.Network, config.ChainID, config.FXRP.Token, config.USDT0.Token))
	rpcURL := config.RPCURL
	if *rpcOverride != "" {
		rpcURL = *rpcOverride
	}
	for _, binary := range []string{"go", "forge", "jq"} {
		path, lookupErr := exec.LookPath(binary)
		add("tool_"+binary, lookupErr == nil, pathOrError(path, lookupErr))
	}
	if *offline {
		add("rpc", true, "skipped by --offline")
		return printDoctor(checks, *jsonOutput)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()
	client, err := ethclient.DialContext(ctx, rpcURL)
	if err != nil {
		add("rpc", false, err.Error())
		return printDoctor(checks, *jsonOutput)
	}
	defer client.Close()
	chainID, err := client.ChainID(ctx)
	if err != nil {
		add("chain_id", false, err.Error())
	} else {
		add("chain_id", chainID.Int64() == config.ChainID, fmt.Sprintf("configured %d, RPC returned %s", config.ChainID, chainID.String()))
	}
	for name, value := range map[string]string{"facility": *facility, "registry": *registry} {
		if value == "" {
			continue
		}
		address, parseErr := parseAddress(value)
		if parseErr != nil {
			add(name+"_address", false, parseErr.Error())
			continue
		}
		code, codeErr := client.CodeAt(ctx, address, nil)
		add(name+"_bytecode", codeErr == nil && len(code) > 0, fmt.Sprintf("%s: %d bytes", address.Hex(), len(code)))
	}
	return printDoctor(checks, *jsonOutput)
}

func runAPI(args []string) error {
	flags := flag.NewFlagSet("concord api", flag.ContinueOnError)
	configPath := flags.String("config", defaultNetworkConfig(), "network JSON configuration")
	rpcOverride := flags.String("rpc", "", "override RPC URL")
	facility := flags.String("facility", "", "CapitalFacility address")
	registry := flags.String("registry", "", "AccordRegistry address")
	listen := flags.String("listen", "127.0.0.1:8080", "HTTP listen address")
	if err := flags.Parse(args); err != nil {
		return err
	}
	config, err := loadNetworkConfig(*configPath)
	if err != nil {
		return err
	}
	rpcURL := config.RPCURL
	if *rpcOverride != "" {
		rpcURL = *rpcOverride
	}
	facilityAddress, err := parseRequiredAddress(*facility, "facility")
	if err != nil {
		return err
	}
	registryAddress, err := parseRequiredAddress(*registry, "registry")
	if err != nil {
		return err
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	reader, err := readmodel.NewChainReader(ctx, readmodel.ChainReaderConfig{
		RPCURL:          rpcURL,
		Network:         config.Network,
		ChainID:         config.ChainID,
		FacilityAddress: facilityAddress,
		RegistryAddress: registryAddress,
		CollateralAsset: readmodel.Asset{Address: config.FXRP.Token, Symbol: "FXRP", Decimals: config.FXRP.Decimals},
		LiquidityAsset:  readmodel.Asset{Address: config.USDT0.Token, Symbol: config.USDT0.Symbol, Decimals: config.USDT0.Decimals},
	})
	if err != nil {
		return err
	}
	defer reader.Close()
	server, err := api.NewServer(reader, config.Network, config.ChainID, facilityAddress, registryAddress)
	if err != nil {
		return err
	}
	fmt.Printf("Concord API listening on http://%s (network=%s chainId=%d)\n", *listen, config.Network, config.ChainID)
	fmt.Printf("Read model: CapitalFacility=%s AccordRegistry=%s\n", facilityAddress.Hex(), registryAddress.Hex())
	return http.ListenAndServe(*listen, server.Handler())
}

func runMCP(args []string) error {
	flags := flag.NewFlagSet("concord mcp", flag.ContinueOnError)
	apiURL := flags.String("api-url", "http://127.0.0.1:8080", "Concord API base URL")
	if err := flags.Parse(args); err != nil {
		return err
	}
	return (&mcpserver.Server{APIBaseURL: *apiURL, Input: os.Stdin, Output: os.Stdout}).Serve(context.Background())
}

func loadNetworkConfig(path string) (networkConfig, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return networkConfig{}, fmt.Errorf("read network config %s: %w", path, err)
	}
	var config networkConfig
	if err := json.Unmarshal(data, &config); err != nil {
		return networkConfig{}, fmt.Errorf("decode network config: %w", err)
	}
	if config.Network == "" || config.ChainID == 0 || config.RPCURL == "" {
		return networkConfig{}, fmt.Errorf("network config is missing network, chainId, or rpcUrl")
	}
	return config, nil
}

func defaultNetworkConfig() string {
	if _, err := os.Stat("../config/networks/coston2.json"); err == nil {
		return "../config/networks/coston2.json"
	}
	return filepath.Join("config", "networks", "coston2.json")
}

func parseRequiredAddress(value, name string) (common.Address, error) {
	if value == "" {
		return common.Address{}, fmt.Errorf("-%s is required", name)
	}
	return parseAddress(value)
}

func parseAddress(value string) (common.Address, error) {
	if !strings.HasPrefix(value, "0x") || len(value) != 42 {
		return common.Address{}, fmt.Errorf("invalid address %q", value)
	}
	for _, char := range value[2:] {
		if !strings.ContainsRune("0123456789abcdefABCDEF", char) {
			return common.Address{}, fmt.Errorf("invalid address %q", value)
		}
	}
	return common.HexToAddress(value), nil
}

func printDoctor(checks []map[string]any, jsonOutput bool) error {
	ok := true
	for _, check := range checks {
		if value, exists := check["ok"].(bool); exists && !value {
			ok = false
		}
	}
	if jsonOutput {
		data, _ := json.MarshalIndent(map[string]any{"ready": ok, "checks": checks}, "", "  ")
		fmt.Println(string(data))
	} else {
		for _, check := range checks {
			mark := "PASS"
			if value, exists := check["ok"].(bool); exists && !value {
				mark = "FAIL"
			}
			fmt.Printf("[%s] %-22s %s\n", mark, check["name"], check["detail"])
		}
		if ok {
			fmt.Println("CLI doctor: ready for the configured checks")
		} else {
			fmt.Println("CLI doctor: not ready; resolve the failed checks")
		}
	}
	if !ok {
		return fmt.Errorf("one or more doctor checks failed")
	}
	return nil
}

func pathOrError(path string, err error) string {
	if err != nil {
		return err.Error()
	}
	return path
}

func exitIfError(err error) {
	if err != nil {
		fmt.Fprintln(os.Stderr, "concord:", err)
		os.Exit(1)
	}
}
