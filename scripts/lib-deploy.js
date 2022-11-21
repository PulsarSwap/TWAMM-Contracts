const hre = require("hardhat");
const ethers = hre.ethers;

async function main() {
  if (hre.network.name === "mainnet") {
    console.log("Deploying Lib-Contract to mainnet. Hit ctrl + c to abort");
  }

  const [deployer] = await ethers.getSigners();
  console.log(
    "Deploying the contracts with the account:",
    await deployer.getAddress()
  );

  console.log("Account balance:", (await deployer.getBalance()).toString());

  const transferHelperLib = await (
    await ethers.getContractFactory("TransferHelper")
  ).deploy();

  console.log("transferHelperLib address:", transferHelperLib.address);

  const orderPoolLib = await (
    await ethers.getContractFactory("OrderPoolLib")
  ).deploy();

  console.log("orderPoolLib address:", orderPoolLib.address);

  const BinarySearchTreeLib = await (
    await ethers.getContractFactory("BinarySearchTreeLib")
  ).deploy();

  console.log("BinarySearchTreeLib address:", BinarySearchTreeLib.address);

  const longTermOrdersLib = await (
    await ethers.getContractFactory("LongTermOrdersLib", {
      libraries: {
        OrderPoolLib: orderPoolLib.address,
        BinarySearchTreeLib: BinarySearchTreeLib.address,
      },
    })
  ).deploy();

  console.log("longTermOrdersLib address:", longTermOrdersLib.address);

  const libraryLib = await (
    await ethers.getContractFactory("Library", {
      libraries: {
        LongTermOrdersLib: longTermOrdersLib.address,
        BinarySearchTreeLib: BinarySearchTreeLib.address,
      },
    })
  ).deploy();

  console.log("libraryLib address:", libraryLib.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
