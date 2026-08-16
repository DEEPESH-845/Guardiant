// Pins the two drains that the linear-priced pool allowed. Run: npx hardhat test
const { expect } = require("chai");
const { ethers } = require("hardhat");

const ONE = ethers.parseEther("1");

async function deployPool() {
  const [lp, attacker] = await ethers.getSigners();

  const Token = await ethers.getContractFactory("CustomToken");
  // 1,000,000 tokens minted to lp
  const token = await Token.deploy("Test", "TST", 1_000_000n, lp.address);

  const Pool = await ethers.getContractFactory("LiquidityPool");
  const pool = await Pool.deploy(await token.getAddress());

  // Seed: 10,000 tokens / 10 ETH
  const seedTokens = ethers.parseEther("10000");
  await token.connect(lp).approve(await pool.getAddress(), seedTokens);
  await pool.connect(lp).addLiquidity(seedTokens, 0, { value: ethers.parseEther("10") });

  // Give the attacker their own tokens to play with
  await token.connect(lp).transfer(attacker.address, ethers.parseEther("50000"));

  return { pool, token, lp, attacker };
}

describe("LiquidityPool", function () {
  it("a swap cannot drain the pool's entire ETH balance", async function () {
    const { pool, token, attacker } = await deployPool();
    const poolAddr = await pool.getAddress();

    // The old pricing was ethOut = tokenIn * ethReserve / tokenReserve, so
    // swapping in exactly the token reserve paid out 100% of the ETH.
    const tokenReserve = await pool.tokenReserve();
    await token.connect(attacker).approve(poolAddr, tokenReserve);

    const ethBefore = await ethers.provider.getBalance(poolAddr);
    await pool.connect(attacker).swap(tokenReserve, 0);
    const ethAfter = await ethers.provider.getBalance(poolAddr);

    // The swap must actually have executed — otherwise the bound below is
    // satisfied vacuously by nothing happening.
    expect(ethAfter).to.be.lt(ethBefore);
    expect(ethAfter).to.be.gt(0n);
    // Constant product: swapping in 1x the reserve can never take more than half.
    expect(ethAfter).to.be.gte(ethBefore / 2n);
  });

  it("a liquidity provider cannot withdraw ETH they never deposited", async function () {
    const { pool, token, attacker } = await deployPool();
    const poolAddr = await pool.getAddress();

    // Old bug: liquidity[] tracked tokens only, so depositing tokens with dust
    // ETH still earned a proportional claim on everyone else's ETH.
    const deposit = ethers.parseEther("10000");
    await token.connect(attacker).approve(poolAddr, deposit);

    const ethSpent = 1n; // one wei
    await pool.connect(attacker).addLiquidity(deposit, 0, { value: ethSpent });

    const shares = await pool.liquidity(attacker.address);
    const balBefore = await ethers.provider.getBalance(attacker.address);
    const tx = await pool.connect(attacker).removeLiquidity(shares, 0, 0);
    const receipt = await tx.wait();
    const balAfter = await ethers.provider.getBalance(attacker.address);

    const gas = receipt.gasUsed * receipt.gasPrice;
    const ethGained = balAfter - balBefore + gas;

    // They put in 1 wei; they must not come out ahead in ETH.
    expect(ethGained).to.be.lte(ethSpent);
  });

  it("honours the slippage bound", async function () {
    const { pool, token, attacker } = await deployPool();
    const poolAddr = await pool.getAddress();
    const amount = ethers.parseEther("1000");
    await token.connect(attacker).approve(poolAddr, amount);

    const quoted = await pool.getSwapRate(amount);
    await expect(
      pool.connect(attacker).swap(amount, quoted + ONE),
    ).to.be.revertedWith("Slippage: ETH below minimum");
  });
});

describe("Wallet", function () {
  it("cannot credit a balance without depositing tokens", async function () {
    const [user] = await ethers.getSigners();
    const Wallet = await ethers.getContractFactory("Wallet");
    const wallet = await Wallet.deploy();

    const Token = await ethers.getContractFactory("CustomToken");
    const token = await Token.deploy("Test", "TST", 1000n, user.address);

    // Old bug: addToken just did `tokenBalances[msg.sender][token] += amount`.
    // Without an approval there are no tokens to pull, so it must revert now.
    await expect(
      wallet.connect(user).addToken(await token.getAddress(), ONE),
    ).to.be.reverted;

    expect(await wallet.tokenBalances(user.address, await token.getAddress())).to.equal(0n);
  });

  it("does not push duplicate entries into the token list", async function () {
    const [user] = await ethers.getSigners();
    const Wallet = await ethers.getContractFactory("Wallet");
    const wallet = await Wallet.deploy();
    const Token = await ethers.getContractFactory("CustomToken");
    const token = await Token.deploy("Test", "TST", 1000n, user.address);
    const addr = await token.getAddress();

    await token.connect(user).approve(await wallet.getAddress(), ONE * 3n);
    await wallet.connect(user).addToken(addr, ONE);
    await wallet.connect(user).addToken(addr, ONE);
    await wallet.connect(user).addToken(addr, ONE);

    expect(await wallet.connect(user).getUserTokens()).to.have.lengthOf(1);
  });
});

describe("AnomalyGuardWallet", function () {
  it("still returns ETH when the pool swap fails", async function () {
    const [owner] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("CustomToken");
    const token = await Token.deploy("Test", "TST", 1000n, owner.address);

    const Pool = await ethers.getContractFactory("LiquidityPool");
    const pool = await Pool.deploy(await token.getAddress()); // never seeded

    const Guard = await ethers.getContractFactory("AnomalyGuardWallet");
    const guard = await Guard.deploy(await token.getAddress(), await pool.getAddress());
    const guardAddr = await guard.getAddress();

    await token.connect(owner).transfer(guardAddr, ONE * 10n);
    await owner.sendTransaction({ to: guardAddr, value: ONE });

    // Empty pool -> swap reverts. The exit must still get the funds out.
    await expect(guard.connect(owner).executeAnomalyExit()).to.not.be.reverted;

    expect(await ethers.provider.getBalance(guardAddr)).to.equal(0n);
    expect(await token.balanceOf(guardAddr)).to.equal(0n);
    expect(await token.balanceOf(owner.address)).to.be.gt(0n);
  });
});
