// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.9;

interface ITWAMM {
    function factory() external view returns (address);

    function WETH() external view returns (address);

    function addInitialLiquidity(
        address token0,
        address token1,
        uint256 amount0,
        uint256 amount1,
        uint256 deadline
    ) external;

    function obtainPairAddress(address token0, address token1)
        external
        returns (address);

    function createPair(
        address token0,
        address token1,
        uint256 deadline
    ) external;

    function reserveA(address pair) external returns (uint256);

    function reserveB(address pair) external returns (uint256);

    function totalSupply(address pair) external returns (uint256);

    // function getPair(
    //     address token0,
    //     address token1,
    //     uint256 deadline
    // ) external returns (address);

    function executeVirtualOrdersWrapper(address pair) external;

    function addInitialLiquidityETH(
        address token,
        uint256 amountToken,
        uint256 amountETH,
        uint256 deadline
    ) external payable;

    function addLiquidity(
        address token0,
        address token1,
        uint256 lpTokenAmount,
        uint256 deadline
    ) external;

    function addLiquidityETH(
        address token,
        uint256 lpTokenAmount,
        uint256 deadline
    ) external payable;

    function withdrawLiquidity(
        address token0,
        address token1,
        uint256 lpTokenAmount,
        uint256 deadline
    ) external;

    function withdrawLiquidityETH(
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

    function longTermSwapTokenToToken(
        address token0,
        address token1,
        uint256 amountIn,
        uint256 numberOfBlockIntervals,
        uint256 deadline
    ) external;

    function longTermSwapTokenToETH(
        address token,
        uint256 amountTokenIn,
        uint256 numberOfBlockIntervals,
        uint256 deadline
    ) external;

    function longTermSwapETHToToken(
        address token,
        uint256 amountETHIn,
        uint256 numberOfBlockIntervals,
        uint256 deadline
    ) external payable;

    function cancelTermSwapTokenToToken(
        address token0,
        address token1,
        uint256 orderId,
        uint256 deadline
    ) external;

    function cancelTermSwapTokenToETH(
        address token,
        uint256 orderId,
        uint256 deadline
    ) external;

    function cancelTermSwapETHToToken(
        address token,
        uint256 orderId,
        uint256 deadline
    ) external;

    function withdrawProceedsFromTermSwapTokenToToken(
        address token0,
        address token1,
        uint256 orderId,
        uint256 deadline
    ) external;

    function withdrawProceedsFromTermSwapTokenToETH(
        address token,
        uint256 orderId,
        uint256 deadline
    ) external;

    function withdrawProceedsFromTermSwapETHToToken(
        address token,
        uint256 orderId,
        uint256 deadline
    ) external;
}
