// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.9;

import "./interfaces/ITWAMMInstantSwap.sol";
import "./interfaces/IPair.sol";
import "./libraries/Library.sol";
import "./libraries/TransferHelper.sol";
import "./interfaces/IWETH10.sol";

contract TWAMMInstantSwap is ITWAMMInstantSwap {
    using Library for address;

    address public immutable factory;
    address public immutable WETH;

    modifier ensure(uint256 deadline) {
        require(deadline >= block.timestamp, "TWAMM: Expired");
        _;
    }

    constructor(address _factory, address _WETH) {
        factory = _factory;
        WETH = _WETH;
    }

    receive() external payable {
        assert(msg.sender == WETH); // only accept ETH via fallback from the WETH contract
    }

    function instantSwapTokenToToken(
        address token0,
        address token1,
        uint256 amountIn,
        uint256 amountOutMin,
        uint256 deadline
    ) external virtual override ensure(deadline) {
        address pair = Library.pairFor(factory, token0, token1);
        IPair(pair).executeVirtualOrders(block.number);
        (uint256 reserve0, uint256 reserve1) = Library.getReserves(
            factory,
            token0,
            token1
        );
        uint256 amountOut = ((reserve1 * amountIn * 997) / 1000) /
            (reserve0 + amountIn);
        require(amountOut >= amountOutMin, "Insufficient Output Amount");
        (address tokenA, ) = Library.sortTokens(token0, token1);

        if (tokenA == token0) {
            IPair(pair).instantSwapFromAToB(msg.sender, amountIn, false);
        } else {
            IPair(pair).instantSwapFromBToA(msg.sender, amountIn, false);
        }
    }

    function instantSwapTokenToETH(
        address token,
        uint256 amountTokenIn,
        uint256 amountETHOutMin,
        uint256 deadline
    ) external virtual override ensure(deadline) {
        address pair = Library.pairFor(factory, token, WETH);
        (address tokenA, ) = Library.sortTokens(token, WETH);

        if (tokenA == token) {
            IPair(pair).instantSwapFromAToB(msg.sender, amountTokenIn, true);
        } else {
            IPair(pair).instantSwapFromBToA(msg.sender, amountTokenIn, true);
        }

        uint256 amountETHWithdraw = IPair(pair).tmpMapWETH(msg.sender);
        require(
            amountETHWithdraw >= amountETHOutMin,
            "Insufficient Output Amount"
        );
        require(
            IWETH10(WETH).balanceOf(address(this)) >= amountETHWithdraw,
            "Inaccurate Amount for WETH."
        );
        IWETH10(WETH).withdrawFrom(
            address(this),
            payable(msg.sender),
            amountETHWithdraw
        );
        IPair(pair).resetMapWETH(msg.sender);
    }

    function instantSwapETHToToken(
        address token,
        uint256 amountETHIn,
        uint256 amountTokenOutMin,
        uint256 deadline
    ) external payable virtual override ensure(deadline) {
        address pair = Library.pairFor(factory, WETH, token);
        IPair(pair).executeVirtualOrders(block.number);
        (uint256 reserveETH, uint256 reserveToken) = Library.getReserves(
            factory,
            WETH,
            token
        );
        uint256 amountTokenOut = ((reserveToken * amountETHIn * 997) / 1000) /
            (reserveETH + amountETHIn);
        require(
            amountTokenOut >= amountTokenOutMin,
            "Insufficient Output Amount"
        );
        (address tokenA, ) = Library.sortTokens(WETH, token);
        IWETH10(WETH).depositTo{value: amountETHIn}(msg.sender);

        if (tokenA == WETH) {
            IPair(pair).instantSwapFromAToB(msg.sender, amountETHIn, false);
        } else {
            IPair(pair).instantSwapFromBToA(msg.sender, amountETHIn, false);
        }
        // refund dust eth, if any
        if (msg.value > amountETHIn)
            TransferHelper.safeTransferETH(msg.sender, msg.value - amountETHIn);
    }
}
