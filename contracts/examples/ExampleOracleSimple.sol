// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity =0.8.9;

import "../interfaces/IFactory.sol";
import "../interfaces/IPair.sol";
import "./OracleLibrary.sol";
import "../libraries/Library.sol";
import "../libraries/SafeMath.sol";
import "../libraries/UQ112x112.sol";

// fixed window oracle that recomputes the average price for the entire period once every period
// note that the price average is only guaranteed to be over at least 1 period, but may be over a longer period
contract ExampleOracleSimple {
    using UQ112x112 for uint224;
    using SafeMath for uint256;

    uint256 public constant PERIOD = 24 hours;

    IPair immutable pair;
    address public immutable tokenA;
    address public immutable tokenB;

    uint256 public priceACumulativeLast;
    uint256 public priceBCumulativeLast;
    uint32 public blockTimestampLast;
    uint256 public priceAAverage;
    uint256 public priceBAverage;

    constructor(
        address factory,
        address token0,
        address token1
    ) {
        IPair _pair = IPair(Library.pairFor(factory, token0, token1));
        pair = _pair;
        tokenA = _pair.tokenA();
        tokenB = _pair.tokenB();
        priceACumulativeLast = _pair.priceACumulativeLast(); // fetch the current accumulated price value (B / A)
        priceBCumulativeLast = _pair.priceBCumulativeLast(); // fetch the current accumulated price value (A / B)
        uint256 reserveA = _pair.tokenAReserves();
        uint256 reserveB = _pair.tokenBReserves();
        require(
            reserveA != 0 && reserveB != 0,
            "ExampleOracleSimple: NO_RESERVES"
        ); // ensure that there's liquidity in the pair
    }

    function update() external {
        (
            uint256 priceACumulative,
            uint256 priceBCumulative,
            uint32 blockTimestamp
        ) = OracleLibrary.currentCumulativePrices(address(pair));
        uint32 timeElapsed = blockTimestamp - blockTimestampLast; // overflow is desired

        // ensure that at least one full period has passed since the last update
        require(
            timeElapsed >= PERIOD,
            "ExampleOracleSimple: PERIOD_NOT_ELAPSED"
        );

        // overflow is desired, casting never truncates
        priceAAverage = (priceACumulative - priceACumulativeLast) / timeElapsed;
        priceBAverage = (priceBCumulative - priceBCumulativeLast) / timeElapsed;

        priceACumulativeLast = priceACumulative;
        priceBCumulativeLast = priceBCumulative;
        blockTimestampLast = blockTimestamp;
    }

    // note this will always return 0 before update has been called successfully for the first time.
    function consult(address token, uint256 amountIn)
        external
        view
        returns (uint256 amountOut)
    {
        if (token == tokenA) {
            amountOut = priceAAverage.mul(amountIn);
        } else {
            require(token == tokenB, "ExampleOracleSimple: INVALID_TOKEN");
            amountOut = priceBAverage.mul(amountIn);
        }
    }
}
