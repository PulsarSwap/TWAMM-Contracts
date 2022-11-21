const { parseUnits } = require("ethers/lib/utils");
const { ethers } = require("hardhat");

async function main() {
  const [account] = await ethers.getSigners();
  console.log("Account Address:", await account.getAddress());
  console.log("Account balance:", (await account.getBalance()).toString());

  // some hyperparameter
  const token0Addr = "0x0F0a8A04100c73C3c443f9a2F09Cf5c464d00c9f";
  const token0 = await ethers.getContractAt("ERC20Mock", token0Addr);
  const token1Addr = "0x2340fC6b74d5B44248698C04C8EaaeB6549B7Edb";
  const token1 = await ethers.getContractAt("ERC20Mock", token1Addr);

  // loading necessary contracts
  const TWAMMAddr = "0xdF9E82787Baf7D5A4DE8059d98F0eBeb18c8cf92";
  const twamm = await ethers.getContractAt("TWAMM", TWAMMAddr);

  // const initialLiquidityProvided = ethers.utils.parseUnits("10");
  // const ERC20Supply = ethers.utils.parseUnits("10000");t

  // //deploy two tokens for pair creation
  // const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
  // const token0 = await ERC20Factory.deploy("Token0", "Token0", ERC20Supply);
  // const token0Addr = token0.address;
  // console.log("token0 address", token0Addr);
  // const token1 = await ERC20Factory.deploy("Token1", "Token1", ERC20Supply);
  // const token1Addr = token1.address;
  // console.log("token1 address", token1Addr);

  // const pairAddr0 = await twamm.obtainPairAddress(token0Addr, token1Addr);
  // console.log("pair address check", pairAddr0);

  // const totalSupply0 = await twamm.obtainTotalSupply(token0Addr, token1Addr);
  // console.log("totalSupply0", totalSupply0);

  // // create pair and initialize liquidity for the pair
  // let currentBlockNumber = await ethers.provider.getBlockNumber();
  // let timeStamp = (await ethers.provider.getBlock(currentBlockNumber))
  //   .timestamp;
  // console.log("current block number", currentBlockNumber);

  // try {
  //   await twamm.createPairWrapper(token0Addr, token1Addr, timeStamp + 100);
  //   console.log("create pair successfully");
  // } catch (error) {
  //   console.log(
  //     "continue without pair creation, the pair might be created already."
  //   );
  // }

  // try {
  //   console.log("add initial liquidity");
  //   let tx0 = await token0.approve(twamm.address, initialLiquidityProvided); //owner calls it
  //   await tx0.wait();
  //   let tx1 = await token1.approve(twamm.address, initialLiquidityProvided);
  //   await tx1.wait();
  //   await twamm.addInitialLiquidity(
  //     token0Addr,
  //     token1Addr,
  //     initialLiquidityProvided,
  //     initialLiquidityProvided,
  //     timeStamp + 10000
  //   );
  //   console.log("initial provide liquidity completed");
  // } catch (error) {
  //   console.log(
  //     "initial liquidity might be provided, add more liquidity instead."
  //   );
  // }

  const pairAddr1 = await twamm.obtainPairAddress(token0Addr, token1Addr);
  console.log("pair address check", pairAddr1);

  const totalSupply1 = await twamm.obtainTotalSupply(token0Addr, token1Addr);
  console.log("totalSupply1", totalSupply1.toString());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
