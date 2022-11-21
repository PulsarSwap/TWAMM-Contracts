const hre = require("hardhat");
const ethers = hre.ethers;
let reserve0;
let reserve1;
let reserves;
let totalSupply;
let bufferReserve0;
let bufferReserve1;

async function listener() {
  const info = "aaa";
  return info;
}
async function main() {
  const [account] = await ethers.getSigners();
  console.log("Account Address:", await account.getAddress());

  console.log("Account balance:", (await account.getBalance()).toString());

  // some hyperparameter
  const initialLPSupply = ethers.utils.parseUnits("10");
  const continualLPSupply = ethers.utils.parseUnits("1");
  const instantSwapAmount = ethers.utils.parseUnits("1");
  const termSwapAmount = ethers.utils.parseUnits("1");
  const numIntervalUnits = 10;

  const token0Addr = "0x0F0a8A04100c73C3c443f9a2F09Cf5c464d00c9f";
  const token0 = await ethers.getContractAt("ERC20Mock", token0Addr);
  const token1Addr = "0x2340fC6b74d5B44248698C04C8EaaeB6549B7Edb";
  const token1 = await ethers.getContractAt("ERC20Mock", token1Addr);

  // loading necessary contracts
  const TWAMMAddr = "";
  const twamm = await ethers.getContractAt("TWAMM", TWAMMAddr);

  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

  // provide (initial) liquidity
  let currentBlockNumber = await ethers.provider.getBlockNumber();
  let timeStamp = (await ethers.provider.getBlock(currentBlockNumber))
    .timestamp;
  console.log("current block number", currentBlockNumber);
  try {
    await twamm.createPairWrapper(token0Addr, token1Addr, timeStamp + 100);
  } catch (error) {
    console.log(
      "continue without pair creation, the pair might be created already."
    );
  }
  const pairAddr = await twamm.obtainPairAddress(token0Addr, token1Addr);
  console.log("pair address check", pairAddr);

  // perform term swap
  let pair = await ethers.getContractAt("Pair", pairAddr);
  console.log("get order Ids");
  let orderIds = await pair.userIdsCheck(account.getAddress());
  console.log("ids before order submission", orderIds);

  const filter1 = {
    address: pairAddr,
    topics: [
      // the name of the event, parentheses containing the data type of each event, no spaces
      ethers.utils.id("Transfer(address,address,uint256)"),
    ],
  };
  /////////////////first part: for cancel order //////////////////
  console.log("term swap");
  await token0.approve(twamm.address, termSwapAmount);
  await twamm.longTermSwapTokenToToken(
    token0.address,
    token1.address,
    termSwapAmount,
    numIntervalUnits,
    timeStamp + 900
  );

  await sleep(10000);

  pair.on("LongTermSwapAToB", (sender, amountAIn, orderId) => {
    console.log(sender, amountAIn, orderId);
  });

  pair.on("LongTermSwapBToA", (sender, amountBIn, orderId) => {
    console.log(sender, amountBIn, orderId);
  });

  console.log("get order Ids");
  orderIds = await pair.userIdsCheck(account.getAddress());
  console.log("ids after order submission", orderIds);
  // console.log('cancel order');
  // currentBlockNumber = await ethers.provider.getBlockNumber();
  // timeStamp = (await ethers.provider.getBlock(currentBlockNumber)).timestamp;
  // await twamm.cancelTermSwapTokenToToken(
  //             token0.address,
  //             token1.address,
  //             Object.values(Object.keys(orderIds))[Object.keys(orderIds).length-2],
  //             timeStamp + 100
  //           );

  // /////////////////second part: for order withdrawal//////////////////
  // console.log('term swap');
  // await token0.approve(twamm.address, termSwapAmount);
  // await twamm.longTermSwapTokenToToken(
  //               token0.address,
  //               token1.address,
  //               termSwapAmount,
  //               numIntervalUnits,
  //               timeStamp + 300
  //           );
  // await sleep(10000);
  // orderIds = await pair.userIdsCheck(account.getAddress());
  // console.log('withdraw order');
  // await twamm.withdrawProceedsFromTermSwapTokenToToken(
  //     token0.address,
  //     token1.address,
  //     Object.values(Object.keys(orderIds))[Object.keys(orderIds).length-1],
  //     timeStamp + 500
  //     );

  // let currentTime;
  // let pastReserves;
  // let currentReserves;
  // let currentSalesRateA;
  // let currentSalesRateB;

  // let arrayReserve0;
  // let arrayReserve1;
  // pastReserves = getPastReserves(pair, unitLength);
  // currentReserves = await twamm.obtainReserves(token0.address, token1.address);
  // {currentSalesRateA, currentSalesRateB} =  await pair.getTWAMMCurrentSalesRate();
  // let { pastReserve0, pastResrve1 } = pastReserves;
  // let listeningCond;

  // if (listeningCond){
  //   currentReserves = await twamm.obtainReserves(token0.address, token1.address);
  //   {currentSalesRateA, currentSalesRateB} =  await pair.getTWAMMCurrentSalesRate();
  // }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
