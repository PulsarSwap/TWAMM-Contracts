// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.9;

import "./interfaces/IPair.sol";
import "./libraries/LongTermOrders.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "prb-math/contracts/PRBMathUD60x18.sol";
import "hardhat/console.sol";

contract Pair is IPair, ERC20 {
    using LongTermOrdersLib for LongTermOrdersLib.LongTermOrders;
    using PRBMathUD60x18 for uint256;

    address public override factory;
    address public override tokenA;
    address public override tokenB;

    ///@notice fee for LP providers, 4 decimal places, i.e. 30 = 0.3%
    uint256 public constant LP_FEE = 30;

    ///@notice interval between blocks that are eligible for order expiry
    uint256 public constant orderBlockInterval = 10;

    ///@notice map token addresses to current amm reserves
    mapping(address => uint256) public override reserveMap;

    ///@notice data structure to handle long term orders
    LongTermOrdersLib.LongTermOrders internal longTermOrders;

    constructor() ERC20("Pulsar-LP", "PUL-LP") {
        factory = msg.sender;
        longTermOrders.initialize(
            tokenA,
            tokenB,
            block.number,
            orderBlockInterval
        );
    }

    // called once by the factory at time of deployment
    function initialize(address _tokenA, address _tokenB) external override {
        require(msg.sender == factory, "PAIR: FORBIDDEN"); // sufficient check
        tokenA = _tokenA;
        tokenB = _tokenB;
    }

    ///@notice get tokenA reserves
    function tokenAReserves() public view returns (uint256) {
        return reserveMap[tokenA];
    }

    ///@notice get tokenB reserves
    function tokenBReserves() public view returns (uint256) {
        return reserveMap[tokenB];
    }

    ///@notice provide initial liquidity to the amm. This sets the relative price between tokens
    function provideInitialLiquidity(
        address to,
        uint256 amountA,
        uint256 amountB
    ) external override {
        require(
            totalSupply() == 0,
            "liquidity has already been provided, need to call provideLiquidity"
        );

        IERC20(tokenA).transferFrom(to, address(this), amountA);
        IERC20(tokenB).transferFrom(to, address(this), amountB);

        reserveMap[tokenA] = amountA;
        reserveMap[tokenB] = amountB;

        //initial LP amount is the geometric mean of supplied tokens
        uint256 lpAmount = amountA
            .fromUint()
            .sqrt()
            .mul(amountB.fromUint().sqrt())
            .toUint();
        _mint(to, lpAmount);

        emit InitialLiquidityProvided(to, amountA, amountB);
    }

    ///@notice provide liquidity to the AMM
    ///@param lpTokenAmount number of lp tokens to mint with new liquidity
    function provideLiquidity(address to, uint256 lpTokenAmount)
        external
        override
    {
        require(
            totalSupply() != 0,
            "no liquidity has been provided yet, need to call provideInitialLiquidity"
        );

        //execute virtual orders
        longTermOrders.executeVirtualOrdersUntilCurrentBlock(reserveMap);

        //the ratio between the number of underlying tokens and the number of lp tokens must remain invariant after mint
        uint256 amountAIn = (lpTokenAmount * reserveMap[tokenA]) /
            totalSupply();
        uint256 amountBIn = (lpTokenAmount * reserveMap[tokenB]) /
            totalSupply();

        IERC20(tokenA).transferFrom(to, address(this), amountAIn);
        IERC20(tokenB).transferFrom(to, address(this), amountBIn);

        reserveMap[tokenA] += amountAIn;
        reserveMap[tokenB] += amountBIn;

        _mint(to, lpTokenAmount);

        emit LiquidityProvided(to, lpTokenAmount);
    }

    ///@notice remove liquidity to the AMM
    ///@param lpTokenAmount number of lp tokens to burn
    function removeLiquidity(address to, uint256 lpTokenAmount)
        external
        override
    {
        require(
            lpTokenAmount <= totalSupply(),
            "not enough lp tokens available"
        );

        //execute virtual orders
        longTermOrders.executeVirtualOrdersUntilCurrentBlock(reserveMap);

        //the ratio between the number of underlying tokens and the number of lp tokens must remain invariant after burn
        uint256 amountAOut = (reserveMap[tokenA] * lpTokenAmount) /
            totalSupply();
        uint256 amountBOut = (reserveMap[tokenB] * lpTokenAmount) /
            totalSupply();

        IERC20(tokenA).transfer(to, amountAOut);
        IERC20(tokenB).transfer(to, amountBOut);

        reserveMap[tokenA] -= amountAOut;
        reserveMap[tokenB] -= amountBOut;

        _burn(to, lpTokenAmount);

        emit LiquidityRemoved(to, lpTokenAmount);
    }

    ///@notice swap a given amount of tokenA against embedded amm
    function swapFromAToB(address sender, uint256 amountAIn) external override {
        uint256 amountBOut = performSwap(sender, tokenA, tokenB, amountAIn);
        emit SwapAToB(sender, amountAIn, amountBOut);
    }

    ///@notice create a long term order to swap from tokenA
    ///@param amountAIn total amount of token A to swap
    ///@param numberOfBlockIntervals number of block intervals over which to execute long term order
    function longTermSwapFromAToB(
        address sender,
        uint256 amountAIn,
        uint256 numberOfBlockIntervals
    ) external override {
        uint256 orderId = longTermOrders.longTermSwapFromAToB(
            sender,
            amountAIn,
            numberOfBlockIntervals,
            reserveMap
        );
        emit LongTermSwapAToB(sender, amountAIn, orderId);
    }

    ///@notice swap a given amount of tokenB against embedded amm
    function swapFromBToA(address sender, uint256 amountBIn) external override {
        uint256 amountAOut = performSwap(sender, tokenB, tokenA, amountBIn);
        emit SwapBToA(sender, amountBIn, amountAOut);
    }

    ///@notice create a long term order to swap from tokenB
    ///@param amountBIn total amount of tokenB to swap
    ///@param numberOfBlockIntervals number of block intervals over which to execute long term order
    function longTermSwapFromBToA(
        address sender,
        uint256 amountBIn,
        uint256 numberOfBlockIntervals
    ) external override {
        uint256 orderId = longTermOrders.longTermSwapFromBToA(
            sender,
            amountBIn,
            numberOfBlockIntervals,
            reserveMap
        );
        emit LongTermSwapBToA(sender, amountBIn, orderId);
    }

    ///@notice stop the execution of a long term order
    function cancelLongTermSwap(address sender, uint256 orderId)
        external
        override
    {
        longTermOrders.cancelLongTermSwap(sender, orderId, reserveMap);
        emit CancelLongTermOrder(sender, orderId);
    }

    ///@notice withdraw proceeds from a long term swap
    function withdrawProceedsFromLongTermSwap(address sender, uint256 orderId)
        external
        override
    {
        longTermOrders.withdrawProceedsFromLongTermSwap(
            sender,
            orderId,
            reserveMap
        );
        emit WithdrawProceedsFromLongTermOrder(sender, orderId);
    }

    ///@notice private function which implements swap logic
    function performSwap(
        address sender,
        address from,
        address to,
        uint256 amountIn
    ) private returns (uint256 amountOutMinusFee) {
        require(amountIn > 0, "swap amount must be positive");

        //execute virtual orders
        longTermOrders.executeVirtualOrdersUntilCurrentBlock(reserveMap);

        //constant product formula
        uint256 amountOut = (reserveMap[to] * amountIn) /
            (reserveMap[from] + amountIn);
        //charge LP fee
        amountOutMinusFee = (amountOut * (10000 - LP_FEE)) / 10000;

        IERC20(from).transferFrom(sender, address(this), amountIn);
        IERC20(to).transfer(sender, amountOutMinusFee);

        reserveMap[from] += amountIn;
        reserveMap[to] -= amountOutMinusFee;
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

    ///@notice convenience function to execute virtual orders. Note that this already happens
    ///before most interactions with the AMM
    function executeVirtualOrders() public {
        longTermOrders.executeVirtualOrdersUntilCurrentBlock(reserveMap);
    }
}