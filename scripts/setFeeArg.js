const { parseUnits } = require("ethers/lib/utils");
const { ethers } = require("hardhat");

async function main() {
  const [account] = await ethers.getSigners();
  console.log("Account Address:", await account.getAddress());
  console.log("Account balance:", (await account.getBalance()).toString());

  // loading necessary contracts
  const FactoryAddr = "0x8B6412217B66d299Ae12885F9Aae0d4D3049f53B";
  const factory = await ethers.getContractAt("IFactory", FactoryAddr);

  let feeArg = await factory.feeArg();
  console.log("fee arg old:", feeArg);

  // const feeArgInt = 1000;

  // let tx0 = await factory.setFeeArg(feeArgInt);
  // await tx0.wait();

  // feeArg = await factory.feeArg();
  // console.log("fee arg new:", feeArg);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
