// SPDX-License-Identifier: GPL-3.0-or-later
// pragma solidity ^0.8.9;

// import "hardhat/console.sol";
// import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// ///@notice TWAMM -- https://www.paradigm.xyz/2021/07/twamm/
// contract TWAMM is ERC20 {
//     using LongTermOrdersLib for LongTermOrdersLib.LongTermOrders;
//     using PRBMathUD60x18 for uint256;

//     /// ---------------------------
//     /// ------ AMM Parameters -----
//     /// ---------------------------
//     ///@notice tokens that can be traded in the AMM
//     address public tokenA;
//     address public tokenB;

//     ///@notice fee for LP providers, 4 decimal places, i.e. 30 = 0.3%
//     uint256 public constant LP_FEE = 30;

    // ///@notice map token addresses to current amm reserves
    // mapping(address => uint256) reserveMap;

//     /// ---------------------------
//     /// -----TWAMM Parameters -----
//     /// ---------------------------

//     ///@notice interval between blocks that are eligible for order expiry
//     uint256 public orderBlockInterval;

//     ///@notice data structure to handle long term orders
//     LongTermOrdersLib.LongTermOrders internal longTermOrders;

//     /// ---------------------------
//     /// --------- Events ----------
//     /// ---------------------------

//     ///@notice An event emitted when initial liquidity is provided
//     event InitialLiquidityProvided(
//         address indexed addr,
//         uint256 amountA,
//         uint256 amountB
//     );

pragma solidity ^0.8.9;

import "./interfaces/ITWAMM.sol";
import "./interfaces/IPair.sol";
import "./interfaces/IFactory.sol";
import "./libraries/Library.sol";
import "./libraries/TransferHelper.sol";
import "./interfaces/IWETH.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "hardhat/console.sol";
// import "./libraries/LongTermOrders.sol";

