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
    ) external virtual override ensure(deadline) returns (uint256 amountOut) {
        address pair = Library.pairFor(factory, token0, token1);
        (address tokenA, ) = Library.sortTokens(token0, token1);

        if (tokenA == token0) {
            amountOut = IPair(pair).instantSwapFromAToB(
                msg.sender,
                amountIn,
                false
            );
        } else {
            amountOut = IPair(pair).instantSwapFromBToA(
                msg.sender,
                amountIn,
                false
            );
        }
        require(amountOut >= amountOutMin, "Insufficient Output Amount");
    }

    function instantSwapTokenToETH(
        address token,
        uint256 amountTokenIn,
        uint256 amountETHOutMin,
        uint256 deadline
    )
        external
        virtual
        override
        ensure(deadline)
        returns (uint256 amountETHOut)
    {
        address pair = Library.pairFor(factory, token, WETH);
        (address tokenA, ) = Library.sortTokens(token, WETH);

        if (tokenA == token) {
            IPair(pair).instantSwapFromAToB(msg.sender, amountTokenIn, true);
        } else {
            IPair(pair).instantSwapFromBToA(msg.sender, amountTokenIn, true);
        }

        amountETHOut = IPair(pair).tmpMapWETH(msg.sender);
        require(amountETHOut >= amountETHOutMin, "Insufficient Output Amount");
        require(
            IWETH10(WETH).balanceOf(address(this)) >= amountETHOut,
            "Inaccurate Amount for WETH."
        );
        IWETH10(WETH).withdrawFrom(
            address(this),
            payable(msg.sender),
            amountETHOut
        );
        IPair(pair).resetMapWETH(msg.sender);
    }

    function instantSwapETHToToken(
        address token,
        uint256 amountETHIn,
        uint256 amountTokenOutMin,
        uint256 deadline
    )
        external
        payable
        virtual
        override
        ensure(deadline)
        returns (uint256 amountTokenOut)
    {
        address pair = Library.pairFor(factory, WETH, token);
        (address tokenA, ) = Library.sortTokens(WETH, token);
        IWETH10(WETH).depositTo{value: amountETHIn}(msg.sender);

        if (tokenA == WETH) {
            amountTokenOut = IPair(pair).instantSwapFromAToB(
                msg.sender,
                amountETHIn,
                false
            );
        } else {
            amountTokenOut = IPair(pair).instantSwapFromBToA(
                msg.sender,
                amountETHIn,
                false
            );
        }
        require(
            amountTokenOut >= amountTokenOutMin,
            "Insufficient Output Amount"
        );
        // refund dust eth, if any
        if (msg.value > amountETHIn)
            TransferHelper.safeTransferETH(msg.sender, msg.value - amountETHIn);
    }
}
