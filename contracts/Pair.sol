// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.9;

// Inspired by https://www.paradigm.xyz/2021/07/twamm
// https://github.com/para-dave/twamm

// import "hardhat/console.sol";
import "./interfaces/IPair.sol";
import "./libraries/LongTermOrders.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@rari-capital/solmate/src/utils/ReentrancyGuard.sol";
import "prb-math/contracts/PRBMathUD60x18.sol";
import "./libraries/Math.sol";
import "./libraries/UQ112x112.sol";

contract Pair is IPair, ERC20, ReentrancyGuard {
    using LongTermOrdersLib for LongTermOrdersLib.LongTermOrders;
    using SafeERC20 for IERC20;
    using PRBMathUD60x18 for uint256;
    using UQ112x112 for uint224;

    address public override factory;
    address public override tokenA;
    address public override tokenB;

    uint32 private blockTimestampLast;
    uint256 public override priceACumulativeLast;
    uint256 public override priceBCumulativeLast;

    uint256 public constant MINIMUM_LIQUIDITY = 10**3;

    ///@notice fee for LP providers, 4 decimal places, i.e. 30 = 0.3%
    uint256 public constant LP_FEE = 30;

    ///@notice interval between blocks that are eligible for order expiry
    uint256 public constant orderBlockInterval = 5;

    ///@notice map token addresses to current amm reserves
    mapping(address => uint256) public override reserveMap;

    ///@notice data structure to handle long term orders
    LongTermOrdersLib.LongTermOrders internal longTermOrders;

    /// ---------------------------
    /// --------- Modifiers ----------
    /// ---------------------------
    ///@notice reentrancy guard initialized to state
    uint256 private unlocked = 1;

    ///@notice reentrancy guard
    modifier lock() {
        require(unlocked == 1, "Locked");

        unlocked = 0; // lock
        _;
        unlocked = 1; // unlock
    }

    constructor(address _tokenA, address _tokenB) ERC20("Pulsar-LP", "PUL-LP") {
        factory = msg.sender;
        tokenA = _tokenA;
        tokenB = _tokenB;
        longTermOrders.initialize(
            tokenA,
            tokenB,
            block.number,
            orderBlockInterval
        );
    }

    ///@notice get tokenA reserves
    function tokenAReserves() public view returns (uint256) {
        return reserveMap[tokenA];
    }

    ///@notice get tokenB reserves
    function tokenBReserves() public view returns (uint256) {
        return reserveMap[tokenB];
    }

    ///@notice get LP total supply
    function getTotalSupply() public view returns (uint256) {
        return totalSupply();
    }

    // update price accumulators, on the first call per block
    function updatePrice(
        uint256 balanceA,
        uint256 balanceB,
        uint256 reserveA,
        uint256 reserveB
    ) private {
        require(
            balanceA <= type(uint256).max && balanceB <= type(uint256).max,
            "Pair: Overflow"
        );
        uint32 blockTimestamp = uint32(block.timestamp % 2**32);
        uint32 timeElapsed = blockTimestamp - blockTimestampLast; // overflow is desired
        if (timeElapsed > 0 && reserveA != 0 && reserveB != 0) {
            // * never overflows, and + overflow is desired
            priceACumulativeLast +=
                uint256(
                    UQ112x112.encode(uint112(reserveB)).uqdiv(uint112(reserveA))
                ) *
                timeElapsed;
            priceBCumulativeLast +=
                uint256(
                    UQ112x112.encode(uint112(reserveA)).uqdiv(uint112(reserveB))
                ) *
                timeElapsed;
        }
        reserveMap[tokenA] = balanceA;
        reserveMap[tokenA] = balanceB;
        blockTimestampLast = blockTimestamp;

        emit UpdatePrice(balanceA, balanceB, reserveA, reserveB);
    }

    // force reserves to match balances
    function sync() external override lock nonReentrant {
        updatePrice(
            IERC20(tokenA).balanceOf(address(this)),
            IERC20(tokenB).balanceOf(address(this)),
            reserveMap[tokenA],
            reserveMap[tokenB]
        );
    }

    ///@notice provide initial liquidity to the amm. This sets the relative price between tokens
    function provideInitialLiquidity(address to)
        external
        override
        lock
        nonReentrant
    {
        require(
            totalSupply() == 0,
            "Liquidity Has Already Been Provided, Need To Call provideLiquidity()"
        );

        uint256 balanceA = IERC20(tokenA).balanceOf(address(this));
        uint256 balanceB = IERC20(tokenB).balanceOf(address(this));

        //initial LP amount is the geometric mean of supplied tokens
        uint256 lpTokenAmount = balanceA
            .fromUint()
            .sqrt()
            .mul(balanceB.fromUint().sqrt())
            .toUint() - MINIMUM_LIQUIDITY;
        require(lpTokenAmount > 0, "Pair: Insufficient Liquidity Providity");
        _mint(address(0), MINIMUM_LIQUIDITY); // permanently lock the first MINIMUM_LIQUIDITY tokens
        _mint(to, lpTokenAmount);

        updatePrice(balanceA, balanceB, balanceA, balanceB);
        emit InitialLiquidityProvided(to, balanceA, balanceB);
    }

    ///@notice provide liquidity to the AMM
    function provideLiquidity(address to) external override lock nonReentrant {
        require(
            totalSupply() != 0,
            "No Liquidity Has Been Provided Yet, Need To Call provideInitialLiquidity()"
        );

        uint256 reserveA = reserveMap[tokenA];
        uint256 reserveB = reserveMap[tokenB];
        uint256 balanceA = IERC20(tokenA).balanceOf(address(this));
        uint256 balanceB = IERC20(tokenB).balanceOf(address(this));
        uint256 amountAIn = balanceA - reserveA;
        uint256 amountBIn = balanceB - reserveB;

        //the ratio between the number of underlying tokens and the number of lp tokens must remain invariant after mint
        uint256 lpTokenAmount = Math.min(
            (amountAIn * totalSupply()) / reserveA,
            (amountBIn * totalSupply()) / reserveB
        );
        require(lpTokenAmount > 0, "Pair: Insufficient Liquidity Providity");
        _mint(to, lpTokenAmount);

        //execute virtual orders
        longTermOrders.executeVirtualOrdersUntilCurrentBlock(reserveMap);

        updatePrice(balanceA, balanceB, reserveA, reserveB);
        emit LiquidityProvided(to, amountAIn, amountBIn);
    }

    ///@notice remove liquidity to the AMM
    function removeLiquidity(address to) external override lock nonReentrant {
        uint256 reserveA = reserveMap[tokenA];
        uint256 reserveB = reserveMap[tokenB];
        uint256 balanceA = IERC20(tokenA).balanceOf(address(this));
        uint256 balanceB = IERC20(tokenB).balanceOf(address(this));

        uint256 lpTokenAmount = balanceOf(address(this));
        require(
            lpTokenAmount <= totalSupply(),
            "Not Enough Lp Tokens Available"
        );
        uint256 totalSupplyLP = totalSupply();
        //the ratio between the number of underlying tokens and the number of lp tokens must remain invariant after burn
        uint256 amountAOut = (reserveA * lpTokenAmount) / totalSupplyLP;
        uint256 amountBOut = (reserveB * lpTokenAmount) / totalSupplyLP;

        require(
            amountAOut > 0 && amountBOut > 0,
            "Pair: Insufficient Liquidity Remove"
        );

        _burn(to, lpTokenAmount);

        //execute virtual orders
        longTermOrders.executeVirtualOrdersUntilCurrentBlock(reserveMap);

        IERC20(tokenA).safeTransfer(to, amountAOut);
        IERC20(tokenB).safeTransfer(to, amountBOut);

        balanceA = IERC20(tokenA).balanceOf(address(this));
        balanceB = IERC20(tokenB).balanceOf(address(this));
        updatePrice(balanceA, balanceB, reserveA, reserveB);
        emit LiquidityRemoved(to, amountAOut, amountBOut);
    }

    ///@notice instant swap a given amount of tokenA against embedded amm
    function instantSwapFromAToB(address sender)
        external
        override
        lock
        nonReentrant
    {
        uint256 reserveA = reserveMap[tokenA];
        uint256 reserveB = reserveMap[tokenB];
        uint256 balanceA = IERC20(tokenA).balanceOf(address(this));
        uint256 balanceB = IERC20(tokenB).balanceOf(address(this));

        uint256 amountAIn = balanceA - reserveA;

        require(amountAIn > 0, "Pair: Insufficient Input Amount");
        uint256 amountBOut = performInstantSwap(
            sender,
            tokenA,
            tokenB,
            amountAIn
        );
        balanceA = IERC20(tokenA).balanceOf(address(this));
        balanceB = IERC20(tokenB).balanceOf(address(this));

        updatePrice(balanceA, balanceB, reserveA, reserveB);
        emit InstantSwapAToB(sender, amountAIn, amountBOut);
    }

    ///@notice create a long term order to swap from tokenA
    ///@param numberOfBlockIntervals number of block intervals over which to execute long term order
    function longTermSwapFromAToB(
        address sender,
        uint256 numberOfBlockIntervals
    ) external override lock nonReentrant {
        uint256 reserveA = reserveMap[tokenA];
        uint256 reserveB = reserveMap[tokenB];
        uint256 balanceA = IERC20(tokenA).balanceOf(address(this));
        uint256 balanceB = IERC20(tokenB).balanceOf(address(this));

        uint256 amountAIn = balanceA - reserveA;

        require(amountAIn > 0, "Pair: Insufficient Input Amount");
        uint256 orderId = longTermOrders.longTermSwapFromAToB(
            sender,
            amountAIn,
            numberOfBlockIntervals,
            reserveMap
        );
        balanceA = IERC20(tokenA).balanceOf(address(this));
        balanceB = IERC20(tokenB).balanceOf(address(this));
        updatePrice(balanceA, balanceB, reserveA, reserveB);
        emit LongTermSwapAToB(sender, amountAIn, orderId);
    }

    ///@notice instant swap a given amount of tokenB against embedded amm
    function instantSwapFromBToA(address sender)
        external
        override
        lock
        nonReentrant
    {
        uint256 reserveA = reserveMap[tokenA];
        uint256 reserveB = reserveMap[tokenB];
        uint256 balanceA = IERC20(tokenA).balanceOf(address(this));
        uint256 balanceB = IERC20(tokenB).balanceOf(address(this));
        uint256 amountBIn = balanceB - reserveB;

        require(amountBIn > 0, "Pair: Insufficient Input Amount");
        uint256 amountAOut = performInstantSwap(
            sender,
            tokenB,
            tokenA,
            amountBIn
        );
        balanceA = IERC20(tokenA).balanceOf(address(this));
        balanceB = IERC20(tokenB).balanceOf(address(this));
        updatePrice(balanceA, balanceB, reserveA, reserveB);
        emit InstantSwapBToA(sender, amountBIn, amountAOut);
    }

    ///@notice create a long term order to swap from tokenB
    ///@param numberOfBlockIntervals number of block intervals over which to execute long term order
    function longTermSwapFromBToA(
        address sender,
        uint256 numberOfBlockIntervals
    ) external override lock nonReentrant {
        uint256 reserveA = reserveMap[tokenA];
        uint256 reserveB = reserveMap[tokenB];
        uint256 balanceA = IERC20(tokenA).balanceOf(address(this));
        uint256 balanceB = IERC20(tokenB).balanceOf(address(this));
        uint256 amountBIn = balanceB - reserveB;

        require(amountBIn > 0, "Pair: Insufficient Input Amount");
        uint256 orderId = longTermOrders.longTermSwapFromBToA(
            sender,
            amountBIn,
            numberOfBlockIntervals,
            reserveMap
        );
        balanceA = IERC20(tokenA).balanceOf(address(this));
        balanceB = IERC20(tokenB).balanceOf(address(this));
        updatePrice(balanceA, balanceB, reserveA, reserveB);
        emit LongTermSwapBToA(sender, amountBIn, orderId);
    }

    ///@notice stop the execution of a long term order
    function cancelLongTermSwap(address sender, uint256 orderId)
        external
        override
        lock
        nonReentrant
    {
        uint256 reserveA = reserveMap[tokenA];
        uint256 reserveB = reserveMap[tokenB];
        longTermOrders.cancelLongTermSwap(sender, orderId, reserveMap);
        uint256 balanceA = IERC20(tokenA).balanceOf(address(this));
        uint256 balanceB = IERC20(tokenB).balanceOf(address(this));
        updatePrice(balanceA, balanceB, reserveA, reserveB);
        emit CancelLongTermOrder(sender, orderId);
    }

    ///@notice withdraw proceeds from a long term swap
    function withdrawProceedsFromLongTermSwap(address sender, uint256 orderId)
        external
        override
        lock
        nonReentrant
    {
        uint256 reserveA = reserveMap[tokenA];
        uint256 reserveB = reserveMap[tokenB];
        longTermOrders.withdrawProceedsFromLongTermSwap(
            sender,
            orderId,
            reserveMap
        );
        uint256 balanceA = IERC20(tokenA).balanceOf(address(this));
        uint256 balanceB = IERC20(tokenB).balanceOf(address(this));
        updatePrice(balanceA, balanceB, reserveA, reserveB);
        emit WithdrawProceedsFromLongTermOrder(sender, orderId);
    }

    ///@notice private function which implements instant swap logic
    function performInstantSwap(
        address sender,
        address from,
        address to,
        uint256 amountIn
    ) private returns (uint256 amountOutMinusFee) {
        require(amountIn > 0, "Swap Amount Must Be Positive");

        //execute virtual orders
        longTermOrders.executeVirtualOrdersUntilCurrentBlock(reserveMap);

        //constant product formula
        uint256 amountOut = (reserveMap[to] * amountIn) /
            (reserveMap[from] + amountIn);
        //charge LP fee
        amountOutMinusFee = (amountOut * (10000 - LP_FEE)) / 10000;

        reserveMap[from] += amountIn;
        reserveMap[to] -= amountOutMinusFee;

        IERC20(from).safeTransferFrom(sender, address(this), amountIn);
        IERC20(to).safeTransfer(sender, amountOutMinusFee);
    }

    ///@notice get user order details
    function getOrderDetails(uint256 orderId)
        external
        view
        returns (LongTermOrdersLib.Order memory)
    {
        return longTermOrders.orderMap[orderId];
    }

    ///@notice get user orderIds
    function userIdsCheck(address userAddress)
        external
        view
        returns (uint256[] memory)
    {
        return longTermOrders.orderIdMap[userAddress];
    }

    ///@notice get user order Id status
    function orderIdStatusCheck(uint256 orderId) external view returns (bool) {
        return longTermOrders.orderIdStatusMap[orderId];
    }

    ///@notice convenience function to execute virtual orders. Note that this already happens
    ///before most interactions with the AMM
    function executeVirtualOrders() public {
        uint256 reserveA = reserveMap[tokenA];
        uint256 reserveB = reserveMap[tokenB];
        longTermOrders.executeVirtualOrdersUntilCurrentBlock(reserveMap);
        uint256 balanceA = IERC20(tokenA).balanceOf(address(this));
        uint256 balanceB = IERC20(tokenB).balanceOf(address(this));
        updatePrice(balanceA, balanceB, reserveA, reserveB);
    }
}
