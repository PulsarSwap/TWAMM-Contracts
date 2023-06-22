const { parseUnits } = require("ethers/lib/utils");
const { ethers } = require("hardhat");

async function main() {
  const [account] = await ethers.getSigners();
  console.log("Account Address:", await account.getAddress());
  console.log("Account balance:", (await account.getBalance()).toString());

  // loading necessary contracts
  const FactoryAddr = "0x8B6412217B66d299Ae12885F9Aae0d4D3049f53B";
  const factory = await ethers.getContractAt("IFactory", FactoryAddr);

  let feeToSetter = await factory.feeToSetter();
  console.log("fee to setter address old:", feeToSetter);

  // const feeToSetterAddr = "0x57802b223F76Afd6E51Bb2AF578E72B07066a069"; //ethereum
  // const feeToSetterAddr = ""; //mantle
  // const feeToSetterAddr = "0xC5273E939e2bFd2B55e5EeeA20ddbFA714b4B78A"; //arbitrumOne
  // const feeToSetterAddr = ""; //base
  // const feeToSetterAddr = ""; //zksync

  // let tx0 = await factory.setFeeToSetter(feeToSetterAddr);
  // await tx0.wait();

  // feeToSetter = await factory.feeToSetter();
  // console.log("fee to setter address new:", feeToSetter);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
