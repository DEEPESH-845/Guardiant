// File: contract/ignition/modules/Transfer.js
const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("TransferModule", (m) => {
  const transferModule = m.contract("TransferTo", []);
  return { transferModule };
});