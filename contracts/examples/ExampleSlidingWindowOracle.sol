// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity =0.8.9;

import "../interfaces/IFactory.sol";
import "../interfaces/IPair.sol";
import "./OracleLibrary.sol";
import "../libraries/Library.sol";
import "../libraries/SafeMath.sol";
import "../libraries/UQ112x112.sol";

// sliding window oracle that uses observations collected over a window to provide moving price averages in the past
// `windowSize` with a precision of `windowSize / granularity`
// note this is a singleton oracle and only needs to be deployed once per desired parameters, which
// differs from the simple oracle which must be deployed once per pair.
contract ExampleSlidingWindowOracle {
    using SafeMath for uint256;
    using UQ112x112 for uint224;

    struct Observation {
        uint256 timestamp;
        uint256 priceACumulative;
        uint256 priceBCumulative;
    }

    address public immutable factory;
    // the desired amount of time over which the moving average should be computed, e.g. 24 hours
    uint256 public immutable windowSize;
    // the number of observations stored for each pair, i.e. how many price observations are stored for the window.
    // as granularity increases from 1, more frequent updates are needed, but moving averages become more precise.
    // averages are computed over intervals with sizes in the range:
    //   [windowSize - (windowSize / granularity) * 2, windowSize]
    // e.g. if the window size is 24 hours, and the granularity is 24, the oracle will return the average price for
    //   the period:
    //   [now - [22 hours, 24 hours], now]
    uint8 public immutable granularity;
    // this is redundant with granularity and windowSize, but stored for gas savings & informational purposes.
    uint256 public immutable periodSize;

    // mapping from pair address to a list of price observations of that pair
    mapping(address => Observation[]) public pairObservations;

    constructor(
        address _factory,
        uint256 _windowSize,
        uint8 _granularity
    ) {
        require(_granularity > 1, "SlidingWindowOracle: GRANULARITY");
        require(
            (periodSize = _windowSize / _granularity) * _granularity ==
                _windowSize,
            "SlidingWindowOracle: WINDOW_NOT_EVENLY_DIVISIBLE"
        );
        factory = _factory;
        windowSize = _windowSize;
        granularity = _granularity;
    }

    // returns the index of the observation corresponding to the given timestamp
    function observationIndexOf(uint256 timestamp)
        public
        view
        returns (uint8 index)
    {
        uint256 epochPeriod = timestamp / periodSize;
        return uint8(epochPeriod % granularity);
    }

    // returns the observation from the oldest epoch (at the beginning of the window) relative to the current time
    function getFirstObservationInWindow(address pair)
        private
        view
        returns (Observation storage firstObservation)
    {
        uint8 observationIndex = observationIndexOf(block.timestamp);
        // no overflow issue. if observationIndex + 1 overflows, result is still zero.
        uint8 firstObservationIndex = (observationIndex + 1) % granularity;
        firstObservation = pairObservations[pair][firstObservationIndex];
    }

    // update the cumulative price for the observation at the current timestamp. each observation is updated at most
    // once per epoch period.
    function update(address tokenA, address tokenB) external {
        address pair = Library.pairFor(factory, tokenA, tokenB);

        // populate the array with empty observations (first call only)
        for (uint256 i = pairObservations[pair].length; i < granularity; i++) {
            pairObservations[pair].push();
        }

        // get the observation for the current period
        uint8 observationIndex = observationIndexOf(block.timestamp);
        Observation storage observation = pairObservations[pair][
            observationIndex
        ];

        // we only want to commit updates once per period (i.e. windowSize / granularity)
        uint256 timeElapsed = block.timestamp - observation.timestamp;
        if (timeElapsed > periodSize) {
            (
                uint256 priceACumulative,
                uint256 priceBCumulative,

            ) = OracleLibrary.currentCumulativePrices(pair);
            observation.timestamp = block.timestamp;
            observation.priceACumulative = priceACumulative;
            observation.priceBCumulative = priceBCumulative;
        }
    }

    // given the cumulative prices of the start and end of a period, and the length of the period, compute the average
    // price in terms of how much amount out is received for the amount in
    function computeAmountOut(
        uint256 priceCumulativeStart,
        uint256 priceCumulativeEnd,
        uint256 timeElapsed,
        uint256 amountIn
    ) private pure returns (uint256 amountOut) {
        // overflow is desired.
        uint256 priceAverage = (priceCumulativeEnd - priceCumulativeStart) /
            timeElapsed;
        amountOut = priceAverage.mul(amountIn);
    }

    // returns the amount out corresponding to the amount in for a given token using the moving average over the time
    // range [now - [windowSize, windowSize - periodSize * 2], now]
    // update must have been called for the bucket corresponding to timestamp `now - windowSize`
    function consult(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (uint256 amountOut) {
        address pair = Library.pairFor(factory, tokenIn, tokenOut);
        Observation storage firstObservation = getFirstObservationInWindow(
            pair
        );

        uint256 timeElapsed = block.timestamp - firstObservation.timestamp;
        require(
            timeElapsed <= windowSize,
            "SlidingWindowOracle: MISSING_HISTORICAL_OBSERVATION"
        );
        // should never happen.
        require(
            timeElapsed >= windowSize - periodSize * 2,
            "SlidingWindowOracle: UNEXPECTED_TIME_ELAPSED"
        );

        (uint256 priceACumulative, uint256 priceBCumulative, ) = OracleLibrary
            .currentCumulativePrices(pair);
        (address tokenA, ) = Library.sortTokens(tokenIn, tokenOut);

        if (tokenA == tokenIn) {
            return
                computeAmountOut(
                    firstObservation.priceACumulative,
                    priceACumulative,
                    timeElapsed,
                    amountIn
                );
        } else {
            return
                computeAmountOut(
                    firstObservation.priceBCumulative,
                    priceBCumulative,
                    timeElapsed,
                    amountIn
                );
        }
    }
}
