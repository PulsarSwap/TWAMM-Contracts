const hre = require("hardhat");
const ethers = hre.ethers;


async function main() {
  if (hre.network.name === "mainnet") {
    console.log("Deploying TWAMM to mainnet. Hit ctrl + c to abort");
  }

  const [account] = await ethers.getSigners();
  console.log(
    "Account Address:",
    await account.getAddress()
  );

  console.log("Account balance:", (await account.getBalance()).toString());

  //some hyperparameters
  const initialLPSupply = ethers.utils.parseUnits("10");
  const continualLPSupply = ethers.utils.parseUnits("1");
  const instantSwapAmount = ethers.utils.parseUnits("1");
  const termSwapAmount = ethers.utils.parseUnits("1");
  const numIntervalUnits = 10;
  const token0Addr = "0xA21bBa2Dcf4DcA321D13337e6b33A1D780B1dFAA";
  const token0 = await ethers.getContractAt("ERC20Mock", token0Addr);
  const token1Addr = "0x0EE834CBBAC3Ad3FB3Ecc6A1B6B130DaAb9adC7B";
  const token1 = await ethers.getContractAt("ERC20Mock", token1Addr);

  // loading necessary contracts
  const TWAMMAddr = "0xDb0F56C376fb178c1f1629374ADE3E5cECcF69D3";
  const twamm = await ethers.getContractAt("TWAMM", TWAMMAddr);

  const TWAMMLiquidityAddr = "0xE5bDf3dFFd442Bff6Aee60a79F0168bab54813c0";
  const twammLiquidity = await ethers.getContractAt("TWAMMLiquidity", TWAMMLiquidityAddr);

  const TWAMMInstantSwapAddr = "0xd6dDdD0542e6960f0C0d851333a5DD215F2CBdA8";
  const twammInstantSwap = await ethers.getContractAt("TWAMMInstantSwap", TWAMMInstantSwapAddr);

  const TWAMMTermSwapAddr = "0x7933583Fe13EAB71Db1C92cfc6C1F2596BDDCb3e";
  const twammTermSwap = await ethers.getContractAt("TWAMMTermSwap", TWAMMTermSwapAddr);

  const sleep = ms => new Promise(res => setTimeout(res, ms));

  
  
  //provide (initial) liquidity
  let currentBlockNumber = await ethers.provider.getBlockNumber();
  let timeStamp = (await ethers.provider.getBlock(currentBlockNumber)).timestamp;
  console.log('current block number', timeStamp);
  try {
    await twamm.createPairWrapper(token0Addr, token1Addr, timeStamp+100)
  } catch (error) {
    // console.log(error);
    console.log('continute without pair creation, the pair might be created already.');
  }
  const pairAddr = await twamm.obtainPairAddress(token0Addr, token1Addr);
  console.log('pair address check', pairAddr);

  sleep(10000)

  try {
    console.log('add initial liquidity')
    await token0.approve(pairAddr, initialLPSupply); //owner calls it
    await token1.approve(pairAddr, initialLPSupply);
    await twamm.addInitialLiquidity(
        token0Addr,
        token1Addr,
        initialLPSupply,
        initialLPSupply,
        timeStamp + 300
      );
  } catch (error) {
    // console.log(error);
    console.log('initial liquidity might be provided, add more liquidity instead.');
    //uncomment below to enable add liquidity
    const newLPTokens = continualLPSupply;
    await token0.approve(pairAddr, newLPTokens); 
    await token1.approve(pairAddr, newLPTokens);

    await twammLiquidity.addLiquidity(
        token0Addr,
        token1Addr,
        newLPTokens,
        timeStamp + 500
      );
  }

// perform instant swap
console.log('instant swap');
await token0.approve(pairAddr, instantSwapAmount);
await twammInstantSwap.instantSwapTokenToToken(
    token0.address,
    token1.address,
    instantSwapAmount,
    timeStamp + 700
);

// perform term swap
let pair = await ethers.getContractAt('Pair', pairAddr);

/////////////////first part: for cancel order //////////////////
console.log('term swap');
await token0.approve(pairAddr, termSwapAmount);
await twammTermSwap.longTermSwapTokenToToken(
    token0.address,
    token1.address,
    termSwapAmount,
    numIntervalUnits,
    timeStamp + 900
);

await sleep(10000);

console.log('get order Ids');
let orderIds = await pair.userIdsCheck(account.getAddress());

console.log('cancel order');
currentBlockNumber = await ethers.provider.getBlockNumber();
timeStamp = (await ethers.provider.getBlock(currentBlockNumber)).timestamp;
await twammTermSwap.cancelTermSwapTokenToToken(
            token0.address,
            token1.address,
            Object.values(Object.keys(orderIds))[Object.keys(orderIds).length-1],
            timeStamp + 100
          );

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
// console.log('withdraw order');
// await twammTermSwap.withdrawProceedsFromTermSwapTokenToToken(
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
