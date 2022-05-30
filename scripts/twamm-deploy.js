const hre = require("hardhat");
const ethers = hre.ethers;

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


  const TWAMMInstantSwap = await ethers.getContractFactory("TWAMMInstantSwap");
  const twammInstantSwap = await TWAMMInstantSwap.deploy(
    hre.network.config.Factory,
    hre.network.config.WETH); 
  console.log("twammInstantSwap library address:", twammInstantSwap.address);

  const TWAMMLiquidityIn = await ethers.getContractFactory("TWAMMLiquidityIn");
  const twammLiquidityIn = await TWAMMLiquidityIn.deploy(
    hre.network.config.Factory,
    hre.network.config.WETH
  ); 
  console.log("twammLiquidityIn library address:", twammLiquidityIn.address);

  const TWAMMLiquidityOut = await ethers.getContractFactory("TWAMMLiquidityOut");
  const twammLiquidityOut = await TWAMMLiquidityOut.deploy(
    hre.network.config.Factory,
    hre.network.config.WETH
  ); 
  console.log("twammLiquidityOut library address:", twammLiquidityOut.address);

  const TWAMMTermSwapIn = await ethers.getContractFactory("TWAMMTermSwapIn");
  const twammTermSwapIn = await TWAMMTermSwapIn.deploy(
    hre.network.config.Factory,
    hre.network.config.WETH
  ); 
  console.log("twammTermSwapIn library address:", twammTermSwapIn.address);

  const TWAMMTermSwapOut = await ethers.getContractFactory("TWAMMTermSwapOut");
  const twammTermSwapOut = await TWAMMTermSwapOut.deploy(
    hre.network.config.Factory,
    hre.network.config.WETH
  ); 
  console.log("twammTermSwapOut library address:", twammTermSwapOut.address);


  const TWAMM = await ethers.getContractFactory("TWAMM");
  const twamm = await TWAMM.deploy(
    hre.network.config.Factory,
    hre.network.config.WETH,
    twammInstantSwap.address,
    twammLiquidityIn.address,
    twammLiquidityOut.address,
    twammTermSwapIn.address,
    twammTermSwapOut.address
  );

  console.log(
    "init params:",
    hre.network.config.Factory,
    hre.network.config.WETH
  );

  await twamm.deployed();

  console.log("TWAMM address:", twamm.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
