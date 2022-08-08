import { BigNumber } from "@ethersproject/bignumber";
import executeVirtualOrders from "./twamm-execute";
const hre = require("hardhat");
const ethers = hre.ethers;

async function main() {
  const [account] = await ethers.getSigners();
  console.log("Account Address:", await account.getAddress());
  console.log("Account balance:", (await account.getBalance()).toString());

  const token0Addr = "0xb0751fACbCcF598787c351Ce9541a4b203504c41";
  const token1Addr = "0x419E14a156daA5159ad73D36313E3520ff2a3F57";

  const tokenAAddr = token0Addr < token1Addr ? token0Addr : token1Addr;

  // loading necessary contracts
  const TWAMMAddr = "0xFe2E5fCe86495560574270f1F97a5ce9f534Cf94";
  const twamm = await ethers.getContractAt("ITWAMM", TWAMMAddr);

  const pairAddr = await twamm.obtainPairAddress(token0Addr, token1Addr);
  let pair = await ethers.getContractAt("Pair", pairAddr);

  let currentBlockNumber = await ethers.provider.getBlockNumber();
  console.log("current block number", currentBlockNumber);

  let reserveA: BigNumber;
  let reserveB: BigNumber;

  let lastVirtualOrderBlock: number;
  let currentSalesRateA: BigNumber;
  let currentSalesRateB: BigNumber;
  let rewardFactorA: BigNumber;
  let rewardFactorB: BigNumber;

  let withdrawableProceeds: BigNumber;
  let orderRewardFactorAtSubmission: BigNumber;

  let orderIds = await pair.userIdsCheck(account.getAddress());
  console.log("get orderIds", orderIds);
  let orderId = Object.values(Object.keys(orderIds))[
    Object.keys(orderIds).length - 1
  ];

  let { expirationBlock, saleRate, sellTokenId } = await pair.getOrderDetails(
    orderId
  );

  orderRewardFactorAtSubmission = await pair.getOrderRewardFactorAtSubmission(
    orderId
  );

  if (currentBlockNumber >= expirationBlock) {
    [
      reserveA,
      reserveB,
      lastVirtualOrderBlock,
      currentSalesRateA,
      currentSalesRateB,
      rewardFactorA,
      rewardFactorB,
    ] = await executeVirtualOrders(expirationBlock);

    if (sellTokenId == tokenAAddr) {
      withdrawableProceeds = rewardFactorA
        .sub(orderRewardFactorAtSubmission)
        .mul(saleRate)
        .mul(97)
        .div(100);
    } else {
      withdrawableProceeds = rewardFactorB
        .sub(orderRewardFactorAtSubmission)
        .mul(saleRate)
        .mul(97)
        .div(100);
    }
    console.log("withdrawableProceeds", withdrawableProceeds);
  } else {
    [
      reserveA,
      reserveB,
      lastVirtualOrderBlock,
      currentSalesRateA,
      currentSalesRateB,
      rewardFactorA,
      rewardFactorB,
    ] = await executeVirtualOrders(currentBlockNumber);

    if (sellTokenId == tokenAAddr) {
      console.log("til current block");
      withdrawableProceeds = rewardFactorA
        .sub(orderRewardFactorAtSubmission)
        .mul(saleRate)
        .mul(97)
        .div(100);
    } else {
      console.log("til current block");
      withdrawableProceeds = rewardFactorB
        .sub(orderRewardFactorAtSubmission)
        .mul(saleRate)
        .mul(97)
        .div(100);
    }
    console.log("withdrawableProceeds", withdrawableProceeds);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });