const hre = require("hardhat");
const ethers = hre.ethers;
let reserve0;
let reserve1;
let reserves;
let totalSupply;

async function main() {
  const [account] = await ethers.getSigners();
  console.log("Account Address:", await account.getAddress());
  console.log("Account balance:", (await account.getBalance()).toString());

  // some hyperparameter
  const initialLPSupply = ethers.utils.parseUnits("10");
  const continualLPSupply = ethers.utils.parseUnits("3");
  const instantSwapAmount = ethers.utils.parseUnits("1");
  const termSwapAmount = ethers.utils.parseUnits("1");
  const numIntervalUnits = 10;
  const token0Addr = "0x0F0a8A04100c73C3c443f9a2F09Cf5c464d00c9f";
  const token0 = await ethers.getContractAt("ERC20Mock", token0Addr);
  const token1Addr = "0x2340fC6b74d5B44248698C04C8EaaeB6549B7Edb";
  const token1 = await ethers.getContractAt("ERC20Mock", token1Addr);
  // const token0Balance = await token0.balanceOf(owner.address);
  // const token1Balance = await token1.balanceOf(owner.address);

  // loading necessary contracts
  const TWAMMAddr = "0xdF9E82787Baf7D5A4DE8059d98F0eBeb18c8cf92";
  const twamm = await ethers.getContractAt("TWAMM", TWAMMAddr);

  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

  // provide (initial) liquidity
  let currentBlockNumber = await ethers.provider.getBlockNumber();
  let timeStamp = (await ethers.provider.getBlock(currentBlockNumber))
    .timestamp;
  console.log("current block number", currentBlockNumber);
  try {
    await twamm.createPairWrapper(token0Addr, token1Addr, timeStamp + 100);
    console.log("create pair successfully");
  } catch (error) {
    console.log(
      "continue without pair creation, the pair might be created already."
    );
  }
  const pairAddr = await twamm.obtainPairAddress(token0Addr, token1Addr);
  console.log("pair address check", pairAddr);

  try {
    console.log("add initial liquidity");
    let tx0 = await token0.approve(twamm.address, initialLPSupply); //owner calls it
    await tx0.wait();
    let tx1 = await token1.approve(twamm.address, initialLPSupply);
    await tx1.wait();
    await twamm.addInitialLiquidity(
      token0Addr,
      token1Addr,
      initialLPSupply,
      initialLPSupply,
      timeStamp + 300
    );
    console.log("initial provide liquidity completed");
  } catch (error) {
    console.log(
      "initial liquidity might be provided, add more liquidity instead."
    );
    // uncomment below to enable add liquidity
    const newLPTokens = continualLPSupply;
    reserves = await twamm.obtainReserves(token0.address, token1.address);
    reserve0 = Object.values(reserves)[0];
    reserve1 = Object.values(reserves)[1];
    totalSupply = await twamm.obtainTotalSupply(token0Addr, token1Addr);
    console.log("totalSupply", totalSupply);
    const amount0In = newLPTokens.mul(reserve0).div(totalSupply);
    const amount1In = newLPTokens.mul(reserve1).div(totalSupply);
    console.log(amount0In, amount1In);
    tx0 = await token0.approve(twamm.address, amount0In);
    // await tx0.wait();
    tx1 = await token1.approve(twamm.address, amount1In);
    // await tx1.wait();

    await twamm.addLiquidity(
      token0Addr,
      token1Addr,
      newLPTokens,
      amount0In,
      amount1In,
      timeStamp + 500
    );
    console.log("add more liquidity completed");
  }

  // perform instant swap
  console.log("instant swap");
  await token0.approve(twamm.address, instantSwapAmount);
  await twamm.instantSwapTokenToToken(
    token0.address,
    token1.address,
    instantSwapAmount,
    0,
    timeStamp + 700
  );
  console.log("instant swap completed");

  // // perform term swap
  let pair = await ethers.getContractAt("Pair", pairAddr);
  console.log("get order Ids");
  let orderIds = await pair.userIdsCheck(account.getAddress());
  console.log("ids before order submission:", orderIds);
  /////////////////first part: for cancel order //////////////////
  console.log("term swap");
  await token0.approve(twamm.address, termSwapAmount);
  await twamm.longTermSwapTokenToToken(
    token0.address,
    token1.address,
    termSwapAmount,
    numIntervalUnits,
    timeStamp + 900,
    { gasLimit: 3e7 }
  );

  await sleep(10000);

  console.log("get order Ids");
  orderIds = await pair.userIdsCheck(account.getAddress());
  console.log(
    "ids after order submission:",
    Object.values(Object.keys(orderIds))[Object.keys(orderIds).length - 1]
  );
  console.log("cancel order");
  currentBlockNumber = await ethers.provider.getBlockNumber();
  timeStamp = (await ethers.provider.getBlock(currentBlockNumber)).timestamp;
  await twamm.cancelTermSwapTokenToToken(
    token0.address,
    token1.address,
    Object.values(Object.keys(orderIds))[Object.keys(orderIds).length - 1],
    timeStamp + 100,
    { gasLimit: 3e7 }
  );

  // /////////////////second part: for order withdrawal//////////////////
  // orderIds = await pair.userIdsCheck(account.getAddress());
  // console.log('withdraw order');
  // await twamm.withdrawProceedsFromTermSwapTokenToToken(
  //     token0.address,
  //     token1.address,
  //     Object.values(Object.keys(orderIds))[Object.keys(orderIds).length-1],
  //     timeStamp + 500
  //     );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
