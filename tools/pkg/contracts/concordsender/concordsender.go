//go:generate go run github.com/ethereum/go-ethereum/cmd/abigen --abi=ConcordInstructionSender.abi --bin=ConcordInstructionSender.bin --pkg=concordsender --type=ConcordInstructionSender --out=autogen.go

// This directory is generated from contracts/ConcordInstructionSender.sol by
// scripts/generate-bindings.sh. Keep only the directive in source control;
// generated ABI, bytecode, and Go bindings are build artifacts.
package concordsender
