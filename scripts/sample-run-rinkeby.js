const hre = require("hardhat");
const ethers = hre.ethers;

async function main() {
  const [account] = await ethers.getSigners();
  console.log("Account Address:", await account.getAddress());
  console.log("Account balance:", (await account.getBalance()).toString());

  // some hyperparameter
  const initialLPSupply = ethers.utils.parseUnits("10");
  const continualLPSupply = ethers.utils.parseUnits("1");
  const instantSwapAmount = ethers.utils.parseUnits("1");
  const termSwapAmount = ethers.utils.parseUnits("1");
  const numIntervalUnits = 100;
  const token0Addr = "0xA21bBa2Dcf4DcA321D13337e6b33A1D780B1dFAA";
  const token0 = await ethers.getContractAt("ERC20Mock", token0Addr);
  const token1Addr = "0x0EE834CBBAC3Ad3FB3Ecc6A1B6B130DaAb9adC7B";
  const token1 = await ethers.getContractAt("ERC20Mock", token1Addr);
  // const token0Balance = await token0.balanceOf(owner.address);
  // const token1Balance = await token1.balanceOf(owner.address);

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
    let tx = await twamm.createPairWrapper(
      token0Addr,
      token1Addr,
      timeStamp + 100
    );
    await tx.wait();
    console.log("create pair successfully");
  } catch (error) {
    console.log(
      "continue without pair creation, the pair might be created already."
    );
  }
  const pairAddr = await twamm.obtainPairAddress(token0Addr, token1Addr);
  console.log("pair address check", pairAddr);

  sleep(10000);

  try {
    console.log("add initial liquidity");
    let pairContract = await ethers.getContractAt("Pair", pairAddr);
    let lpAmount = await pairContract.getTotalSupply();
    console.log("lpAmount", lpAmount);

    let tokenAReserve = await pairContract.tokenAReserves();
    console.log("tokenAReserve", tokenAReserve);
    let tokenBReserve = await pairContract.tokenBReserves();
    console.log("tokenBReserve", tokenBReserve);

    let tx1 = await token0.approve(twamm.address, initialLPSupply); //owner calls it
    await tx1.wait();
    tx1 = await token1.approve(twamm.address, initialLPSupply);
    await tx1.wait();
    tx1 = await twamm.addInitialLiquidity(
      token0Addr,
      token1Addr,
      initialLPSupply,
      initialLPSupply,
      timeStamp + 300
    );
    await tx1.wait();
    console.log("initial provide liquidity completed");
  } catch (error) {
    console.log(
      "initial liquidity might be provided, add more liquidity instead."
    );
    // uncomment below to enable add liquidity
    const newLPTokens = continualLPSupply;
    const allowance = ethers.utils.parseUnits("100");
    tx1 = await token0.approve(twamm.address, allowance);
    await tx1.wait();
    tx1 = await token1.approve(twamm.address, allowance);
    await tx1.wait();

    await twamm.addLiquidity(
      token0Addr,
      token1Addr,
      newLPTokens,
      allowance,
      allowance,
      timeStamp + 500
    );
  }

  let [reserve0, reserve1] = await twamm.obtainReserves(
    token0.address,
    token1.address
  );

  console.log("reserve0: ", reserve0);
  console.log("reserve1: ", reserve1);

  // perform instant swap
  // console.log('instant swap');
  // await token0.approve(twamm.address, instantSwapAmount);
  // await twamm.instantSwapTokenToToken(
  //     token0.address,
  //     token1.address,
  //     instantSwapAmount,
  //     timeStamp + 700
  // );

  // perform term swap
  let pairContract = await ethers.getContractAt("Pair", pairAddr);
  console.log("term swap");
  let tx = await token0.approve(twamm.address, termSwapAmount);
  await tx.wait();
  let orderId = await twamm.longTermSwapTokenToToken(
    token0.address,
    token1.address,
    termSwapAmount,
    numIntervalUnits,
    timeStamp + 300
  );
  await orderId.wait();
  console.log("get orderId", orderId);

  // // first part: for cancel order
  // console.log('get order Ids');
  // let orderIds = await pair.userIdsCheck(account.getAddress());
  // let s = Object.values(Object.keys(orderIds))[Object.keys(orderIds).length-1] ;
  // console.log("s: ", s);
  // console.log('cancel order ', orderIds);
  // currentBlockNumber = await ethers.provider.getBlockNumber();
  // timeStamp = (await ethers.provider.getBlock(currentBlockNumber)).timestamp;
  // await twamm.cancelTermSwapTokenToToken(
  //             token0.address,
  //             token1.address,
  //             Object.values(Object.keys(orderIds))[Object.keys(orderIds).length-1],
  //           // orderIds[0],
  //             timeStamp + 100
  //           );

  // second part: for order withdrawal
  await sleep(10000);
  let orderIds = await pairContract.userIdsCheck(account.getAddress());
  console.log("get orderIds", orderIds);
  console.log("withdraw order");
  tx1 = await twamm.withdrawProceedsFromTermSwapTokenToToken(
    token0.address,
    token1.address,
    Object.values(Object.keys(orderIds))[Object.keys(orderIds).length - 1],
    timeStamp + 500
  );
  await tx1.wait();
  let [reserve2, reserve3] = await twamm.obtainReserves(
    token0.address,
    token1.address
  );

  console.log("reserve0: ", reserve2);
  console.log("reserve1: ", reserve3);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
