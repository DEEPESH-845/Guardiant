// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/// @notice Constant-product (x*y=k) ETH/token pool.
///
/// The previous implementation priced linearly — `tokenAmount * ethBalance /
/// tokenBalance` — which meant swapping an amount equal to the pool's token
/// balance paid out the pool's *entire* ETH balance. It also tracked liquidity
/// positions in token units only, ignoring the ETH a provider contributed, so a
/// provider could deposit tokens with 1 wei of ETH and withdraw a proportional
/// share of everyone else's ETH. Both were unconditional drains.
///
/// Reserves are tracked in storage rather than read from `balanceOf` /
/// `address(this).balance` so that donating assets directly to the pool cannot
/// move the price.
contract LiquidityPool is ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable token;

    /// Locked forever on the first deposit so totalLiquidity can never return to
    /// zero, which would let someone re-seed the pool at an arbitrary price.
    uint256 private constant MINIMUM_LIQUIDITY = 1000;

    /// 0.3% swap fee, retained in the reserves for liquidity providers.
    uint256 private constant FEE_NUMERATOR = 997;
    uint256 private constant FEE_DENOMINATOR = 1000;

    uint256 public tokenReserve;
    uint256 public ethReserve;

    /// LP shares, not token amounts.
    uint256 public totalLiquidity;
    mapping(address => uint256) public liquidity;

    event LiquidityAdded(address indexed provider, uint256 tokenAmount, uint256 ethAmount, uint256 shares);
    event LiquidityRemoved(address indexed provider, uint256 tokenAmount, uint256 ethAmount, uint256 shares);
    event Swapped(address indexed user, uint256 tokenAmount, uint256 ethAmount);

    constructor(address _token) {
        require(_token != address(0), "Token is zero address");
        token = IERC20(_token);
    }

    /// @param tokenAmount tokens to deposit; must be paired with ETH via msg.value
    /// @param minShares slippage bound — revert if the deposit mints fewer shares
    function addLiquidity(uint256 tokenAmount, uint256 minShares)
        external
        payable
        nonReentrant
        returns (uint256 shares)
    {
        require(msg.value > 0, "Must send ETH");
        require(tokenAmount > 0, "Must send tokens");

        // Measure what actually arrived, so fee-on-transfer tokens can't credit
        // more than they delivered.
        uint256 balanceBefore = token.balanceOf(address(this));
        token.safeTransferFrom(msg.sender, address(this), tokenAmount);
        uint256 received = token.balanceOf(address(this)) - balanceBefore;
        require(received > 0, "No tokens received");

        if (totalLiquidity == 0) {
            shares = Math.sqrt(received * msg.value);
            require(shares > MINIMUM_LIQUIDITY, "Initial liquidity too small");
            shares -= MINIMUM_LIQUIDITY;
            totalLiquidity = MINIMUM_LIQUIDITY;
        } else {
            // The limiting side sets the share count, so depositing lopsidedly
            // cannot mint value out of the other reserve.
            shares = Math.min(
                (received * totalLiquidity) / tokenReserve,
                (msg.value * totalLiquidity) / ethReserve
            );
        }

        require(shares > 0, "Zero shares minted");
        require(shares >= minShares, "Slippage: shares below minimum");

        liquidity[msg.sender] += shares;
        totalLiquidity += shares;
        tokenReserve += received;
        ethReserve += msg.value;

        emit LiquidityAdded(msg.sender, received, msg.value, shares);
    }

    /// @param shares LP shares to burn
    /// @param minTokenAmount slippage bound on the tokens returned
    /// @param minEthAmount slippage bound on the ETH returned
    function removeLiquidity(uint256 shares, uint256 minTokenAmount, uint256 minEthAmount)
        external
        nonReentrant
        returns (uint256 tokenAmount, uint256 ethAmount)
    {
        require(shares > 0, "Zero shares");
        require(liquidity[msg.sender] >= shares, "Not enough liquidity");

        // Strictly proportional to the shares held — both sides, so a provider
        // can only ever withdraw what their own deposit is worth.
        tokenAmount = (shares * tokenReserve) / totalLiquidity;
        ethAmount = (shares * ethReserve) / totalLiquidity;

        require(tokenAmount >= minTokenAmount, "Slippage: tokens below minimum");
        require(ethAmount >= minEthAmount, "Slippage: ETH below minimum");

        liquidity[msg.sender] -= shares;
        totalLiquidity -= shares;
        tokenReserve -= tokenAmount;
        ethReserve -= ethAmount;

        token.safeTransfer(msg.sender, tokenAmount);
        _sendETH(msg.sender, ethAmount);

        emit LiquidityRemoved(msg.sender, tokenAmount, ethAmount, shares);
    }

    /// Sell tokens for ETH.
    /// @param minEthOut slippage bound — the caller's protection against the
    ///        price moving between simulation and execution.
    function swap(uint256 tokenAmount, uint256 minEthOut)
        external
        nonReentrant
        returns (uint256 ethOut)
    {
        require(tokenAmount > 0, "Zero amount");

        uint256 balanceBefore = token.balanceOf(address(this));
        token.safeTransferFrom(msg.sender, address(this), tokenAmount);
        uint256 received = token.balanceOf(address(this)) - balanceBefore;

        ethOut = _getAmountOut(received, tokenReserve, ethReserve);
        require(ethOut >= minEthOut, "Slippage: ETH below minimum");

        tokenReserve += received;
        ethReserve -= ethOut;

        _sendETH(msg.sender, ethOut);

        emit Swapped(msg.sender, received, ethOut);
    }

    /// Buy tokens with ETH.
    /// @param minTokensOut slippage bound
    function swapEthForTokens(uint256 minTokensOut)
        external
        payable
        nonReentrant
        returns (uint256 tokensOut)
    {
        require(msg.value > 0, "Must send ETH");

        tokensOut = _getAmountOut(msg.value, ethReserve, tokenReserve);
        require(tokensOut >= minTokensOut, "Slippage: tokens below minimum");

        ethReserve += msg.value;
        tokenReserve -= tokensOut;

        token.safeTransfer(msg.sender, tokensOut);

        emit Swapped(msg.sender, tokensOut, msg.value);
    }

    /// Constant product with the fee applied to the input.
    /// Output is strictly less than reserveOut for any finite input, so no swap
    /// can empty a reserve.
    function _getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut)
        internal
        pure
        returns (uint256)
    {
        require(reserveIn > 0 && reserveOut > 0, "Pool not initialised");
        uint256 amountInWithFee = amountIn * FEE_NUMERATOR;
        return (amountInWithFee * reserveOut) / (reserveIn * FEE_DENOMINATOR + amountInWithFee);
    }

    /// `.transfer()` forwards only 2300 gas, which reverts for any recipient
    /// with a non-trivial receive() — including most smart-contract wallets.
    function _sendETH(address to, uint256 amount) private {
        (bool ok, ) = payable(to).call{value: amount}("");
        require(ok, "ETH transfer failed");
    }

    /// How much ETH `tokenAmount` would fetch right now.
    function getSwapRate(uint256 tokenAmount) public view returns (uint256) {
        if (tokenReserve == 0 || ethReserve == 0) return 0;
        return _getAmountOut(tokenAmount, tokenReserve, ethReserve);
    }

    /// How many tokens `ethAmount` would fetch right now.
    function getTokenSwapRate(uint256 ethAmount) public view returns (uint256) {
        if (tokenReserve == 0 || ethReserve == 0) return 0;
        return _getAmountOut(ethAmount, ethReserve, tokenReserve);
    }

    /// Donations are not counted as reserves, by design — accepting them here
    /// only means they sit in the contract without moving the price.
    receive() external payable {}
}
