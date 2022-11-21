const { expect } = require("chai");
const { parseUnits } = require("ethers/lib/utils");
const { ethers } = require("hardhat");

describe("TWAMM", function () {
  let token0;
  let token1;
  let token;
  let twamm;
  let owner;
  let addr0;
  let addr1;
  let addrs;
  let factory;
  let WETH;
  let pair;
  let blockNumber;
  let timeStamp;

  const blockInterval = 5;

  const initialLiquidityProvided = ethers.utils.parseUnits("10000000");
  const newLPTokens = ethers.utils.parseUnits("10000000");
  const ERC20Supply = ethers.utils.parseUnits("100000000000000000");

  beforeEach(async function () {
    // network basics
    await network.provider.send("evm_setAutomine", [true]);
    [owner, addr0, addr1, ...addrs] = await ethers.getSigners();

    const transferHelperLib = await (
      await ethers.getContractFactory("TransferHelper")
    ).deploy();

    const orderPoolLib = await (
      await ethers.getContractFactory("OrderPoolLib")
    ).deploy();

    const BinarySearchTreeLib = await (
      await ethers.getContractFactory("BinarySearchTreeLib")
    ).deploy();

    const longTermOrdersLib = await (
      await ethers.getContractFactory("LongTermOrdersLib", {
        libraries: {
          OrderPoolLib: orderPoolLib.address,
          BinarySearchTreeLib: BinarySearchTreeLib.address,
        },
      })
    ).deploy();

    const libraryLib = await (
      await ethers.getContractFactory("Library", {
        libraries: {
          LongTermOrdersLib: longTermOrdersLib.address,
          BinarySearchTreeLib: BinarySearchTreeLib.address,
        },
      })
    ).deploy();

    //factory deployment
    const Factory = await ethers.getContractFactory("Factory", {
      libraries: {
        LongTermOrdersLib: longTermOrdersLib.address,
        BinarySearchTreeLib: BinarySearchTreeLib.address,
      },
    });
    factory = await Factory.deploy(owner.address);

    await factory.setFeeTo(addr0.address);
    console.log("fee on is opened", addr0.address);

    await factory.setFeeArg(1);
    console.log("fee arg is settled", 1);

    //deploy three tokens and WETH for pair creation
    const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
    // token = await ERC20Factory.deploy("Token", "Token", ERC20Supply);
    token0 = await ERC20Factory.deploy("USDA", "USDA", ERC20Supply);
    token1 = await ERC20Factory.deploy("USDB", "USDB", ERC20Supply);

    const tokenAAddr =
      token0.address < token1.address ? token0.address : token1.address;
    console.log("token0ddr:", token0.address);
    console.log("token1ddr:", token1.address);
    console.log("tokenAAddr:", tokenAAddr);

    const Weth = await ethers.getContractFactory("WETH9");
    WETH = await Weth.deploy();
    expect(await WETH.symbol()).to.equal("WETH");

    // TWAMM init
    const TWAMM = await ethers.getContractFactory("TWAMM", {
      libraries: {
        Library: libraryLib.address,
        TransferHelper: transferHelperLib.address,
      },
    });
    twamm = await TWAMM.deploy(factory.address, WETH.address);

    // create pair and initialize liquidity for the pair
    blockNumber = await ethers.provider.getBlockNumber();
    timeStamp = (await ethers.provider.getBlock(blockNumber)).timestamp;

    await twamm.createPairWrapper(
      token0.address,
      token1.address,
      timeStamp + 50000
    );

    pairAddr = await twamm.obtainPairAddress(token0.address, token1.address);
    pair = await ethers.getContractAt("Pair", pairAddr);
    console.log("check pair address", pairAddr);

    await token0.approve(twamm.address, initialLiquidityProvided); //owner calls it
    await token1.approve(twamm.address, initialLiquidityProvided);
    await twamm.addInitialLiquidity(
      token0.address,
      token1.address,
      initialLiquidityProvided,
      initialLiquidityProvided,
      timeStamp + 100000
    );
    console.log("Initial Setup Finished");

    console.log("Providing Liquidity Start");
    await token0.approve(twamm.address, ERC20Supply); //owner calls it
    await token1.approve(twamm.address, ERC20Supply);
    await twamm.addLiquidity(
      token0.address,
      token1.address,
      newLPTokens,
      ERC20Supply,
      ERC20Supply,
      timeStamp + 100000
    );

    // const liquidityBalance = await pair.balanceOf(addr0.address);
    // console.log("fee to liquidity balance:", liquidityBalance.toString());

    console.log("Term Swap A");
    const amountIn0 = ethers.utils.parseUnits("1000000000000000");
    await token0.approve(twamm.address, amountIn0); //owner calls it
    await twamm.longTermSwapTokenToToken(
      token0.address,
      token1.address,
      amountIn0,
      2000,
      timeStamp + 100000
    );

    console.log("Term Swap B");
    const amountIn1 = ethers.utils.parseUnits("100000000000000");
    await token1.approve(twamm.address, amountIn1); //owner calls it
    await twamm.longTermSwapTokenToToken(
      token1.address,
      token0.address,
      amountIn1,
      2000,
      timeStamp + 100000
    );

    // console.log("Instant Swap C");
    // const amountIn2 = 1000000;
    // await token0.approve(twamm.address, amountIn2); //owner calls it
    // await twamm.instantSwapTokenToToken(
    //   token0.address,
    //   token1.address,
    //   amountIn2,
    //   0,
    //   timeStamp + 100000
    // );

    // console.log("Instant Swap D");
    // const amountIn3 = 1000000;
    // await token1.approve(twamm.address, amountIn3); //owner calls it
    // await twamm.instantSwapTokenToToken(
    //   token1.address,
    //   token0.address,
    //   amountIn3,
    //   0,
    //   timeStamp + 100000
    // );
  });

  describe("Execute Orders Check", function () {
    it("Execute Orders Check", async function () {
      console.log("Execute Orders");

      //move blocks forward, and execute virtual orders
      await mineBlocks(100 * blockInterval);
      blockNumber = await ethers.provider.getBlockNumber();
      await twamm.executeVirtualOrdersWrapper(pairAddr, blockNumber);

      // const newLPTokens = 1000000;
      // await token0.approve(twamm.address, ERC20Supply); //owner calls it
      // await token1.approve(twamm.address, ERC20Supply);

      // await twamm.addLiquidity(
      //   token0.address,
      //   token1.address,
      //   newLPTokens,
      //   ERC20Supply,
      //   ERC20Supply,
      //   timeStamp + 100000
      // );

      // const liquidityBalance = await pair.balanceOf(addr0.address);
      // console.log("fee to liquidity balance:", liquidityBalance.toString());
    });

    // it("Mint Fee Check", async function () {
    //   const liquidityToRemove = initialLiquidityProvided / 2;
    //   await twamm.withdrawLiquidity(
    //     token0.address,
    //     token1.address,
    //     liquidityToRemove,
    //     0,
    //     0,
    //     timeStamp + 100000
    //   );
    // });
  });
});

async function mineBlocks(blockNumber) {
  for (let i = 0; i < blockNumber; i++) {
    await network.provider.send("evm_mine");
  }
}
