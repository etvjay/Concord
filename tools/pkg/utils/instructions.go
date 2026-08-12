package utils

import (
	"context"
	"math/big"
	"time"

	"concord/tools/pkg/contracts/concordsender"
	"concord/tools/pkg/support"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/pkg/errors"
)

const instructionFeeWei = 1_000_000

func DeployInstructionSender(s *support.Support) (common.Address, *concordsender.ConcordInstructionSender, error) {
	opts, err := bind.NewKeyedTransactorWithChainID(s.Prv, s.ChainID)
	if err != nil {
		return common.Address{}, nil, errors.Errorf("failed to create transactor: %s", err)
	}
	address, tx, contract, err := concordsender.DeployConcordInstructionSender(
		opts, s.ChainClient, s.Addresses.FlareTeeManager, s.Addresses.FlareTeeManager,
	)
	if err != nil {
		return common.Address{}, nil, errors.Errorf("failed to deploy ConcordInstructionSender: %s", err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()
	receipt, err := bind.WaitMined(ctx, s.ChainClient, tx)
	if err != nil {
		return common.Address{}, nil, errors.Errorf("deployment tx not mined within 2 minutes (tx: %s): %s", tx.Hash().Hex(), err)
	}
	if receipt.Status != types.ReceiptStatusSuccessful {
		return common.Address{}, nil, errors.New("ConcordInstructionSender deployment failed")
	}
	return address, contract, nil
}

func SetExtensionId(s *support.Support, instructionSenderAddress common.Address) error {
	sender, err := concordsender.NewConcordInstructionSender(instructionSenderAddress, s.ChainClient)
	if err != nil {
		return errors.Errorf("failed to bind ConcordInstructionSender: %s", err)
	}
	opts, err := bind.NewKeyedTransactorWithChainID(s.Prv, s.ChainID)
	if err != nil {
		return errors.Errorf("failed to create transactor: %s", err)
	}
	tx, err := sender.SetExtensionId(opts)
	if err != nil {
		return errors.Errorf("failed to call setExtensionId: %s", err)
	}
	receipt, err := bind.WaitMined(context.Background(), s.ChainClient, tx)
	if err != nil {
		return errors.Errorf("failed waiting for setExtensionId transaction: %s", err)
	}
	if receipt.Status != types.ReceiptStatusSuccessful {
		return errors.New("setExtensionId transaction failed")
	}
	return nil
}

func SendSubmitQuote(s *support.Support, instructionSenderAddress common.Address, encryptedPayload []byte) (common.Hash, common.Hash, error) {
	sender, err := concordsender.NewConcordInstructionSender(instructionSenderAddress, s.ChainClient)
	if err != nil {
		return common.Hash{}, common.Hash{}, errors.Errorf("failed to bind ConcordInstructionSender: %s", err)
	}
	opts, err := bind.NewKeyedTransactorWithChainID(s.Prv, s.ChainID)
	if err != nil {
		return common.Hash{}, common.Hash{}, errors.Errorf("failed to create transactor: %s", err)
	}
	opts.Value = big.NewInt(instructionFeeWei)
	tx, err := sender.SendSubmitQuote(opts, encryptedPayload)
	if err != nil {
		return common.Hash{}, common.Hash{}, errors.Errorf("failed to send SUBMIT_QUOTE: %s", err)
	}
	return parseInstructionReceipt(s, tx)
}

func SendFinalizeRound(s *support.Support, instructionSenderAddress common.Address, encryptedPayload []byte) (common.Hash, common.Hash, error) {
	sender, err := concordsender.NewConcordInstructionSender(instructionSenderAddress, s.ChainClient)
	if err != nil {
		return common.Hash{}, common.Hash{}, errors.Errorf("failed to bind ConcordInstructionSender: %s", err)
	}
	opts, err := bind.NewKeyedTransactorWithChainID(s.Prv, s.ChainID)
	if err != nil {
		return common.Hash{}, common.Hash{}, errors.Errorf("failed to create transactor: %s", err)
	}
	opts.Value = big.NewInt(instructionFeeWei)
	tx, err := sender.SendFinalizeRound(opts, encryptedPayload)
	if err != nil {
		return common.Hash{}, common.Hash{}, errors.Errorf("failed to send FINALIZE_ROUND: %s", err)
	}
	return parseInstructionReceipt(s, tx)
}

func parseInstructionReceipt(s *support.Support, tx *types.Transaction) (common.Hash, common.Hash, error) {
	receipt, err := bind.WaitMined(context.Background(), s.ChainClient, tx)
	if err != nil {
		return common.Hash{}, common.Hash{}, errors.Errorf("failed waiting for transaction: %s", err)
	}
	if receipt.Status != types.ReceiptStatusSuccessful {
		return common.Hash{}, common.Hash{}, errors.Errorf("transaction failed with status: %d", receipt.Status)
	}
	for _, log := range receipt.Logs {
		instructionSent, parseErr := s.TeeVerification.ParseTeeInstructionsSent(*log)
		if parseErr == nil {
			return instructionSent.InstructionId, receipt.TxHash, nil
		}
	}
	return common.Hash{}, common.Hash{}, errors.New("no TeeInstructionsSent event found in receipt")
}

// SenderAddress is used by callers that need the configured deployer address
// without reimplementing the key derivation rule.
func SenderAddress(s *support.Support) common.Address {
	return crypto.PubkeyToAddress(s.Prv.PublicKey)
}
