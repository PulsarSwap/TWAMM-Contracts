const hre = require("hardhat");
const ethers = hre.ethers;
const ERC20Supply = ethers.utils.parseUnits("100000000");

async function main() {
  if (hre.network.name === "mainnet") {
    console.log("Deploying Token To mainnet. Hit ctrl + c to abort");
  }

  const [deployer] = await ethers.getSigners();
  console.log(
    "Deploying the contracts with the account:",
    await deployer.getAddress()
  );

  console.log("Account balance:", (await deployer.getBalance()).toString());

  const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
  console.log("Supplied amount for both tokens: %s", ERC20Supply);
  const tokenA = await ERC20Factory.deploy("USDTB", "USDTB", ERC20Supply);
  const tokenB = await ERC20Factory.deploy("WETHB", "WETHB", ERC20Supply);
  await tokenA.deployed();
  await tokenB.deployed();
  console.log("tokenA (USDT) address:", tokenA.address);
  console.log("tokenB (WETH) address:", tokenB.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
