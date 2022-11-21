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

  const transferHelperLibAdd = "0x164354de108D7b6c1965B52aeb68e9eA0C366e61";
  const libraryLibAdd = "0xceB20CdCAA0042F039e6994607137e8F1739c2c6";

  const library = await ethers.getContractAt("Library", libraryLibAdd);
  const transferHelper = await ethers.getContractAt(
    "TransferHelper",
    transferHelperLibAdd
  );

  const TWAMM = await ethers.getContractFactory("TWAMM", {
    libraries: {
      Library: library.address,
      TransferHelper: transferHelper.address,
    },
  });
  const twamm = await TWAMM.deploy(
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
