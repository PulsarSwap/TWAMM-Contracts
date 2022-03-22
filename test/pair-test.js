const { expect } = require("chai");
const { ethers } = require("hardhat");
const BigNumber = ethers.BigNumber;

describe("Pair", function () {
  let tokenA;
  let tokenB;
  let pair;
  let owner;
  let addr1;
  let addr2;
  let addrs;

  const blockInterval = 10;

  const initialLiquidityProvided = 100000000;

  const ERC20Supply = ethers.utils.parseUnits("100");

  beforeEach(async function () {
    await network.provider.send("evm_setAutomine", [true]);
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
    tokenA = await ERC20Factory.deploy("TokenA", "TokenA", ERC20Supply);
    tokenB = await ERC20Factory.deploy("TokenB", "TokenB", ERC20Supply);

    const Pair = await ethers.getContractFactory("Pair");

    pair = await Pair.deploy(tokenA.address, tokenB.address);
    tokenA.approve(pair.address, initialLiquidityProvided);
    tokenB.approve(pair.address, initialLiquidityProvided);
    await pair.provideInitialLiquidity(
      owner.address,
      initialLiquidityProvided,
      initialLiquidityProvided
    );

    console.log("sucessfully setup the pre-test env!!!");
  });

  describe("Basic AMM", function () {
    describe("Providing Liquidity", function () {
      it("Should mint correct number of LP tokens", async function () {
        const LPBalance = await pair.balanceOf(owner.address);
        const totalSupplyCheck = await pair.totalSupply();
        expect(totalSupplyCheck).to.eq(initialLiquidityProvided);
        expect(LPBalance).to.eq(initialLiquidityProvided);
        // expect(totalSupplyCheck).to.eq(initialLiquidityProvidedAdjusted);
      });

      it("Can't provide initial liquidity twice", async function () {
        const amount = 10000;
        await expect(
          pair.provideInitialLiquidity(owner.address, amount, amount)
        ).to.be.revertedWith(
          "Liquidity Has Already Been Provided, Need To Call provideLiquidity"
        );
      });

      it("LP token value is constant after mint", async function () {
        let totalSupply = await pair.totalSupply();

        let tokenAReserve = await pair.tokenAReserves();
        let tokenBReserve = await pair.tokenBReserves();

        const initialTokenAPerLP = tokenAReserve / totalSupply;
        const initialTokenBPerLP = tokenBReserve / totalSupply;

        const newLPTokens = 10000;

        await tokenA.approve(pair.address, newLPTokens);
        await tokenB.approve(pair.address, newLPTokens);
        await pair.provideLiquidity(owner.address, newLPTokens);

        totalSupply = await pair.totalSupply();

        tokenAReserve = await pair.tokenAReserves();
        tokenBReserve = await pair.tokenBReserves();

        const finalTokenAPerLP = tokenAReserve / totalSupply;
        const finalTokenBPerLP = tokenBReserve / totalSupply;

        expect(finalTokenAPerLP).to.eq(initialTokenAPerLP);
        expect(finalTokenBPerLP).to.eq(initialTokenBPerLP);
      });
    });

    describe("Removing Liquidity", function () {
      it("LP token value is constant after removing", async function () {
        let totalSupply = await pair.totalSupply();

        let tokenAReserve = await pair.tokenAReserves();
        let tokenBReserve = await pair.tokenBReserves();

        const initialTokenAPerLP = tokenAReserve / totalSupply;
        const initialTokenBPerLP = tokenBReserve / totalSupply;

        const liquidityToRemove = initialLiquidityProvided / 2;
        await pair.removeLiquidity(owner.address, liquidityToRemove);

        totalSupply = await pair.totalSupply();

        tokenAReserve = await pair.tokenAReserves();
        tokenBReserve = await pair.tokenBReserves();

        const finalTokenAPerLP = tokenAReserve / totalSupply;
        const finalTokenBPerLP = tokenBReserve / totalSupply;

        expect(finalTokenAPerLP).to.eq(initialTokenAPerLP);
        expect(finalTokenBPerLP).to.eq(initialTokenBPerLP);
      });

      it("Can't remove more than available liquidity", async function () {
        let totalSupply = await pair.totalSupply();

        const liquidityToRemove = initialLiquidityProvided * 2;

        await expect(
          pair.removeLiquidity(owner.address, liquidityToRemove)
        ).to.be.revertedWith("Not Enough Lp Tokens Available");
      });
    });

    describe("Instant Swap", function () {
      it("Swap expected amount", async function () {
        const amountInA = ethers.utils.parseUnits("1");
        const tokenAReserve = await pair.tokenAReserves();
        const tokenBReserve = await pair.tokenBReserves();
        const expectedOutBeforeFees = tokenBReserve
          .mul(amountInA)
          .div(tokenAReserve.add(amountInA));

        //adjust for LP fee of 0.3%
        const expectedOutput = expectedOutBeforeFees.mul(1000 - 3).div(1000);

        const beforeBalanceB = await tokenB.balanceOf(owner.address);
        await tokenA.approve(pair.address, amountInA);
        await pair.instantSwapFromAToB(owner.address, amountInA);
        const afterBalanceB = await tokenB.balanceOf(owner.address);
        const actualOutput = afterBalanceB.sub(beforeBalanceB);

        expect(actualOutput).to.eq(expectedOutput);
      });
    });
  });

  describe("Pair Functionality ", function () {
    describe("Long Term Swap", function () {
      it("Single sided long term order behaves like normal swap", async function () {
        const amountInA = 10000;
        await tokenA.transfer(addr1.address, amountInA);

        //expected output
        const tokenAReserve = await pair.tokenAReserves();
        const tokenBReserve = await pair.tokenBReserves();
        const expectedOut = tokenBReserve
          .mul(amountInA)
          .div(tokenAReserve.add(amountInA));

        //trigger long term order
        tokenA.connect(addr1).approve(pair.address, amountInA);
        await pair
          .connect(addr1)
          .longTermSwapFromAToB(addr1.address, amountInA, 2);

        //move blocks forward, and execute virtual orders
        await mineBlocks(3 * blockInterval);
        await pair.executeVirtualOrders();

        //withdraw proceeds
        const beforeBalanceB = await tokenB.balanceOf(addr1.address);
        await pair
          .connect(addr1)
          .withdrawProceedsFromLongTermSwap(addr1.address, 0);
        const afterBalanceB = await tokenB.balanceOf(addr1.address);
        const actualOutput = afterBalanceB.sub(beforeBalanceB);

        //since we are breaking up order, match is not exact
        expect(actualOutput).to.be.closeTo(
          expectedOut,
          ethers.utils.parseUnits("100", "wei")
        );
      });

      it("Orders in both pools work as expected", async function () {
        const amountIn = ethers.BigNumber.from(10000);
        await tokenA.approve(addr1.address, amountIn);
        await tokenB.approve(addr2.address, amountIn);
        await tokenA.transfer(addr1.address, amountIn);
        await tokenB.transfer(addr2.address, amountIn);

        //trigger long term order
        await tokenA.connect(addr1).approve(pair.address, amountIn);
        await tokenB.connect(addr2).approve(pair.address, amountIn);

        //trigger long term orders
        await pair
          .connect(addr1)
          .longTermSwapFromAToB(addr1.address, amountIn, 2);
        await pair
          .connect(addr2)
          .longTermSwapFromBToA(addr2.address, amountIn, 2);

        //move blocks forward, and execute virtual orders
        await mineBlocks(3 * blockInterval);
        await pair.executeVirtualOrders();

        //withdraw proceeds
        await pair
          .connect(addr1)
          .withdrawProceedsFromLongTermSwap(addr1.address, 0);
        await pair
          .connect(addr2)
          .withdrawProceedsFromLongTermSwap(addr2.address, 1);

        const amountABought = await tokenA.balanceOf(addr2.address);
        const amountBBought = await tokenB.balanceOf(addr1.address);

        //pool is balanced, and both orders execute same amount in opposite directions,
        //so we expect final balances to be roughly equal
        expect(amountABought).to.be.closeTo(amountBBought, amountIn / 100);
      });

      it("Swap amounts are consistent with pair formula", async function () {
        const tokenAIn = 10000;
        const tokenBIn = 2000;
        await tokenA.approve(addr1.address, tokenAIn);
        await tokenB.approve(addr2.address, tokenBIn);
        await tokenA.transfer(addr1.address, tokenAIn);
        await tokenB.transfer(addr2.address, tokenBIn);
        await tokenA.connect(addr1).approve(pair.address, tokenAIn);
        await tokenB.connect(addr2).approve(pair.address, tokenBIn);

        const tokenAReserve = (await pair.tokenAReserves()).toNumber();
        const tokenBReserve = (await pair.tokenBReserves()).toNumber();

        const k = tokenAReserve * tokenBReserve;
        const c =
          (Math.sqrt(tokenAReserve * tokenBIn) -
            Math.sqrt(tokenBReserve * tokenAIn)) /
          (Math.sqrt(tokenAReserve * tokenBIn) +
            Math.sqrt(tokenBReserve * tokenAIn));

        const exponent = 2 * Math.sqrt((tokenAIn * tokenBIn) / k);

        const finalAReserveExpected =
          (Math.sqrt((k * tokenAIn) / tokenBIn) * (Math.exp(exponent) + c)) /
          (Math.exp(exponent) - c);

        const finalBReserveExpected = k / finalAReserveExpected;

        const tokenAOut = Math.abs(
          tokenAReserve - finalAReserveExpected + tokenAIn
        );
        const tokenBOut = Math.abs(
          tokenBReserve - finalBReserveExpected + tokenBIn
        );

        //trigger long term orders
        await pair
          .connect(addr1)
          .longTermSwapFromAToB(addr1.address, tokenAIn, 2);
        await pair
          .connect(addr2)
          .longTermSwapFromBToA(addr2.address, tokenBIn, 2);

        //move blocks forward, and execute virtual orders
        await mineBlocks(22 * blockInterval);
        await pair.executeVirtualOrders();

        //withdraw proceeds
        await pair
          .connect(addr1)
          .withdrawProceedsFromLongTermSwap(addr1.address, 0);
        await pair
          .connect(addr2)
          .withdrawProceedsFromLongTermSwap(addr2.address, 1);

        const amountABought = await tokenA.balanceOf(addr2.address);
        const amountBBought = await tokenB.balanceOf(addr1.address);

        const finalAReserveActual = await pair.tokenAReserves();
        const finalBReserveActual = await pair.tokenBReserves();

        //expect results to be within 1% of calculation
        expect(finalAReserveActual.toNumber()).to.be.closeTo(
          finalAReserveExpected,
          finalAReserveExpected / 100
        );
        expect(finalBReserveActual.toNumber()).to.be.closeTo(
          finalBReserveExpected,
          finalBReserveExpected / 100
        );

        expect(amountABought.toNumber()).to.be.closeTo(
          tokenAOut,
          tokenAOut / 100
        );
        expect(amountBBought.toNumber()).to.be.closeTo(
          tokenBOut,
          tokenBOut / 100
        );
      });

      it("Multiple orders in both pools work as expected", async function () {
        const amountIn = 10000;
        await tokenA.approve(addr1.address, amountIn);
        await tokenB.approve(addr2.address, amountIn);
        await tokenA.transfer(addr1.address, amountIn);
        await tokenB.transfer(addr2.address, amountIn);

        //trigger long term order
        await tokenA.connect(addr1).approve(pair.address, amountIn);
        await tokenB.connect(addr2).approve(pair.address, amountIn);

        //trigger long term orders
        await pair
          .connect(addr1)
          .longTermSwapFromAToB(addr1.address, amountIn / 2, 2);
        await pair
          .connect(addr2)
          .longTermSwapFromBToA(addr2.address, amountIn / 2, 3);
        await pair
          .connect(addr1)
          .longTermSwapFromAToB(addr1.address, amountIn / 2, 4);
        await pair
          .connect(addr2)
          .longTermSwapFromBToA(addr2.address, amountIn / 2, 5);

        //move blocks forward, and execute virtual orders
        await mineBlocks(6 * blockInterval);
        await pair.executeVirtualOrders();

        //withdraw proceeds
        await pair
          .connect(addr1)
          .withdrawProceedsFromLongTermSwap(addr1.address, 0);
        await pair
          .connect(addr2)
          .withdrawProceedsFromLongTermSwap(addr2.address, 1);
        await pair
          .connect(addr1)
          .withdrawProceedsFromLongTermSwap(addr1.address, 2);
        await pair
          .connect(addr2)
          .withdrawProceedsFromLongTermSwap(addr2.address, 3);

        const amountABought = await tokenA.balanceOf(addr2.address);
        const amountBBought = await tokenB.balanceOf(addr1.address);

        //pool is balanced, and orders execute same amount in opposite directions,
        //so we expect final balances to be roughly equal
        expect(amountABought).to.be.closeTo(amountBBought, amountIn / 100);
      });

      it("Normal swap works as expected while long term orders are active", async function () {
        const amountIn = 10000;
        await tokenA.approve(addr1.address, amountIn);
        await tokenB.approve(addr2.address, amountIn);
        await tokenA.transfer(addr1.address, amountIn);
        await tokenB.transfer(addr2.address, amountIn);

        //trigger long term order
        await tokenA.connect(addr1).approve(pair.address, amountIn);
        await tokenB.connect(addr2).approve(pair.address, amountIn);

        //trigger long term orders
        await pair
          .connect(addr1)
          .longTermSwapFromAToB(addr1.address, amountIn, 10);
        await pair
          .connect(addr2)
          .longTermSwapFromBToA(addr2.address, amountIn, 10);

        //move blocks forward, and execute virtual orders
        await mineBlocks(3 * blockInterval);
        await pair.executeVirtualOrders();

        //withdraw proceeds
        await pair
          .connect(addr1)
          .withdrawProceedsFromLongTermSwap(addr1.address, 0);
        await pair
          .connect(addr2)
          .withdrawProceedsFromLongTermSwap(addr2.address, 1);

        const amountABought = await tokenA.balanceOf(addr2.address);
        const amountBBought = await tokenB.balanceOf(addr1.address);

        //pool is balanced, and both orders execute same amount in opposite directions,
        //so we expect final balances to be roughly equal
        expect(amountABought).to.be.closeTo(amountBBought, amountIn / 100);
      });
    });

    describe("Cancelling Orders", function () {
      it("Order can be cancelled", async function () {
        const amountIn = 100000;
        await tokenA.approve(addr1.address, amountIn);
        await tokenA.transfer(addr1.address, amountIn);
        await tokenA.connect(addr1).approve(pair.address, amountIn);

        const amountABefore = await tokenA.balanceOf(addr1.address);
        const amountBBefore = await tokenB.balanceOf(addr1.address);

        //trigger long term order
        await pair
          .connect(addr1)
          .longTermSwapFromAToB(addr1.address, amountIn, 10);

        //move blocks forward, and execute virtual orders
        await mineBlocks(3 * blockInterval);
        await pair.connect(addr1).cancelLongTermSwap(addr1.address, 0);

        const amountAAfter = await tokenA.balanceOf(addr1.address);
        const amountBAfter = await tokenB.balanceOf(addr1.address);

        //expect some amount of the order to be filled
        expect(amountABefore).to.be.gt(amountAAfter);
        expect(amountBBefore).to.be.lt(amountBAfter);
      });
    });

    describe("Partial Withdrawal", function () {
      it("Proceeds can be withdrawn while order is still active", async function () {
        const amountIn = 100000;
        await tokenA.approve(addr1.address, amountIn);
        await tokenA.transfer(addr1.address, amountIn);
        await tokenA.connect(addr1).approve(pair.address, amountIn);

        await tokenB.transfer(addr2.address, amountIn);
        await tokenA.approve(addr2.address, amountIn);
        await tokenB.connect(addr2).approve(pair.address, amountIn);

        //trigger long term order
        await pair
          .connect(addr1)
          .longTermSwapFromAToB(addr1.address, amountIn, 10);

        //move blocks forward, and execute virtual orders
        await mineBlocks(3 * blockInterval);

        const beforeBalanceA = await tokenA.balanceOf(addr2.address);
        const beforeBalanceB = await tokenB.balanceOf(addr2.address);
        await pair.connect(addr2).instantSwapFromBToA(addr2.address, amountIn);
        const afterBalanceA = await tokenA.balanceOf(addr2.address);
        const afterBalanceB = await tokenB.balanceOf(addr2.address);

        //expect swap to work as expected
        expect(beforeBalanceA).to.be.lt(afterBalanceA);
        expect(beforeBalanceB).to.be.gt(afterBalanceB);
      });
    });
  });
});

async function mineBlocks(blockNumber) {
  for (let i = 0; i < blockNumber; i++) {
    await network.provider.send("evm_mine");
  }
}
