// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.9;

interface ITWAMM {

    function factory() external pure returns (address);

    function WETH() external pure returns (address);

    function _provideInitialLiquidity(address token0, address token1, uint256 amount0, uint256 amount1) external;

    function _provideLiquidity(address token0, address token1, uint256 lpTokenAmount) external;

    function _removeLiquidity(address token0, address token1, uint256 lpTokenAmount) external;

    function swap(address token0, address token1, uint256 amountIn) external;

    function termSwap (address token0, address token1, uint256 amountIn,uint256 numberOfBlockIntervals) external;

    function _cancelLongTermSwap(address token0, address token1, uint256 orderId) external;

    function _withdrawProceedsFromLongTermSwap(address token0, address token1, uint256 orderId) external;
}