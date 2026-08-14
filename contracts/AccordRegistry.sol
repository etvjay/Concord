// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

/// @title AccordRegistry
/// @notice Stores Concord relationship identity and explicit parent-child
/// lineage. Economic state remains in CapitalFacility; this registry answers
/// which relationship authorized each derived action.
contract AccordRegistry {
    enum NodeKind {
        ROOT_ACCORD,
        MAKKARI_SESSION,
        COFILL_ALLOCATION,
        CHILD_ACCORD,
        DRAW,
        DRAW_LEG,
        SETTLEMENT,
        REPAYMENT
    }

    struct LineageNode {
        bytes32 id;
        bytes32 parentId;
        NodeKind kind;
        uint64 createdAt;
        bool exists;
    }

    struct SettlementRecord {
        bytes32 id;
        bytes32 parentId;
        address asset;
        address from;
        address to;
        uint256 principal;
        uint64 createdAt;
    }

    struct RepaymentRecord {
        bytes32 id;
        bytes32 drawId;
        uint256 principal;
        uint64 createdAt;
    }

    address public immutable admin;
    address public facility;

    mapping(bytes32 => LineageNode) public nodes;
    mapping(bytes32 => bytes32[]) private childrenByParent;
    mapping(bytes32 => SettlementRecord) public settlements;
    mapping(bytes32 => RepaymentRecord) public repayments;

    event FacilitySet(address indexed facility);
    event LineageRegistered(bytes32 indexed id, bytes32 indexed parentId, NodeKind kind);
    event SettlementRegistered(
        bytes32 indexed id,
        bytes32 indexed parentId,
        address indexed asset,
        address from,
        address to,
        uint256 principal
    );
    event RepaymentRegistered(bytes32 indexed id, bytes32 indexed drawId, uint256 principal);

    error Unauthorized();
    error AlreadyInitialized();
    error InvalidLineage();
    error DuplicateNode();

    constructor(address admin_) {
        require(admin_ != address(0), "admin is zero");
        admin = admin_;
    }

    modifier onlyFacility() {
        if (msg.sender != facility) revert Unauthorized();
        _;
    }

    function setFacility(address facility_) external {
        if (msg.sender != admin) revert Unauthorized();
        if (facility != address(0)) revert AlreadyInitialized();
        require(facility_ != address(0), "facility is zero");
        facility = facility_;
        emit FacilitySet(facility_);
    }

    function registerNode(bytes32 id, bytes32 parentId, NodeKind kind) public onlyFacility {
        if (id == bytes32(0)) revert InvalidLineage();
        if (nodes[id].exists) revert DuplicateNode();
        if (kind != NodeKind.ROOT_ACCORD && !nodes[parentId].exists) revert InvalidLineage();

        nodes[id] = LineageNode({
            id: id,
            parentId: parentId,
            kind: kind,
            createdAt: uint64(block.timestamp),
            exists: true
        });
        childrenByParent[parentId].push(id);
        emit LineageRegistered(id, parentId, kind);
    }

    function registerSettlement(
        bytes32 id,
        bytes32 parentId,
        address asset,
        address from,
        address to,
        uint256 principal
    ) external onlyFacility {
        registerNode(id, parentId, NodeKind.SETTLEMENT);
        settlements[id] = SettlementRecord({
            id: id,
            parentId: parentId,
            asset: asset,
            from: from,
            to: to,
            principal: principal,
            createdAt: uint64(block.timestamp)
        });
        emit SettlementRegistered(id, parentId, asset, from, to, principal);
    }

    function registerRepayment(bytes32 id, bytes32 drawId, uint256 principal) external onlyFacility {
        registerNode(id, drawId, NodeKind.REPAYMENT);
        repayments[id] = RepaymentRecord({
            id: id,
            drawId: drawId,
            principal: principal,
            createdAt: uint64(block.timestamp)
        });
        emit RepaymentRegistered(id, drawId, principal);
    }

    function getChildren(bytes32 parentId) external view returns (bytes32[] memory) {
        return childrenByParent[parentId];
    }

    function hasNode(bytes32 id) external view returns (bool) {
        return nodes[id].exists;
    }
}
