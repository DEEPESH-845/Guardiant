// File: contract/ignition/modules/Wallet.js
const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("DeployTokensModule", (m) => {
  const wallet = m.contract("Wallet", []);
  return { wallet };
});
