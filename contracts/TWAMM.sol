// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.9;

// import "hardhat/console.sol";
import "./interfaces/ITWAMM.sol";
import "./interfaces/IPair.sol";
import "./interfaces/IFactory.sol";
import "./libraries/Library.sol";
import "./libraries/TransferHelper.sol";
import "./interfaces/IWETH10.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract TWAMM is ITWAMM {
    using Library for address;
    using SafeERC20 for IERC20;

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

    function reserveA(address pair) external view returns (uint256) {
        return IPair(pair).tokenAReserves();
    }

    function reserveB(address pair) external view returns (uint256) {
        return IPair(pair).tokenBReserves();
    }

    function totalSupply(address pair) external view returns (uint256) {
        return IPair(pair).getTotalSupply();
    }

    function obtainPairAddress(address token0, address token1)
        external
        view
        returns (address)
    {
        return IFactory(factory).getPair(token0, token1);
    }

    function createPair(
        address token0,
        address token1,
        uint256 deadline
    ) external virtual override ensure(deadline) {
        require(
            IFactory(factory).getPair(token0, token1) == address(0),
            "Pair Existing Already!"
        );
        IFactory(factory).createPair(token0, token1);
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

        IPair(pair).provideInitialLiquidity(amountA, amountB);
    }

    function addInitialLiquidityETH(
        address token,
        uint256 amountToken,
        uint256 deadline
    ) external payable virtual override ensure(deadline) {
        // create the pair if it doesn't exist yet
        if (IFactory(factory).getPair(token, WETH) == address(0)) {
            IFactory(factory).createPair(token, WETH);
        }

        address pair = Library.pairFor(factory, token, WETH);
        (address tokenA, ) = Library.sortTokens(token, WETH);
        uint256 amountETH = msg.value;
        IWETH10(WETH).deposit{value: amountETH}();
        (uint256 amountA, uint256 amountB) = tokenA == token
            ? (amountToken, amountETH)
            : (amountETH, amountToken);
        IPair(pair).provideInitialLiquidity(amountA, amountB);

        // refund dust eth, if any
        if (msg.value > amountETH) {
            TransferHelper.safeTransferETH(msg.sender, msg.value - amountETH);
        }
    }

    function _addLiquidity(
        address token0,
        address token1,
        uint256 amount0Desired,
        uint256 amount1Desired,
        uint256 amount0Min,
        uint256 amount1Min
    ) internal virtual returns (uint256 amount0, uint256 amount1) {
        (uint256 reserve0, uint256 reserve1) = Library.getReserves(
            factory,
            token0,
            token1
        );
        if (reserve0 == 0 || reserve1 == 0) {
            (amount0, amount1) = (amount0Desired, amount1Desired);
        } else {
            uint256 amount1Optimal = Library.quote(
                amount0Desired,
                reserve0,
                reserve1
            );
            if (amount1Optimal <= amount1Desired) {
                require(
                    amount1Optimal >= amount1Min,
                    "TWAMM: Insufficient Amount1"
                );
                (amount0, amount1) = (amount0Desired, amount1Optimal);
            } else {
                uint256 amount0Optimal = Library.quote(
                    amount1Desired,
                    reserve1,
                    reserve0
                );
                assert(amount0Optimal <= amount0Desired);
                require(
                    amount0Optimal >= amount0Min,
                    "TWAMM: Insufficient Amount0"
                );
                (amount0, amount1) = (amount0Optimal, amount1Desired);
            }
        }
    }

    function addLiquidity(
        address token0,
        address token1,
        uint256 amount0Desired,
        uint256 amount1Desired,
        uint256 amount0Min,
        uint256 amount1Min,
        uint256 deadline
    ) external virtual override ensure(deadline) {
        (uint256 amount0, uint256 amount1) = _addLiquidity(
            token0,
            token1,
            amount0Desired,
            amount1Desired,
            amount0Min,
            amount1Min
        );
        address pair = Library.pairFor(factory, token0, token1);
        (address tokenA, ) = Library.sortTokens(token0, token1);
        (uint256 amountA, uint256 amountB) = tokenA == token0
            ? (amount0, amount1)
            : (amount1, amount0);
        IPair(pair).provideLiquidity(amountA, amountB);
    }

    function addLiquidityETH(
        address token,
        uint256 amountTokenDesired,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        uint256 deadline
    ) external payable virtual override ensure(deadline) {
        (uint256 amountToken, uint256 amountETH) = _addLiquidity(
            token,
            WETH,
            amountTokenDesired,
            msg.value,
            amountTokenMin,
            amountETHMin
        );
        address pair = Library.pairFor(factory, token, WETH);
        (address tokenA, ) = Library.sortTokens(token, WETH);
        (uint256 amountA, uint256 amountB) = tokenA == token
            ? (amountToken, amountETH)
            : (amountETH, amountToken);
        IWETH10(WETH).deposit{value: amountETH}();

        IPair(pair).provideLiquidity(amountA, amountB);

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
        IPair(pair).removeLiquidity(lpTokenAmount);
    }

    function withdrawLiquidityETH(
        address token,
        uint256 lpTokenAmount,
        uint256 deadline
    ) external virtual override ensure(deadline) {
        uint256 balanceBeforeWETH = IWETH10(WETH).balanceOf(msg.sender);
        address pair = Library.pairFor(factory, token, WETH);
        IPair(pair).removeLiquidity(lpTokenAmount);
        uint256 balanceAfterWETH = IWETH10(WETH).balanceOf(msg.sender);
        uint256 amountETHWithdraw = balanceAfterWETH - balanceBeforeWETH;
        IWETH10(WETH).withdraw(amountETHWithdraw);
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
            IPair(pair).instantSwapFromAToB(amountIn);
        } else {
            IPair(pair).instantSwapFromBToA(amountIn);
        }
    }

    function instantSwapTokenToETH(
        address token,
        uint256 amountTokenIn,
        uint256 deadline
    ) external virtual override ensure(deadline) {
        uint256 balanceBeforeWETH = IWETH10(WETH).balanceOf(msg.sender);
        address pair = Library.pairFor(factory, token, WETH);
        (address tokenA, ) = Library.sortTokens(token, WETH);

        if (tokenA == token) {
            IPair(pair).instantSwapFromAToB(amountTokenIn);
        } else {
            IPair(pair).instantSwapFromBToA(amountTokenIn);
        }

        uint256 balanceAfterWETH = IWETH10(WETH).balanceOf(msg.sender);
        uint256 amountETHWithdraw = balanceAfterWETH - balanceBeforeWETH;
        IWETH10(WETH).withdraw(amountETHWithdraw);
    }

    function instantSwapETHToToken(address token, uint256 deadline)
        external
        payable
        virtual
        override
        ensure(deadline)
    {
        address pair = Library.pairFor(factory, WETH, token);
        (address tokenA, ) = Library.sortTokens(WETH, token);
        uint256 amountETHIn = msg.value;
        IWETH10(WETH).deposit{value: amountETHIn}();

        if (tokenA == WETH) {
            IPair(pair).instantSwapFromAToB(amountETHIn);
        } else {
            IPair(pair).instantSwapFromBToA(amountETHIn);
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
            IPair(pair).longTermSwapFromAToB(amountIn, numberOfBlockIntervals);
        } else {
            IPair(pair).longTermSwapFromBToA(amountIn, numberOfBlockIntervals);
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
                amountTokenIn,
                numberOfBlockIntervals
            );
        } else {
            IPair(pair).longTermSwapFromBToA(
                amountTokenIn,
                numberOfBlockIntervals
            );
        }
    }

    function longTermSwapETHToToken(
        address token,
        uint256 numberOfBlockIntervals,
        uint256 deadline
    ) external payable virtual override ensure(deadline) {
        require(
            IFactory(factory).getPair(token, WETH) != address(0),
            "Liquidity Not Provided. Provide It First."
        );

        address pair = Library.pairFor(factory, token, WETH);
        (address tokenA, ) = Library.sortTokens(WETH, token);
        uint256 amountETHIn = msg.value;
        IWETH10(WETH).deposit{value: amountETHIn}();

        if (tokenA == WETH) {
            IPair(pair).longTermSwapFromAToB(
                amountETHIn,
                numberOfBlockIntervals
            );
        } else {
            IPair(pair).longTermSwapFromBToA(
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
        IPair(pair).cancelLongTermSwap(orderId);
    }

    function cancelTermSwapTokenToETH(
        address token,
        uint256 orderId,
        uint256 deadline
    ) external virtual override ensure(deadline) {
        uint256 balanceBeforeWETH = IWETH10(WETH).balanceOf(msg.sender);
        address pair = Library.pairFor(factory, token, WETH);
        IPair(pair).cancelLongTermSwap(orderId);
        uint256 balanceAfterWETH = IWETH10(WETH).balanceOf(msg.sender);
        uint256 amountETHWithdraw = balanceAfterWETH - balanceBeforeWETH;
        IWETH10(WETH).withdraw(amountETHWithdraw);
    }

    function cancelTermSwapETHToToken(
        address token,
        uint256 orderId,
        uint256 deadline
    ) external virtual override ensure(deadline) {
        uint256 balanceBeforeWETH = IWETH10(WETH).balanceOf(msg.sender);
        address pair = Library.pairFor(factory, WETH, token);
        IPair(pair).cancelLongTermSwap(orderId);
        uint256 balanceAfterWETH = IWETH10(WETH).balanceOf(msg.sender);
        uint256 amountETHWithdraw = balanceAfterWETH - balanceBeforeWETH;
        IWETH10(WETH).withdraw(amountETHWithdraw);
    }

    function withdrawProceedsFromTermSwapTokenToToken(
        address token0,
        address token1,
        uint256 orderId,
        uint256 deadline
    ) external virtual override ensure(deadline) {
        address pair = Library.pairFor(factory, token0, token1);
        IPair(pair).withdrawProceedsFromLongTermSwap(orderId);
    }

    function withdrawProceedsFromTermSwapTokenToETH(
        address token,
        uint256 orderId,
        uint256 deadline
    ) external virtual override ensure(deadline) {
        uint256 balanceBeforeWETH = IWETH10(WETH).balanceOf(msg.sender);
        address pair = Library.pairFor(factory, token, WETH);
        IPair(pair).withdrawProceedsFromLongTermSwap(orderId);
        uint256 balanceAfterWETH = IWETH10(WETH).balanceOf(msg.sender);
        uint256 amountETHWithdraw = balanceAfterWETH - balanceBeforeWETH;
        IWETH10(WETH).withdraw(amountETHWithdraw);
    }

    function withdrawProceedsFromTermSwapETHToToken(
        address token,
        uint256 orderId,
        uint256 deadline
    ) external virtual override ensure(deadline) {
        address pair = Library.pairFor(factory, WETH, token);
        IPair(pair).withdrawProceedsFromLongTermSwap(orderId);
    }

    function executeVirtualOrdersWrapper(address pair)
        external
        virtual
        override
    {
        IPair(pair).executeVirtualOrders();
    }
}
