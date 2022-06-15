// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.9;

import "./interfaces/ITWAMMLiquidity.sol";
import "./interfaces/IPair.sol";
import "./libraries/Library.sol";
import "./libraries/TransferHelper.sol";
import "./interfaces/IWETH10.sol";

contract TWAMMLiquidity is ITWAMMLiquidity {
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

    function addLiquidity(
        address token0,
        address token1,
        uint256 lpTokenAmount,
        uint256 deadline
    ) external virtual override ensure(deadline) {
        address pair = Library.pairFor(factory, token0, token1);
        IPair(pair).provideLiquidity(msg.sender, lpTokenAmount);
    }

    function addLiquidityETH(
        address token,
        uint256 lpTokenAmount,
        uint256 deadline
    ) external payable virtual override ensure(deadline) {
        address pair = Library.pairFor(factory, token, WETH);
        IPair(pair).executeVirtualOrders(block.number);
        (, uint256 reserveETH) = Library.getReserves(factory, token, WETH);
        uint256 totalSupplyLP = IPair(pair).getTotalSupply();
        uint256 amountETH = (lpTokenAmount * reserveETH) / totalSupplyLP;

        IWETH10(WETH).depositTo{value: amountETH}(msg.sender);
        IPair(pair).provideLiquidity(msg.sender, lpTokenAmount);

        // refund dust eth, if any
        if (msg.value > amountETH)
            TransferHelper.safeTransferETH(msg.sender, msg.value - amountETH);
    }

    function withdrawLiquidity(
        address token0,
        address token1,
        uint256 lpTokenAmount,
        uint256 deadline
    ) external virtual override ensure(deadline) {
        address pair = Library.pairFor(factory, token0, token1);
        IPair(pair).removeLiquidity(msg.sender, lpTokenAmount, false);
    }

    function withdrawLiquidityETH(
        address token,
        uint256 lpTokenAmount,
        uint256 deadline
    ) external virtual override ensure(deadline) {
        address pair = Library.pairFor(factory, token, WETH);
        IPair(pair).removeLiquidity(msg.sender, lpTokenAmount, true);
        uint256 amountETHWithdraw = IPair(pair).tmpMapWETH(msg.sender);
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
}
