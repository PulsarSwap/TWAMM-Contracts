const { parseUnits } = require("ethers/lib/utils");
const { ethers } = require("hardhat");

async function main() {
  const [account] = await ethers.getSigners();
  console.log("Account Address:", await account.getAddress());
  console.log("Account balance:", (await account.getBalance()).toString());

  // loading necessary contracts
  const TWAMMAddr = "0xdF9E82787Baf7D5A4DE8059d98F0eBeb18c8cf92";
  const twamm = await ethers.getContractAt("TWAMM", TWAMMAddr);

  const token0Addr = "0x0F0a8A04100c73C3c443f9a2F09Cf5c464d00c9f";
  const token0 = await ethers.getContractAt("ERC20Mock", token0Addr);
  const token1Addr = "0x2340fC6b74d5B44248698C04C8EaaeB6549B7Edb";
  const token1 = await ethers.getContractAt("ERC20Mock", token1Addr);

  let currentBlockNumber = await ethers.provider.getBlockNumber();
  let timeStamp = (await ethers.provider.getBlock(currentBlockNumber))
    .timestamp;
  console.log("current block number", currentBlockNumber);

  const pairAddr = await twamm.obtainPairAddress(token0Addr, token1Addr);
  const pair = await ethers.getContractAt("Pair", pairAddr);
  console.log("pair address check", pairAddr);

  let orderIds = await pair.userIdsCheck(account.getAddress());
  console.log("get orderIds:", orderIds.toString());

  let orderId = Object.values(Object.keys(orderIds))[
    Object.keys(orderIds).length - 1
  ];
  let order = await pair.getOrderDetails(orderId);
  console.log("get order:", order.toString());

  let orderId1 = Object.values(Object.keys(orderIds))[
    Object.keys(orderIds).length - 2
  ];
  let order1 = await pair.getOrderDetails(orderId1);
  console.log("get order1:", order1.toString());

  let orderId2 = Object.values(Object.keys(orderIds))[
    Object.keys(orderIds).length - 3
  ];
  let order2 = await pair.getOrderDetails(orderId2);
  console.log("get order2:", order2.toString());

  let orderId3 = Object.values(Object.keys(orderIds))[
    Object.keys(orderIds).length - 4
  ];
  let order3 = await pair.getOrderDetails(orderId3);
  console.log("get order3:", order3.toString());

  let orderId4 = Object.values(Object.keys(orderIds))[
    Object.keys(orderIds).length - 5
  ];
  let order4 = await pair.getOrderDetails(orderId4);
  console.log("get order4:", order4.toString());

  let orderId5 = Object.values(Object.keys(orderIds))[
    Object.keys(orderIds).length - 6
  ];
  let order5 = await pair.getOrderDetails(orderId5);
  console.log("get order5:", order5.toString());

  let orderId6 = Object.values(Object.keys(orderIds))[
    Object.keys(orderIds).length - 7
  ];
  let order6 = await pair.getOrderDetails(orderId6);
  console.log("get order6:", order6.toString());

  let orderId7 = Object.values(Object.keys(orderIds))[
    Object.keys(orderIds).length - 8
  ];
  let order7 = await pair.getOrderDetails(orderId7);
  console.log("get order7:", order7.toString());

  let orderId8 = Object.values(Object.keys(orderIds))[
    Object.keys(orderIds).length - 9
  ];
  let order8 = await pair.getOrderDetails(orderId8);
  console.log("get order8:", order8.toString());

  let orderId9 = Object.values(Object.keys(orderIds))[
    Object.keys(orderIds).length - 10
  ];
  let order9 = await pair.getOrderDetails(orderId9);
  console.log("get order9:", order9.toString());

  let orderId10 = Object.values(Object.keys(orderIds))[
    Object.keys(orderIds).length - 11
  ];
  let order10 = await pair.getOrderDetails(orderId10);
  console.log("get order10:", order10.toString());

  let orderId11 = Object.values(Object.keys(orderIds))[
    Object.keys(orderIds).length - 12
  ];
  let order11 = await pair.getOrderDetails(orderId11);
  console.log("get order11:", order11.toString());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
