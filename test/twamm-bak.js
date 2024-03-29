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
  let pairETH;
  let blockNumber;
  let timeStamp;

  const testDAOAmount = ethers.utils.parseUnits("1000000000000000");
  const totalNBlockIntervals = 10000;

  const blockInterval = 5;

  const initialLiquidityProvided = ethers.utils.parseUnits("10");
  const ERC20Supply = ethers.utils.parseUnits("100000000000000000000000");

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
    console.log("fee on is opened");

    await factory.setFeeArg(1);
    console.log("fee arg is settled");

    //deploy three tokens and WETH for pair creation
    const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
    token = await ERC20Factory.deploy("Token", "Token", ERC20Supply);
    token0 = await ERC20Factory.deploy("Token0", "Token0", ERC20Supply);
    token1 = await ERC20Factory.deploy("Token1", "Token1", ERC20Supply);

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
    pair = await twamm.obtainPairAddress(token0.address, token1.address);
    await token0.approve(twamm.address, initialLiquidityProvided); //owner calls it
    await token1.approve(twamm.address, initialLiquidityProvided);
    await twamm.addInitialLiquidity(
      token0.address,
      token1.address,
      initialLiquidityProvided,
      initialLiquidityProvided,
      timeStamp + 100000
    );

    await twamm.createPairWrapper(
      token.address,
      WETH.address,
      timeStamp + 50000
    );
    pairETH = await twamm.obtainPairAddress(token.address, WETH.address);
    await WETH.approve(twamm.address, initialLiquidityProvided);
    await token.approve(twamm.address, initialLiquidityProvided);
    await twamm.addInitialLiquidityETH(
      token.address,
      initialLiquidityProvided,
      initialLiquidityProvided,
      timeStamp + 100000,
      { value: initialLiquidityProvided }
    );
    console.log("Initial Setup Finished");
  });

  describe("DAO Order Submit", function () {
    it("", async function () {
      await token0.connect(owner).approve(twamm.address, testDAOAmount);
      await token1.connect(owner).approve(twamm.address, testDAOAmount);
      blockNumber = await ethers.provider.getBlockNumber();
      timeStamp = (await ethers.provider.getBlock(blockNumber)).timestamp;
      await twamm.longTermSwapTokenToToken(
        token0.address,
        token1.address,
        testDAOAmount,
        totalNBlockIntervals,
        timeStamp + 100000
      );

      for (let idx = 0; idx < addrs.length; idx++) {
        // Runs 5 times, with values of step 0 through 4.
        await mineBlocks(1);
        console.log(`current for user ${idx}`);
        console.log(
          (await token1.balanceOf(owner.address)).gt(testDAOAmount.div(10))
        );
        await token1
          .connect(owner)
          .approve(addrs[idx].address, testDAOAmount.div(10));
        await token1
          .connect(owner)
          .transfer(addrs[idx].address, testDAOAmount.div(10));
        console.log(await token1.balanceOf(addrs[idx].address));
        await token1
          .connect(addrs[idx])
          .approve(twamm.address, testDAOAmount.div(10));
        blockNumber = await ethers.provider.getBlockNumber();
        timeStamp = (await ethers.provider.getBlock(blockNumber)).timestamp;
        await twamm
          .connect(addrs[idx])
          .longTermSwapTokenToToken(
            token1.address,
            token0.address,
            testDAOAmount.div(10),
            totalNBlockIntervals / 10,
            timeStamp + 100
          );
      }
    });
  });
});

async function mineBlocks(blockNumber) {
  for (let i = 0; i < blockNumber; i++) {
    await network.provider.send("evm_mine");
  }
}
