// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract TransferTo {
    function sendToken(address tokenAddress, address recipient, uint256 amount) external {
        IERC20 token = IERC20(tokenAddress);

        uint256 senderBalance = token.balanceOf(msg.sender);
        require(senderBalance >= amount, "Insufficient token balance");

        require(token.transferFrom(msg.sender, recipient, amount), "Transfer failed");
    }
}
