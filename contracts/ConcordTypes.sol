// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

/// @title ConcordTypes
/// @notice Shared value types for Concord's relationship and facility layers.
///
/// The transaction is not Concord's canonical object. A RootAccord is. Child
/// Accords, rounds, draws, legs, and settlements are bounded by that root.
library ConcordTypes {
    enum RootState {
        NONE,
        PROPOSED,
        SYNDICATING,
        FUNDING,
        ACTIVE,
        CLOSED,
        FROZEN,
        EXPIRED
    }

    enum ChildState {
        NONE,
        SELECTED,
        FUNDED,
        ACTIVE,
        CLOSED,
        EXPIRED,
        DEFAULTED
    }

    enum RoundStatus {
        NONE,
        OPEN,
        FINALIZED,
        EXPIRED
    }

    struct RootAccord {
        bytes32 id;
        address borrower;
        address collateralAsset;
        address liquidityAsset;
        uint256 targetCapacity;
        uint256 committedCapacity;
        uint256 drawnPrincipal;
        uint256 collateralLocked;
        uint64 validUntil;
        bytes32 policyHash;
        bytes32 syndicationRoundId;
        RootState state;
    }

    struct ChildAccord {
        bytes32 id;
        bytes32 rootId;
        bytes32 allocationId;
        address provider;
        uint256 selectedCapacity;
        uint256 committedCapacity;
        uint256 drawnPrincipal;
        uint32 feeBps;
        uint64 validUntil;
        bytes32 termsCommitment;
        ChildState state;
    }

    /// @dev This is the verified boundary between FCC and materialization.
    /// `resultDigest` commits to every field in this struct using the canonical
    /// packed encoding implemented by CapitalFacility._allocationDigest().
    struct AllocationResult {
        bytes32 extensionId;
        bytes32 roundId;
        bytes32 rootAccordId;
        bool success;
        address[] selectedProviders;
        uint256[] allocatedCapacity;
        uint32[] acceptedFeeBps;
        bytes32[] termsCommitments;
        uint64 roundExpiry;
        bytes32 resultDigest;
    }
}
