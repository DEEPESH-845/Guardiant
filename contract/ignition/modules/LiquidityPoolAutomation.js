// File: contract/ignition/modules/LiquidityPoolAutomation.js
const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");
const { ethers } = require("ethers");

module.exports = buildModule("LiquidityPoolAutomationModule", (m) => {
  const deployer = m.getAccount(0);
  const tokenAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const liquidityPool = m.contract("LiquidityPool", [tokenAddress]);
  return { liquidityPool };
});