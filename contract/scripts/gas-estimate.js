const { ethers } = require("hardhat");
async function main() {
  const [d] = await ethers.getSigners();
  let total = 0n;
  const track = async (label, p) => {
    const c = await p; await c.waitForDeployment?.();
    const r = await ethers.provider.getTransactionReceipt(
      c.deploymentTransaction ? c.deploymentTransaction().hash : c.hash);
    total += r.gasUsed; console.log(`${label.padEnd(22)} ${r.gasUsed}`);
    return c;
  };
  await track("Wallet", (await ethers.getContractFactory("Wallet")).deploy());
  await track("TransferTo", (await ethers.getContractFactory("TransferTo")).deploy());
  const tf = await track("TokenFactory", (await ethers.getContractFactory("TokenFactory")).deploy());

  let tx = await tf.createToken("Guardiant Demo Token","GDT",1000000n);
  let r = await tx.wait(); total += r.gasUsed; console.log(`${"createToken".padEnd(22)} ${r.gasUsed}`);
  const ev = r.logs.map(l=>{try{return tf.interface.parseLog(l)}catch{return null}}).find(e=>e?.name==="TokenCreated");
  const tokenAddr = ev.args[0];

  const pool = await track("LiquidityPool", (await ethers.getContractFactory("LiquidityPool")).deploy(tokenAddr));
  const token = await ethers.getContractAt("CustomToken", tokenAddr);
  const amt = ethers.parseEther("10000");
  r = await (await token.approve(await pool.getAddress(), amt)).wait(); total += r.gasUsed;
  console.log(`${"approve".padEnd(22)} ${r.gasUsed}`);
  r = await (await pool.addLiquidity(amt, 0, {value: ethers.parseEther("0.02")})).wait();
  total += r.gasUsed; console.log(`${"addLiquidity".padEnd(22)} ${r.gasUsed}`);
  await track("AnomalyGuardWallet", (await ethers.getContractFactory("AnomalyGuardWallet")).deploy(tokenAddr, await pool.getAddress()));

  console.log("\nTOTAL GAS:", total.toString());
  for (const g of [1n, 3n, 10n]) {
    const cost = total * g * 10n**9n;
    console.log(`  at ${g} gwei: ${ethers.formatEther(cost)} ETH  (+0.02 LP seed = ${ethers.formatEther(cost + ethers.parseEther("0.02"))})`);
  }
}
main().catch(e=>{console.error(e);process.exit(1)});
