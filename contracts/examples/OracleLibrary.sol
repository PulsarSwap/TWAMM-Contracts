// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity >=0.5.0;

import "../interfaces/IPair.sol";
import "../libraries/UQ112x112.sol";

// library with helper methods for oracles that are concerned with computing average prices
library OracleLibrary {
    using UQ112x112 for uint224;

    // helper function that returns the current block timestamp within the range of uint32, i.e. [0, 2**32 - 1]
    function currentBlockTimestamp() internal view returns (uint32) {
        return uint32(block.timestamp % 2**32);
    }

    // produces the cumulative price using counterfactuals to save gas and avoid a call to sync.
    function currentCumulativePrices(address pair)
        internal
        view
        returns (
            uint256 priceACumulative,
            uint256 priceBCumulative,
            uint32 blockTimestamp
        )
    {
        blockTimestamp = currentBlockTimestamp();
        priceACumulative = IPair(pair).priceACumulativeLast();
        priceBCumulative = IPair(pair).priceBCumulativeLast();

        // if time has elapsed since the last update on the pair, mock the accumulated price values
        uint256 reserveA = IPair(pair).tokenAReserves();
        uint256 reserveB = IPair(pair).tokenBReserves();
        uint32 blockTimestampLast = IPair(pair).blockTimestampLast();

        if (blockTimestampLast != blockTimestamp) {
            // subtraction overflow is desired
            uint32 timeElapsed = blockTimestamp - blockTimestampLast;
            // addition overflow is desired
            // counterfactual
            priceACumulative +=
                uint256(
                    UQ112x112.encode(uint112(reserveB)).uqdiv(uint112(reserveA))
                ) *
                timeElapsed;
            // counterfactual
            priceBCumulative +=
                uint256(
                    UQ112x112.encode(uint112(reserveA)).uqdiv(uint112(reserveB))
                ) *
                timeElapsed;
        }
    }
}
