const { expect } = require("chai");
const { parseUnits } = require("ethers/lib/utils");
const { ethers } = require("hardhat");

describe("TWAMM", function () {

    let tokenA;
    let tokenB;
    let twamm;
    let owner;
    let addr1;
    let addr2;
    let addrs;
    let factory;
    let pair;
    let WETH;
    let blockNumber;
    let timeStamp;

    const blockInterval = 10;

    const initialLiquidityProvided = 100000000;
    const ERC20Supply = ethers.utils.parseUnits("100"); 
    
    beforeEach(async function () {
        // network basics
        await network.provider.send("evm_setAutomine", [true]);
        [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
        
        //factory deployment
        await console.log("Deploying factory")
        const factoryContract = await ethers.getContractFactory("Factory");
        factory = await factoryContract.deploy();
        const allpairLength = await factory.allPairsLength();
        await console.log("factory has been successfully deployed")
        await console.log("factory length check", allpairLength)


        //create two tokens for pair creation, and WETH
        const ERC20Factory =  await ethers.getContractFactory("ERC20Mock");
        tokenA = await ERC20Factory.deploy("TokenA", "TokenA", ERC20Supply);
        tokenB = await ERC20Factory.deploy("TokenB", "TokenB", ERC20Supply);
        WETH = await ERC20Factory.deploy("WETH", "WETH", ERC20Supply);
        await console.log("two tokens and WETH created", tokenA.address, tokenB.address)
 
        // TWAMM init
        const TWAMM = await ethers.getContractFactory("TWAMM", { gasLimit: "1000000000" })
        twamm = await TWAMM.deploy(factory.address, WETH.address)
        await console.log("TWAMM is initialized")

        // create pair and initialize liquidity for the pair
        
        blockNumber = await ethers.provider.getBlockNumber()
        timeStamp = (await ethers.provider.getBlock(blockNumber)).timestamp
        // await console.log('time stamp check', timeStamp)
        const allw = await tokenA.allowance(owner.address, twamm.address);
        // console.log('bb', allw, owner.address)
        await twamm.createPair(tokenA.address, tokenB.address, timeStamp+50000)
        pair = await twamm.obtainPairAddress(tokenA.address, tokenB.address)
        await tokenA.approve(pair, initialLiquidityProvided); //owner calls it
        await tokenB.approve(pair, initialLiquidityProvided); 
        // await console.log('pair pair add', tmpPairAdd)
        await twamm.addInitialLiquidity(tokenA.address, tokenB.address, initialLiquidityProvided, initialLiquidityProvided, timeStamp+100000);
        await console.log("initial liquidity provided", pair)


        
    });

    describe("Basic AMM", function () {

        describe("Providing Liquidity", function () {
            

            it("can't provide initial liquidity twice", async function () {

                const amount = 10000;
                await expect(
                    twamm.addInitialLiquidity(tokenA.address, tokenB.address, amount, amount, timeStamp+100000)
                ).to.be.revertedWith('Liquidity Has Already Been Provided, Need To Call provideLiquidity');
            });

            it("LP token value is constant after mint", async function () {
                
                let totalSupply = await twamm.totalSupply(pair);
                
                let tokenAReserve = await twamm.reserveA(pair);
                let tokenBReserve = await twamm.reserveB(pair);

                const initialTokenAPerLP = tokenAReserve / totalSupply;
                const initialTokenBPerLP = tokenBReserve / totalSupply;
                const newLPTokens = 10000;
                await tokenA.approve(pair, newLPTokens); //owner calls it
                await tokenB.approve(pair, newLPTokens); 

                
                await twamm.addLiquidity(tokenA.address, tokenB.address, newLPTokens, timeStamp+100000);

                totalSupply = await twamm.totalSupply(pair);
                
                tokenAReserve = await twamm.reserveA(pair);
                tokenBReserve = await twamm.reserveB(pair);

                const finalTokenAPerLP = tokenAReserve / totalSupply;
                const finalTokenBPerLP = tokenBReserve / totalSupply;

                expect(finalTokenAPerLP).to.eq(initialTokenAPerLP);
                expect(finalTokenBPerLP).to.eq(initialTokenBPerLP);

                
            });
        });

        describe("Removing Liquidity", function () {

            it("LP token value is constant after removing", async function () {
                
                let totalSupply = await twamm.totalSupply(pair);
                
                let tokenAReserve = await twamm.reserveA(pair);
                let tokenBReserve = await twamm.reserveB(pair);

                const initialTokenAPerLP = tokenAReserve / totalSupply;
                const initialTokenBPerLP = tokenBReserve / totalSupply;

                const liquidityToRemove = initialLiquidityProvided / 2;
                await twamm.withdrawLiquidity(tokenA.address, tokenB.address, liquidityToRemove, timeStamp+100000);

                totalSupply = await twamm.totalSupply(pair);
                
                tokenAReserve = await twamm.reserveA(pair);
                tokenBReserve = await twamm.reserveB(pair);

                const finalTokenAPerLP = tokenAReserve / totalSupply;
                const finalTokenBPerLP = tokenBReserve / totalSupply;

                expect(finalTokenAPerLP).to.eq(initialTokenAPerLP);
                expect(finalTokenBPerLP).to.eq(initialTokenBPerLP);
            });

            it("can't remove more than available liquidity", async function () {
                
                let totalSupply = await twamm.totalSupply(pair);
                
                const liquidityToRemove = initialLiquidityProvided * 2;


                await expect(
                    twamm.withdrawLiquidity(tokenA.address, tokenB.address, liquidityToRemove, timeStamp+100000)
                ).to.be.revertedWith('Not Enough Lp Tokens Available');                
            });
        });


        describe("Swapping", function () {

            it("swaps expected amount", async function () {
                const amountInA = ethers.utils.parseUnits("1");
                const tokenAReserve = await twamm.reserveA(pair);
                const tokenBReserve = await twamm.reserveB(pair);
                const expectedOutBeforeFees = 
                    tokenBReserve
                        .mul(amountInA)
                        .div(tokenAReserve.add(amountInA));

                //adjust for LP fee of 0.3%
                const expectedOutput = expectedOutBeforeFees.mul(1000 - 3).div(1000);
                await tokenA.approve(pair, amountInA); //owner calls it
                const beforeBalanceB = await tokenB.balanceOf(owner.address);
                await twamm.instantSwapTokenToToken(tokenA.address, tokenB.address, amountInA, timeStamp+100000);
                const afterBalanceB = await tokenB.balanceOf(owner.address);
                const actualOutput = afterBalanceB.sub(beforeBalanceB);

                expect(actualOutput).to.eq(expectedOutput);
            
        
            });

            it("swaps expected amount (reversed token order)", async function () {
                const amountInB = ethers.utils.parseUnits("1");
                const tokenAReserve = await twamm.reserveA(pair);
                const tokenBReserve = await twamm.reserveB(pair);
                const expectedOutBeforeFees = 
                    tokenAReserve
                        .mul(amountInB)
                        .div(tokenBReserve.add(amountInB));

                //adjust for LP fee of 0.3%
                const expectedOutput = expectedOutBeforeFees.mul(1000 - 3).div(1000);
                await tokenB.approve(pair, amountInB); //owner calls it
                const beforeBalanceA = await tokenA.balanceOf(owner.address);
                await twamm.instantSwapTokenToToken(tokenB.address, tokenA.address, amountInB, timeStamp+100000);
                const afterBalanceA = await tokenA.balanceOf(owner.address);
                const actualOutput = afterBalanceA.sub(beforeBalanceA);

                expect(actualOutput).to.eq(expectedOutput);
            
        
            });
        });
    });

    describe("TWAMM Functionality ", function () {
        
        describe("Long term swaps", function () {

            it("Single sided long term order behaves like normal swap", async function () {

                const amountInA = 10000; 
                await tokenA.transfer(addr1.address, amountInA);
                
                //expected output
                const tokenAReserve = await twamm.reserveA(pair);
                const tokenBReserve = await twamm.reserveB(pair);
                const expectedOut = 
                    tokenBReserve
                        .mul(amountInA)
                        .div(tokenAReserve.add(amountInA));

                const expectedOutputAfterFeeAdj = expectedOut.mul(1000 - 3).div(1000);

                //trigger long term order
                tokenA.connect(addr1).approve(pair, amountInA);
                await twamm.connect(addr1).longTermSwapTokenToToken(tokenA.address, tokenB.address, amountInA, 2, timeStamp+100000)
                
                //move blocks forward, and execute virtual orders
                await mineBlocks(3 * blockInterval)
                await twamm.executeVirtualOrdersWrapper(pair);

                //withdraw proceeds 
                const beforeBalanceB = await tokenB.balanceOf(addr1.address);
                await twamm.connect(addr1).withdrawProceedsFromTermSwapTokenToToken(tokenA.address, tokenB.address, 0, timeStamp+100000);
                const afterBalanceB = await tokenB.balanceOf(addr1.address);
                const actualOutput = afterBalanceB.sub(beforeBalanceB);

                //since we are breaking up order, match is not exact
                expect(actualOutput).to.be.closeTo(
                    expectedOut,
                    ethers.utils.parseUnits("100", "wei")
                );

                expect(actualOutput).to.be.eq(expectedOutputAfterFeeAdj);
            });

            it("Orders in both pools work as expected", async function () {

                const amountIn = 10000;//ethers.BigNumber.from(10000);

                await tokenA.approve(addr1.address, amountIn);
                await tokenB.approve(addr2.address, amountIn);

                await tokenA.transfer(addr1.address, amountIn);
                await tokenB.transfer(addr2.address, amountIn);
                
                //trigger long term order
                await tokenA.connect(addr1).approve(pair, amountIn);
                await tokenB.connect(addr2).approve(pair, amountIn);

                //trigger long term orders
                await twamm.connect(addr1).longTermSwapTokenToToken(tokenA.address, tokenB.address, amountIn, 2, timeStamp+100000);
                await twamm.connect(addr2).longTermSwapTokenToToken(tokenB.address, tokenA.address, amountIn, 2, timeStamp+100000);
                

                
                //move blocks forward, and execute virtual orders
                await mineBlocks(3 * blockInterval)
                await twamm.executeVirtualOrdersWrapper(pair);
                
                
                // await twamm.userIdsCheck(addr2)
                

                //withdraw proceeds 
                await twamm.connect(addr1).withdrawProceedsFromTermSwapTokenToToken(tokenA.address, tokenB.address, 0, timeStamp+100000);
                await twamm.connect(addr2).withdrawProceedsFromTermSwapTokenToToken(tokenA.address, tokenB.address, 1, timeStamp+100000);

                const amountABought = await tokenA.balanceOf(addr2.address);
                const amountBBought = await tokenB.balanceOf(addr1.address);

                //pool is balanced, and both orders execute same amount in opposite directions,
                //so we expect final balances to be roughly equal
                expect(amountABought).to.be.closeTo(amountBBought, amountIn / 100)         
            });

            it("Swap amounts are consistent with twamm formula", async function () {

                const tokenAIn = 10000;
                const tokenBIn = 2000;
                await tokenA.approve(addr1.address, tokenAIn);
                await tokenB.approve(addr2.address, tokenBIn);
                await tokenA.transfer(addr1.address, tokenAIn);
                await tokenB.transfer(addr2.address, tokenBIn);
                await tokenA.connect(addr1).approve(pair, tokenAIn);
                await tokenB.connect(addr2).approve(pair, tokenBIn);

                const tokenAReserve = (await twamm.reserveA(pair)).toNumber();
                const tokenBReserve = (await twamm.reserveB(pair)).toNumber();

                const k = tokenAReserve * tokenBReserve;
                const c = (
                    Math.sqrt(tokenAReserve * tokenBIn) - Math.sqrt(tokenBReserve * tokenAIn)
                ) / (
                    Math.sqrt(tokenAReserve * tokenBIn) + Math.sqrt(tokenBReserve * tokenAIn)
                );

                const exponent = 2 * Math.sqrt(tokenAIn * tokenBIn / k);

                const finalAReserveExpected = (
                    Math.sqrt(k * tokenAIn / tokenBIn)
                    * (Math.exp(exponent) + c) 
                    / (Math.exp(exponent) - c) 
                )

                const finalBReserveExpected = k / finalAReserveExpected;

                const tokenAOut = Math.abs(tokenAReserve - finalAReserveExpected + tokenAIn);
                const tokenBOut = Math.abs(tokenBReserve - finalBReserveExpected + tokenBIn);
                
                //trigger long term orders
                await twamm.connect(addr1).longTermSwapTokenToToken(tokenA.address, tokenB.address, tokenAIn, 2, timeStamp+100000);
                await twamm.connect(addr2).longTermSwapTokenToToken(tokenB.address, tokenA.address, tokenBIn, 2, timeStamp+100000);

                //move blocks forward, and execute virtual orders
                await mineBlocks(22 * blockInterval)
                await twamm.executeVirtualOrdersWrapper(pair);

                //withdraw proceeds 
                await twamm.connect(addr1).withdrawProceedsFromTermSwapTokenToToken(tokenA.address, tokenB.address, 0, timeStamp+100000);
                await twamm.connect(addr2).withdrawProceedsFromTermSwapTokenToToken(tokenA.address, tokenB.address, 1, timeStamp+100000);

                const amountABought = await tokenA.balanceOf(addr2.address);
                const amountBBought = await tokenB.balanceOf(addr1.address);

                const finalAReserveActual = (await twamm.reserveA(pair));
                const finalBReserveActual = (await twamm.reserveB(pair));

                //expect results to be within 1% of calculation
                expect(finalAReserveActual.toNumber()).to.be.closeTo(finalAReserveExpected, finalAReserveExpected/100);
                expect(finalBReserveActual.toNumber()).to.be.closeTo(finalBReserveExpected, finalBReserveExpected/100);

                expect(amountABought.toNumber()).to.be.closeTo(tokenAOut, tokenAOut/100);
                expect(amountBBought.toNumber()).to.be.closeTo(tokenBOut, tokenBOut/100);
            });

            it("Multiple orders in both pools work as expected", async function () {

                const amountIn = 10000;
                await tokenA.approve(addr1.address, amountIn);
                await tokenB.approve(addr2.address, amountIn);
                await tokenA.transfer(addr1.address, amountIn);
                await tokenB.transfer(addr2.address, amountIn);
                
                //trigger long term order
                await tokenA.connect(addr1).approve(pair, amountIn);
                await tokenB.connect(addr2).approve(pair, amountIn);

                //trigger long term orders
                await twamm.connect(addr1).longTermSwapTokenToToken(tokenA.address, tokenB.address, amountIn/2, 2, timeStamp+100000);//, { 
                await twamm.connect(addr2).longTermSwapTokenToToken(tokenB.address, tokenA.address, amountIn/2, 3, timeStamp+100000);
                await twamm.connect(addr1).longTermSwapTokenToToken(tokenA.address, tokenB.address, amountIn/2, 4, timeStamp+100000);
                await twamm.connect(addr2).longTermSwapTokenToToken(tokenB.address, tokenA.address, amountIn/2, 5, timeStamp+100000);

                //move blocks forward, and execute virtual orders
                await mineBlocks(6 * blockInterval)
                await twamm.executeVirtualOrdersWrapper(pair);

                //withdraw proceeds 
                await twamm.connect(addr1).withdrawProceedsFromTermSwapTokenToToken(tokenA.address, tokenB.address, 0, timeStamp+100000);
                await twamm.connect(addr2).withdrawProceedsFromTermSwapTokenToToken(tokenA.address, tokenB.address, 1, timeStamp+100000);
                await twamm.connect(addr1).withdrawProceedsFromTermSwapTokenToToken(tokenA.address, tokenB.address, 2, timeStamp+100000);
                await twamm.connect(addr2).withdrawProceedsFromTermSwapTokenToToken(tokenA.address, tokenB.address, 3, timeStamp+100000);

                const amountABought = await tokenA.balanceOf(addr2.address);
                const amountBBought = await tokenB.balanceOf(addr1.address);

                //pool is balanced, and orders execute same amount in opposite directions,
                //so we expect final balances to be roughly equal
                expect(amountABought).to.be.closeTo(amountBBought, amountIn / 100)         
            });

            it("Normal swap works as expected while long term orders are active", async function () {

                const amountIn = 10000;
                await tokenA.transfer(addr1.address, amountIn);
                await tokenB.transfer(addr2.address, amountIn);
                
                //trigger long term order
                await tokenA.connect(addr1).approve(pair, amountIn);
                await tokenB.connect(addr2).approve(pair, amountIn);

                //trigger long term orders
                await twamm.connect(addr1).longTermSwapTokenToToken(tokenA.address, tokenB.address, amountIn, 10, timeStamp+100000);
                await twamm.connect(addr2).longTermSwapTokenToToken(tokenB.address, tokenA.address, amountIn, 10, timeStamp+100000);

                //move blocks forward, and execute virtual orders
                await mineBlocks(3 * blockInterval)
                await twamm.executeVirtualOrdersWrapper(pair);

                //withdraw proceeds 
                await twamm.connect(addr1).withdrawProceedsFromTermSwapTokenToToken(tokenA.address, tokenB.address, 0, timeStamp+100000);
                await twamm.connect(addr2).withdrawProceedsFromTermSwapTokenToToken(tokenA.address, tokenB.address, 1, timeStamp+100000);

                const amountABought = await tokenA.balanceOf(addr2.address);
                const amountBBought = await tokenB.balanceOf(addr1.address);

                //pool is balanced, and both orders execute same amount in opposite directions,
                //so we expect final balances to be roughly equal
                expect(amountABought).to.be.closeTo(amountBBought, amountIn / 100)          
            });
        });


        describe("Cancelling orders", function () { 

            it("Order can be cancelled", async function () {

                const amountIn = 100000;
                await tokenA.approve(addr1.address, amountIn);
                await tokenA.transfer(addr1.address, amountIn);
                await tokenA.connect(addr1).approve(pair, amountIn);
            
                const amountABefore = await tokenA.balanceOf(addr1.address);
                const amountBBefore = await tokenB.balanceOf(addr1.address);

                //trigger long term order
                await twamm.connect(addr1).longTermSwapTokenToToken(tokenA.address, tokenB.address, amountIn, 10, timeStamp+100000);

                //move blocks forward, and execute virtual orders
                await mineBlocks(3 * blockInterval)
                await twamm.connect(addr1).cancelTermSwapTokenToToken(tokenA.address, tokenB.address, 0, timeStamp+100000);

                const amountAAfter = await tokenA.balanceOf(addr1.address);
                const amountBAfter = await tokenB.balanceOf(addr1.address);

                //expect some amount of the order to be filled
                expect(amountABefore).to.be.gt(amountAAfter);
                expect(amountBBefore).to.be.lt(amountBAfter);
            });

        });

        describe("partial withdrawal", function () { 

            it("proceeds can be withdrawn while order is still active", async function () {

                const amountIn = 100000;
                await tokenA.transfer(addr1.address, amountIn);
                await tokenA.connect(addr1).approve(pair, amountIn);

                await tokenB.transfer(addr2.address, amountIn);
                await tokenB.connect(addr2).approve(pair, amountIn);

                //trigger long term order
                await twamm.connect(addr1).longTermSwapTokenToToken(tokenA.address, tokenB.address, amountIn, 10, timeStamp+100000);

                //move blocks forward, and execute virtual orders
                await mineBlocks(3 * blockInterval)
                
                const beforeBalanceA = await tokenA.balanceOf(addr2.address);
                const beforeBalanceB = await tokenB.balanceOf(addr2.address);
                await twamm.connect(addr2).instantSwapTokenToToken(tokenB.address, tokenA.address, amountIn, timeStamp+100000);
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
    for(let i = 0; i < blockNumber; i++) {
        await network.provider.send("evm_mine")
    }
}
