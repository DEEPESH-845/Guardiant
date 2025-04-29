// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {CustomToken} from "./CustomToken.sol";

contract TokenFactory {
    event TokenCreated(address tokenAddress, string name, string symbol, uint256 initialSupply, address creator);

    function createToken(string memory name, string memory symbol, uint256 initialSupply) external {
        CustomToken newToken = new CustomToken(name, symbol, initialSupply, msg.sender);
        emit TokenCreated(address(newToken), name, symbol, initialSupply, msg.sender);
    }
}
