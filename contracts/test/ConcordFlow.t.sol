// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {AccordRegistry} from "../AccordRegistry.sol";
import {CapitalFacility} from "../CapitalFacility.sol";
import {ConcordTypes} from "../ConcordTypes.sol";
import {MockERC20} from "./MockERC20.sol";

contract ConcordActor {
    function approve(MockERC20 token, address spender, uint256 amount) external {
        require(token.approve(spender, amount), "approve failed");
    }

    function createRoot(
        CapitalFacility facility,
        bytes32 rootId,
        uint256 target,
        uint64 validUntil,
        bytes32 policyHash
    ) external {
        facility.createRootAccord(rootId, target, validUntil, policyHash);
    }

    function lock(CapitalFacility facility, bytes32 rootId, uint256 amount) external {
        facility.lockCollateral(rootId, amount);
    }

    function open(
        CapitalFacility facility,
        bytes32 rootId,
        bytes32 roundId,
        uint32 maxFeeBps,
        uint64 roundExpiry,
        address[] calldata providers
    ) external {
        facility.openSyndication(rootId, roundId, maxFeeBps, roundExpiry, providers);
    }

    function fund(CapitalFacility facility, bytes32 childId, uint256 amount) external {
        facility.fundChild(childId, amount);
    }

    function draw(CapitalFacility facility, bytes32 drawId, bytes32 rootId, uint256 amount) external {
        facility.draw(drawId, rootId, amount);
    }

    function repay(CapitalFacility facility, bytes32 drawId, uint256 amount) external {
        facility.repay(drawId, amount);
    }

    function closeChild(CapitalFacility facility, bytes32 childId) external {
        facility.closeChild(childId);
    }

    function closeRoot(CapitalFacility facility, bytes32 rootId) external {
        facility.closeRoot(rootId);
    }

    function mark(CapitalFacility facility, bytes32 digest) external {
        facility.markAllocationVerified(digest);
    }

    function materialize(CapitalFacility facility, ConcordTypes.AllocationResult calldata result) external {
        facility.materializeAllocation(result);
    }
}

