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

  const testBombAmount = ethers.utils.parseUnits("1000000");
  const unitBlockInterval = 200;

  const blockInterval = 5;

  const initialLiquidityProvided = ethers.utils.parseUnits("1000000000");
  const ERC20Supply = ethers.utils.parseUnits("1000000000000");

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

    // await twamm.createPairWrapper(
    //   token.address,
    //   WETH.address,
    //   timeStamp + 50000
    // );
    // pairETH = await twamm.obtainPairAddress(token.address, WETH.address);
    // await WETH.approve(twamm.address, initialLiquidityProvided);
    // await token.approve(twamm.address, initialLiquidityProvided);
    // await twamm.addInitialLiquidityETH(
    //   token.address,
    //   initialLiquidityProvided,
    //   initialLiquidityProvided,
    //   timeStamp + 100000,
    //   { value: initialLiquidityProvided }
    // );
    console.log("Initial Setup Finished");
  });

  describe("Bomb Orders Submit", function () {
    it("", async function () {
      this.timeout(1000000); // 10000 second timeout only for this test

      await token0.connect(owner).approve(twamm.address, ERC20Supply);
      await token1.connect(owner).approve(twamm.address, ERC20Supply);

      for (let i = 0; i < 100; i++) {
        // submit 200 long-term orders.
        blockNumber = await ethers.provider.getBlockNumber();
        timeStamp = (await ethers.provider.getBlock(blockNumber)).timestamp;

        console.log(`current for sellToken0 order ${i}`);
        await twamm.longTermSwapTokenToToken(
          token0.address,
          token1.address,
          testBombAmount,
          unitBlockInterval * (i + 1),
          timeStamp + 100000
        );

        console.log(`current for sellToken1 order ${i}`);
        await twamm.longTermSwapTokenToToken(
          token1.address,
          token0.address,
          testBombAmount,
          unitBlockInterval * (i + 1),
          timeStamp + 100000
        );
      }

      // await mineBlocks(1000);
      await hre.network.provider.send("hardhat_mine", ["0x2710"]);
      blockNumber = await ethers.provider.getBlockNumber();
      timeStamp = (await ethers.provider.getBlock(blockNumber)).timestamp;
      let tx = await twamm.executeVirtualOrdersWrapper(pair, blockNumber);
      let rcpt = await tx.wait();
      const gasSpent = ethers.BigNumber.from(
        rcpt.gasUsed.mul(rcpt.effectiveGasPrice)
      );
      console.log("gas spent", gasSpent, rcpt.effectiveGasPrice.toString());
    });
  });
});

async function mineBlocks(blockNumber) {
  for (let i = 0; i < blockNumber; i++) {
    await network.provider.send("evm_mine");
  }
}
