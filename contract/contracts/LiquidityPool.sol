// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract LiquidityPool {
    IERC20 public token;

    uint256 public totalLiquidity;
    mapping(address => uint256) public liquidity;

    event LiquidityAdded(address indexed provider, uint256 tokenAmount, uint256 ethAmount);
    event LiquidityRemoved(address indexed provider, uint256 tokenAmount, uint256 ethAmount);
    event Swapped(address indexed user, uint256 tokenAmount, uint256 ethAmount);

    constructor(address _token) {
        token = IERC20(_token);
    }

    function addLiquidity(uint256 tokenAmount) external payable {
        require(msg.value > 0, "Must send ETH");
        require(token.transferFrom(msg.sender, address(this), tokenAmount), "Token transfer failed");

        totalLiquidity += tokenAmount;
        liquidity[msg.sender] += tokenAmount;

        emit LiquidityAdded(msg.sender, tokenAmount, msg.value);
    }

    function removeLiquidity(uint256 amount) external {
        require(liquidity[msg.sender] >= amount, "Not enough liquidity");

        uint256 ethAmount = getSwapRate(amount);
        require(address(this).balance >= ethAmount, "Not enough ETH in pool");

        liquidity[msg.sender] -= amount;
        totalLiquidity -= amount;

        require(token.transfer(msg.sender, amount), "Token transfer failed");
        payable(msg.sender).transfer(ethAmount);

        emit LiquidityRemoved(msg.sender, amount, ethAmount);
    }

    function swap(uint256 tokenAmount) external {
        uint256 ethAmount = getSwapRate(tokenAmount);
        require(address(this).balance >= ethAmount, "Not enough ETH in pool");

        require(token.transferFrom(msg.sender, address(this), tokenAmount), "Token transfer failed");
        payable(msg.sender).transfer(ethAmount);

        emit Swapped(msg.sender, tokenAmount, ethAmount);
    }

    function swapEthForTokens() external payable {
        require(msg.value > 0, "Must send ETH");

        uint256 tokenAmount = getTokenSwapRate(msg.value);
        require(token.balanceOf(address(this)) >= tokenAmount, "Not enough tokens in pool");

        require(token.transfer(msg.sender, tokenAmount), "Token transfer failed");

        emit Swapped(msg.sender, tokenAmount, msg.value);
    }

    function getTokenSwapRate(uint256 ethAmount) public view returns (uint256) {
        return (ethAmount * token.balanceOf(address(this))) / address(this).balance;
    }

    function getSwapRate(uint256 tokenAmount) public view returns (uint256) {
        return (tokenAmount * address(this).balance) / token.balanceOf(address(this));
    }

    receive() external payable {}
}
