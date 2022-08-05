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

  // some hyperparameters
  const initialLPSupply = ethers.utils.parseUnits("10");
  const continualLPSupply = ethers.utils.parseUnits("1");
  const instantSwapAmount = ethers.utils.parseUnits("1");
  const termSwapAmount = ethers.utils.parseUnits("1");
  const numIntervalUnits = 10;
  const token0Addr = "0xb0751fACbCcF598787c351Ce9541a4b203504c41";
  const token0 = await ethers.getContractAt("ERC20Mock", token0Addr);
  const token1Addr = "0x419E14a156daA5159ad73D36313E3520ff2a3F57";
  const token1 = await ethers.getContractAt("ERC20Mock", token1Addr);

  // loading necessary contracts
  const TWAMMAddr = "0xFe2E5fCe86495560574270f1F97a5ce9f534Cf94";
  const twamm = await ethers.getContractAt("TWAMM", TWAMMAddr);

  const TWAMMLiquidityAddr = "0x470C1F6F472f4ec19de25A467327188b5de96308";
  const twammLiquidity = await ethers.getContractAt(
    "TWAMMLiquidity",
    TWAMMLiquidityAddr
  );

  const TWAMMInstantSwapAddr = "0xf382E6ff0cE929FA5F10DBBD006213e7E1D14F53";
  const twammInstantSwap = await ethers.getContractAt(
    "TWAMMInstantSwap",
    TWAMMInstantSwapAddr
  );

  const TWAMMTermSwapAddr = "0x6c859b445695E216e348A75287B453A2329F391F";
  const twammTermSwap = await ethers.getContractAt(
    "TWAMMTermSwap",
    TWAMMTermSwapAddr
  );

  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

  // provide (initial) liquidity
  let currentBlockNumber = await ethers.provider.getBlockNumber();
  let timeStamp = (await ethers.provider.getBlock(currentBlockNumber))
    .timestamp;
  console.log("current block number", timeStamp);
  try {
    await twamm.createPairWrapper(token0Addr, token1Addr, timeStamp + 100);
  } catch (error) {
    //console.log(error);
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
  /////////////////first part: for cancel order //////////////////
  console.log("term swap");
  await token0.approve(pairAddr, termSwapAmount);
  await twammTermSwap.longTermSwapTokenToToken(
    token0.address,
    token1.address,
    termSwapAmount,
    numIntervalUnits,
    timeStamp + 900
  );

  // await sleep(10000);

  console.log("get order Ids");
  orderIds = await pair.userIdsCheck(account.getAddress());
  console.log("ids after order submission", orderIds);
  // console.log('cancel order');
  // currentBlockNumber = await ethers.provider.getBlockNumber();
  // timeStamp = (await ethers.provider.getBlock(currentBlockNumber)).timestamp;
  // await twammTermSwap.cancelTermSwapTokenToToken(
  //             token0.address,
  //             token1.address,
  //             Object.values(Object.keys(orderIds))[Object.keys(orderIds).length-2],
  //             timeStamp + 100
  //           );

  // /////////////////second part: for order withdrawal//////////////////
  // console.log('term swap');
  // await token0.approve(pairAddr, termSwapAmount);
  // await twammTermSwap.longTermSwapTokenToToken(
  //               token0.address,
  //               token1.address,
  //               termSwapAmount,
  //               numIntervalUnits,
  //               timeStamp + 300
  //           );
  // await sleep(10000);
  // orderIds = await pair.userIdsCheck(account.getAddress());
  // console.log("withdraw order");
  // let orderId = await twammTermSwap.withdrawProceedsFromTermSwapTokenToToken(
  //   token0.address,
  //   token1.address,
  //   Object.values(Object.keys(orderIds))[Object.keys(orderIds).length - 1],
  //   timeStamp + 500
  // );
  // await orderId.wait();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
