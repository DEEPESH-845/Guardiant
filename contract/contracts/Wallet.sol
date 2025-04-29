// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Wallet {
    mapping(address => address[]) public userTokens;

    mapping(address => mapping(address => uint256)) public tokenBalances;

    function addToken(address token, uint256 amount) external {
        userTokens[msg.sender].push(token);
        tokenBalances[msg.sender][token] += amount;
    }

    function removeToken(address token, uint256 amount) external {
        require(tokenBalances[msg.sender][token] >= amount, "Insufficient balance");
        tokenBalances[msg.sender][token] -= amount;
    }

    function getTokenBalance(address token) external view returns (uint256) {
        return tokenBalances[msg.sender][token];
    }

    function getUserTokens() external view returns (address[] memory) {
        return userTokens[msg.sender];
    }

    function transferToken(address token, address to, uint256 amount) external {
        require(tokenBalances[msg.sender][token] >= amount, "Insufficient balance");
        require(to != address(0), "Cannot transfer to zero address");
        
        tokenBalances[msg.sender][token] -= amount;
        
        // Add token to recipient's list if it doesn't exist
        bool tokenExists = false;
        for (uint i = 0; i < userTokens[to].length; i++) {
            if (userTokens[to][i] == token) {
                tokenExists = true;
                break;
            }
        }
        
        if (!tokenExists) {
            userTokens[to].push(token);
        }
        
        tokenBalances[to][token] += amount;
    }
}
