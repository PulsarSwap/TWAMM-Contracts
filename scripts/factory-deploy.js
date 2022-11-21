const hre = require("hardhat");
const ethers = hre.ethers;

async function main() {
  if (hre.network.name === "mainnet") {
    console.log("Deploying Factory to mainnet. Hit ctrl + c to abort");
  }

  const [deployer] = await ethers.getSigners();
  console.log(
    "Deploying the contracts with the account:",
    await deployer.getAddress()
  );

  console.log("Account balance:", (await deployer.getBalance()).toString());

  const longTermOrdersLibAdd = "0x2081C6232a7A8220423Ed5298A747Ea783c6CBD6";
  const longTermOrdersLib = await ethers.getContractAt(
    "LongTermOrdersLib",
    longTermOrdersLibAdd
  );

  const BinarySearchTreeLibAdd = "0xf3B251857523516C0d503f4e59Bed61451C85cA2";
  const BinarySearchTreeLib = await ethers.getContractAt(
    "BinarySearchTreeLib",
    BinarySearchTreeLibAdd
  );

  const Factory = await ethers.getContractFactory("Factory", {
    libraries: {
      LongTermOrdersLib: longTermOrdersLib.address,
      BinarySearchTreeLib: BinarySearchTreeLib.address,
    },
  });
  const factory = await Factory.deploy(hre.network.config.FeeToSetter);
  await factory.deployed();
  console.log("Factory address:", factory.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
