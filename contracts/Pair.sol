// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.9;

import "./interfaces/IPair.sol";
import "./libraries/LongTermOrders.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@rari-capital/solmate/src/utils/ReentrancyGuard.sol";
import "prb-math/contracts/PRBMathUD60x18.sol";
import "./libraries/UQ112x112.sol";
import "hardhat/console.sol";

contract Pair is IPair, ERC20, ReentrancyGuard {
    using LongTermOrdersLib for LongTermOrdersLib.LongTermOrders;
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
    uint256 public constant orderBlockInterval = 10;

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

    constructor() ERC20("Pulsar-LP", "PUL-LP") {
        factory = msg.sender;
        longTermOrders.initialize(
            tokenA,
            tokenB,
            block.number,
            orderBlockInterval
        );
    }

    // called once by the factory at time of deployment
    function initialize(address _tokenA, address _tokenB)
        external
        override
        lock
        nonReentrant
    {
        require(msg.sender == factory, "Pair: Forbidden"); // sufficient check
        tokenA = _tokenA;
        tokenB = _tokenB;
    }

    ///@notice get tokenA reserves
    function tokenAReserves() public view returns (uint256) {
        return reserveMap[tokenA];
    }

    ///@notice get tokenB reserves
    function tokenBReserves() public view returns (uint256) {
        return reserveMap[tokenB];
    }

    // update price accumulators, on the first call per block
    function updatePrice(uint256 reserveA, uint256 reserveB) private {
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
    ) external override lock nonReentrant {
        require(
            totalSupply() == 0,
            "Liquidity Has Already Been Provided, Need To Call provideLiquidity"
        );

        reserveMap[tokenA] = amountA;
        reserveMap[tokenB] = amountB;

        //initial LP amount is the geometric mean of supplied tokens
        uint256 lpAmount = amountA
            .fromUint()
            .sqrt()
            .mul(amountB.fromUint().sqrt())
            .toUint() - MINIMUM_LIQUIDITY;
        _mint(address(0), MINIMUM_LIQUIDITY); // permanently lock the first MINIMUM_LIQUIDITY tokens
        _mint(to, lpAmount);

        IERC20(tokenA).transferFrom(to, address(this), amountA);
        IERC20(tokenB).transferFrom(to, address(this), amountB);

        emit InitialLiquidityProvided(to, amountA, amountB);
    }

    ///@notice provide liquidity to the AMM
    ///@param lpTokenAmount number of lp tokens to mint with new liquidity
    function provideLiquidity(address to, uint256 lpTokenAmount)
        external
        override
        lock
        nonReentrant
    {
        require(
            totalSupply() != 0,
            "No Liquidity Has Been Provided Yet, Need To Call provideInitialLiquidity"
        );
        updatePrice(reserveMap[tokenA], reserveMap[tokenB]);

        //execute virtual orders
        longTermOrders.executeVirtualOrdersUntilCurrentBlock(reserveMap);

        //the ratio between the number of underlying tokens and the number of lp tokens must remain invariant after mint
        uint256 amountAIn = (lpTokenAmount * reserveMap[tokenA]) /
            totalSupply();
        uint256 amountBIn = (lpTokenAmount * reserveMap[tokenB]) /
            totalSupply();

        reserveMap[tokenA] += amountAIn;
        reserveMap[tokenB] += amountBIn;

        _mint(to, lpTokenAmount);

        IERC20(tokenA).transferFrom(to, address(this), amountAIn);
        IERC20(tokenB).transferFrom(to, address(this), amountBIn);

        emit LiquidityProvided(to, lpTokenAmount);
    }

    ///@notice remove liquidity to the AMM
    ///@param lpTokenAmount number of lp tokens to burn
    function removeLiquidity(address to, uint256 lpTokenAmount)
        external
        override
        lock
        nonReentrant
    {
        require(
            lpTokenAmount <= totalSupply(),
            "Not Enough Lp Tokens Available"
        );
        updatePrice(reserveMap[tokenA], reserveMap[tokenB]);

        //execute virtual orders
        longTermOrders.executeVirtualOrdersUntilCurrentBlock(reserveMap);

        //the ratio between the number of underlying tokens and the number of lp tokens must remain invariant after burn
        uint256 amountAOut = (reserveMap[tokenA] * lpTokenAmount) /
            totalSupply();
        uint256 amountBOut = (reserveMap[tokenB] * lpTokenAmount) /
            totalSupply();

        reserveMap[tokenA] -= amountAOut;
        reserveMap[tokenB] -= amountBOut;

        _burn(to, lpTokenAmount);

        IERC20(tokenA).transfer(to, amountAOut);
        IERC20(tokenB).transfer(to, amountBOut);

        emit LiquidityRemoved(to, lpTokenAmount);
    }

    ///@notice instant swap a given amount of tokenA against embedded amm
    function instantSwapFromAToB(address sender, uint256 amountAIn)
        external
        override
        lock
        nonReentrant
    {
        updatePrice(reserveMap[tokenA], reserveMap[tokenB]);

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
    ) external override lock nonReentrant {
        updatePrice(reserveMap[tokenA], reserveMap[tokenB]);

        uint256 orderId = longTermOrders.longTermSwapFromAToB(
            sender,
            amountAIn,
            numberOfBlockIntervals,
            reserveMap
        );

        emit LongTermSwapAToB(sender, amountAIn, orderId);
    }

    ///@notice instant swap a given amount of tokenB against embedded amm
    function instantSwapFromBToA(address sender, uint256 amountBIn)
        external
        override
        lock
        nonReentrant
    {
        updatePrice(reserveMap[tokenA], reserveMap[tokenB]);

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
    ) external override lock nonReentrant {
        updatePrice(reserveMap[tokenA], reserveMap[tokenB]);

        uint256 orderId = longTermOrders.longTermSwapFromBToA(
            sender,
            amountBIn,
            numberOfBlockIntervals,
            reserveMap
        );

        emit LongTermSwapBToA(sender, amountBIn, orderId);
    }

    ///@notice stop the execution of a long term order
    function cancelLongTermSwap(address sender, uint256 orderId)
        external
        override
        lock
        nonReentrant
    {
        updatePrice(reserveMap[tokenA], reserveMap[tokenB]);

        longTermOrders.cancelLongTermSwap(sender, orderId, reserveMap);

        emit CancelLongTermOrder(sender, orderId);
    }

    ///@notice withdraw proceeds from a long term swap
    function withdrawProceedsFromLongTermSwap(address sender, uint256 orderId)
        external
        override
        lock
        nonReentrant
    {
        updatePrice(reserveMap[tokenA], reserveMap[tokenB]);

        longTermOrders.withdrawProceedsFromLongTermSwap(
            sender,
            orderId,
            reserveMap
        );

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

        IERC20(from).transferFrom(sender, address(this), amountIn);
        IERC20(to).transfer(sender, amountOutMinusFee);
    }


    ///@notice get user order details
    function getOrderDetails(
        uint256 orderId
    ) external view returns (LongTermOrdersLib.Order memory) {
        return longTermOrders.orderMap[orderId];
    }

    ///@notice get user orderIds
    function userIdsCheck(
        address userAddress
    ) external view returns (uint256[] memory) {
        return longTermOrders.orderIdMap[userAddress];
    }


    ///@notice get user order Id status
    function orderIdStatusCheck(
        uint256 orderId
    ) external view returns (bool) {
        return longTermOrders.orderIdStatusMap[orderId];
    }

    // ///@notice get user orderIds
    // function userIdsCheck(address userAddress)
    //     external
    //     view
    //     override
    //     returns (uint256[] memory)
    // {
    //     return longTermOrders.orderIdMap[userAddress];
    // }

    // ///@notice get user orderIds
    // function orderIdStatusCheck(uint256 orderId) external view returns (bool) {
    //     return longTermOrders.orderIdStatusMap[orderId];
    // }

    ///@notice convenience function to execute virtual orders. Note that this already happens
    ///before most interactions with the AMM
    function executeVirtualOrders() public {
        longTermOrders.executeVirtualOrdersUntilCurrentBlock(reserveMap);
    }
}
