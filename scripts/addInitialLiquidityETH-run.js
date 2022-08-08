const { parseUnits } = require("ethers/lib/utils");
const { ethers } = require("hardhat");

async function main() {
  const [account] = await ethers.getSigners();
  console.log("Account Address:", await account.getAddress());
  console.log("Account balance:", (await account.getBalance()).toString());

  // loading necessary contracts
  const TWAMMAddr = "0xE4e55FE1e3D5A716C3d7036a56F270Df66Eb178E";
  const twamm = await ethers.getContractAt("TWAMM", TWAMMAddr);

  const initialLiquidityProvidedETH = 1000000000000000;
  const initialLiquidityProvided = ethers.utils.parseUnits("10");
  const ERC20Supply = ethers.utils.parseUnits("10000");

  //deploy three token for pair creation
  const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
  token = await ERC20Factory.deploy("Token", "Token", ERC20Supply);
  const tokenAddr = token.address;
  console.log("token address", tokenAddr);

  // const tokenAddr= "0xc2f63364ec1Bd965fc4C93ebaB4FD3377cE64d43";
  // const token = await ethers.getContractAt("ERC20Mock", tokenAddr);

  const WETHAddr = "0xc778417e063141139fce010982780140aa0cd5ab";
  const WETH = await ethers.getContractAt("WETH10", WETHAddr);

  // create pair and initialize liquidity for the pair
  let currentBlockNumber = await ethers.provider.getBlockNumber();
  let timeStamp = (await ethers.provider.getBlock(currentBlockNumber))
    .timestamp;
  console.log("current block timeStamp", timeStamp);

  try {
    await twamm.createPairWrapper(tokenAddr, WETHAddr, timeStamp + 50000);
    console.log("create pair successfully");
  } catch (error) {
    console.log(
      "continue without pair creation, the pair might be created already."
    );
  }
  const pairETHAddr = await twamm.obtainPairAddress(tokenAddr, WETHAddr);
  console.log("pair address check", pairETHAddr);

  try {
    console.log("add initial liquidity");
    let tx0 = await token.approve(pairETHAddr, initialLiquidityProvided); //owner calls it
    await tx0.wait();
    let tx1 = await WETH.approve(pairETHAddr, initialLiquidityProvidedETH);
    await tx1.wait();
    await twamm.addInitialLiquidityETH(
      tokenAddr,
      initialLiquidityProvided,
      initialLiquidityProvidedETH,
      timeStamp + 10000,
      { value: initialLiquidityProvidedETH }
    );
    console.log("Initial Setup Finished");
  } catch (error) {
    console.log(
      "initial liquidity might be provided, add more liquidity instead."
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
