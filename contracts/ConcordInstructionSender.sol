// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {ITeeExtensionRegistry} from "./interfaces/ITeeExtensionRegistry.sol";
import {ITeeMachineRegistry} from "./interfaces/ITeeMachineRegistry.sol";

/// @title ConcordInstructionSender
/// @notice Concord's Flare Confidential Compute instruction entry point.
/// The message is expected to be encrypted to the active FCC machine public
/// key before it is submitted. Settlement and relationship state remain public
/// onchain; quote terms and losing offers remain inside the FCC boundary.
contract ConcordInstructionSender {
    bytes32 public constant OP_TYPE_CONCORD = bytes32("CONCORD");
    bytes32 public constant OP_COMMAND_SUBMIT_QUOTE = bytes32("SUBMIT_QUOTE");
    bytes32 public constant OP_COMMAND_FINALIZE_ROUND = bytes32("FINALIZE_ROUND");

    ITeeExtensionRegistry public immutable TEE_EXTENSION_REGISTRY;
    ITeeMachineRegistry public immutable TEE_MACHINE_REGISTRY;

    uint256 private constant FIRST_PUBLIC_EXTENSION_ID = 0x10000;
    uint256 private _extensionId;

    constructor(ITeeExtensionRegistry extensionRegistry_, ITeeMachineRegistry machineRegistry_) {
        require(address(extensionRegistry_) != address(0), "extension registry is zero");
        require(address(machineRegistry_) != address(0), "machine registry is zero");
        require(address(extensionRegistry_).code.length > 0, "extension registry has no code");
        require(address(machineRegistry_).code.length > 0, "machine registry has no code");
        TEE_EXTENSION_REGISTRY = extensionRegistry_;
        TEE_MACHINE_REGISTRY = machineRegistry_;
    }

    function setExtensionId() external {
        require(_extensionId == 0, "Extension ID already set.");
        uint256 nextId = TEE_EXTENSION_REGISTRY.nextPublicExtensionId();
        for (uint256 i = FIRST_PUBLIC_EXTENSION_ID; i < nextId; ++i) {
            if (TEE_EXTENSION_REGISTRY.getTeeExtensionInstructionsSender(i) == address(this)) {
                _extensionId = i;
                return;
            }
        }
        revert("Extension ID not found.");
    }

    function extensionId() external view returns (uint256) {
        return _extensionId;
    }

    function sendSubmitQuote(bytes calldata encryptedMessage) external payable returns (bytes32 instructionId) {
        instructionId = _send(OP_COMMAND_SUBMIT_QUOTE, encryptedMessage);
    }

    function sendFinalizeRound(bytes calldata encryptedMessage) external payable returns (bytes32 instructionId) {
        instructionId = _send(OP_COMMAND_FINALIZE_ROUND, encryptedMessage);
    }

    function _send(bytes32 command, bytes calldata encryptedMessage) internal returns (bytes32 instructionId) {
        require(encryptedMessage.length != 0, "encrypted message is empty");
        address[] memory teeIds = TEE_MACHINE_REGISTRY.getRandomTeeIds(_getExtensionId(), 1);
        address[] memory cosigners = new address[](0);
        ITeeExtensionRegistry.TeeInstructionParams memory params = ITeeExtensionRegistry.TeeInstructionParams({
            opType: OP_TYPE_CONCORD,
            opCommand: command,
            message: encryptedMessage,
            cosigners: cosigners,
            cosignersThreshold: 0,
            claimBackAddress: msg.sender
        });
        instructionId = TEE_EXTENSION_REGISTRY.sendInstructions{value: msg.value}(teeIds, params);
    }

    function _getExtensionId() internal view returns (uint256) {
        require(_extensionId != 0, "Extension ID is not set.");
        return _extensionId;
    }
}
