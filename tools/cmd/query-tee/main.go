package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"math/big"
	"os"
	"path/filepath"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/flare-foundation/go-flare-common/pkg/contracts/tee/machinemanager"
)

type deployedAddress struct {
	Name    string `json:"name"`
	Address string `json:"address"`
}

func resolveRegistry(explicit, addressesFile string) (string, error) {
	if explicit != "" {
		if !common.IsHexAddress(explicit) {
			return "", fmt.Errorf("invalid TeeMachineRegistry address: %q", explicit)
		}
		return explicit, nil
	}

	candidates := []string{}
	if addressesFile != "" {
		candidates = append(candidates, addressesFile)
	} else {
		candidates = append(candidates,
			"config/coston2/deployed-addresses.json",
			"../config/coston2/deployed-addresses.json",
		)
	}

	var lastErr error
	for _, candidate := range candidates {
		path := candidate
		if !filepath.IsAbs(path) {
			path, _ = filepath.Abs(path)
		}
		data, err := os.ReadFile(path)
		if err != nil {
			lastErr = err
			continue
		}
		var entries []deployedAddress
		if err := json.Unmarshal(data, &entries); err != nil {
			return "", fmt.Errorf("parse deployed-addresses file %s: %w", path, err)
		}
		for _, entry := range entries {
			if entry.Name == "FlareTeeManager" {
				if !common.IsHexAddress(entry.Address) {
					return "", fmt.Errorf("FlareTeeManager address in %s is invalid", path)
				}
				return entry.Address, nil
			}
		}
		return "", fmt.Errorf("FlareTeeManager not found in %s", path)
	}

	return "", fmt.Errorf("TeeMachineRegistry not supplied and deployed-addresses file was not readable: %v", lastErr)
}

func main() {
	rpc := flag.String("rpc", "https://coston2-api.flare.network/ext/C/rpc", "rpc url")
	reg := flag.String("reg", "", "TeeMachineRegistry address override (otherwise derive FlareTeeManager from config/coston2/deployed-addresses.json)")
	addressesFile := flag.String("addresses", "", "deployed-addresses.json path used to derive FlareTeeManager")
	listExt := flag.Int64("ext", -1, "list active TEEs in extension id (e.g. 0 for FTDC, 1588 for user)")
	flag.Parse()

	registry, err := resolveRegistry(*reg, *addressesFile)
	if err != nil {
		fmt.Fprintf(os.Stderr, "resolve registry: %v\n", err)
		os.Exit(1)
	}
	fmt.Printf("TeeMachineRegistry: %s\n", common.HexToAddress(registry).Hex())

	cc, err := ethclient.Dial(*rpc)
	if err != nil {
		fmt.Fprintf(os.Stderr, "dial: %v\n", err)
		os.Exit(1)
	}
	mm, err := machinemanager.NewMachineManager(common.HexToAddress(registry), cc)
	if err != nil {
		fmt.Fprintf(os.Stderr, "bind: %v\n", err)
		os.Exit(1)
	}

	opts := &bind.CallOpts{Context: context.Background()}

	if *listExt >= 0 {
		ext := big.NewInt(*listExt)
		fmt.Printf("\n=== Active TEEs for extensionId=%s ===\n", ext.String())
		out, err := mm.GetActiveTeeMachines(opts, ext)
		if err != nil {
			fmt.Printf("getActiveTeeMachines ERROR: %v\n", err)
		} else {
			for i, id := range out.TeeIds {
				url := ""
				if i < len(out.Urls) {
					url = out.Urls[i]
				}
				fmt.Printf("  %d: %s url=%q\n", i, id.Hex(), url)
			}
			if len(out.TeeIds) == 0 {
				fmt.Println("  (none)")
			}
		}
	}

	for _, raw := range flag.Args() {
		id := common.HexToAddress(raw)
		fmt.Printf("\n=== TEE %s ===\n", id.Hex())

		m, err := mm.GetTeeMachine(opts, id)
		if err != nil {
			fmt.Printf("  getTeeMachine ERROR: %v\n", err)
		} else {
			fmt.Printf("  getTeeMachine: teeId=%s teeProxyId=%s url=%q\n", m.TeeId.Hex(), m.TeeProxyId.Hex(), m.Url)
			if m.TeeId == (common.Address{}) {
				fmt.Println("  -> EMPTY/UNREGISTERED")
			}
		}

		st, err := mm.GetTeeMachineStatus(opts, id)
		if err != nil {
			fmt.Printf("  getTeeMachineStatus ERROR: %v\n", err)
		} else {
			fmt.Printf("  getTeeMachineStatus: %d\n", st)
		}

		owner, err := mm.GetTeeMachineOwner(opts, id)
		if err != nil {
			fmt.Printf("  getTeeMachineOwner ERROR: %v\n", err)
		} else {
			fmt.Printf("  getTeeMachineOwner: %s\n", owner.Hex())
		}

		extID, err := mm.GetExtensionId(opts, id)
		if err != nil {
			fmt.Printf("  getExtensionId ERROR: %v\n", err)
		} else {
			fmt.Printf("  getExtensionId: %s\n", extID.String())
		}

		ts, err := mm.GetLastStatusChangeTs(opts, id)
		if err != nil {
			fmt.Printf("  getLastStatusChangeTs ERROR: %v\n", err)
		} else {
			fmt.Printf("  getLastStatusChangeTs: %s\n", ts.String())
		}

		spid, err := mm.GetInitialSigningPolicyId(opts, id)
		if err != nil {
			fmt.Printf("  getInitialSigningPolicyId ERROR: %v\n", err)
		} else {
			fmt.Printf("  getInitialSigningPolicyId: %d\n", spid)
		}
	}
}
