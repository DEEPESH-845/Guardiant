const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");
const { ethers } = require("ethers");

module.exports = buildModule("TokenFactoryModule", (m) => {
  const deployer = m.getAccount(0);
  const tokenFactory = m.contract("TokenFactory", []);
  const tokenName = "Custom Token";
  const tokenSymbol = "CTK";
  const initialSupply = ethers.parseEther("1000000");
  const createTokenTx = m.call(
    tokenFactory,
    "createToken",
    [tokenName, tokenSymbol, initialSupply],
    { from: deployer }
  );
  return { tokenFactory, createTokenTx };
});

// Test
