const hre = require("hardhat");
const ethers = hre.ethers;
// const initialLiquidityProvided = ethers.utils.parseUnits("50");
const ERC20Supply = ethers.utils.parseUnits("100");

async function main() {
  if (hre.network.name === "mainnet") {
    console.log("Deploying TWAMM to mainnet. Hit ctrl + c to abort");
  }

  const [deployer] = await ethers.getSigners();
  console.log(
    "Deploying the contracts with the account:",
    await deployer.getAddress()
  );

  console.log("Account balance:", (await deployer.getBalance()).toString());

  const TWAMM = await ethers.getContractFactory("TWAMM");

  console.log("TWAMM loaded");

  const twamm = await TWAMM.deploy(
    hre.network.config.Factory,
    hre.network.config.WETH
  );

  console.log(
    "init params:",
    hre.network.config.Factory,
    hre.network.config.WETH
  );
  console.log("TWAMM deployed");

  await twamm.deployed();

  console.log("TWAMM address:", twamm.address);

  // await twamm.provideInitialLiquidity(initialLiquidityProvided,initialLiquidityProvided);
  // console.log('initial liquidity added');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
