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


  const TWAMMSwap = await ethers.getContractFactory("TWAMMSwap");
  const twammSwap = await TWAMMSwap.deploy(
    hre.network.config.Factory,
    hre.network.config.WETH); 
  console.log("twammSwap library address:", twammSwap.address);

  const TWAMMLiquidity = await ethers.getContractFactory("TWAMMLiquidity");
  const twammLiquidity = await TWAMMLiquidity.deploy(
    hre.network.config.Factory,
    hre.network.config.WETH
  ); 
  console.log("twammLiquidity library address:", twammLiquidity.address);


  const TWAMMTermSwap = await ethers.getContractFactory("TWAMMTermSwap");
  const twammTermSwap = await TWAMMTermSwap.deploy(
    hre.network.config.Factory,
    hre.network.config.WETH
  ); 
  console.log("twammTermSwap library address:", twammTermSwap.address);



  const TWAMM = await ethers.getContractFactory("TWAMM");
  const twamm = await TWAMM.deploy(
    hre.network.config.Factory,
    hre.network.config.WETH,
    twammSwap.address,
    twammTermSwap.address,
    twammLiquidity.address,
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
