const { parseUnits } = require("ethers/lib/utils");
const { ethers } = require("hardhat");

async function main() {
  const [account] = await ethers.getSigners();
  console.log("Account Address:", await account.getAddress());
  console.log("Account balance:", (await account.getBalance()).toString());

  // loading necessary contracts
  const TWAMMAddr = "0xdF9E82787Baf7D5A4DE8059d98F0eBeb18c8cf92";
  const twamm = await ethers.getContractAt("TWAMM", TWAMMAddr);

  const initialLiquidityProvidedETH = 1000000000000000;
  const initialLiquidityProvided = ethers.utils.parseUnits("10");
  const ERC20Supply = ethers.utils.parseUnits("10000");

  //deploy two tokens for pair creation
  const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
  const token = await ERC20Factory.deploy("Token", "Token", ERC20Supply);
  const tokenAddr = token.address;
  console.log("token address", tokenAddr);

  const WETHAddr = "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6";
  const WETH = await ethers.getContractAt("WETH9", WETHAddr);

  // create pair and initialize liquidity for the pair
  let currentBlockNumber = await ethers.provider.getBlockNumber();
  let timeStamp = (await ethers.provider.getBlock(currentBlockNumber))
    .timestamp;
  console.log("current block number", currentBlockNumber);

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
    let tx0 = await token.approve(twamm.address, initialLiquidityProvided); //owner calls it
    await tx0.wait();
    let tx1 = await WETH.approve(twamm.address, initialLiquidityProvidedETH);
    await tx1.wait();
    await twamm.addInitialLiquidityETH(
      tokenAddr,
      initialLiquidityProvided,
      initialLiquidityProvidedETH,
      timeStamp + 10000,
      { value: initialLiquidityProvidedETH }
    );
    console.log("initial provide liquidity completed");
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
