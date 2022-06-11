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

  const blockInterval = 5;

  const initialLiquidityProvided = 100000000;
  const ERC20Supply = ethers.utils.parseUnits("100");

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

  describe("Basic AMM", function () {
    describe("Providing Liquidity", function () {
      it("can't provide initial liquidity twice", async function () {
        const amount = 10000;
        await expect(
          twamm.addInitialLiquidity(
            token0.address,
            token1.address,
            amount,
            amount,
            timeStamp + 100000
          )
        ).to.be.revertedWith("Liquidity Has Already Been Provided");
      });

      it("(ETH)can't provide initial liquidity twice(ETH)", async function () {
        const amount = 10000;
        await expect(
          twamm.addInitialLiquidityETH(
            token.address,
            amount,
            amount,
            timeStamp + 100000,
            { value: amount }
          )
        ).to.be.revertedWith("Liquidity Has Already Been Provided");
      });

      it("LP token value is constant after mint", async function () {
        let totalSupply = await twamm.obtainTotalSupply(pair);

        let [token0Reserve, token1Reserve] = await twamm.obtainReserves(
          token0.address,
          token1.address
        );

        const initialToken0PerLP = token0Reserve / totalSupply;
        const initialToken1PerLP = token1Reserve / totalSupply;
        const newLPTokens = 10000;
        await token0.approve(pair, newLPTokens * initialToken0PerLP); //owner calls it
        await token1.approve(pair, newLPTokens * initialToken1PerLP);

        await twammLiquidity.addLiquidity(
          token0.address,
          token1.address,
          newLPTokens,
          timeStamp + 100000
        );

        totalSupply = await twamm.obtainTotalSupply(pair);

        [token0Reserve, token1Reserve] = await twamm.obtainReserves(
          token0.address,
          token1.address
        );

        const finalToken0PerLP = token0Reserve / totalSupply;
        const finalToken1PerLP = token1Reserve / totalSupply;

        expect(finalToken0PerLP).to.eq(initialToken0PerLP);
        expect(finalToken1PerLP).to.eq(initialToken1PerLP);
      });

      it("(ETH)LP token value is constant after mint(ETH)", async function () {
        let totalSupply = await twamm.obtainTotalSupply(pairETH);

        let [tokenReserve, ethReserve] = await twamm.obtainReserves(
          token.address,
          WETH.address
        );

        const initialTokenPerLP = tokenReserve / totalSupply;
        const initialETHPerLP = ethReserve / totalSupply;
        const newLPTokens = 10000;
        await WETH.approve(pairETH, newLPTokens * initialETHPerLP); //owner calls it
        await token.approve(pairETH, newLPTokens * initialTokenPerLP);

        await twammLiquidity.addLiquidityETH(
          token.address,
          newLPTokens,
          timeStamp + 100000,
          { value: newLPTokens * initialETHPerLP }
        );

        totalSupply = await twamm.obtainTotalSupply(pairETH);

        [tokenReserve, ethReserve] = await twamm.obtainReserves(
          token.address,
          WETH.address
        );

        const finalTokenPerLP = tokenReserve / totalSupply;
        const finalETHPerLP = ethReserve / totalSupply;

        expect(finalTokenPerLP).to.eq(initialTokenPerLP);
        expect(finalETHPerLP).to.eq(initialETHPerLP);
      });
    });

    describe("Removing Liquidity", function () {
      it("LP token value is constant after removing", async function () {
        let totalSupply = await twamm.obtainTotalSupply(pair);

        let [token0Reserve, token1Reserve] = await twamm.obtainReserves(
          token0.address,
          token1.address
        );

        const initialToken0PerLP = token0Reserve / totalSupply;
        const initialToken1PerLP = token1Reserve / totalSupply;

        const liquidityToRemove = initialLiquidityProvided / 2;
        await twammLiquidity.withdrawLiquidity(
          token0.address,
          token1.address,
          liquidityToRemove,
          timeStamp + 100000
        );

        totalSupply = await twamm.obtainTotalSupply(pair);

        [token0Reserve, token1Reserve] = await twamm.obtainReserves(
          token0.address,
          token1.address
        );

        const finalToken0PerLP = token0Reserve / totalSupply;
        const finalToken1PerLP = token1Reserve / totalSupply;

        expect(finalToken0PerLP).to.eq(initialToken0PerLP);
        expect(finalToken1PerLP).to.eq(initialToken1PerLP);
      });

      it("(ETH)LP token value is constant after removing(ETH)", async function () {
        let totalSupply = await twamm.obtainTotalSupply(pairETH);

        let [tokenReserve, ethReserve] = await twamm.obtainReserves(
          token.address,
          WETH.address
        );

        const initialTokenPerLP = tokenReserve / totalSupply;
        const initialETHPerLP = ethReserve / totalSupply;

        const liquidityToRemove = initialLiquidityProvided / 2;
        await twammLiquidity.withdrawLiquidityETH(
          token.address,
          liquidityToRemove,
          timeStamp + 100000
        );

        totalSupply = await twamm.obtainTotalSupply(pairETH);

        [tokenReserve, ethReserve] = await twamm.obtainReserves(
          token.address,
          WETH.address
        );
        const finalTokenPerLP = tokenReserve / totalSupply;
        const finalETHPerLP = ethReserve / totalSupply;

        expect(finalTokenPerLP).to.eq(initialTokenPerLP);
        expect(finalETHPerLP).to.eq(initialETHPerLP);
      });

      it("can't remove more than available liquidity", async function () {
        let totalSupply = await twamm.obtainTotalSupply(pair);

        const liquidityToRemove = initialLiquidityProvided * 2;

        await expect(
          twammLiquidity.withdrawLiquidity(
            token0.address,
            token1.address,
            liquidityToRemove,
            timeStamp + 100000
          )
        ).to.be.revertedWith("Not Enough Lp Tokens Available");
      });

      it("(ETH)can't remove more than available liquidity(ETH)", async function () {
        let totalSupply = await twamm.obtainTotalSupply(pairETH);

        const liquidityToRemove = initialLiquidityProvided * 2;

        await expect(
          twammLiquidity.withdrawLiquidityETH(
            token.address,
            liquidityToRemove,
            timeStamp + 100000
          )
        ).to.be.revertedWith("Not Enough Lp Tokens Available");
      });
    });

    describe("Instant Swaps", function () {
      it("instant swap expected amount", async function () {
        const amountIn = ethers.utils.parseUnits("1");
        const [token0Reserve, token1Reserve] = await twamm.obtainReserves(
          token0.address,
          token1.address
        );
        const expectedOutBeforeFees = token1Reserve
          .mul(amountIn)
          .div(token0Reserve.add(amountIn));

        //adjust for LP fee of 0.3%
        const expectedOutput = expectedOutBeforeFees.mul(1000 - 3).div(1000);
        await token0.approve(pair, amountIn); //owner calls it
        const beforeBalance = await token1.balanceOf(owner.address);
        await twammInstantSwap.instantSwapTokenToToken(
          token0.address,
          token1.address,
          amountIn,
          timeStamp + 100000
        );
        const afterBalance = await token1.balanceOf(owner.address);
        const actualOutput = afterBalance.sub(beforeBalance);
        expect(actualOutput).to.eq(expectedOutput);
      });

      it("(ETH)instant swap expected amount(ETH)", async function () {
        const amountTokenIn = ethers.utils.parseUnits("1");
        const [tokenReserve, ethReserve] = await twamm.obtainReserves(
          token.address,
          WETH.address
        );
        const expectedOutBeforeFees = ethReserve
          .mul(amountTokenIn)
          .div(tokenReserve.add(amountTokenIn));

        //adjust for LP fee of 0.3%
        const expectedOutput = expectedOutBeforeFees.mul(1000 - 3).div(1000);
        await token.approve(pairETH, amountTokenIn); //owner calls it
        const beforeBalance = await ethers.provider.getBalance(owner.address);

        const transaction = await twammInstantSwap.instantSwapTokenToETH(
          token.address,
          amountTokenIn,
          timeStamp + 100000
        );
        const receipt = await transaction.wait();
        const gasSpent = receipt.gasUsed.mul(receipt.effectiveGasPrice);

        const afterBalance = await ethers.provider.getBalance(owner.address);
        const expectedAfterBalance = ethers.BigNumber.from(beforeBalance)
          .add(ethers.BigNumber.from(expectedOutput))
          .sub(ethers.BigNumber.from(gasSpent));

        expect(afterBalance).to.eq(expectedAfterBalance);
      });

      it("(ETH)instant swap expected amount(ETH)", async function () {
        const amountETHIn = ethers.utils.parseUnits("1");
        const [tokenReserve, ethReserve] = await twamm.obtainReserves(
          token.address,
          WETH.address
        );
        const expectedOutBeforeFees = tokenReserve
          .mul(amountETHIn)
          .div(ethReserve.add(amountETHIn));

        //adjust for LP fee of 0.3%
        const expectedOutput = expectedOutBeforeFees.mul(1000 - 3).div(1000);
        await WETH.approve(pairETH, amountETHIn); //owner calls it
        const beforeBalance = await token.balanceOf(owner.address);
        await twammInstantSwap.instantSwapETHToToken(
          token.address,
          amountETHIn,
          timeStamp + 100000,
          { value: amountETHIn }
        );
        const afterBalance = await token.balanceOf(owner.address);
        const actualOutput = afterBalance.sub(beforeBalance);

        expect(actualOutput).to.eq(expectedOutput);
      });
    });
  });

  describe("TWAMM Functionality ", function () {
    describe("Long Term Swaps", function () {
      it("single sided long term order behaves like normal swap", async function () {
        const amountIn = 10000;
        await token0.approve(addr0.address, amountIn);
        await token0.transfer(addr0.address, amountIn);

        //expected output
        const [token0Reserve, token1Reserve] = await twamm.obtainReserves(
          token0.address,
          token1.address
        );
        const expectedOutBeforeFees = token1Reserve
          .mul(amountIn)
          .div(token0Reserve.add(amountIn));

        const expectedOutput = expectedOutBeforeFees.mul(1000 - 3).div(1000);
        //trigger long term order
        token0.connect(addr0).approve(pair, amountIn);
        await twammTermSwap
          .connect(addr0)
          .longTermSwapTokenToToken(
            token0.address,
            token1.address,
            amountIn,
            2,
            timeStamp + 100000
          );

        //move blocks forward, and execute virtual orders
        await mineBlocks(3 * blockInterval);
        blockNumber = await ethers.provider.getBlockNumber();
        await twamm.executeVirtualOrdersWrapper(pair, blockNumber);

        //withdraw proceeds
        const beforeBalance = await token1.balanceOf(addr0.address);
        await twammTermSwap
          .connect(addr0)
          .withdrawProceedsFromTermSwapTokenToToken(
            token0.address,
            token1.address,
            0,
            timeStamp + 100000
          );
        const afterBalance = await token1.balanceOf(addr0.address);
        const actualOutput = afterBalance.sub(beforeBalance);

        //since we are breaking up order, match is not exact
        expect(actualOutput).to.be.closeTo(
          expectedOutput,
          ethers.utils.parseUnits("100", "wei")
        );
      });

      it("(ETH) single sided long term order behaves like normal swap (ETH)", async function () {
        const amountTokenIn = 10000;
        await token.approve(addr0.address, amountTokenIn);
        await token.transfer(addr0.address, amountTokenIn);

        //expected output
        const [tokenReserve, ethReserve] = await twamm.obtainReserves(
          token.address,
          WETH.address
        );
        const expectedOutBeforeFees = ethReserve
          .mul(amountTokenIn)
          .div(tokenReserve.add(amountTokenIn));

        const expectedOutput = expectedOutBeforeFees.mul(1000 - 3).div(1000);
        //trigger long term order
        token.connect(addr0).approve(pairETH, amountTokenIn);
        const transactionPart1 = await twammTermSwap
          .connect(addr0)
          .longTermSwapTokenToETH(
            token.address,
            amountTokenIn,
            2,
            timeStamp + 100000
          );

        const receiptPart1 = await transactionPart1.wait();
        const gasSpentPart1 = ethers.BigNumber.from(
          receiptPart1.gasUsed.mul(receiptPart1.effectiveGasPrice)
        );

        //move blocks forward, and execute virtual orders
        await mineBlocks(3 * blockInterval);
        blockNumber = await ethers.provider.getBlockNumber();
        await twamm.executeVirtualOrdersWrapper(pairETH, blockNumber);

        //withdraw proceeds
        const beforeBalance = await ethers.provider.getBalance(addr0.address);
        const transactionPart2 = await twammTermSwap
          .connect(addr0)
          .withdrawProceedsFromTermSwapTokenToETH(
            token.address,
            0,
            timeStamp + 100000
          );

        const receiptPart2 = await transactionPart2.wait();
        const gasSpentPart2 = ethers.BigNumber.from(
          receiptPart2.gasUsed.mul(receiptPart2.effectiveGasPrice)
        );
        const expectedAfterBalance = beforeBalance
          .add(ethers.BigNumber.from(expectedOutput))
          .sub(gasSpentPart2);
        const afterBalance = await ethers.provider.getBalance(addr0.address);

        expect(afterBalance).to.be.closeTo(
          expectedAfterBalance,
          ethers.utils.parseUnits("100", "wei")
        );
      });

      it("(ETH) single sided long term order behaves like normal swap (ETH)", async function () {
        const amountETHIn = 10000;

        //expected output
        const [tokenReserve, ethReserve] = await twamm.obtainReserves(
          token.address,
          WETH.address
        );
        const expectedOutBeforeFees = tokenReserve
          .mul(amountETHIn)
          .div(ethReserve.add(amountETHIn));

        const expectedOutput = expectedOutBeforeFees.mul(1000 - 3).div(1000);

        //trigger long term order
        WETH.connect(addr0).approve(pairETH, amountETHIn);
        await twammTermSwap
          .connect(addr0)
          .longTermSwapETHToToken(
            token.address,
            amountETHIn,
            2,
            timeStamp + 100000,
            { value: amountETHIn }
          );

        //move blocks forward, and execute virtual orders
        await mineBlocks(3 * blockInterval);
        blockNumber = await ethers.provider.getBlockNumber();
        await twamm.executeVirtualOrdersWrapper(pairETH, blockNumber);

        //withdraw proceeds
        const beforeBalance = await token.balanceOf(addr0.address);
        await twammTermSwap
          .connect(addr0)
          .withdrawProceedsFromTermSwapETHToToken(
            token.address,
            0,
            timeStamp + 100000
          );
        const afterBalance = await token.balanceOf(addr0.address);
        const actualOutput = afterBalance.sub(beforeBalance);

        //since we are breaking up order, match is not exact
        expect(actualOutput).to.be.closeTo(
          expectedOutput,
          ethers.utils.parseUnits("100", "wei")
        );
      });

      it("orders in both pools work as expected", async function () {
        const amountIn = 10000;

        await token0.approve(addr0.address, amountIn);
        await token1.approve(addr1.address, amountIn);

        await token0.transfer(addr0.address, amountIn);
        await token1.transfer(addr1.address, amountIn);

        //trigger long term order
        await token0.connect(addr0).approve(pair, amountIn);
        await token1.connect(addr1).approve(pair, amountIn);

        //trigger long term orders
        await twammTermSwap
          .connect(addr0)
          .longTermSwapTokenToToken(
            token0.address,
            token1.address,
            amountIn,
            2,
            timeStamp + 100000
          );
        await twammTermSwap
          .connect(addr1)
          .longTermSwapTokenToToken(
            token1.address,
            token0.address,
            amountIn,
            2,
            timeStamp + 100000
          );

        //move blocks forward, and execute virtual orders
        await mineBlocks(3 * blockInterval);
        blockNumber = await ethers.provider.getBlockNumber();
        await twamm.executeVirtualOrdersWrapper(pair, blockNumber);

        //withdraw proceeds
        await twammTermSwap
          .connect(addr0)
          .withdrawProceedsFromTermSwapTokenToToken(
            token0.address,
            token1.address,
            0,
            timeStamp + 100000
          );
        await twammTermSwap
          .connect(addr1)
          .withdrawProceedsFromTermSwapTokenToToken(
            token0.address,
            token1.address,
            1,
            timeStamp + 100000
          );

        const amount0Bought = await token0.balanceOf(addr1.address);
        const amount1Bought = await token1.balanceOf(addr0.address);

        //pool is balanced, and both orders execute same amount in opposite directions,
        //so we expect final balances to be roughly equal
        expect(amount0Bought).to.be.closeTo(amount1Bought, amountIn / 100);
      });

      it("(ETH) orders in both pools work as expected (ETH)", async function () {
        const amountIn = 10000;
        await token.approve(addr0.address, amountIn);
        await token.transfer(addr0.address, amountIn);

        await token.connect(addr0).approve(pairETH, amountIn);
        await WETH.connect(addr1).approve(pairETH, amountIn);

        //trigger long term orders
        const tx1 = await twammTermSwap
          .connect(addr0)
          .longTermSwapTokenToETH(
            token.address,
            amountIn,
            2,
            timeStamp + 100000
          );
        const tx2 = await twammTermSwap
          .connect(addr1)
          .longTermSwapETHToToken(
            token.address,
            amountIn,
            2,
            timeStamp + 100000,
            { value: amountIn }
          );

        //move blocks forward, and execute virtual orders
        await mineBlocks(3 * blockInterval);
        blockNumber = await ethers.provider.getBlockNumber();
        await twamm.executeVirtualOrdersWrapper(pairETH, blockNumber);

        //withdraw proceeds
        const beforeBalance = await ethers.provider.getBalance(addr0.address);

        const tx3 = await twammTermSwap
          .connect(addr0)
          .withdrawProceedsFromTermSwapTokenToETH(
            token.address,
            0,
            timeStamp + 100000
          );
        const tx4 = await twammTermSwap
          .connect(addr1)
          .withdrawProceedsFromTermSwapETHToToken(
            token.address,
            1,
            timeStamp + 100000
          );
        const rcpt1 = await tx1.wait();
        const gasSpent1 = ethers.BigNumber.from(
          rcpt1.gasUsed.mul(rcpt1.effectiveGasPrice)
        );
        const rcpt2 = await tx2.wait();
        const gasSpent2 = ethers.BigNumber.from(
          rcpt2.gasUsed.mul(rcpt2.effectiveGasPrice)
        );
        const rcpt3 = await tx3.wait();
        const gasSpent3 = ethers.BigNumber.from(
          rcpt3.gasUsed.mul(rcpt3.effectiveGasPrice)
        );
        const rcpt4 = await tx4.wait();
        const gasSpent4 = ethers.BigNumber.from(
          rcpt4.gasUsed.mul(rcpt4.effectiveGasPrice)
        );

        const afterBalance = await ethers.provider.getBalance(addr0.address);

        const amountETHBought = afterBalance.add(gasSpent3).sub(beforeBalance);
        const amountTokenBought = await token.balanceOf(addr1.address);

        //pool is balanced, and both orders execute same amount in opposite directions,
        //so we expect final balances to be roughly equal
        expect(amountETHBought).to.be.closeTo(
          amountTokenBought,
          amountIn / 100
        );
      });

      it("long term swap amounts are consistent with twamm formula", async function () {
        const token0In = 10000;
        const token1In = 2000;
        await token0.approve(addr0.address, token0In);
        await token1.approve(addr1.address, token1In);
        await token0.transfer(addr0.address, token0In);
        await token1.transfer(addr1.address, token1In);
        await token0.connect(addr0).approve(pair, token0In);
        await token1.connect(addr1).approve(pair, token1In);

        const [token0ReserveBeforeConvert, token1ReserveBeforeConvert] =
          await twamm.obtainReserves(token0.address, token1.address);
        const token0Reserve = token0ReserveBeforeConvert.toNumber();
        const token1Reserve = token1ReserveBeforeConvert.toNumber();
        const k = token0Reserve * token1Reserve;
        const c =
          (Math.sqrt(token0Reserve * token1In) -
            Math.sqrt(token1Reserve * token0In)) /
          (Math.sqrt(token0Reserve * token1In) +
            Math.sqrt(token1Reserve * token0In));

        const exponent = 2 * Math.sqrt((token0In * token1In) / k);

        const final0ReserveExpectedBeforeFees =
          (Math.sqrt((k * token0In) / token1In) * (Math.exp(exponent) + c)) /
          (Math.exp(exponent) - c);

        const final1ReserveExpectedBeforeFees =
          k / final0ReserveExpectedBeforeFees;

        const token0OutBeforeFees = Math.abs(
          token0Reserve - final0ReserveExpectedBeforeFees + token0In
        );
        const token1OutBeforeFees = Math.abs(
          token1Reserve - final1ReserveExpectedBeforeFees + token1In
        );

        const token0Out = (token0OutBeforeFees * 997) / 1000;
        const token1Out = (token1OutBeforeFees * 997) / 1000;

        const final0ReserveExpected =
          final0ReserveExpectedBeforeFees + (token0OutBeforeFees * 3) / 1000;

        const final1ReserveExpected =
          final1ReserveExpectedBeforeFees + (token1OutBeforeFees * 3) / 1000;

        //trigger long term orders
        await twammTermSwap
          .connect(addr0)
          .longTermSwapTokenToToken(
            token0.address,
            token1.address,
            token0In,
            2,
            timeStamp + 100000
          );
        await twammTermSwap
          .connect(addr1)
          .longTermSwapTokenToToken(
            token1.address,
            token0.address,
            token1In,
            2,
            timeStamp + 100000
          );

        //move blocks forward, and execute virtual orders
        await mineBlocks(22 * blockInterval);
        blockNumber = await ethers.provider.getBlockNumber();
        await twamm.executeVirtualOrdersWrapper(pair, blockNumber);

        //withdraw proceeds
        await twammTermSwap
          .connect(addr0)
          .withdrawProceedsFromTermSwapTokenToToken(
            token0.address,
            token1.address,
            0,
            timeStamp + 100000
          );
        await twammTermSwap
          .connect(addr1)
          .withdrawProceedsFromTermSwapTokenToToken(
            token0.address,
            token1.address,
            1,
            timeStamp + 100000
          );

        const amount0Bought = await token0.balanceOf(addr1.address);
        const amount1Bought = await token1.balanceOf(addr0.address);

        const [final0ReserveActual, final1ReserveActual] =
          await twamm.obtainReserves(token0.address, token1.address);

        //expect results to be within 1% of calculation
        expect(final0ReserveActual.toNumber()).to.be.closeTo(
          final0ReserveExpected,
          final0ReserveExpected / 100
        );
        expect(final1ReserveActual.toNumber()).to.be.closeTo(
          final1ReserveExpected,
          final1ReserveExpected / 100
        );

        expect(amount0Bought.toNumber()).to.be.closeTo(
          token0Out,
          token0Out / 100
        );
        expect(amount1Bought.toNumber()).to.be.closeTo(
          token1Out,
          token1Out / 100
        );
      });

      it("(ETH)long term swap amounts are consistent with twamm formula(ETH)", async function () {
        const tokenIn = 10000;
        const ethIn = 2000;
        await token.approve(addr0.address, tokenIn);
        await token.transfer(addr0.address, tokenIn);
        await token.connect(addr0).approve(pairETH, tokenIn);
        await WETH.connect(addr1).approve(pairETH, ethIn);

        const [tokenReserveBeforeConvert, ethReserveBeforeConvert] =
          await twamm.obtainReserves(token.address, WETH.address);
        const tokenReserve = tokenReserveBeforeConvert.toNumber();
        const ethReserve = ethReserveBeforeConvert.toNumber();
        const k = tokenReserve * ethReserve;
        const c =
          (Math.sqrt(tokenReserve * ethIn) - Math.sqrt(ethReserve * tokenIn)) /
          (Math.sqrt(tokenReserve * ethIn) + Math.sqrt(ethReserve * tokenIn));

        const exponent = 2 * Math.sqrt((tokenIn * ethIn) / k);

        const finalTokenReserveExpectedBeforeFees =
          (Math.sqrt((k * tokenIn) / ethIn) * (Math.exp(exponent) + c)) /
          (Math.exp(exponent) - c);

        const finalETHReserveExpectedBeforeFees =
          k / finalTokenReserveExpectedBeforeFees;

        const tokenOutBeforeFees = Math.abs(
          tokenReserve - finalTokenReserveExpectedBeforeFees + tokenIn
        );
        const ethOutBeforeFees = Math.abs(
          ethReserve - finalETHReserveExpectedBeforeFees + ethIn
        );

        const tokenOut = (tokenOutBeforeFees * 997) / 1000;
        const ethOut = (ethOutBeforeFees * 997) / 1000;

        const finalTokenReserveExpected =
          finalTokenReserveExpectedBeforeFees + (tokenOutBeforeFees * 3) / 1000;

        const finalETHReserveExpected =
          finalETHReserveExpectedBeforeFees + (ethOutBeforeFees * 3) / 1000;

        //trigger long term orders
        const tx1 = await twammTermSwap
          .connect(addr0)
          .longTermSwapTokenToETH(
            token.address,
            tokenIn,
            2,
            timeStamp + 100000
          );
        const tx2 = await twammTermSwap
          .connect(addr1)
          .longTermSwapETHToToken(token.address, ethIn, 2, timeStamp + 100000, {
            value: ethIn,
          });

        //move blocks forward, and execute virtual orders
        await mineBlocks(22 * blockInterval);
        blockNumber = await ethers.provider.getBlockNumber();
        await twamm.executeVirtualOrdersWrapper(pairETH, blockNumber);

        //withdraw proceeds
        const beforeBalance = await ethers.provider.getBalance(addr0.address);
        const tx3 = await twammTermSwap
          .connect(addr0)
          .withdrawProceedsFromTermSwapTokenToETH(
            token.address,
            0,
            timeStamp + 100000
          );
        const tx4 = await twammTermSwap
          .connect(addr1)
          .withdrawProceedsFromTermSwapETHToToken(
            token.address,
            1,
            timeStamp + 100000
          );

        const rcpt1 = await tx1.wait();
        const gasSpent1 = ethers.BigNumber.from(
          rcpt1.gasUsed.mul(rcpt1.effectiveGasPrice)
        );
        const rcpt2 = await tx2.wait();
        const gasSpent2 = ethers.BigNumber.from(
          rcpt2.gasUsed.mul(rcpt2.effectiveGasPrice)
        );
        const rcpt3 = await tx3.wait();
        const gasSpent3 = ethers.BigNumber.from(
          rcpt3.gasUsed.mul(rcpt3.effectiveGasPrice)
        );
        const rcpt4 = await tx4.wait();
        const gasSpent4 = ethers.BigNumber.from(
          rcpt4.gasUsed.mul(rcpt4.effectiveGasPrice)
        );

        const afterBalance = await ethers.provider.getBalance(addr0.address);

        const amountETHBought = afterBalance.add(gasSpent3).sub(beforeBalance);
        const amountTokenBought = await token.balanceOf(addr1.address);

        const [finalTokenReserveActual, finalETHReserveActual] =
          await twamm.obtainReserves(token.address, WETH.address);

        //expect results to be within 1.1% of calculation
        expect(finalTokenReserveActual.toNumber()).to.be.closeTo(
          finalTokenReserveExpected,
          finalTokenReserveExpected / 100
        );
        expect(finalETHReserveActual.toNumber()).to.be.closeTo(
          finalETHReserveExpected,
          finalETHReserveExpected / 100
        );

        expect(amountTokenBought.toNumber()).to.be.closeTo(
          tokenOut,
          tokenOut / 100
        );
        expect(amountETHBought.toNumber()).to.be.closeTo(ethOut, ethOut / 100);
      });

      it("multiple orders in both pools work as expected", async function () {
        const amountIn = 10000;
        await token0.approve(addr0.address, amountIn);
        await token1.approve(addr1.address, amountIn);
        await token0.transfer(addr0.address, amountIn);
        await token1.transfer(addr1.address, amountIn);

        //trigger long term order
        await token0.connect(addr0).approve(pair, amountIn);
        await token1.connect(addr1).approve(pair, amountIn);

        //trigger long term orders
        await twammTermSwap
          .connect(addr0)
          .longTermSwapTokenToToken(
            token0.address,
            token1.address,
            amountIn / 2,
            2,
            timeStamp + 100000
          );
        await twammTermSwap
          .connect(addr1)
          .longTermSwapTokenToToken(
            token1.address,
            token0.address,
            amountIn / 2,
            3,
            timeStamp + 100000
          );
        await twammTermSwap
          .connect(addr0)
          .longTermSwapTokenToToken(
            token0.address,
            token1.address,
            amountIn / 2,
            4,
            timeStamp + 100000
          );
        await twammTermSwap
          .connect(addr1)
          .longTermSwapTokenToToken(
            token1.address,
            token0.address,
            amountIn / 2,
            5,
            timeStamp + 100000
          );

        //move blocks forward, and execute virtual orders
        await mineBlocks(6 * blockInterval);
        blockNumber = await ethers.provider.getBlockNumber();
        await twamm.executeVirtualOrdersWrapper(pair, blockNumber);

        //withdraw proceeds
        await twammTermSwap
          .connect(addr0)
          .withdrawProceedsFromTermSwapTokenToToken(
            token0.address,
            token1.address,
            0,
            timeStamp + 100000
          );
        await twammTermSwap
          .connect(addr1)
          .withdrawProceedsFromTermSwapTokenToToken(
            token0.address,
            token1.address,
            1,
            timeStamp + 100000
          );
        await twammTermSwap
          .connect(addr0)
          .withdrawProceedsFromTermSwapTokenToToken(
            token0.address,
            token1.address,
            2,
            timeStamp + 100000
          );
        await twammTermSwap
          .connect(addr1)
          .withdrawProceedsFromTermSwapTokenToToken(
            token0.address,
            token1.address,
            3,
            timeStamp + 100000
          );

        const amount0Bought = await token0.balanceOf(addr1.address);
        const amount1Bought = await token1.balanceOf(addr0.address);

        //pool is balanced, and orders execute same amount in opposite directions,
        //so we expect final balances to be roughly equal
        expect(amount0Bought).to.be.closeTo(amount1Bought, amountIn / 100);
      });

      it("(ETH)multiple orders in both pools work as expected(ETH)", async function () {
        const amountIn = 10000;
        await token.approve(addr0.address, amountIn);
        await token.transfer(addr0.address, amountIn);

        //trigger long term order
        await token.connect(addr0).approve(pairETH, amountIn);
        await WETH.connect(addr1).approve(pairETH, amountIn);

        //trigger long term orders
        await twammTermSwap
          .connect(addr0)
          .longTermSwapTokenToETH(
            token.address,
            amountIn / 2,
            2,
            timeStamp + 100000
          );
        await twammTermSwap
          .connect(addr1)
          .longTermSwapETHToToken(
            token.address,
            amountIn / 2,
            3,
            timeStamp + 100000,
            { value: amountIn / 2 }
          );
        await twammTermSwap
          .connect(addr0)
          .longTermSwapTokenToETH(
            token.address,
            amountIn / 2,
            4,
            timeStamp + 100000
          );
        await twammTermSwap
          .connect(addr1)
          .longTermSwapETHToToken(
            token.address,
            amountIn / 2,
            5,
            timeStamp + 100000,
            { value: amountIn / 2 }
          );

        //move blocks forward, and execute virtual orders
        await mineBlocks(6 * blockInterval);
        blockNumber = await ethers.provider.getBlockNumber();
        await twamm.executeVirtualOrdersWrapper(pairETH, blockNumber);

        //withdraw proceeds
        const beforeBalance = await ethers.provider.getBalance(addr0.address);
        const tx1 = await twammTermSwap
          .connect(addr0)
          .withdrawProceedsFromTermSwapTokenToETH(
            token.address,
            0,
            timeStamp + 100000
          );
        const tx2 = await twammTermSwap
          .connect(addr1)
          .withdrawProceedsFromTermSwapETHToToken(
            token.address,
            1,
            timeStamp + 100000
          );
        const tx3 = await twammTermSwap
          .connect(addr0)
          .withdrawProceedsFromTermSwapTokenToETH(
            token.address,
            2,
            timeStamp + 100000
          );
        const tx4 = await twammTermSwap
          .connect(addr1)
          .withdrawProceedsFromTermSwapETHToToken(
            token.address,
            3,
            timeStamp + 100000
          );
        const rcpt1 = await tx1.wait();
        const gasSpent1 = ethers.BigNumber.from(
          rcpt1.gasUsed.mul(rcpt1.effectiveGasPrice)
        );
        const rcpt2 = await tx2.wait();
        const gasSpent2 = ethers.BigNumber.from(
          rcpt2.gasUsed.mul(rcpt2.effectiveGasPrice)
        );
        const rcpt3 = await tx3.wait();
        const gasSpent3 = ethers.BigNumber.from(
          rcpt3.gasUsed.mul(rcpt3.effectiveGasPrice)
        );
        const rcpt4 = await tx4.wait();
        const gasSpent4 = ethers.BigNumber.from(
          rcpt4.gasUsed.mul(rcpt4.effectiveGasPrice)
        );

        const afterBalance = await ethers.provider.getBalance(addr0.address);

        const amountETHBought = afterBalance
          .add(gasSpent3)
          .add(gasSpent1)
          .sub(beforeBalance);
        const amountTokenBought = await token.balanceOf(addr1.address);

        //pool is balanced, and orders execute same amount in opposite directions,
        //so we expect final balances to be roughly equal
        expect(amountTokenBought).to.be.closeTo(
          amountETHBought,
          amountIn / 100
        );
      });

      it("normal swap works as expected while long term orders are active", async function () {
        const amountIn = 10000;
        await token0.approve(addr0.address, amountIn);
        await token1.approve(addr1.address, amountIn);
        await token0.transfer(addr0.address, amountIn);
        await token1.transfer(addr1.address, amountIn);

        //trigger long term order
        await token0.connect(addr0).approve(pair, amountIn);
        await token1.connect(addr1).approve(pair, amountIn);

        //trigger long term orders
        await twammTermSwap
          .connect(addr0)
          .longTermSwapTokenToToken(
            token0.address,
            token1.address,
            amountIn,
            10,
            timeStamp + 100000
          );
        await twammTermSwap
          .connect(addr1)
          .longTermSwapTokenToToken(
            token1.address,
            token0.address,
            amountIn,
            10,
            timeStamp + 100000
          );

        //move blocks forward, and execute virtual orders
        await mineBlocks(3 * blockInterval);
        blockNumber = await ethers.provider.getBlockNumber();
        await twamm.executeVirtualOrdersWrapper(pair, blockNumber);

        //withdraw proceeds
        await twammTermSwap
          .connect(addr0)
          .withdrawProceedsFromTermSwapTokenToToken(
            token0.address,
            token1.address,
            0,
            timeStamp + 100000
          );
        await twammTermSwap
          .connect(addr1)
          .withdrawProceedsFromTermSwapTokenToToken(
            token0.address,
            token1.address,
            1,
            timeStamp + 100000
          );

        const amount0Bought = await token0.balanceOf(addr1.address);
        const amount1Bought = await token1.balanceOf(addr0.address);

        //pool is balanced, and both orders execute same amount in opposite directions,
        //so we expect final balances to be roughly equal
        expect(amount0Bought).to.be.closeTo(amount1Bought, amountIn / 100);
      });

      it("(ETH)normal swap works as expected while long term orders are active(ETH)", async function () {
        const amountIn = 10000;
        await token.approve(addr0.address, amountIn);
        await token.transfer(addr0.address, amountIn);

        //trigger long term order
        await token.connect(addr0).approve(pairETH, amountIn);
        await WETH.connect(addr1).approve(pairETH, amountIn);

        //trigger long term orders
        await twammTermSwap
          .connect(addr0)
          .longTermSwapTokenToETH(
            token.address,
            amountIn,
            10,
            timeStamp + 100000
          );
        await twammTermSwap
          .connect(addr1)
          .longTermSwapETHToToken(
            token.address,
            amountIn,
            10,
            timeStamp + 100000,
            { value: amountIn }
          );

        //move blocks forward, and execute virtual orders
        await mineBlocks(3 * blockInterval);
        blockNumber = await ethers.provider.getBlockNumber();
        await twamm.executeVirtualOrdersWrapper(pairETH, blockNumber);

        //withdraw proceeds
        const beforeBalance = await ethers.provider.getBalance(addr0.address);
        const tx1 = await twammTermSwap
          .connect(addr0)
          .withdrawProceedsFromTermSwapTokenToETH(
            token.address,
            0,
            timeStamp + 100000
          );
        const tx2 = await twammTermSwap
          .connect(addr1)
          .withdrawProceedsFromTermSwapETHToToken(
            token.address,
            1,
            timeStamp + 100000
          );

        const rcpt1 = await tx1.wait();
        const gasSpent1 = ethers.BigNumber.from(
          rcpt1.gasUsed.mul(rcpt1.effectiveGasPrice)
        );
        const rcpt2 = await tx2.wait();
        const gasSpent2 = ethers.BigNumber.from(
          rcpt2.gasUsed.mul(rcpt2.effectiveGasPrice)
        );

        const afterBalance = await ethers.provider.getBalance(addr0.address);

        const amountETHBought = afterBalance.add(gasSpent1).sub(beforeBalance);
        const amountTokenBought = await token.balanceOf(addr1.address);

        //pool is balanced, and both orders execute same amount in opposite directions,
        //so we expect final balances to be roughly equal
        expect(amountTokenBought).to.be.closeTo(
          amountETHBought,
          amountIn / 25 //only place that costs a bit more, but acceptable.
        );
      });
    });

    describe("Cancelling Orders", function () {
      it("order can be cancelled", async function () {
        const amountIn = 100000;
        await token0.approve(addr0.address, amountIn);
        await token0.transfer(addr0.address, amountIn);
        await token0.connect(addr0).approve(pair, amountIn);

        const balance0Before = await token0.balanceOf(addr0.address);
        const balance1Before = await token1.balanceOf(addr0.address);

        //trigger long term order
        await twammTermSwap
          .connect(addr0)
          .longTermSwapTokenToToken(
            token0.address,
            token1.address,
            amountIn,
            10,
            timeStamp + 100000
          );

        //move blocks forward, and execute virtual orders
        await mineBlocks(3 * blockInterval);
        await twammTermSwap
          .connect(addr0)
          .cancelTermSwapTokenToToken(
            token0.address,
            token1.address,
            0,
            timeStamp + 100000
          );

        const balance0After = await token0.balanceOf(addr0.address);
        const balance1After = await token1.balanceOf(addr0.address);

        //expect some amount of the order to be filled
        expect(balance0Before).to.be.gt(balance0After);
        expect(balance1Before).to.be.lt(balance1After);
      });

      it("(ETH)order can be cancelled(ETH)", async function () {
        const amountTokenIn = 100000;
        await token.connect(addr0).approve(pairETH, amountTokenIn);
        await token.transfer(addr0.address, amountTokenIn);
        await token.connect(addr0).approve(pairETH, amountTokenIn);

        const balanceTokenBefore = await token.balanceOf(addr0.address);
        const balanceETHBefore = await ethers.provider.getBalance(
          addr0.address
        );

        //trigger long term order
        const tx1 = await twammTermSwap
          .connect(addr0)
          .longTermSwapTokenToETH(
            token.address,
            amountTokenIn,
            10,
            timeStamp + 100000
          );

        //move blocks forward, and execute virtual orders
        await mineBlocks(3 * blockInterval);
        const tx2 = await twammTermSwap
          .connect(addr0)
          .cancelTermSwapTokenToETH(token.address, 0, timeStamp + 100000);

        const rcpt1 = await tx1.wait();
        const gasSpent1 = ethers.BigNumber.from(
          rcpt1.gasUsed.mul(rcpt1.effectiveGasPrice)
        );
        const rcpt2 = await tx2.wait();
        const gasSpent2 = ethers.BigNumber.from(
          rcpt2.gasUsed.mul(rcpt2.effectiveGasPrice)
        );
        const balanceETHAfter = await ethers.provider.getBalance(addr0.address);
        const balanceTokenAfter = await token.balanceOf(addr0.address);

        //expect some amount of the order to be filled
        expect(balanceTokenBefore).to.be.gt(balanceTokenAfter);
        expect(balanceETHBefore).to.be.lt(
          balanceETHAfter.add(gasSpent1).add(gasSpent2)
        );
      });
    });

    it("(ETH)order can be cancelled(ETH)", async function () {
      const amountETHIn = 100000;
      await WETH.connect(addr0).approve(pairETH, amountETHIn);
      const balanceETHBefore = await ethers.provider.getBalance(addr0.address);
      const balanceTokenBefore = await token.balanceOf(addr0.address);

      //trigger long term order
      await twammTermSwap
        .connect(addr0)
        .longTermSwapETHToToken(
          token.address,
          amountETHIn,
          10,
          timeStamp + 100000,
          { value: amountETHIn }
        );

      //move blocks forward, and execute virtual orders
      await mineBlocks(3 * blockInterval);
      await twammTermSwap
        .connect(addr0)
        .cancelTermSwapETHToToken(token.address, 0, timeStamp + 100000);

      const balanceETHAfter = await ethers.provider.getBalance(addr0.address);
      const balanceTokenAfter = await token.balanceOf(addr0.address);

      //expect some amount of the order to be filled
      expect(balanceETHBefore).to.be.gt(balanceETHAfter);
      expect(balanceTokenBefore).to.be.lt(balanceTokenAfter);
    });

    describe("Partial withdrawal", function () {
      it("proceeds can be withdrawn while order is still active", async function () {
        const amountIn = 100000;
        await token0.approve(addr0.address, amountIn);
        await token0.transfer(addr0.address, amountIn);
        await token0.connect(addr0).approve(pair, amountIn);

        const beforeBalance0 = await token0.balanceOf(addr0.address);
        const beforeBalance1 = await token1.balanceOf(addr0.address);

        //trigger long term order
        await twammTermSwap
          .connect(addr0)
          .longTermSwapTokenToToken(
            token0.address,
            token1.address,
            amountIn,
            10,
            timeStamp + 100000
          );

        //move blocks forward, and execute virtual orders
        await mineBlocks(3 * blockInterval);

        await twammTermSwap
          .connect(addr0)
          .withdrawProceedsFromTermSwapTokenToToken(
            token0.address,
            token1.address,
            0,
            timeStamp + 100000
          );
        const afterBalance0 = await token0.balanceOf(addr0.address);
        const afterBalance1 = await token1.balanceOf(addr0.address);

        //expect swap to work as expected
        expect(beforeBalance0).to.be.gt(afterBalance0);
        expect(beforeBalance1).to.be.lt(afterBalance1);
      });

      it("(ETH)proceeds can be withdrawn while order is still active(ETH)", async function () {
        const amountTokenIn = 100000;
        await token.connect(addr0).approve(pairETH, amountTokenIn);
        await token.transfer(addr0.address, amountTokenIn);
        await token.connect(addr0).approve(pairETH, amountTokenIn);
        const beforeBalanceToken = await token.balanceOf(addr0.address);
        const beforeBalanceETH = await ethers.provider.getBalance(
          addr0.address
        );

        //trigger long term order
        const tx1 = await twammTermSwap
          .connect(addr0)
          .longTermSwapTokenToETH(
            token.address,
            amountTokenIn,
            10,
            timeStamp + 100000
          );

        //move blocks forward, and execute virtual orders
        await mineBlocks(3 * blockInterval);

        const tx2 = await twammTermSwap
          .connect(addr0)
          .withdrawProceedsFromTermSwapTokenToETH(
            token.address,
            0,
            timeStamp + 100000
          );
        const afterBalanceToken = await token.balanceOf(addr0.address);
        const afterBalanceETH = await ethers.provider.getBalance(addr0.address);

        const rcpt1 = await tx1.wait();
        const gasSpent1 = ethers.BigNumber.from(
          rcpt1.gasUsed.mul(rcpt1.effectiveGasPrice)
        );
        const rcpt2 = await tx2.wait();
        const gasSpent2 = ethers.BigNumber.from(
          rcpt2.gasUsed.mul(rcpt2.effectiveGasPrice)
        );

        //expect swap to work as expected
        expect(beforeBalanceToken).to.be.gt(afterBalanceToken);
        expect(beforeBalanceETH).to.be.lt(
          afterBalanceETH.add(gasSpent1).add(gasSpent2)
        );
      });

      it("(ETH)proceeds can be withdrawn while order is still active(ETH)", async function () {
        const amountETHIn = 100000;
        await WETH.connect(addr0).approve(pairETH, amountETHIn);
        const beforeBalanceETH = await ethers.provider.getBalance(
          addr0.address
        );
        const beforeBalanceToken = await token.balanceOf(addr0.address);

        //trigger long term order
        await twammTermSwap
          .connect(addr0)
          .longTermSwapETHToToken(
            token.address,
            amountETHIn,
            10,
            timeStamp + 100000,
            { value: amountETHIn }
          );

        //move blocks forward, and execute virtual orders
        await mineBlocks(3 * blockInterval);

        await twammTermSwap
          .connect(addr0)
          .withdrawProceedsFromTermSwapETHToToken(
            token.address,
            0,
            timeStamp + 100000
          );
        const afterBalanceETH = await ethers.provider.getBalance(addr0.address);
        const afterBalanceToken = await token.balanceOf(addr0.address);

        //expect swap to work as expected
        expect(beforeBalanceETH).to.be.gt(afterBalanceETH);
        expect(beforeBalanceToken).to.be.lt(afterBalanceToken);
      });
    });
  });
});

async function mineBlocks(blockNumber) {
  for (let i = 0; i < blockNumber; i++) {
    await network.provider.send("evm_mine");
  }
}
