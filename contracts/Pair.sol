// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.9;

// import "hardhat/console.sol";
import "./interfaces/IPair.sol";
import "./libraries/LongTermOrders.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@rari-capital/solmate/src/utils/ReentrancyGuard.sol";
import "prb-math/contracts/PRBMathUD60x18.sol";
import "./libraries/UQ112x112.sol";

contract Pair is IPair, ERC20, ReentrancyGuard {
    using LongTermOrdersLib for LongTermOrdersLib.LongTermOrders;
    using SafeERC20 for IERC20;
    using PRBMathUD60x18 for uint256;
    using UQ112x112 for uint224;

    address public override factory;
    address public override tokenA;
    address public override tokenB;
    address private safeCaller;

    uint32 private blockTimestampLast;
    uint256 public override priceACumulativeLast;
    uint256 public override priceBCumulativeLast;

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

    ///@notice pair contract caller check
    modifier checkCaller() {
        require(msg.sender == safeCaller, "Invalid Caller");
        _;
    }

    constructor(
        address _tokenA,
        address _tokenB,
        address _twamm
    ) ERC20("Pulsar-LP", "PUL-LP") {
        factory = msg.sender;
        safeCaller = _twamm;
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
    function updatePrice(uint256 reserveA, uint256 reserveB) private {
        require(
            reserveA <= type(uint112).max && reserveB <= type(uint112).max,
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
        blockTimestampLast = blockTimestamp;
        emit UpdatePrice(reserveA, reserveB);
    }

    ///@notice provide initial liquidity to the amm. This sets the relative price between tokens
    function provideInitialLiquidity(
        address to,
        uint256 amountA,
        uint256 amountB
    ) external override checkCaller lock nonReentrant {
        require(amountA > 0 && amountB > 0, "Invalid Amount");
        require(
            totalSupply() == 0,
            "Liquidity Has Already Been Provided, Need To Call provideLiquidity()"
        );

        reserveMap[tokenA] = amountA;
        reserveMap[tokenB] = amountB;

        //initial LP amount is the geometric mean of supplied tokens
        uint256 lpTokenAmount = amountA
            .fromUint()
            .sqrt()
            .mul(amountB.fromUint().sqrt())
            .toUint();

        IERC20(tokenA).safeTransferFrom(to, address(this), amountA);
        IERC20(tokenB).safeTransferFrom(to, address(this), amountB);
        _mint(to, lpTokenAmount);

        updatePrice(amountA, amountB);
        emit InitialLiquidityProvided(to, amountA, amountB);
    }

    ///@notice provide liquidity to the AMM
    ///@param lpTokenAmount number of lp tokens to mint with new liquidity
    function provideLiquidity(address to, uint256 lpTokenAmount)
        external
        override
        checkCaller
        lock
        nonReentrant
    {
        //execute virtual orders
        longTermOrders.executeVirtualOrdersUntilCurrentBlock(reserveMap);

        require(lpTokenAmount > 0, "Invalid Amount");
        require(
            totalSupply() != 0,
            "No Liquidity Has Been Provided Yet, Need To Call provideInitialLiquidity()"
        );
        uint256 reserveA = reserveMap[tokenA];
        uint256 reserveB = reserveMap[tokenB];

        //the ratio between the number of underlying tokens and the number of lp tokens must remain invariant after mint
        uint256 amountAIn = (lpTokenAmount * reserveA) / totalSupply();
        uint256 amountBIn = (lpTokenAmount * reserveB) / totalSupply();

        reserveMap[tokenA] += amountAIn;
        reserveMap[tokenB] += amountBIn;

        IERC20(tokenA).safeTransferFrom(to, address(this), amountAIn);
        IERC20(tokenB).safeTransferFrom(to, address(this), amountBIn);
        _mint(to, lpTokenAmount);

        updatePrice(reserveA, reserveB);
        emit LiquidityProvided(to, lpTokenAmount);
    }

    ///@notice remove liquidity to the AMM
    ///@param lpTokenAmount number of lp tokens to burn

    function removeLiquidity(address to, uint256 lpTokenAmount)
        external
        override
        checkCaller
        lock
        nonReentrant
    {
        //execute virtual orders
        longTermOrders.executeVirtualOrdersUntilCurrentBlock(reserveMap);

        require(lpTokenAmount > 0, "Invalid Amount");
        require(
            lpTokenAmount <= totalSupply(),
            "Not Enough Lp Tokens Available"
        );
        uint256 reserveA = reserveMap[tokenA];
        uint256 reserveB = reserveMap[tokenB];

        //the ratio between the number of underlying tokens and the number of lp tokens must remain invariant after burn
        uint256 amountAOut = (reserveA * lpTokenAmount) / totalSupply();
        uint256 amountBOut = (reserveB * lpTokenAmount) / totalSupply();

        reserveMap[tokenA] -= amountAOut;
        reserveMap[tokenB] -= amountBOut;

        _burn(to, lpTokenAmount);

        IERC20(tokenA).safeTransfer(to, amountAOut);
        IERC20(tokenB).safeTransfer(to, amountBOut);
        updatePrice(reserveA, reserveB);
        emit LiquidityRemoved(to, lpTokenAmount);
    }

    ///@notice instant swap a given amount of tokenA against embedded amm
    function instantSwapFromAToB(address sender, uint256 amountAIn)
        external
        override
        checkCaller
        lock
        nonReentrant
    {
        require(amountAIn > 0, "Invalid Amount");
        uint256 amountBOut = performInstantSwap(
            sender,
            tokenA,
            tokenB,
            amountAIn
        );
        emit InstantSwapAToB(sender, amountAIn, amountBOut);
    }

    ///@notice create a long term order to swap from tokenA
    ///@param amountAIn total amount of token A to swap
    ///@param numberOfBlockIntervals number of block intervals over which to execute long term order
    function longTermSwapFromAToB(
        address sender,
        uint256 amountAIn,
        uint256 numberOfBlockIntervals
    ) external override checkCaller lock nonReentrant {
        require(amountAIn > 0, "Invalid Amount");
        uint256 orderId = longTermOrders.longTermSwapFromAToB(
            sender,
            amountAIn,
            numberOfBlockIntervals,
            reserveMap
        );
        updatePrice(reserveMap[tokenA], reserveMap[tokenB]);
        emit LongTermSwapAToB(sender, amountAIn, orderId);
    }

    ///@notice instant swap a given amount of tokenB against embedded amm
    function instantSwapFromBToA(address sender, uint256 amountBIn)
        external
        override
        checkCaller
        lock
        nonReentrant
    {
        require(amountBIn > 0, "Invalid Amount");
        uint256 amountAOut = performInstantSwap(
            sender,
            tokenB,
            tokenA,
            amountBIn
        );
        emit InstantSwapBToA(sender, amountBIn, amountAOut);
    }

    ///@notice create a long term order to swap from tokenB
    ///@param amountBIn total amount of tokenB to swap
    ///@param numberOfBlockIntervals number of block intervals over which to execute long term order
    function longTermSwapFromBToA(
        address sender,
        uint256 amountBIn,
        uint256 numberOfBlockIntervals
    ) external override checkCaller lock nonReentrant {
        require(amountBIn > 0, "Invalid Amount");
        uint256 orderId = longTermOrders.longTermSwapFromBToA(
            sender,
            amountBIn,
            numberOfBlockIntervals,
            reserveMap
        );
        updatePrice(reserveMap[tokenA], reserveMap[tokenB]);
        emit LongTermSwapBToA(sender, amountBIn, orderId);
    }

    ///@notice stop the execution of a long term order
    function cancelLongTermSwap(address sender, uint256 orderId)
        external
        override
        checkCaller
        lock
        nonReentrant
    {
        longTermOrders.cancelLongTermSwap(sender, orderId, reserveMap);
        updatePrice(reserveMap[tokenA], reserveMap[tokenB]);
        emit CancelLongTermOrder(sender, orderId);
    }

    ///@notice withdraw proceeds from a long term swap
    function withdrawProceedsFromLongTermSwap(address sender, uint256 orderId)
        external
        override
        checkCaller
        lock
        nonReentrant
    {
        longTermOrders.withdrawProceedsFromLongTermSwap(
            sender,
            orderId,
            reserveMap
        );
        updatePrice(reserveMap[tokenA], reserveMap[tokenB]);
        emit WithdrawProceedsFromLongTermOrder(sender, orderId);
    }

    ///@notice private function which implements instant swap logic
    function performInstantSwap(
        address sender,
        address from,
        address to,
        uint256 amountIn
    ) private checkCaller returns (uint256 amountOutMinusFee) {
        //execute virtual orders
        longTermOrders.executeVirtualOrdersUntilCurrentBlock(reserveMap);
        uint256 reserveFrom = reserveMap[from];
        uint256 reserveTo = reserveMap[to];

        //constant product formula
        uint256 amountOut = (reserveTo * amountIn) / (reserveFrom + amountIn);
        require(amountOut <= reserveTo, "Pair: Insufficient Liquidity");

        //charge LP fee
        amountOutMinusFee = (amountOut * (10000 - LP_FEE)) / 10000;

        reserveMap[from] += amountIn;
        reserveMap[to] -= amountOutMinusFee;

        IERC20(from).safeTransferFrom(sender, address(this), amountIn);
        IERC20(to).safeTransfer(sender, amountOutMinusFee);

        (uint256 reserveA, uint256 reserveB) = from < to
            ? (reserveFrom, reserveTo)
            : (reserveTo, reserveFrom);
        updatePrice(reserveA, reserveB);
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
        longTermOrders.executeVirtualOrdersUntilCurrentBlock(reserveMap);
        updatePrice(reserveMap[tokenA], reserveMap[tokenB]);
    }
}