contract ConcordFlowTest {
    bytes32 private constant EXTENSION_ID = keccak256("CONCORD_FCC_EXTENSION");
    bytes32 private constant ROOT_ID = keccak256("ROOT-01");
    bytes32 private constant ROUND_ID = keccak256("ROUND-01");
    bytes32 private constant ALLOCATION_ID = keccak256("ALLOCATION-01");
    bytes32 private constant DRAW_ID = keccak256("DRAW-01");

    MockERC20 private fxrp;
    MockERC20 private usdt0;
    AccordRegistry private registry;
    CapitalFacility private facility;
    ConcordActor private treasury;
    ConcordActor private providerA;
    ConcordActor private providerB;
    ConcordActor private providerC;

    function setUp() public {
        fxrp = new MockERC20("Flare XRP", "FXRP", 6);
        usdt0 = new MockERC20("Tether USD0", "USDT0", 18);
        registry = new AccordRegistry(address(this));
        treasury = new ConcordActor();
        providerA = new ConcordActor();
        providerB = new ConcordActor();
        providerC = new ConcordActor();
        facility = new CapitalFacility(
            registry,
            address(fxrp),
            address(usdt0),
            address(providerC),
            EXTENSION_ID
        );
        registry.setFacility(address(facility));

        fxrp.mint(address(treasury), 100);
        usdt0.mint(address(providerA), 600);
        usdt0.mint(address(providerB), 400);
        treasury.approve(fxrp, address(facility), type(uint256).max);
        providerA.approve(usdt0, address(facility), type(uint256).max);
        providerB.approve(usdt0, address(facility), type(uint256).max);
    }

    function testFullRelationshipLifecycle() public {
        uint64 expiry = uint64(block.timestamp + 30 days);
        treasury.createRoot(facility, ROOT_ID, 1_000, expiry, keccak256("POLICY"));
        treasury.lock(facility, ROOT_ID, 100);

        address[] memory providers = new address[](3);
        providers[0] = address(providerA);
        providers[1] = address(providerB);
        providers[2] = address(providerC);
        treasury.open(facility, ROOT_ID, ROUND_ID, 700, expiry - 1 days, providers);

        address[] memory selected = new address[](2);
        selected[0] = address(providerA);
        selected[1] = address(providerB);
        uint256[] memory allocations = new uint256[](2);
        allocations[0] = 600;
        allocations[1] = 400;
        uint32[] memory fees = new uint32[](2);
        fees[0] = 610;
        fees[1] = 640;
        bytes32[] memory terms = new bytes32[](2);
        terms[0] = keccak256("A-TERMS");
        terms[1] = keccak256("B-TERMS");

        ConcordTypes.AllocationResult memory result = ConcordTypes.AllocationResult({
            extensionId: EXTENSION_ID,
            roundId: ROUND_ID,
            rootAccordId: ROOT_ID,
            success: true,
            selectedProviders: selected,
            allocatedCapacity: allocations,
            acceptedFeeBps: fees,
            termsCommitments: terms,
            roundExpiry: expiry - 1 days,
            resultDigest: bytes32(0)
        });
        result.resultDigest = allocationDigest(result);

        // Only the configured verifier may authorize materialization.
        providerC.mark(facility, result.resultDigest);
        treasury.materialize(facility, result);

        bytes32 childA = keccak256(abi.encode(ROOT_ID, result.resultDigest, address(providerA)));
        bytes32 childB = keccak256(abi.encode(ROOT_ID, result.resultDigest, address(providerB)));
        require(facility.getChild(childA).state == ConcordTypes.ChildState.SELECTED, "A not selected");
        require(facility.getChild(childB).state == ConcordTypes.ChildState.SELECTED, "B not selected");

        providerA.fund(facility, childA, 600);
        providerB.fund(facility, childB, 400);
        require(facility.getRoot(ROOT_ID).state == ConcordTypes.RootState.ACTIVE, "root not active");
        require(facility.availableCapacity(ROOT_ID) == 1_000, "available mismatch after funding");

        treasury.draw(facility, DRAW_ID, ROOT_ID, 750);
        require(facility.getRoot(ROOT_ID).drawnPrincipal == 750, "root exposure mismatch");
        require(facility.getChild(childA).drawnPrincipal == 600, "A exposure mismatch");
        require(facility.getChild(childB).drawnPrincipal == 150, "B exposure mismatch");
        require(facility.getDrawLegIds(DRAW_ID).length == 2, "draw was not split");

        usdt0.mint(address(treasury), 750);
        treasury.approve(usdt0, address(facility), type(uint256).max);
        treasury.repay(facility, DRAW_ID, 750);
        require(facility.getRoot(ROOT_ID).drawnPrincipal == 0, "root exposure not repaid");
        require(facility.availableCapacity(ROOT_ID) == 1_000, "capacity not restored");

        providerA.closeChild(facility, childA);
        providerB.closeChild(facility, childB);
        treasury.closeRoot(facility, ROOT_ID);
        require(facility.getRoot(ROOT_ID).state == ConcordTypes.RootState.CLOSED, "root not closed");
        require(fxrp.balanceOf(address(treasury)) == 100, "collateral not returned");
    }

    function testUnauthorizedResultAndOverfundingFail() public {
        uint64 expiry = uint64(block.timestamp + 30 days);
        treasury.createRoot(facility, ROOT_ID, 1_000, expiry, keccak256("POLICY"));
        treasury.lock(facility, ROOT_ID, 100);
        address[] memory providers = new address[](1);
        providers[0] = address(providerA);
        treasury.open(facility, ROOT_ID, ROUND_ID, 700, expiry - 1 days, providers);

        address[] memory selected = new address[](1);
        selected[0] = address(providerA);
        uint256[] memory allocations = new uint256[](1);
        allocations[0] = 1_000;
        uint32[] memory fees = new uint32[](1);
        fees[0] = 700;
        bytes32[] memory terms = new bytes32[](1);
        terms[0] = keccak256("A-TERMS");
        ConcordTypes.AllocationResult memory result = ConcordTypes.AllocationResult({
            extensionId: EXTENSION_ID,
            roundId: ROUND_ID,
            rootAccordId: ROOT_ID,
            success: true,
            selectedProviders: selected,
            allocatedCapacity: allocations,
            acceptedFeeBps: fees,
            termsCommitments: terms,
            roundExpiry: expiry - 1 days,
            resultDigest: bytes32(0)
        });
        result.resultDigest = allocationDigest(result);

        (bool unauthorizedOk,) = address(treasury).call(
            abi.encodeWithSelector(ConcordActor.materialize.selector, facility, result)
        );
        require(!unauthorizedOk, "unverified materialization succeeded");

        providerC.mark(facility, result.resultDigest);
        // The provider list is eligible but the allocation is insufficiently
        // funded for the requested target; it remains a selected child.
        treasury.materialize(facility, result);
        bytes32 childA = keccak256(abi.encode(ROOT_ID, result.resultDigest, address(providerA)));
        usdt0.mint(address(providerA), 400);
        providerA.fund(facility, childA, 1_000);
        (bool overfundOk,) = address(providerA).call(
            abi.encodeWithSelector(ConcordActor.fund.selector, facility, childA, 1)
        );
        require(!overfundOk, "overfunding succeeded");
    }

    function allocationDigest(ConcordTypes.AllocationResult memory result) internal pure returns (bytes32) {
        bytes memory encoded = abi.encodePacked(
            result.extensionId,
            result.roundId,
            result.rootAccordId,
            result.success,
            result.roundExpiry
        );
        for (uint256 i; i < result.selectedProviders.length; ++i) {
            encoded = bytes.concat(
                encoded,
                abi.encodePacked(
                    result.selectedProviders[i],
                    result.allocatedCapacity[i],
                    result.acceptedFeeBps[i],
                    result.termsCommitments[i]
                )
            );
        }
        return keccak256(encoded);
    }
}
