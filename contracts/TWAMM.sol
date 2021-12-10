// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.9;

import "./interfaces/ITWAMM.sol";
import "./interfaces/IPair.sol";
import "./interfaces/IFactory.sol";
import "./libraries/Library.sol";
import "./libraries/TransferHelper.sol";
import "./interfaces/IWETH.sol";

contract TWAMM is ITWAMM {
    address public immutable override factory;
    address public immutable override WETH;

    constructor(address _factory, address _WETH) {
        factory = _factory;
        WETH = _WETH;
    }

    receive() external payable {
        assert(msg.sender == WETH); // only accept ETH via fallback from the WETH contract
    }

    function _provideInitialLiquidity(
        address token0,
        address token1,
        uint256 amount0,
        uint256 amount1
    ) external override {
        (address tokenA, address tokenB) = Library.sortTokens(token0, token1);
        (uint256 amountA, uint256 amountB) = tokenA == token1
            ? (amount0, amount1)
            : (amount1, amount0);
        address pair = Library.pairFor(factory, token0, token1);
        IPair(pair).provideInitialLiquidity(msg.sender, amountA, amountB);
    }

    function _provideLiquidity(
        address token0,
        address token1,
        uint256 lpTokenAmount
    ) external override {
        address pair = Library.pairFor(factory, token0, token1);
        IPair(pair).provideLiquidity(msg.sender, lpTokenAmount);
    }

    function _removeLiquidity(
        address token0,
        address token1,
        uint256 lpTokenAmount
    ) external override {
        address pair = Library.pairFor(factory, token0, token1);
        IPair(pair).removeLiquidity(msg.sender, lpTokenAmount);
    }

    function instantSwap(
        address token0,
        address token1,
        uint256 amountIn
    ) external override {
        address pair = Library.pairFor(factory, token0, token1);
        (address tokenA, address tokenB) = Library.sortTokens(token0, token1);

        if (tokenA == token0) {
            IPair(pair).swapFromAToB(msg.sender, amountIn);
        } else {
            IPair(pair).swapFromBToA(msg.sender, amountIn);
        }
    }

    function termSwap(
        address token0,
        address token1,
        uint256 amountIn,
        uint256 numberOfBlockIntervals
    ) external override {
        address pair = Library.pairFor(factory, token0, token1);
        (address tokenA, address tokenB) = Library.sortTokens(token0, token1);

        if (tokenA == token0) {
            IPair(pair).longTermSwapFromAToB(
                msg.sender,
                amountIn,
                numberOfBlockIntervals
            );
        } else {
            IPair(pair).longTermSwapFromBToA(
                msg.sender,
                amountIn,
                numberOfBlockIntervals
            );
        }
    }

    function _cancelLongTermSwap(
        address token0,
        address token1,
        uint256 orderId
    ) external override {
        address pair = Library.pairFor(factory, token0, token1);
        IPair(pair).cancelLongTermSwap(msg.sender, orderId);
    }

    function _withdrawProceedsFromLongTermSwap(
        address token0,
        address token1,
        uint256 orderId
    ) external override {
        address pair = Library.pairFor(factory, token0, token1);
        IPair(pair).withdrawProceedsFromLongTermSwap(msg.sender, orderId);
    }
}
