// SPDX-License-Identifier: GPL-3.0-or-later

// Inspired by https://www.paradigm.xyz/2021/07/twamm
// https://github.com/para-dave/twamm
// FrankieIsLost MVP code implementation: https://github.com/FrankieIsLost/TWAMM

pragma solidity ^0.8.9;

import "./interfaces/IPair.sol";
import "./interfaces/IFactory.sol";
import "./interfaces/ITWAMM.sol";
import "./libraries/LongTermOrders.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@rari-capital/solmate/src/utils/ReentrancyGuard.sol";
import "prb-math/contracts/PRBMathUD60x18.sol";

contract Pair is IPair, ERC20, ReentrancyGuard {
    using LongTermOrdersLib for LongTermOrdersLib.LongTermOrders;
    using SafeERC20 for IERC20;
    using PRBMathUD60x18 for uint256;

    address public override factory;
    address public override tokenA;
    address public override tokenB;
    address private twamm;
    address private twammInstantSwap;
    address private twammTermSwap;
    address private twammLiquidity;
    uint256 public override kLast;

    ///@notice fee for LP providers, 4 decimal places, i.e. 30 = 0.3%
    uint256 public constant LP_FEE = 30;

    ///@notice interval between blocks that are eligible for order expiry
    uint256 public constant orderBlockInterval = 5;

    ///@notice map token addresses to current amm reserves
    mapping(address => uint256) public override reserveMap;

    ///@notice map user addresses to the tmp WETH amount they desire
    mapping(address => uint256) public override tmpMapWETH;

    ///@notice data structure to handle long term orders
    LongTermOrdersLib.LongTermOrders internal longTermOrders;

    ///@notice pair contract caller check
    modifier checkCaller() {
        require(
            msg.sender == twamm ||
                msg.sender == twammInstantSwap ||
                msg.sender == twammTermSwap ||
                msg.sender == twammLiquidity,
            "Invalid Caller"
        );
        _;
    }

    constructor(
        address _tokenA,
        address _tokenB,
        address _twamm,
        address _twammInstantSwap,
        address _twammTermSwap,
        address _twammLiquidity
    ) ERC20("Pulsar-LP", "PUL-LP") {
        factory = msg.sender;
        tokenA = _tokenA;
        tokenB = _tokenB;
        twamm = _twamm;
        twammInstantSwap = _twammInstantSwap;
        twammTermSwap = _twammTermSwap;
        twammLiquidity = _twammLiquidity;
        longTermOrders.initialize(
            tokenA,
            tokenB,
            twammTermSwap,
            ITWAMM(twamm).WETH(),
            block.number,
            orderBlockInterval
        );
    }

    ///@notice get tokenA reserves
    function tokenAReserves() public view override returns (uint256) {
        return reserveMap[tokenA];
    }

    ///@notice get tokenB reserves
    function tokenBReserves() public view override returns (uint256) {
        return reserveMap[tokenB];
    }

    ///@notice get LP total supply
    function getTotalSupply() public view override returns (uint256) {
        return totalSupply();
    }

    ///@notice update MapWETH reserve
    function resetMapWETH(address sender) external override checkCaller {
        tmpMapWETH[sender] = 0;
    }

    // if fee is on, mint liquidity equivalent to 1/2th of the growth in sqrt(k)
    function mintFee(uint256 reserveA, uint256 reserveB)
        private
        returns (bool feeOn)
    {
        address feeTo = IFactory(factory).feeTo();
        feeOn = feeTo != address(0);

        if (feeOn) {
            if (kLast != 0) {
                uint256 rootK = reserveA
                    .fromUint()
                    .sqrt()
                    .mul(reserveB.fromUint().sqrt())
                    .toUint();
                uint256 rootKLast = kLast.fromUint().sqrt().toUint();
                if (rootK > rootKLast) {
                    uint256 numerator = totalSupply() * (rootK - rootKLast);
                    uint256 denominator = rootK + rootKLast;
                    uint256 liquidity = numerator / denominator;
                    if (liquidity > 0) _mint(feeTo, liquidity);
                }
            }
        } else if (kLast != 0) {
            kLast = 0;
        }
    }

    ///@notice provide initial liquidity to the amm. This sets the relative price between tokens
    function provideInitialLiquidity(
        address to,
        uint256 amountA,
        uint256 amountB
    ) external override checkCaller nonReentrant {
        require(amountA > 0 && amountB > 0, "Invalid Amount");
        require(totalSupply() == 0, "Liquidity Has Already Been Provided");

        bool feeOn = mintFee(0, 0);
        reserveMap[tokenA] = amountA;
        reserveMap[tokenB] = amountB;

        //initial LP amount is the geometric mean of supplied tokens
        uint256 lpTokenAmount = amountA
            .fromUint()
            .sqrt()
            .mul(amountB.fromUint().sqrt())
            .toUint();

        IERC20(tokenA).safeTransferFrom(to, address(this), amountA);
        IERC20(tokenB).safeTransferFrom(to, address(this), amountB);
        _mint(to, lpTokenAmount);

        if (feeOn) kLast = amountA * amountB;
        emit InitialLiquidityProvided(to, amountA, amountB);
    }

    ///@notice provide liquidity to the AMM
    ///@param lpTokenAmount number of lp tokens to mint with new liquidity
    function provideLiquidity(address to, uint256 lpTokenAmount)
        external
        override
        checkCaller
        nonReentrant
    {
        //execute virtual orders
        longTermOrders.executeVirtualOrdersUntilSpecifiedBlock(
            reserveMap,
            block.number
        );

        require(lpTokenAmount > 0, "Invalid Amount");
        require(totalSupply() != 0, "No Liquidity Has Been Provided Yet");
        uint256 reserveA = reserveMap[tokenA];
        uint256 reserveB = reserveMap[tokenB];
        bool feeOn = mintFee(reserveA, reserveB);

        //the ratio between the number of underlying tokens and the number of lp tokens must remain invariant after mint
        uint256 amountAIn = (lpTokenAmount * reserveA) / totalSupply();
        uint256 amountBIn = (lpTokenAmount * reserveB) / totalSupply();

        reserveMap[tokenA] += amountAIn;
        reserveMap[tokenB] += amountBIn;

        IERC20(tokenA).safeTransferFrom(to, address(this), amountAIn);
        IERC20(tokenB).safeTransferFrom(to, address(this), amountBIn);
        _mint(to, lpTokenAmount);

        if (feeOn) kLast = reserveMap[tokenA] * reserveMap[tokenB];
        emit LiquidityProvided(to, lpTokenAmount);
    }

    ///@notice remove liquidity to the AMM
    ///@param lpTokenAmount number of lp tokens to burn
    function removeLiquidity(
        address to,
        uint256 lpTokenAmount,
        bool proceedETH
    ) external override checkCaller nonReentrant {
        //execute virtual orders
        longTermOrders.executeVirtualOrdersUntilSpecifiedBlock(
            reserveMap,
            block.number
        );

        require(lpTokenAmount > 0, "Invalid Amount");
        require(
            lpTokenAmount <= totalSupply(),
            "Not Enough Lp Tokens Available"
        );
        uint256 reserveA = reserveMap[tokenA];
        uint256 reserveB = reserveMap[tokenB];
        bool feeOn = mintFee(reserveA, reserveB);

        //the ratio between the number of underlying tokens and the number of lp tokens must remain invariant after burn
        uint256 amountAOut = (reserveA * lpTokenAmount) / totalSupply();
        uint256 amountBOut = (reserveB * lpTokenAmount) / totalSupply();

        reserveMap[tokenA] -= amountAOut;
        reserveMap[tokenB] -= amountBOut;

        _burn(to, lpTokenAmount);
        if (proceedETH) {
            if (ITWAMM(twamm).WETH() == tokenA) {
                IERC20(tokenA).safeTransfer(twammLiquidity, amountAOut);
                IERC20(tokenB).safeTransfer(to, amountBOut);
                tmpMapWETH[to] = amountAOut;
            } else {
                IERC20(tokenA).safeTransfer(to, amountAOut);
                IERC20(tokenB).safeTransfer(twammLiquidity, amountBOut);
                tmpMapWETH[to] = amountBOut;
            }
        } else {
            IERC20(tokenA).safeTransfer(to, amountAOut);
            IERC20(tokenB).safeTransfer(to, amountBOut);
        }

        if (feeOn) kLast = reserveMap[tokenA] * reserveMap[tokenB];
        emit LiquidityRemoved(to, lpTokenAmount);
    }

    ///@notice instant swap a given amount of tokenA against embedded amm
    function instantSwapFromAToB(
        address sender,
        uint256 amountAIn,
        bool proceedETH
    ) external override checkCaller nonReentrant {
        require(amountAIn > 0, "Invalid Amount");
        uint256 amountBOut = performInstantSwap(
            sender,
            tokenA,
            tokenB,
            amountAIn,
            proceedETH
        );

        emit InstantSwapAToB(sender, amountAIn, amountBOut);
    }

    ///@notice create a long term order to swap from tokenA
    ///@param amountAIn total amount of token A to swap
    ///@param numberOfBlockIntervals number of block intervals over which to execute long term order
    function longTermSwapFromAToB(
        address sender,
        uint256 amountAIn,
        uint256 numberOfBlockIntervals
    ) external override checkCaller nonReentrant {
        require(amountAIn > 0, "Invalid Amount");
        uint256 orderId = longTermOrders.longTermSwapFromAToB(
            sender,
            amountAIn,
            numberOfBlockIntervals,
            reserveMap
        );

        emit LongTermSwapAToB(sender, amountAIn, orderId);
    }

    ///@notice instant swap a given amount of tokenB against embedded amm
    function instantSwapFromBToA(
        address sender,
        uint256 amountBIn,
        bool proceedETH
    ) external override checkCaller nonReentrant {
        require(amountBIn > 0, "Invalid Amount");
        uint256 amountAOut = performInstantSwap(
            sender,
            tokenB,
            tokenA,
            amountBIn,
            proceedETH
        );

        emit InstantSwapBToA(sender, amountBIn, amountAOut);
    }

    ///@notice create a long term order to swap from tokenB
    ///@param amountBIn total amount of tokenB to swap
    ///@param numberOfBlockIntervals number of block intervals over which to execute long term order
    function longTermSwapFromBToA(
        address sender,
        uint256 amountBIn,
        uint256 numberOfBlockIntervals
    ) external override checkCaller nonReentrant {
        require(amountBIn > 0, "Invalid Amount");
        uint256 orderId = longTermOrders.longTermSwapFromBToA(
            sender,
            amountBIn,
            numberOfBlockIntervals,
            reserveMap
        );

        emit LongTermSwapBToA(sender, amountBIn, orderId);
    }

    ///@notice stop the execution of a long term order
    function cancelLongTermSwap(
        address sender,
        uint256 orderId,
        bool proceedETH
    ) external override checkCaller nonReentrant {
        tmpMapWETH[sender] = longTermOrders.cancelLongTermSwap(
            sender,
            orderId,
            proceedETH,
            reserveMap
        );
        emit CancelLongTermOrder(sender, orderId);
    }

    ///@notice withdraw proceeds from a long term swap
    function withdrawProceedsFromLongTermSwap(
        address sender,
        uint256 orderId,
        bool proceedETH
    ) external override checkCaller nonReentrant {
        tmpMapWETH[sender] = longTermOrders.withdrawProceedsFromLongTermSwap(
            sender,
            orderId,
            proceedETH,
            reserveMap
        );

        emit WithdrawProceedsFromLongTermOrder(sender, orderId);
    }

    ///@notice private function which implements instant swap logic
    function performInstantSwap(
        address sender,
        address from,
        address to,
        uint256 amountIn,
        bool poceedETH
    ) private checkCaller returns (uint256 amountOutMinusFee) {
        //execute virtual orders
        longTermOrders.executeVirtualOrdersUntilSpecifiedBlock(
            reserveMap,
            block.number
        );

        uint256 reserveFrom = reserveMap[from];
        uint256 reserveTo = reserveMap[to];
        //constant product formula
        uint256 amountOut = (reserveTo * amountIn) / (reserveFrom + amountIn);

        //charge LP fee
        amountOutMinusFee = (amountOut * (10000 - LP_FEE)) / 10000;

        reserveMap[from] += amountIn;
        reserveMap[to] -= amountOutMinusFee;

        IERC20(from).safeTransferFrom(sender, address(this), amountIn);
        if (poceedETH && ITWAMM(twamm).WETH() == to) {
            IERC20(to).safeTransfer(twammInstantSwap, amountOutMinusFee);
            tmpMapWETH[sender] = amountOutMinusFee;
        } else {
            IERC20(to).safeTransfer(sender, amountOutMinusFee);
        }
    }

    ///@notice get user order details
    function getOrderDetails(uint256 orderId)
        external
        view
        returns (LongTermOrdersLib.Order memory)
    {
        return longTermOrders.orderMap[orderId];
    }

    ///@notice returns the user order withdrawable proceeds
    function getOrderProceeds(uint256 orderId)
        external
        view
        override
        returns (uint256 withdrawableProceeds)
    {
        address orderSellToken = longTermOrders.orderMap[orderId].sellTokenId;
        uint256 orderExpiry = longTermOrders.orderMap[orderId].expirationBlock;
        uint256 orderSaleRate = longTermOrders.orderMap[orderId].saleRate;

        uint256 orderRewardFactorAtSubmission = longTermOrders
            .OrderPoolMap[orderSellToken]
            .rewardFactorAtSubmission[orderId];
        uint256 orderRewardFactorAtExpiry = longTermOrders
            .OrderPoolMap[orderSellToken]
            .rewardFactorAtBlock[orderExpiry];
        uint256 poolRewardFactor = longTermOrders
            .OrderPoolMap[orderSellToken]
            .rewardFactor;

        if (block.number >= orderExpiry) {
            withdrawableProceeds = (orderRewardFactorAtExpiry -
                orderRewardFactorAtSubmission)
                .mul(orderSaleRate.fromUint())
                .toUint();
        }
        //if order has not yet expired, we just adjust the start
        else {
            withdrawableProceeds = (poolRewardFactor -
                orderRewardFactorAtSubmission)
                .mul(orderSaleRate.fromUint())
                .toUint();
        }
    }

    ///@notice returns the current sell rate of the twamm
    function getTWAMMCurrentSalesRate()
        external
        view
        override
        returns (uint256 tokenASalesRate, uint256 tokenBSalesRate)
    {
        tokenASalesRate = longTermOrders.OrderPoolMap[tokenA].currentSalesRate;
        tokenBSalesRate = longTermOrders.OrderPoolMap[tokenB].currentSalesRate;
    }

    ///@notice get user orderIds
    function userIdsCheck(address userAddress)
        external
        view
        override
        returns (uint256[] memory)
    {
        return longTermOrders.orderIdMap[userAddress];
    }

    ///@notice get user order status based on Ids
    function orderIdStatusCheck(uint256 orderId)
        external
        view
        override
        returns (bool)
    {
        return longTermOrders.orderIdStatusMap[orderId];
    }

    ///@notice convenience function to execute virtual orders. Note that this already happens
    ///before most interactions with the AMM
    function executeVirtualOrders(uint256 blockNumber) public override {
        longTermOrders.executeVirtualOrdersUntilSpecifiedBlock(
            reserveMap,
            blockNumber
        );
    }
}
