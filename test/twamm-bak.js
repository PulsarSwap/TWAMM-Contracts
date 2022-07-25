const { expect } = require("chai");
const { parseUnits } = require("ethers/lib/utils");
const { ethers } = require("hardhat");

describe("TWAMM", function () {
  let token0;
  let token1;
  let token;
  let twamm;
  let twammInstantSwap;
  let twammTermSwap;
  let twammLiquidity;
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

  const testDAOAmount = ethers.utils.parseUnits("10000000000000000000"); //1000000000;
  const totalNBlockIntervals = 10000;

  const blockInterval = 5;

  const initialLiquidityProvided = ethers.utils.parseUnits("10"); //1000000;
  const ERC20Supply = ethers.utils.parseUnits("100000000000000000000000");

  beforeEach(async function () {
    // network basics
    await network.provider.send("evm_setAutomine", [true]);
    [owner, addr0, addr1, ...addrs] = await ethers.getSigners();

    //factory deployment
    const Factory = await ethers.getContractFactory("Factory");
    factory = await Factory.deploy();

    //deploy three tokens and WETH for pair creation
    const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
    token = await ERC20Factory.deploy("Token", "Token", ERC20Supply);
    token0 = await ERC20Factory.deploy("Token0", "Token0", ERC20Supply);
    token1 = await ERC20Factory.deploy("Token1", "Token1", ERC20Supply);

    const Weth = await ethers.getContractFactory("WETH10");
    WETH = await Weth.deploy();
    expect(await WETH.symbol()).to.equal("WETH10");

    // TWAMM init
    const TWAMMInstantSwap = await ethers.getContractFactory(
      "TWAMMInstantSwap",
      {
        gasLimit: "8000000",
      }
    );
    twammInstantSwap = await TWAMMInstantSwap.deploy(
      factory.address,
      WETH.address
    );

    const TWAMMTermSwap = await ethers.getContractFactory("TWAMMTermSwap", {
      gasLimit: "8000000",
    });
    twammTermSwap = await TWAMMTermSwap.deploy(factory.address, WETH.address);

    const TWAMMLiquidity = await ethers.getContractFactory("TWAMMLiquidity", {
      gasLimit: "8000000",
    });
    twammLiquidity = await TWAMMLiquidity.deploy(factory.address, WETH.address);

    const TWAMM = await ethers.getContractFactory("TWAMM", {
      gasLimit: "8000000",
    });
    twamm = await TWAMM.deploy(
      factory.address,
      WETH.address,
      twammInstantSwap.address,
      twammTermSwap.address,
      twammLiquidity.address
    );
    // create pair and initialize liquidity for the pair
    blockNumber = await ethers.provider.getBlockNumber();
    timeStamp = (await ethers.provider.getBlock(blockNumber)).timestamp;

    await twamm.createPairWrapper(
      token0.address,
      token1.address,
      timeStamp + 50000
    );
    pair = await twamm.obtainPairAddress(token0.address, token1.address);
    await token0.approve(pair, initialLiquidityProvided); //owner calls it
    await token1.approve(pair, initialLiquidityProvided);
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
    await WETH.approve(pairETH, initialLiquidityProvided);
    await token.approve(pairETH, initialLiquidityProvided);
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
      await token0.connect(owner).approve(pair, testDAOAmount);
      await token1.connect(owner).approve(pair, testDAOAmount);
      blockNumber = await ethers.provider.getBlockNumber();
      timeStamp = (await ethers.provider.getBlock(blockNumber)).timestamp;
      await twammTermSwap.longTermSwapTokenToToken(
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
        await token1.connect(addrs[idx]).approve(pair, testDAOAmount.div(10));
        blockNumber = await ethers.provider.getBlockNumber();
        timeStamp = (await ethers.provider.getBlock(blockNumber)).timestamp;
        await twammTermSwap
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
