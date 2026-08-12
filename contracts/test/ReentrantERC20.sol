// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

interface IReentrantFacility {
    function fundChild(bytes32 childId, uint256 amount) external;
}

/// @notice Test-only ERC-20 that attempts a callback during transferFrom.
/// The callback is swallowed so the outer token transfer can complete; the
/// test can then assert that CapitalFacility's nonReentrant guard blocked it.
contract ReentrantERC20 {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    address public callbackTarget;
    bytes32 public callbackChild;
    bool public callbackEnabled;
    bool public reentryBlocked;

    function mintSelf(uint256 amount) external {
        balanceOf[address(this)] += amount;
    }

    function approveSelf(address spender, uint256 amount) external {
        allowance[address(this)][spender] = amount;
    }

    function configureReentry(address target, bytes32 childId) external {
        callbackTarget = target;
        callbackChild = childId;
        callbackEnabled = true;
        reentryBlocked = false;
    }

    function attackFund(address facility, bytes32 childId, uint256 amount) external {
        IReentrantFacility(facility).fundChild(childId, amount);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _move(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        require(allowed >= amount, "allowance");
        allowance[from][msg.sender] = allowed - amount;

        if (callbackEnabled && msg.sender == callbackTarget) {
            callbackEnabled = false;
            (bool ok,) = callbackTarget.call(
                abi.encodeWithSelector(IReentrantFacility.fundChild.selector, callbackChild, 1)
            );
            reentryBlocked = !ok;
        }

        _move(from, to, amount);
        return true;
    }

    function _move(address from, address to, uint256 amount) internal {
        require(balanceOf[from] >= amount, "balance");
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
    }
}