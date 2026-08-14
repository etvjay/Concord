// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {AccordRegistry} from "../contracts/AccordRegistry.sol";
import {CapitalFacility} from "../contracts/CapitalFacility.sol";
import {ConcordInstructionSender} from "../contracts/ConcordInstructionSender.sol";
import {ITeeExtensionRegistry} from "../contracts/interfaces/ITeeExtensionRegistry.sol";
import {ITeeMachineRegistry} from "../contracts/interfaces/ITeeMachineRegistry.sol";

interface Vm {
    function envAddress(string calldata name) external returns (address);
    function envBytes32(string calldata name) external returns (bytes32);
    function startBroadcast(address broadcaster) external;
    function stopBroadcast() external;
}

/// @notice Minimal, dependency-free Foundry deployment entry point.
/// Mutable Flare deployment addresses are supplied by the environment.
contract DeployCoston2 {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    event ConcordDeployed(
        address indexed accordRegistry,
        address indexed capitalFacility,
        address instructionSender,
        address collateralAsset,
        address liquidityAsset,
        bytes32 extensionId
    );

    event InstructionSenderDeployed(
        address indexed instructionSender,
        address indexed teeExtensionRegistry,
        address indexed teeMachineRegistry
    );

    /// @notice Standard Foundry entry point for the facility phase.
    function run() external {
        _deployFacility();
    }

    /// @notice Low-level sender deployment for a manual registration flow.
    /// Register the emitted sender through the official FCC tooling before
    /// deploying the facility with runFacility().
    function runSender() external {
        _deploySender();
    }

    /// @notice Deploy the economic contracts after the FCC extension id exists.
    function runFacility() external {
        _deployFacility();
    }

    function _deploySender() internal {
        address owner = vm.envAddress("DEPLOYMENT_OWNER");
        address teeExtensionRegistry = vm.envAddress("TEE_EXTENSION_REGISTRY");
        address teeMachineRegistry = vm.envAddress("TEE_MACHINE_REGISTRY");

        vm.startBroadcast(owner);
        ConcordInstructionSender sender = new ConcordInstructionSender(
            ITeeExtensionRegistry(teeExtensionRegistry),
            ITeeMachineRegistry(teeMachineRegistry)
        );
        vm.stopBroadcast();

        emit InstructionSenderDeployed(address(sender), teeExtensionRegistry, teeMachineRegistry);
    }

    function _deployFacility() internal {
        address owner = vm.envAddress("DEPLOYMENT_OWNER");
        address fxrp = vm.envAddress("FXRP_TOKEN");
        address usdt0 = vm.envAddress("USDT0_TOKEN");
        address verifier = vm.envAddress("ALLOCATION_VERIFIER");
        bytes32 extensionId = vm.envBytes32("CONCORD_EXTENSION_ID");

        vm.startBroadcast(owner);
        AccordRegistry registry = new AccordRegistry(owner);
        CapitalFacility facility = new CapitalFacility(
            registry,
            fxrp,
            usdt0,
            verifier,
            extensionId
        );
        registry.setFacility(address(facility));
        vm.stopBroadcast();

        emit ConcordDeployed(address(registry), address(facility), address(0), fxrp, usdt0, extensionId);
    }
}
