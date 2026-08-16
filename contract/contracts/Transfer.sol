// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract TransferTo {
    using SafeERC20 for IERC20;

    /// Pull `amount` from the caller and forward it to `recipient`.
    ///
    /// Uses SafeERC20 because `require(token.transferFrom(...))` reverts against
    /// non-standard ERC-20s that return no value at all (USDT being the common
    /// one) — the call succeeds on-chain but decodes as a missing bool.
    /// The pre-flight `balanceOf` check is gone: it duplicated what
    /// `transferFrom` already enforces, while ignoring the allowance, so it
    /// produced a misleading error for the case that actually fails in practice.
    function sendToken(address tokenAddress, address recipient, uint256 amount) external {
        require(recipient != address(0), "Cannot transfer to zero address");
        IERC20(tokenAddress).safeTransferFrom(msg.sender, recipient, amount);
    }
}
