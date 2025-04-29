// File: contract/ignition/modules/TokenFactoryLPModule.js
const {buildModule} = require("@nomicfoundation/hardhat-ignition/modules");
const { ethers } = require("ethers");

module.exports = buildModule("TokenFactoryLPModule", (m) => {
  const deployer = m.getAccount(0);
  const tokenFactory = m.contract("TokenFactory", []);
  const tokenName = "Custom Token";
  const tokenSymbol = "CTK";
  const initialSupply = ethers.parseEther("1000000");
  // Create the token
  const createTokenTx = m.call(
    tokenFactory,
    "createToken",
    [tokenName, tokenSymbol, initialSupply],
    { from: deployer }
  );
  // Read the new token’s address from the TokenCreated event
  const tokenAddress = m.readEventArgument(createTokenTx, "TokenCreated", 0);

  // Set up the liquidity pool for the new token
  const liquidityPool = m.contract("LiquidityPool", [tokenAddress]);
  // Approve the pool to spend tokens
  const approveTx = m.call(
    tokenAddress,
    "approve",
    [liquidityPool, ethers.parseEther("10000")],
    { from: deployer }
  );
  // Add liquidity
  const addLiquidityTx = m.call(
    liquidityPool,
    "addLiquidity",
    [ethers.parseEther("10000")],
    { from: deployer, value: ethers.parseEther("10") }
  );

  return {
    tokenFactory,
    createTokenTx,
    liquidityPool,
    approveTx,
    addLiquidityTx,
  };
});