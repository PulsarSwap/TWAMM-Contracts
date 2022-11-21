const { parseUnits } = require("ethers/lib/utils");
const { ethers } = require("hardhat");

async function main() {
  const [account] = await ethers.getSigners();
  console.log("Account Address:", await account.getAddress());
  console.log("Account balance:", (await account.getBalance()).toString());

  const initialLiquidityProvided = ethers.utils.parseUnits("100");
  const continualLPSupply = ethers.utils.parseUnits("100");
  const termSwapAmount = ethers.utils.parseUnits("10");
  const numIntervalUnits = 100;
  const ERC20Supply = ethers.utils.parseUnits("1000000");

  // loading necessary contracts
  const TWAMMAddr = "0xdF9E82787Baf7D5A4DE8059d98F0eBeb18c8cf92";
  const twamm = await ethers.getContractAt("TWAMM", TWAMMAddr);

  const token0Addr = "0x0F0a8A04100c73C3c443f9a2F09Cf5c464d00c9f";
  const token0 = await ethers.getContractAt("ERC20Mock", token0Addr);
  const token1Addr = "0x2340fC6b74d5B44248698C04C8EaaeB6549B7Edb";
  const token1 = await ethers.getContractAt("ERC20Mock", token1Addr);
  // const token0Balance = await token0.balanceOf(owner.address);
  // const token1Balance = await token1.balanceOf(owner.address);

  // deploy two tokens for pair creation
  // const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
  // const token0 = await ERC20Factory.deploy("Token0", "Token0", ERC20Supply);
  // const token0Addr = token0.address;
  // console.log("token0 address", token0Addr);
  // const token1 = await ERC20Factory.deploy("Token1", "Token1", ERC20Supply);
  // const token1Addr = token1.address;
  // console.log("token1 address", token1Addr);

  let currentBlockNumber = await ethers.provider.getBlockNumber();
  let timeStamp = (await ethers.provider.getBlock(currentBlockNumber))
    .timestamp;
  console.log("current block number", currentBlockNumber);

  // // create pair and initialize liquidity for the pair
  // try {
  //   await twamm.createPairWrapper(token0Addr, token1Addr, timeStamp + 50000);
  //   console.log("create pair successfully");
  // } catch (error) {
  //   console.log(
  //     "continue without pair creation, the pair might be created already."
  //   );
  // }

  const pairAddr = await twamm.obtainPairAddress(token0Addr, token1Addr);
  const pair = await ethers.getContractAt("Pair", pairAddr);
  console.log("pair address check", pairAddr);

  // try {
  //   console.log("add initial liquidity");
  //   let tx0 = await token0.approve(twamm.address, initialLiquidityProvided); //owner calls it
  //   await tx0.wait();
  //   let tx1 = await token1.approve(twamm.address, initialLiquidityProvided);
  //   await tx1.wait();
  //   let tx2 = await twamm.addInitialLiquidity(
  //     token0Addr,
  //     token1Addr,
  //     initialLiquidityProvided,
  //     initialLiquidityProvided,
  //     timeStamp + 10000
  //   );
  //   await tx2.wait();
  //   console.log("initial provide liquidity completed");
  // } catch (error) {
  //   console.log(
  //     "initial liquidity might be provided, add more liquidity instead."
  //   );
  // }

  // const newLPTokens = continualLPSupply;
  // const allowance = ethers.utils.parseUnits("10000");
  // let tx3 = await token0.approve(twamm.address, allowance);
  // await tx3.wait();
  // let tx4 = await token1.approve(twamm.address, allowance);
  // await tx4.wait();
  // let tx5 = await twamm.addLiquidity(
  //   token0Addr,
  //   token1Addr,
  //   newLPTokens,
  //   allowance,
  //   allowance,
  //   timeStamp + 6000,
  //   { gasLimit: 3e7 }
  // );
  // await tx5.wait();
  // console.log("more liquidity added.");

  console.log("term swap");
  let tx6 = await token0.approve(twamm.address, termSwapAmount);
  await tx6.wait();
  // let tx7 = await token1.approve(twamm.address, termSwapAmount);
  // await tx7.wait();
  let tx8 = await twamm.longTermSwapTokenToToken(
    token0.address,
    token1.address,
    termSwapAmount,
    numIntervalUnits,
    timeStamp + 6000,
    { gasLimit: 3e7 }
  );
  await tx8.wait();

  let tx9 = await token1.approve(twamm.address, termSwapAmount);
  await tx9.wait();
  // let tx10 = await token0.approve(twamm.address, termSwapAmount);
  // await tx10.wait();
  let tx11 = await twamm.longTermSwapTokenToToken(
    token1.address,
    token0.address,
    termSwapAmount,
    numIntervalUnits,
    timeStamp + 6000,
    { gasLimit: 3e7 }
  );
  await tx11.wait();

  let orderIds = await pair.userIdsCheck(account.getAddress());
  console.log("get orderIds:", orderIds.toString());

  let orderId = Object.values(Object.keys(orderIds))[
    Object.keys(orderIds).length - 1
  ];
  let order = await pair.getOrderDetails(orderId);
  console.log("get order:", order.toString());
  console.log("get order expirationBlock:", order[2].toString());

  let orderId1 = Object.values(Object.keys(orderIds))[
    Object.keys(orderIds).length - 2
  ];
  let order1 = await pair.getOrderDetails(orderId1);
  console.log("get order1:", order1.toString());
  console.log("get order1 expirationBlock:", order1[2].toString());

  // console.log("withdraw order");
  // let tx12 = await twamm.withdrawProceedsFromTermSwapTokenToToken(
  //   token0.address,
  //   token1.address,
  //   orderId1,
  //   timeStamp + 6000,
  //   { gasLimit: 3e7 }
  // );
  // await tx12.wait();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
