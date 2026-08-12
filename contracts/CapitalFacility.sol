// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {AccordRegistry} from "./AccordRegistry.sol";
import {ConcordTypes} from "./ConcordTypes.sol";
import {IERC20Minimal} from "./interfaces/IERC20Minimal.sol";

/// @title CapitalFacility
/// @notice The economic lifecycle for one FXRP-backed, USDT0-liquidity
/// syndicated facility. Makkari/CoFill decide an allocation; this contract
/// owns funding, draws, exposure, settlement, and repayment.
contract CapitalFacility {
    uint256 private constant BPS = 10_000;

    address public immutable owner;
    address public immutable allocationVerifier;
    bytes32 public immutable extensionId;
    AccordRegistry public immutable accordRegistry;
    address public immutable collateralAsset;
    address public immutable liquidityAsset;

    struct MakkariRound {
        bytes32 id;
        bytes32 rootAccordId;
        uint256 targetCapacity;
        uint32 maxFeeBps;
        uint64 roundExpiry;
        ConcordTypes.RoundStatus status;
    }

    struct Draw {
        bytes32 id;
        bytes32 rootAccordId;
        uint256 principal;
        uint256 repaidPrincipal;
        uint64 createdAt;
        bool exists;
    }

    struct DrawLeg {
        bytes32 id;
        bytes32 drawId;
        bytes32 childAccordId;
        uint256 principal;
        uint256 repaidPrincipal;
    }

    mapping(bytes32 => ConcordTypes.RootAccord) public rootAccords;
    mapping(bytes32 => ConcordTypes.ChildAccord) public childAccords;
    mapping(bytes32 => MakkariRound) public rounds;
    mapping(bytes32 => Draw) public draws;
    mapping(bytes32 => DrawLeg) public drawLegs;
    mapping(bytes32 => bytes32[]) private childrenByRoot;
    mapping(bytes32 => bytes32[]) private legsByDraw;
    mapping(bytes32 => address[]) private eligibleProvidersByRound;
    mapping(bytes32 => mapping(address => bool)) public eligibleProvider;
    mapping(bytes32 => bool) public verifiedAllocationDigest;
    mapping(bytes32 => bool) public consumedAllocationDigest;

    uint256 private repaymentNonce;

    uint256 private _entered;

    event RootAccordCreated(
        bytes32 indexed rootId,
        address indexed borrower,
        uint256 targetCapacity,
        uint64 validUntil,
        bytes32 policyHash
    );
    event CollateralLocked(bytes32 indexed rootId, address indexed borrower, uint256 amount);
    event SyndicationOpened(
        bytes32 indexed rootId,
        bytes32 indexed roundId,
        uint256 targetCapacity,
        uint32 maxFeeBps,
        uint64 roundExpiry
    );
    event AllocationVerified(bytes32 indexed resultDigest);
    event ChildAccordSelected(
        bytes32 indexed childId,
        bytes32 indexed rootId,
        address indexed provider,
        uint256 selectedCapacity,
        uint32 feeBps
    );
    event ChildAccordFunded(bytes32 indexed childId, address indexed provider, uint256 amount);
    event RootActivated(bytes32 indexed rootId, uint256 committedCapacity);
    event DrawCreated(bytes32 indexed drawId, bytes32 indexed rootId, uint256 principal);
    event DrawLegCreated(
        bytes32 indexed legId,
        bytes32 indexed drawId,
        bytes32 indexed childId,
        uint256 principal
    );
    event Settlement(
        bytes32 indexed settlementId,
        bytes32 indexed parentId,
        address indexed asset,
        address from,
        address to,
        uint256 principal
    );
    event Repayment(bytes32 indexed repaymentId, bytes32 indexed drawId, uint256 principal);
    event ChildClosed(bytes32 indexed childId, address indexed provider, uint256 returnedAmount);
    event RootClosed(bytes32 indexed rootId, uint256 collateralReturned);
    event RootExpired(bytes32 indexed rootId);
    event ChildExpired(bytes32 indexed childId, uint256 returnedAmount);

    error Unauthorized();
    error InvalidState();
    error InvalidAmount();
    error InvalidExpiry();
    error InvalidAllocation();
    error AllocationNotVerified();
    error AllocationAlreadyConsumed();
    error InsufficientCapacity();
    error UnknownAccord();
    error TransferFailed();
    error Reentrancy();

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier nonReentrant() {
        if (_entered == 1) revert Reentrancy();
        _entered = 1;
        _;
        _entered = 0;
    }

    constructor(
        AccordRegistry registry_,
        address collateralAsset_,
        address liquidityAsset_,
        address allocationVerifier_,
        bytes32 extensionId_
    ) {
        require(address(registry_) != address(0), "registry is zero");
        require(collateralAsset_ != address(0), "collateral asset is zero");
        require(liquidityAsset_ != address(0), "liquidity asset is zero");
        require(allocationVerifier_ != address(0), "verifier is zero");
        require(extensionId_ != bytes32(0), "extension id is zero");
        owner = msg.sender;
        accordRegistry = registry_;
        collateralAsset = collateralAsset_;
        liquidityAsset = liquidityAsset_;
        allocationVerifier = allocationVerifier_;
        extensionId = extensionId_;
    }

    function createRootAccord(
        bytes32 rootId,
        uint256 targetCapacity,
        uint64 validUntil,
        bytes32 policyHash
    ) external {
        if (rootId == bytes32(0) || targetCapacity == 0) revert InvalidAmount();
        if (validUntil <= block.timestamp) revert InvalidExpiry();
        if (rootAccords[rootId].state != ConcordTypes.RootState.NONE) revert InvalidState();

        rootAccords[rootId] = ConcordTypes.RootAccord({
            id: rootId,
            borrower: msg.sender,
            collateralAsset: collateralAsset,
            liquidityAsset: liquidityAsset,
            targetCapacity: targetCapacity,
            committedCapacity: 0,
            drawnPrincipal: 0,
            collateralLocked: 0,
            validUntil: validUntil,
            policyHash: policyHash,
            syndicationRoundId: bytes32(0),
            state: ConcordTypes.RootState.PROPOSED
        });
        accordRegistry.registerNode(rootId, bytes32(0), AccordRegistry.NodeKind.ROOT_ACCORD);
        emit RootAccordCreated(rootId, msg.sender, targetCapacity, validUntil, policyHash);
    }

    function lockCollateral(bytes32 rootId, uint256 amount) external nonReentrant {
        ConcordTypes.RootAccord storage root = _root(rootId);
        if (msg.sender != root.borrower) revert Unauthorized();
        if (root.state != ConcordTypes.RootState.PROPOSED || amount == 0) revert InvalidState();
        _safeTransferFrom(collateralAsset, msg.sender, address(this), amount);
        root.collateralLocked += amount;
        emit CollateralLocked(rootId, msg.sender, amount);
    }

    function openSyndication(
        bytes32 rootId,
        bytes32 roundId,
        uint32 maxFeeBps,
        uint64 roundExpiry,
        address[] calldata eligibleProviders
    ) external {
        ConcordTypes.RootAccord storage root = _root(rootId);
        if (msg.sender != root.borrower) revert Unauthorized();
        if (root.state != ConcordTypes.RootState.PROPOSED || root.collateralLocked == 0) {
            revert InvalidState();
        }
        if (roundId == bytes32(0) || rounds[roundId].status != ConcordTypes.RoundStatus.NONE) {
            revert InvalidAllocation();
        }
        if (maxFeeBps > BPS || roundExpiry <= block.timestamp || roundExpiry > root.validUntil) {
            revert InvalidExpiry();
        }
        if (eligibleProviders.length == 0) revert InvalidAllocation();

        rounds[roundId] = MakkariRound({
            id: roundId,
            rootAccordId: rootId,
            targetCapacity: root.targetCapacity,
            maxFeeBps: maxFeeBps,
            roundExpiry: roundExpiry,
            status: ConcordTypes.RoundStatus.OPEN
        });
        root.syndicationRoundId = roundId;
        root.state = ConcordTypes.RootState.SYNDICATING;

        for (uint256 i; i < eligibleProviders.length; ++i) {
            address provider = eligibleProviders[i];
            if (provider == address(0) || eligibleProvider[roundId][provider]) revert InvalidAllocation();
            eligibleProvider[roundId][provider] = true;
            eligibleProvidersByRound[roundId].push(provider);
        }

        accordRegistry.registerNode(roundId, rootId, AccordRegistry.NodeKind.MAKKARI_SESSION);
        emit SyndicationOpened(rootId, roundId, root.targetCapacity, maxFeeBps, roundExpiry);
    }

    /// @notice Called only by the configured result verifier after it has
    /// checked the FCC response and its active machine/signature binding.
    function markAllocationVerified(bytes32 resultDigest) external {
        // The explicit verifier boundary is kept as a separate immutable
        // address so an owner key cannot silently impersonate the FCC path.
        if (msg.sender != allocationVerifier) revert Unauthorized();
        if (resultDigest == bytes32(0)) revert InvalidAllocation();
        verifiedAllocationDigest[resultDigest] = true;
        emit AllocationVerified(resultDigest);
    }

    function materializeAllocation(ConcordTypes.AllocationResult calldata result) external {
        ConcordTypes.RootAccord storage root = _root(result.rootAccordId);
        MakkariRound storage round = rounds[result.roundId];

        // The verifier authorizes the digest; the treasury still controls
        // when its root relationship materializes those selected children.
        if (msg.sender != root.borrower) revert Unauthorized();

        if (result.extensionId != extensionId || result.rootAccordId != round.rootAccordId) {
            revert InvalidAllocation();
        }
        if (root.state != ConcordTypes.RootState.SYNDICATING || round.status != ConcordTypes.RoundStatus.OPEN) {
            revert InvalidState();
        }
        if (block.timestamp > round.roundExpiry || result.roundExpiry != round.roundExpiry) revert InvalidExpiry();
        if (!result.success) revert InvalidAllocation();
        if (!verifiedAllocationDigest[result.resultDigest]) revert AllocationNotVerified();
        if (consumedAllocationDigest[result.resultDigest]) revert AllocationAlreadyConsumed();
        if (_allocationDigest(result) != result.resultDigest) revert InvalidAllocation();

        uint256 length = result.selectedProviders.length;
        if (length == 0 || result.allocatedCapacity.length != length || result.acceptedFeeBps.length != length) {
            revert InvalidAllocation();
        }
        if (result.termsCommitments.length != length) revert InvalidAllocation();

        uint256 total;
        for (uint256 i; i < length; ++i) {
            address provider = result.selectedProviders[i];
            if (!eligibleProvider[result.roundId][provider] || result.allocatedCapacity[i] == 0) {
                revert InvalidAllocation();
            }
            if (result.acceptedFeeBps[i] > round.maxFeeBps) revert InvalidAllocation();
            for (uint256 j; j < i; ++j) {
                if (result.selectedProviders[j] == provider) revert InvalidAllocation();
            }
            total += result.allocatedCapacity[i];
        }
        if (total != root.targetCapacity) revert InsufficientCapacity();

        consumedAllocationDigest[result.resultDigest] = true;
        round.status = ConcordTypes.RoundStatus.FINALIZED;
        root.state = ConcordTypes.RootState.FUNDING;
        accordRegistry.registerNode(
            result.resultDigest,
            result.roundId,
            AccordRegistry.NodeKind.COFILL_ALLOCATION
        );

        for (uint256 i; i < length; ++i) {
            bytes32 childId = keccak256(abi.encode(result.rootAccordId, result.resultDigest, result.selectedProviders[i]));
            childAccords[childId] = ConcordTypes.ChildAccord({
                id: childId,
                rootId: result.rootAccordId,
                allocationId: result.resultDigest,
                provider: result.selectedProviders[i],
                selectedCapacity: result.allocatedCapacity[i],
                committedCapacity: 0,
                drawnPrincipal: 0,
                feeBps: result.acceptedFeeBps[i],
                validUntil: result.roundExpiry,
                termsCommitment: result.termsCommitments[i],
                state: ConcordTypes.ChildState.SELECTED
            });
            childrenByRoot[result.rootAccordId].push(childId);
            accordRegistry.registerNode(childId, result.resultDigest, AccordRegistry.NodeKind.CHILD_ACCORD);
            emit ChildAccordSelected(
                childId,
                result.rootAccordId,
                result.selectedProviders[i],
                result.allocatedCapacity[i],
                result.acceptedFeeBps[i]
            );
        }
    }

    function fundChild(bytes32 childId, uint256 amount) external nonReentrant {
        ConcordTypes.ChildAccord storage child = _child(childId);
        ConcordTypes.RootAccord storage root = _root(child.rootId);
        if (msg.sender != child.provider) revert Unauthorized();
        if (
            (child.state != ConcordTypes.ChildState.SELECTED && child.state != ConcordTypes.ChildState.FUNDED) ||
            amount == 0
        ) revert InvalidState();
        if (root.state != ConcordTypes.RootState.FUNDING) revert InvalidState();
        if (child.committedCapacity + amount > child.selectedCapacity) revert InsufficientCapacity();

        _safeTransferFrom(liquidityAsset, msg.sender, address(this), amount);
        child.committedCapacity += amount;
        root.committedCapacity += amount;
        // Any successful USDT0 transfer makes the relationship funded. The
        // provider may finish a selected allocation in more than one transfer,
        // but selected capacity is never counted as committed before transfer.
        child.state = ConcordTypes.ChildState.FUNDED;
        emit ChildAccordFunded(childId, msg.sender, amount);

        if (root.committedCapacity == root.targetCapacity) {
            root.state = ConcordTypes.RootState.ACTIVE;
            bytes32[] storage childIds = childrenByRoot[root.id];
            for (uint256 i; i < childIds.length; ++i) {
                if (childAccords[childIds[i]].state == ConcordTypes.ChildState.FUNDED) {
                    childAccords[childIds[i]].state = ConcordTypes.ChildState.ACTIVE;
                }
            }
            emit RootActivated(root.id, root.committedCapacity);
        }
    }

    function draw(bytes32 drawId, bytes32 rootId, uint256 amount) external nonReentrant {
        ConcordTypes.RootAccord storage root = _root(rootId);
        if (msg.sender != root.borrower) revert Unauthorized();
        if (root.state != ConcordTypes.RootState.ACTIVE || amount == 0) revert InvalidState();
        if (drawId == bytes32(0) || draws[drawId].exists) revert InvalidAllocation();
        if (amount > availableCapacity(rootId)) revert InsufficientCapacity();

        bytes32[] storage childIds = childrenByRoot[rootId];
        bytes32[] memory selectedChildren = new bytes32[](childIds.length);
        uint256[] memory selectedAmounts = new uint256[](childIds.length);
        uint256 selectedCount;
        uint256 remaining = amount;
        for (uint256 i; i < childIds.length && remaining > 0; ++i) {
            ConcordTypes.ChildAccord storage child = childAccords[childIds[i]];
            if (child.state != ConcordTypes.ChildState.ACTIVE) continue;
            uint256 available = child.committedCapacity - child.drawnPrincipal;
            if (available == 0) continue;
            uint256 legAmount = available < remaining ? available : remaining;
            selectedChildren[selectedCount] = childIds[i];
            selectedAmounts[selectedCount] = legAmount;
            ++selectedCount;
            remaining -= legAmount;
        }
        if (remaining != 0) revert InsufficientCapacity();

        _safeTransfer(liquidityAsset, root.borrower, amount);
        draws[drawId] = Draw({
            id: drawId,
            rootAccordId: rootId,
            principal: amount,
            repaidPrincipal: 0,
            createdAt: uint64(block.timestamp),
            exists: true
        });
        root.drawnPrincipal += amount;
        accordRegistry.registerNode(drawId, rootId, AccordRegistry.NodeKind.DRAW);
        emit DrawCreated(drawId, rootId, amount);

        for (uint256 i; i < selectedCount; ++i) {
            bytes32 childId = selectedChildren[i];
            bytes32 legId = keccak256(abi.encode(drawId, childId));
            DrawLeg memory leg = DrawLeg({
                id: legId,
                drawId: drawId,
                childAccordId: childId,
                principal: selectedAmounts[i],
                repaidPrincipal: 0
            });
            drawLegs[legId] = leg;
            legsByDraw[drawId].push(legId);
            childAccords[childId].drawnPrincipal += selectedAmounts[i];
            accordRegistry.registerNode(legId, drawId, AccordRegistry.NodeKind.DRAW_LEG);
            emit DrawLegCreated(legId, drawId, childId, selectedAmounts[i]);
        }

        bytes32 settlementId = keccak256(abi.encode("DRAW_SETTLEMENT", drawId));
        accordRegistry.registerSettlement(
            settlementId,
            drawId,
            liquidityAsset,
            address(this),
            root.borrower,
            amount
        );
        emit Settlement(settlementId, drawId, liquidityAsset, address(this), root.borrower, amount);
    }

    function repay(bytes32 drawId, uint256 amount) external nonReentrant {
        Draw storage drawState = draws[drawId];
        if (!drawState.exists || amount == 0) revert InvalidAmount();
        ConcordTypes.RootAccord storage root = _root(drawState.rootAccordId);
        if (msg.sender != root.borrower) revert Unauthorized();
        uint256 outstanding = drawState.principal - drawState.repaidPrincipal;
        if (amount > outstanding) revert InvalidAmount();

        _safeTransferFrom(liquidityAsset, msg.sender, address(this), amount);
        drawState.repaidPrincipal += amount;
        root.drawnPrincipal -= amount;

        uint256 remaining = amount;
        bytes32[] storage legIds = legsByDraw[drawId];
        for (uint256 i; i < legIds.length && remaining > 0; ++i) {
            DrawLeg storage leg = drawLegs[legIds[i]];
            uint256 legOutstanding = leg.principal - leg.repaidPrincipal;
            if (legOutstanding == 0) continue;
            uint256 legRepayment = legOutstanding < remaining ? legOutstanding : remaining;
            leg.repaidPrincipal += legRepayment;
            childAccords[leg.childAccordId].drawnPrincipal -= legRepayment;
            remaining -= legRepayment;
        }
        if (remaining != 0) revert InvalidAmount();

        bytes32 repaymentId = keccak256(abi.encode(drawId, amount, repaymentNonce++));
        accordRegistry.registerRepayment(repaymentId, drawId, amount);
        emit Repayment(repaymentId, drawId, amount);

        bytes32 settlementId = keccak256(abi.encode("REPAYMENT_SETTLEMENT", repaymentId));
        accordRegistry.registerSettlement(
            settlementId,
            repaymentId,
            liquidityAsset,
            root.borrower,
            address(this),
            amount
        );
        emit Settlement(settlementId, repaymentId, liquidityAsset, root.borrower, address(this), amount);
    }

    function closeChild(bytes32 childId) external nonReentrant {
        ConcordTypes.ChildAccord storage child = _child(childId);
        ConcordTypes.RootAccord storage root = _root(child.rootId);
        if (msg.sender != child.provider) revert Unauthorized();
        if (
            child.state != ConcordTypes.ChildState.ACTIVE &&
            child.state != ConcordTypes.ChildState.FUNDED &&
            child.state != ConcordTypes.ChildState.SELECTED
        ) revert InvalidState();
        if (child.drawnPrincipal != 0) revert InvalidState();

        uint256 returned = child.committedCapacity;
        if (returned != 0) {
            root.committedCapacity -= returned;
            child.committedCapacity = 0;
            _safeTransfer(liquidityAsset, child.provider, returned);
        }
        child.state = ConcordTypes.ChildState.CLOSED;
        if (root.state == ConcordTypes.RootState.ACTIVE && root.committedCapacity < root.targetCapacity) {
            root.state = ConcordTypes.RootState.FUNDING;
        }
        emit ChildClosed(childId, child.provider, returned);
    }

    function expireChild(bytes32 childId) external nonReentrant {
        ConcordTypes.ChildAccord storage child = _child(childId);
        ConcordTypes.RootAccord storage root = _root(child.rootId);
        if (block.timestamp <= child.validUntil || child.drawnPrincipal != 0) revert InvalidState();
        if (
            child.state != ConcordTypes.ChildState.SELECTED &&
            child.state != ConcordTypes.ChildState.FUNDED &&
            child.state != ConcordTypes.ChildState.ACTIVE
        ) revert InvalidState();

        uint256 returned = child.committedCapacity;
        if (returned != 0) {
            root.committedCapacity -= returned;
            child.committedCapacity = 0;
            _safeTransfer(liquidityAsset, child.provider, returned);
        }
        child.state = ConcordTypes.ChildState.EXPIRED;
        // An expired child can reduce an already active root below target.
        // Preserve the root state invariant so no draw can proceed against
        // a facility that is no longer fully funded.
        if (
            root.state == ConcordTypes.RootState.ACTIVE &&
            root.committedCapacity < root.targetCapacity
        ) {
            root.state = ConcordTypes.RootState.FUNDING;
        }
        emit ChildExpired(childId, returned);
    }

    function closeRoot(bytes32 rootId) external nonReentrant {
        ConcordTypes.RootAccord storage root = _root(rootId);
        if (msg.sender != root.borrower) revert Unauthorized();
        if (root.drawnPrincipal != 0 || root.committedCapacity != 0) revert InvalidState();
        bytes32[] storage childIds = childrenByRoot[rootId];
        for (uint256 i; i < childIds.length; ++i) {
            ConcordTypes.ChildState state = childAccords[childIds[i]].state;
            if (state != ConcordTypes.ChildState.CLOSED && state != ConcordTypes.ChildState.EXPIRED) {
                revert InvalidState();
            }
        }
        if (root.collateralLocked == 0) revert InvalidState();
        uint256 returnedCollateral = root.collateralLocked;
        root.collateralLocked = 0;
        root.state = ConcordTypes.RootState.CLOSED;
        _safeTransfer(collateralAsset, root.borrower, returnedCollateral);
        emit RootClosed(rootId, returnedCollateral);
    }

    function expireRoot(bytes32 rootId) external nonReentrant {
        ConcordTypes.RootAccord storage root = _root(rootId);
        if (block.timestamp <= root.validUntil || root.drawnPrincipal != 0 || root.committedCapacity != 0) {
            revert InvalidState();
        }
        if (root.collateralLocked == 0) revert InvalidState();
        uint256 returnedCollateral = root.collateralLocked;
        root.collateralLocked = 0;
        root.state = ConcordTypes.RootState.EXPIRED;
        _safeTransfer(collateralAsset, root.borrower, returnedCollateral);
        emit RootExpired(rootId);
    }

    function availableCapacity(bytes32 rootId) public view returns (uint256) {
        ConcordTypes.RootAccord storage root = _root(rootId);
        return root.committedCapacity - root.drawnPrincipal;
    }

    function childAvailableCapacity(bytes32 childId) public view returns (uint256) {
        ConcordTypes.ChildAccord storage child = _child(childId);
        return child.committedCapacity - child.drawnPrincipal;
    }

    function getRoot(bytes32 rootId) external view returns (ConcordTypes.RootAccord memory) {
        return _root(rootId);
    }

    function getChild(bytes32 childId) external view returns (ConcordTypes.ChildAccord memory) {
        return _child(childId);
    }

    function getChildIds(bytes32 rootId) external view returns (bytes32[] memory) {
        return childrenByRoot[rootId];
    }

    function getEligibleProviders(bytes32 roundId) external view returns (address[] memory) {
        return eligibleProvidersByRound[roundId];
    }

    function getDrawLegIds(bytes32 drawId) external view returns (bytes32[] memory) {
        return legsByDraw[drawId];
    }

    function _root(bytes32 rootId) internal view returns (ConcordTypes.RootAccord storage root) {
        root = rootAccords[rootId];
        if (root.state == ConcordTypes.RootState.NONE) revert UnknownAccord();
    }

    function _child(bytes32 childId) internal view returns (ConcordTypes.ChildAccord storage child) {
        child = childAccords[childId];
        if (child.state == ConcordTypes.ChildState.NONE) revert UnknownAccord();
    }

    function _allocationDigest(ConcordTypes.AllocationResult calldata result) internal pure returns (bytes32) {
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

    function _safeTransferFrom(address token, address from, address to, uint256 amount) internal {
        (bool ok, bytes memory data) = token.call(
            abi.encodeWithSelector(IERC20Minimal.transferFrom.selector, from, to, amount)
        );
        if (!ok || (data.length != 0 && !abi.decode(data, (bool)))) revert TransferFailed();
    }

    function _safeTransfer(address token, address to, uint256 amount) internal {
        (bool ok, bytes memory data) = token.call(abi.encodeWithSelector(IERC20Minimal.transfer.selector, to, amount));
        if (!ok || (data.length != 0 && !abi.decode(data, (bool)))) revert TransferFailed();
    }
}
