// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.9;

interface IPair {
    function factory() external view returns (address);

    function tokenA() external view returns (address);

    function tokenB() external view returns (address);

    function priceACumulativeLast() external view returns (uint256);

    function priceBCumulativeLast() external view returns (uint256);

    function MINIMUM_LIQUIDITY() external pure returns (uint256);

    function LP_FEE() external pure returns (uint256);

    function orderBlockInterval() external pure returns (uint256);

    function reserveMap(address) external view returns (uint256);

    function tokenAReserves() external view returns (uint256);

    function tokenBReserves() external view returns (uint256);

    function getTotalSupply() external view returns (uint256);

    function sync() external;

    event UpdatePrice(
        uint256 balanceA,
        uint256 balanceB,
        uint256 reserveA,
        uint256 reserveB
    );
    event InitialLiquidityProvided(
        address indexed addr,
        uint256 amountAIn,
        uint256 amountBIn
    );
    event LiquidityProvided(
        address indexed addr,
        uint256 amountAIn,
        uint256 amountBIn
    );
    event LiquidityRemoved(
        address indexed addr,
        uint256 amountAOut,
        uint256 amountBOut
    );
    event InstantSwapAToB(
        address indexed addr,
        uint256 amountAIn,
        uint256 amountBOut
    );
    event InstantSwapBToA(
        address indexed addr,
        uint256 amountBIn,
        uint256 amountAOut
    );
    event LongTermSwapAToB(
        address indexed addr,
        uint256 amountAIn,
        uint256 orderId
    );
    event LongTermSwapBToA(
        address indexed addr,
        uint256 amountBIn,
        uint256 orderId
    );
    event CancelLongTermOrder(address indexed addr, uint256 orderId);
    event WithdrawProceedsFromLongTermOrder(
        address indexed addr,
        uint256 orderId
    );

    function provideInitialLiquidity(address to) external;

    function provideLiquidity(address to) external;

    function removeLiquidity(address to) external;

    function instantSwapFromAToB(address sender) external;

    function longTermSwapFromAToB(
        address sender,
        uint256 numberOfBlockIntervals
    ) external;

    function instantSwapFromBToA(address sender) external;

    function longTermSwapFromBToA(
        address sender,
        uint256 numberOfBlockIntervals
    ) external;

    function cancelLongTermSwap(address sender, uint256 orderId) external;

    function withdrawProceedsFromLongTermSwap(address sender, uint256 orderId)
        external;

    function userIdsCheck(address userAddress)
        external
        view
        returns (uint256[] memory);

    function orderIdStatusCheck(uint256 orderId) external view returns (bool);

    function executeVirtualOrders() external;
}
