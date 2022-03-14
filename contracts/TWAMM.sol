// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.9;

import "./interfaces/ITWAMM.sol";
import "./interfaces/IPair.sol";
import "./interfaces/IFactory.sol";
import "./libraries/Library.sol";
import "./libraries/TransferHelper.sol";
import "./interfaces/IWETH.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract TWAMM is ITWAMM {
    address public immutable override factory;
    address public immutable override WETH;

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

    function addInitialLiquidity(
        address token0,
        address token1,
        uint256 amount0,
        uint256 amount1,
        uint256 deadline
    ) external virtual override ensure(deadline) {
        // create the pair if it doesn't exist yet
        if (IFactory(factory).getPair(token0, token1) == address(0)) {
            IFactory(factory).createPair(token0, token1);
        }
        address pair = Library.pairFor(factory, token0, token1);
        (address tokenA, ) = Library.sortTokens(token0, token1);
        (uint256 amountA, uint256 amountB) = tokenA == token0
            ? (amount0, amount1)
            : (amount1, amount0);
        IPair(pair).provideInitialLiquidity(msg.sender, amountA, amountB);
    }

    function addInitialLiquidityETH(
        address token,
        uint256 amountToken,
        uint256 amountETH,
        uint256 deadline
    ) external payable virtual override ensure(deadline) {
        if (IFactory(factory).getPair(token, WETH) == address(0)) {
            IFactory(factory).createPair(token, WETH);
        }

        address pair = Library.pairFor(factory, token, WETH);
        (address tokenA, ) = Library.sortTokens(token, WETH);
        (uint256 amountA, uint256 amountB) = tokenA == token
            ? (amountToken, amountETH)
            : (amountETH, amountToken);
        IWETH(WETH).deposit{value: amountETH}();
        IPair(pair).provideInitialLiquidity(msg.sender, amountA, amountB);

        // refund dust eth, if any
        if (msg.value > amountETH)
            TransferHelper.safeTransferETH(msg.sender, msg.value - amountETH);
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
        (, uint256 reserveETH) = Library.getReserves(factory, token, WETH);
        uint256 totalSupplyLP = IERC20(pair).totalSupply();
        uint256 amountETH = (lpTokenAmount * reserveETH) / totalSupplyLP;
        IWETH(WETH).deposit{value: amountETH}();
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
        IPair(pair).removeLiquidity(msg.sender, lpTokenAmount);
    }

    function withdrawLiquidityETH(
        address token,
        uint256 lpTokenAmount,
        uint256 deadline
    ) external virtual override ensure(deadline) {
        uint256 balanceBeforeWETH = IWETH(WETH).balanceOf(msg.sender);
        address pair = Library.pairFor(factory, token, WETH);
        IPair(pair).removeLiquidity(msg.sender, lpTokenAmount);

        uint256 balanceAfterWETH = IWETH(WETH).balanceOf(msg.sender);
        require(balanceAfterWETH >= balanceBeforeWETH);
        uint256 amountETHWithdraw = balanceAfterWETH - balanceBeforeWETH;
        IWETH(WETH).withdraw(amountETHWithdraw);
    }

    function instantSwapTokenToToken(
        address token0,
        address token1,
        uint256 amountIn,
        uint256 deadline
    ) external virtual override ensure(deadline) {
        address pair = Library.pairFor(factory, token0, token1);
        (address tokenA, ) = Library.sortTokens(token0, token1);

        if (tokenA == token0) {
            IPair(pair).instantSwapFromAToB(msg.sender, amountIn);
        } else {
            IPair(pair).instantSwapFromBToA(msg.sender, amountIn);
        }
    }

    function instantSwapTokenToETH(
        address token,
        uint256 amountTokenIn,
        uint256 deadline
    ) external virtual override ensure(deadline) {
        uint256 balanceBeforeWETH = IWETH(WETH).balanceOf(msg.sender);
        address pair = Library.pairFor(factory, token, WETH);
        (address tokenA, ) = Library.sortTokens(token, WETH);

        if (tokenA == token) {
            IPair(pair).instantSwapFromAToB(msg.sender, amountTokenIn);
        } else {
            IPair(pair).instantSwapFromBToA(msg.sender, amountTokenIn);
        }

        uint256 balanceAfterWETH = IWETH(WETH).balanceOf(msg.sender);
        require(balanceAfterWETH >= balanceBeforeWETH);
        uint256 amountETHWithdraw = balanceAfterWETH - balanceBeforeWETH;
        IWETH(WETH).withdraw(amountETHWithdraw);
    }

    function instantSwapETHToToken(
        address token,
        uint256 amountETHIn,
        uint256 deadline
    ) external payable virtual override ensure(deadline) {
        address pair = Library.pairFor(factory, WETH, token);
        (address tokenA, ) = Library.sortTokens(WETH, token);
        IWETH(WETH).deposit{value: amountETHIn}();

        if (tokenA == WETH) {
            IPair(pair).instantSwapFromAToB(msg.sender, amountETHIn);
        } else {
            IPair(pair).instantSwapFromBToA(msg.sender, amountETHIn);
        }
        // refund dust eth, if any
        if (msg.value > amountETHIn)
            TransferHelper.safeTransferETH(msg.sender, msg.value - amountETHIn);
    }

    function longTermSwapTokenToToken(
        address token0,
        address token1,
        uint256 amountIn,
        uint256 numberOfBlockIntervals,
        uint256 deadline
    ) external virtual override ensure(deadline) {
        address pair = Library.pairFor(factory, token0, token1);
        (address tokenA, ) = Library.sortTokens(token0, token1);

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

    function longTermSwapTokenToETH(
        address token,
        uint256 amountTokenIn,
        uint256 numberOfBlockIntervals,
        uint256 deadline
    ) external virtual override ensure(deadline) {
        address pair = Library.pairFor(factory, token, WETH);
        (address tokenA, ) = Library.sortTokens(token, WETH);

        if (tokenA == token) {
            IPair(pair).longTermSwapFromAToB(
                msg.sender,
                amountTokenIn,
                numberOfBlockIntervals
            );
        } else {
            IPair(pair).longTermSwapFromBToA(
                msg.sender,
                amountTokenIn,
                numberOfBlockIntervals
            );
        }
    }

    function longTermSwapETHToToken(
        address token,
        uint256 amountETHIn,
        uint256 numberOfBlockIntervals,
        uint256 deadline
    ) external payable virtual override ensure(deadline) {
        address pair = Library.pairFor(factory, WETH, token);
        (address tokenA, ) = Library.sortTokens(WETH, token);
        IWETH(WETH).deposit{value: amountETHIn}();

        if (tokenA == WETH) {
            IPair(pair).longTermSwapFromAToB(
                msg.sender,
                amountETHIn,
                numberOfBlockIntervals
            );
        } else {
            IPair(pair).longTermSwapFromBToA(
                msg.sender,
                amountETHIn,
                numberOfBlockIntervals
            );
        }
        // refund dust eth, if any
        if (msg.value > amountETHIn)
            TransferHelper.safeTransferETH(msg.sender, msg.value - amountETHIn);
    }

    function cancelTermSwapTokenToToken(
        address token0,
        address token1,
        uint256 orderId,
        uint256 deadline
    ) external virtual override ensure(deadline) {
        address pair = Library.pairFor(factory, token0, token1);
        IPair(pair).cancelLongTermSwap(msg.sender, orderId);
    }

    function cancelTermSwapTokenToETH(
        address token,
        uint256 orderId,
        uint256 deadline
    ) external virtual override ensure(deadline) {
        uint256 balanceBeforeWETH = IWETH(WETH).balanceOf(msg.sender);
        address pair = Library.pairFor(factory, token, WETH);
        IPair(pair).cancelLongTermSwap(msg.sender, orderId);

        uint256 balanceAfterWETH = IWETH(WETH).balanceOf(msg.sender);
        require(balanceAfterWETH >= balanceBeforeWETH);
        uint256 amountETHWithdraw = balanceAfterWETH - balanceBeforeWETH;
        IWETH(WETH).withdraw(amountETHWithdraw);
    }

    function cancelTermSwapETHToToken(
        address token,
        uint256 orderId,
        uint256 deadline
    ) external virtual override ensure(deadline) {
        uint256 balanceBeforeWETH = IWETH(WETH).balanceOf(msg.sender);
        address pair = Library.pairFor(factory, WETH, token);
        IPair(pair).cancelLongTermSwap(msg.sender, orderId);

        uint256 balanceAfterWETH = IWETH(WETH).balanceOf(msg.sender);
        require(balanceAfterWETH >= balanceBeforeWETH);
        uint256 amountETHWithdraw = balanceAfterWETH - balanceBeforeWETH;
        IWETH(WETH).withdraw(amountETHWithdraw);
    }

    function withdrawProceedsFromTermSwapTokenToToken(
        address token0,
        address token1,
        uint256 orderId,
        uint256 deadline
    ) external virtual override ensure(deadline) {
        address pair = Library.pairFor(factory, token0, token1);
        IPair(pair).withdrawProceedsFromLongTermSwap(msg.sender, orderId);
    }

    function withdrawProceedsFromTermSwapTokenToETH(
        address token,
        uint256 orderId,
        uint256 deadline
    ) external virtual override ensure(deadline) {
        uint256 balanceBeforeWETH = IWETH(WETH).balanceOf(msg.sender);
        address pair = Library.pairFor(factory, token, WETH);
        IPair(pair).withdrawProceedsFromLongTermSwap(msg.sender, orderId);

        uint256 balanceAfterWETH = IWETH(WETH).balanceOf(msg.sender);
        require(balanceAfterWETH >= balanceBeforeWETH);
        uint256 amountETHWithdraw = balanceAfterWETH - balanceBeforeWETH;
        IWETH(WETH).withdraw(amountETHWithdraw);
    }

    function withdrawProceedsFromTermSwapETHToToken(
        address token,
        uint256 orderId,
        uint256 deadline
    ) external virtual override ensure(deadline) {
        uint256 balanceBeforeWETH = IWETH(WETH).balanceOf(msg.sender);
        address pair = Library.pairFor(factory, WETH, token);
        IPair(pair).withdrawProceedsFromLongTermSwap(msg.sender, orderId);

        uint256 balanceAfterWETH = IWETH(WETH).balanceOf(msg.sender);
        require(balanceAfterWETH >= balanceBeforeWETH);
        uint256 amountETHWithdraw = balanceAfterWETH - balanceBeforeWETH;
        IWETH(WETH).withdraw(amountETHWithdraw);
    }
}