contract TWAMM is ITWAMM {
    address public immutable override factory;
    address public immutable override WETH;

    modifier ensure(uint256 deadline) {
        require(deadline >= block.timestamp, "TWAMM: Expired");
        _;
    }

    // ///@notice provide  temporary approve function for user (msg.sender) to approve amount TokenA & B to this contract
    // function approveTokenAB(uint256 amountA, uint256 amountB)
    //     external
    // {
    //     ERC20(tokenA).approve(address(this), amountA); // this is self-approval, useless cause it's address(this) sending out this transaction
    //     ERC20(tokenB).approve(address(this), amountB); // the msg.sender approves address(this) to spend tokenB
        



    // }

    // ///@notice provide initial liquidity to the amm. This sets the relative price between tokens
    // function provideInitialLiquidity(uint256 amountA, uint256 amountB)
    //     external
    // {
    //     require(
    //         totalSupply() == 0,
    //         "liquidity has already been provided, need to call provideLiquidity"
    //     );


    //     ERC20(tokenA).transferFrom(msg.sender, address(this), amountA);
    //     ERC20(tokenB).transferFrom(msg.sender, address(this), amountB);

    //     reserveMap[tokenA] = amountA;
    //     reserveMap[tokenB] = amountB;

    //     //initial LP amount is the geometric mean of supplied tokens
    //     uint256 lpAmount = amountA
    //         .fromUint()
    //         .sqrt()
    //         .mul(amountB.fromUint().sqrt())
    //         .toUint();
    //     _mint(msg.sender, lpAmount);
    // event PairCheck(address pair);

    //     emit InitialLiquidityProvided(msg.sender, amountA, amountB);
    constructor(address _factory, address _WETH) {
        factory = _factory;
        WETH = _WETH;
    }

    receive() external payable {
        assert(msg.sender == WETH); // only accept ETH via fallback from the WETH contract
    }

    // ///@notice remove liquidity to the AMM
    // ///@param lpTokenAmount number of lp tokens to burn
    // function removeLiquidity(uint256 lpTokenAmount) external {
    //     require(
    //         lpTokenAmount <= totalSupply(),
    //         "not enough lp tokens available"
    //     );
    //     //execute virtual orders
    //     longTermOrders.executeVirtualOrdersUntilCurrentBlock(reserveMap);

    //     //the ratio between the number of underlying tokens and the number of lp tokens must remain invariant after burn
    //     uint256 amountAOut = (reserveMap[tokenA] * lpTokenAmount) /
    //         totalSupply();
    //     uint256 amountBOut = (reserveMap[tokenB] * lpTokenAmount) /
    //         totalSupply();

    //     ERC20(tokenA).transfer(msg.sender, amountAOut);
    //     ERC20(tokenB).transfer(msg.sender, amountBOut);
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
        console.log("deployed pair address check", pair);
        // console.log(IPair);
        IPair(pair).provideInitialLiquidity(msg.sender, amountA, amountB);
    }

    function reserveA(
        address tokenA,
        address tokenB
    ) external view returns (uint256) {
        address pair = Library.pairFor(factory, tokenA, tokenB);
        console.log("contract check", pair);
        return IPair(pair).tokenAReserves();
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
    // ///@notice create a long term order to swap from tokenA
    // ///@param amountAIn total amount of token A to swap
    // ///@param numberOfBlockIntervals number of block intervals over which to execute long term order
    // function longTermSwapFromAToB(
    //     uint256 amountAIn,
    //     uint256 numberOfBlockIntervals
    // ) external {
    //     uint256 orderId = longTermOrders.longTermSwapFromAToB(
    //         amountAIn,
    //         numberOfBlockIntervals,
    //         reserveMap
    //     );
    //     emit LongTermSwapAToB(msg.sender, amountAIn, orderId);

    function withdrawLiquidityETH(
        address token,
        uint256 lpTokenAmount,
        uint256 deadline
    ) external virtual override ensure(deadline) {
        address pair = Library.pairFor(factory, token, WETH);
        IPair(pair).removeLiquidity(msg.sender, lpTokenAmount);
        (, uint256 reserveETH) = Library.getReserves(factory, token, WETH);
        uint256 totalSupplyLP = IERC20(pair).totalSupply();
        uint256 amountETH = (reserveETH * lpTokenAmount) / totalSupplyLP;
        IWETH(WETH).withdraw(amountETH);
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
        address pair = Library.pairFor(factory, token, WETH);
        (address tokenA, ) = Library.sortTokens(token, WETH);

        if (tokenA == token) {
            IPair(pair).instantSwapFromAToB(msg.sender, amountTokenIn);
        } else {
            IPair(pair).instantSwapFromBToA(msg.sender, amountTokenIn);
        }

        (uint256 reserveToken, uint256 reserveETH) = Library.getReserves(
            factory,
            token,
            WETH
        );
        uint256 amountETHOut = (reserveETH * amountTokenIn) /
            (reserveToken + amountTokenIn);
        //charge LP fee
        uint256 amountETHOutMinusFee = (amountETHOut * 997) / 1000;
        IWETH(WETH).withdraw(amountETHOutMinusFee);
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


    // ///@notice get user orderIds
    // function userIdsCheck(
    //     address userAddress
    // ) external view returns (uint256[] memory) {
    //     return longTermOrders.orderIdMap[userAddress];
    // }


    // ///@notice get user order Id status
    // function orderIdStatusCheck(
    //     uint256 orderId
    // ) external view returns (bool) {
    //     return longTermOrders.orderIdStatusMap[orderId];
    // }

    // ///@notice get user order details
    // function getOrderDetails(
    //     uint256 orderId
    // ) external view returns (LongTermOrdersLib.Order memory) {
    //     return longTermOrders.orderMap[orderId];
    // }
    
    // ///@notice get tokenA reserves
    // function tokenAReserves() public view returns (uint256) {
    //     return reserveMap[tokenA];
    // }

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

    function cancelTermSwap(
        address token0,
        address token1,
        uint256 orderId,
        uint256 deadline
    ) external virtual override ensure(deadline) {
        address pair = Library.pairFor(factory, token0, token1);
        IPair(pair).cancelLongTermSwap(msg.sender, orderId);
    }

    function withdrawProceedsFromTermSwap(
        address token0,
        address token1,
        uint256 orderId,
        uint256 deadline
    ) external virtual override ensure(deadline) {
        address pair = Library.pairFor(factory, token0, token1);
        IPair(pair).withdrawProceedsFromLongTermSwap(msg.sender, orderId);
    }
}
