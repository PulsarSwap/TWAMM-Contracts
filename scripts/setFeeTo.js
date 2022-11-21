const { parseUnits } = require("ethers/lib/utils");
const { ethers } = require("hardhat");

async function main() {
  const [account] = await ethers.getSigners();
  console.log("Account Address:", await account.getAddress());
  console.log("Account balance:", (await account.getBalance()).toString());

  // loading necessary contracts
  const FactoryAddr = "0x8B6412217B66d299Ae12885F9Aae0d4D3049f53B";
  const factory = await ethers.getContractAt("IFactory", FactoryAddr);

  let feeTo = await factory.feeTo();
  console.log("fee to address old:", feeTo);

  // const feeToAddr = "0xb8688826e957Ece1fBF8f6203d025c5624286bAe"
  // const feeToAddr = "0xCB3A9BFC9f99E75E922a516EED04D9F62e83a28E";
  // const feeToAddr = "0x0000000000000000000000000000000000000000";

  // let tx0 = await factory.setFeeTo(feeToAddr);
  // await tx0.wait();

  // feeTo = await factory.feeTo();
  // console.log("fee to address new:", feeTo);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
