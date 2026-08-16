// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface ILiquidityPool {
    function swap(uint256 tokenAmount, uint256 minEthOut) external returns (uint256);
    function swapEthForTokens(uint256 minTokensOut) external payable returns (uint256);
}

/// @notice Holds funds under a "get me out" emergency exit.
///
/// The exit previously called the pool's linear-priced `swap`, which reverted
/// whenever the guard's token balance was large relative to the pool — so the
/// escape hatch failed in exactly the situation it exists for. It also paid out
/// with `.transfer()`, whose 2300 gas stipend reverts for most smart-contract
/// wallets, which would have locked the funds permanently.
///
/// The exit is now unblockable: a failing swap degrades to sending the tokens
/// themselves to the owner rather than reverting the whole withdrawal.
contract AnomalyGuardWallet is ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public owner;
    IERC20 public immutable token;
    ILiquidityPool public immutable liquidityPool;

    event AnomalyExit(uint256 tokensSwapped, uint256 ethReturned, bool swapSucceeded);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    constructor(address _token, address _liquidityPool) {
        require(_token != address(0) && _liquidityPool != address(0), "Zero address");
        owner = msg.sender;
        token = IERC20(_token);
        liquidityPool = ILiquidityPool(_liquidityPool);
    }

    receive() external payable {}

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function forwardTokens(uint256 amount) external onlyOwner {
        token.safeTransferFrom(msg.sender, address(this), amount);
    }

    function forwardETH() external payable onlyOwner {}

    function swapETHForTokens(uint256 ethAmount, uint256 minTokensOut) external onlyOwner nonReentrant {
        require(address(this).balance >= ethAmount, "Not enough ETH");
        liquidityPool.swapEthForTokens{value: ethAmount}(minTokensOut);
    }

    /// Convert everything to ETH and return it to the owner.
    ///
    /// `minEthOut` is 0 deliberately: this is the panic path, and getting the
    /// position out matters more than the price it clears at. Front-running it
    /// costs the owner value but never blocks the exit — and a reverting exit is
    /// the worse failure.
    function executeAnomalyExit() external onlyOwner nonReentrant {
        uint256 tokenBalance = token.balanceOf(address(this));
        bool swapSucceeded = false;

        if (tokenBalance > 0) {
            token.forceApprove(address(liquidityPool), tokenBalance);

            // A pool that is empty, paused or simply cannot absorb this size must
            // not strand the ETH, so the failure is caught rather than bubbled.
            try liquidityPool.swap(tokenBalance, 0) {
                swapSucceeded = true;
            } catch {
                token.forceApprove(address(liquidityPool), 0);
                token.safeTransfer(owner, tokenBalance);
            }
        }

        uint256 ethBalance = address(this).balance;
        if (ethBalance > 0) {
            (bool ok, ) = payable(owner).call{value: ethBalance}("");
            require(ok, "ETH transfer failed");
        }

        emit AnomalyExit(tokenBalance, ethBalance, swapSucceeded);
    }

    /// Escape hatch for any other token that ends up here.
    function rescueToken(address other, uint256 amount) external onlyOwner {
        IERC20(other).safeTransfer(owner, amount);
    }
}
