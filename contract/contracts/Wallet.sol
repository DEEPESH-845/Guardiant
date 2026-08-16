// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @notice Custodial ledger for ERC-20 balances held by this contract.
///
/// `addToken` previously credited `tokenBalances[msg.sender][token] += amount`
/// without moving any tokens, so any caller could mint themselves an arbitrary
/// balance and then `transferToken` it to someone else. `removeToken` likewise
/// decremented the ledger without paying anything out. The ledger is now backed
/// by real custody: deposits pull tokens in, withdrawals send them back.
contract Wallet is ReentrancyGuard {
    using SafeERC20 for IERC20;

    mapping(address => address[]) private userTokens;
    /// Tracked separately so membership is O(1) instead of a linear scan, and so
    /// repeated deposits cannot push duplicates into the array without bound.
    mapping(address => mapping(address => bool)) public tokenTracked;

    mapping(address => mapping(address => uint256)) public tokenBalances;

    event Deposited(address indexed user, address indexed token, uint256 amount);
    event Withdrawn(address indexed user, address indexed token, uint256 amount);
    event InternalTransfer(address indexed from, address indexed to, address indexed token, uint256 amount);

    /// Deposit `amount` of `token` into the caller's balance. Requires the caller
    /// to have approved this contract first.
    function addToken(address token, uint256 amount) external nonReentrant {
        require(token != address(0), "Token is zero address");
        require(amount > 0, "Zero amount");

        // Credit what actually arrived, so a fee-on-transfer token cannot credit
        // more than the contract received.
        uint256 balanceBefore = IERC20(token).balanceOf(address(this));
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        uint256 received = IERC20(token).balanceOf(address(this)) - balanceBefore;
        require(received > 0, "No tokens received");

        _track(msg.sender, token);
        tokenBalances[msg.sender][token] += received;

        emit Deposited(msg.sender, token, received);
    }

    /// Withdraw `amount` of `token` from the caller's balance to their wallet.
    function removeToken(address token, uint256 amount) external nonReentrant {
        require(tokenBalances[msg.sender][token] >= amount, "Insufficient balance");

        tokenBalances[msg.sender][token] -= amount;
        IERC20(token).safeTransfer(msg.sender, amount);

        emit Withdrawn(msg.sender, token, amount);
    }

    function getTokenBalance(address token) external view returns (uint256) {
        return tokenBalances[msg.sender][token];
    }

    function getUserTokens() external view returns (address[] memory) {
        return userTokens[msg.sender];
    }

    /// Move a balance between users inside the ledger. No tokens leave the
    /// contract, so there is no external call and no reentrancy surface.
    function transferToken(address token, address to, uint256 amount) external {
        require(to != address(0), "Cannot transfer to zero address");
        require(tokenBalances[msg.sender][token] >= amount, "Insufficient balance");

        tokenBalances[msg.sender][token] -= amount;
        _track(to, token);
        tokenBalances[to][token] += amount;

        emit InternalTransfer(msg.sender, to, token, amount);
    }

    function _track(address user, address token) private {
        if (!tokenTracked[user][token]) {
            tokenTracked[user][token] = true;
            userTokens[user].push(token);
        }
    }
}
