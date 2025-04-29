// File: contract/ignition/modules/AnomalyGuard.js
const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("AnomalyGuardModule", (m) => {
  const tokenAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const liquidityPoolAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
  const anomalyGuard = m.contract("AnomalyGuardWallet", [tokenAddress, liquidityPoolAddress]);
  return { anomalyGuard };
});