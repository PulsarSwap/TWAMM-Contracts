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
    hre.network.config.WETH
  );
  await twammInstantSwap.deployed();
  console.log("TWAMMInstantSwap address:", twammInstantSwap.address);

  const TWAMMTermSwap = await ethers.getContractFactory("TWAMMTermSwap");
  const twammTermSwap = await TWAMMTermSwap.deploy(
    hre.network.config.Factory,
    hre.network.config.WETH
  );
  await twammTermSwap.deployed();
  console.log("TWAMMTermSwap address:", twammTermSwap.address);

  const TWAMMLiquidity = await ethers.getContractFactory("TWAMMLiquidity");
  const twammLiquidity = await TWAMMLiquidity.deploy(
    hre.network.config.Factory,
    hre.network.config.WETH
  );
  await twammLiquidity.deployed();
  console.log("TWAMMLiquidity address:", twammLiquidity.address);

  const TWAMM = await ethers.getContractFactory("TWAMM");
  const twamm = await TWAMM.deploy(
    hre.network.config.Factory,
    hre.network.config.WETH,
    twammInstantSwap.address,
    twammTermSwap.address,
    twammLiquidity.address
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
