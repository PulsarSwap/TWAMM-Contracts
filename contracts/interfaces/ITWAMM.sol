// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.9;

interface ITWAMM {
    function factory() external view returns (address);

    function WETH() external view returns (address);

    function _provideInitialLiquidity(
        address token0,
        address token1,
        uint256 amount0,
        uint256 amount1,
        uint256 deadline
    ) external;

    function _provideInitialLiquidityETH(
        address token,
        uint256 amountToken,
        uint256 amountETH,
        uint256 deadline
    ) external payable;

    function _provideLiquidity(
        address token0,
        address token1,
        uint256 lpTokenAmount,
        uint256 deadline
    ) external;

    function _provideLiquidityETH(
        address token,
        uint256 lpTokenAmount,
        uint256 deadline
    ) external payable;

    function _removeLiquidity(
        address token0,
        address token1,
        uint256 lpTokenAmount,
        uint256 deadline
    ) external;

    function _removeLiquidityETH(
        address token,
        uint256 lpTokenAmount,
        uint256 deadline
    ) external;

    function instantSwapTokenToToken(
        address token0,
        address token1,
        uint256 amountIn,
        uint256 deadline
    ) external;

    function instantSwapTokenToETH(
        address token,
        uint256 amountTokenIn,
        uint256 deadline
    ) external;

    function instantSwapETHToToken(
        address token,
        uint256 amountETHIn,
        uint256 deadline
    ) external payable;

    function termSwapTokenToToken(
        address token0,
        address token1,
        uint256 amountIn,
        uint256 numberOfBlockIntervals,
        uint256 deadline
    ) external;

    function termSwapTokenToETH(
        address token,
        uint256 amountTokenIn,
        uint256 numberOfBlockIntervals,
        uint256 deadline
    ) external;

    function termSwapETHToToken(
        address token,
        uint256 amountETHIn,
        uint256 numberOfBlockIntervals,
        uint256 deadline
    ) external payable;

    function _cancelLongTermSwap(
        address token0,
        address token1,
        uint256 orderId,
        uint256 deadline
    ) external;

    function _withdrawProceedsFromLongTermSwap(
        address token0,
        address token1,
        uint256 orderId,
        uint256 deadline
    ) external;
}
