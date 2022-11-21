const hre = require("hardhat");
const ethers = hre.ethers;

async function main() {
  const [account] = await ethers.getSigners();
  console.log("Account Address:", await account.getAddress());
  console.log("Account balance:", (await account.getBalance()).toString());

  const token0Addr = "0x0F0a8A04100c73C3c443f9a2F09Cf5c464d00c9f";
  const token1Addr = "0x2340fC6b74d5B44248698C04C8EaaeB6549B7Edb";

  const tokenAAddr = token0Addr < token1Addr ? token0Addr : token1Addr;
  console.log("tokenAAddr:", tokenAAddr);

  // loading necessary contracts
  const TWAMMAddr = "0xdF9E82787Baf7D5A4DE8059d98F0eBeb18c8cf92";
  const twamm = await ethers.getContractAt("TWAMM", TWAMMAddr);

  const pairAddr = await twamm.obtainPairAddress(token0Addr, token1Addr);
  let pair = await ethers.getContractAt("Pair", pairAddr);

  let currentBlockNumber = await ethers.provider.getBlockNumber();
  console.log("current block number", currentBlockNumber);

  let orderIds = await pair.userIdsCheck(account.getAddress());
  console.log("get orderIds", orderIds.toString());
  let orderId = Object.values(Object.keys(orderIds))[
    Object.keys(orderIds).length - 11
  ];
  let order = await pair.getOrderDetails(orderId);
  console.log("get order:", order.toString());
  let orderStatus = await pair.orderIdStatusCheck(orderId);
  console.log("get order status:", orderStatus.toString());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
