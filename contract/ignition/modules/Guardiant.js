// Deploys the whole protocol in one shot, wiring each contract to the address
// of the one before it. Replaces the per-contract modules that hardcoded
// Hardhat's deterministic local addresses.
const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");
const { ethers } = require("ethers");

// Tuned for a faucet-funded testnet account. CustomToken multiplies by
// 10**decimals internally, so INITIAL_SUPPLY is a plain token count.
const INITIAL_SUPPLY = 1_000_000n;
const LP_TOKEN_AMOUNT = ethers.parseEther("10000");
const LP_ETH_AMOUNT = ethers.parseEther("0.02");

module.exports = buildModule("GuardiantModule", (m) => {
  const deployer = m.getAccount(0);

  const wallet = m.contract("Wallet", []);
  const transfer = m.contract("TransferTo", []);
  const tokenFactory = m.contract("TokenFactory", []);

  const createToken = m.call(
    tokenFactory,
    "createToken",
    ["Guardiant Demo Token", "GDT", INITIAL_SUPPLY],
    { from: deployer },
  );
  const tokenAddress = m.readEventArgument(createToken, "TokenCreated", 0);
  const token = m.contractAt("CustomToken", tokenAddress);

  const liquidityPool = m.contract("LiquidityPool", [tokenAddress]);

  const approve = m.call(token, "approve", [liquidityPool, LP_TOKEN_AMOUNT], {
    from: deployer,
  });
  // minShares 0: this is the pool's very first deposit, so there is no existing
  // price for it to slip against.
  m.call(liquidityPool, "addLiquidity", [LP_TOKEN_AMOUNT, 0], {
    from: deployer,
    value: LP_ETH_AMOUNT,
    after: [approve],
  });

  const anomalyGuard = m.contract("AnomalyGuardWallet", [
    tokenAddress,
    liquidityPool,
  ]);

  return { wallet, transfer, tokenFactory, token, liquidityPool, anomalyGuard };
});
