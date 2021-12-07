// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.9;

import "../interfaces/IPulsarPair.sol";
import "./SafeMath.sol";
import "./Math.sol";
import "./ExponentMath.sol";

library PulsarLibrary {
    using SafeMath for uint256;

    // returns sorted token addresses, used to handle return values from pairs sorted in this order
    function sortTokens(address tokenA, address tokenB)
        internal
        pure
        returns (address token0, address token1)
    {
        require(tokenA != tokenB, "PULSARLIBRARY: IDENTICAL_ADDRESSES");
        (token0, token1) = tokenA < tokenB
            ? (tokenA, tokenB)
            : (tokenB, tokenA);
        require(token0 != address(0), "PULSARLIBRARY: ZERO_ADDRESS");
    }

    // calculates the CREATE2 address for a pair without making any external calls
    function pairFor(
        address factory,
        address tokenA,
        address tokenB
    ) internal pure returns (address pair) {
        (address token0, address token1) = sortTokens(tokenA, tokenB);
        pair = address(
            uint256(
                keccak256(
                    abi.encodePacked(
                        hex"ff",
                        factory,
                        keccak256(abi.encodePacked(token0, token1)),
                        hex"96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f" // init code hash
                    )
                )
            )
        );
    }

    // fetches and sorts the reserves for a pair
    function getReserves(
        address factory,
        address tokenA,
        address tokenB
    ) internal view returns (uint256 reserveA, uint256 reserveB) {
        (address token0, ) = sortTokens(tokenA, tokenB);
        (uint256 reserve0, uint256 reserve1, ) = IPulsarPair(
            pairFor(factory, tokenA, tokenB)
        ).getReserves();
        (reserveA, reserveB) = tokenA == token0
            ? (reserve0, reserve1)
            : (reserve1, reserve0);
    }

    // given some amount of an asset and pair reserves, returns an equivalent amount of the other asset
    function quote(
        uint256 amountA,
        uint256 reserveA,
        uint256 reserveB
    ) internal pure returns (uint256 amountB) {
        require(amountA > 0, "PULSARLIBRARY: INSUFFICIENT_AMOUNT");
        require(
            reserveA > 0 && reserveB > 0,
            "PULSARLIBRARY: INSUFFICIENT_LIQUIDITY"
        );
        amountB = amountA.mul(reserveB) / reserveA;
    }

    // given an input amount of an asset and pair reserves, returns the maximum output amount of the other asset
    function getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) internal pure returns (uint256 amountOut) {
        require(amountIn > 0, "PULSARLIBRARY: INSUFFICIENT_INPUT_AMOUNT");
        require(
            reserveIn > 0 && reserveOut > 0,
            "PULSARLIBRARY: INSUFFICIENT_LIQUIDITY"
        );
        uint256 amountInWithFee = amountIn.mul(997);
        uint256 numerator = amountInWithFee.mul(reserveOut);
        uint256 denominator = reserveIn.mul(1000).add(amountInWithFee);
        amountOut = numerator / denominator;
    }

    // given an output amount of an asset and pair reserves, returns a required input amount of the other asset
    function getAmountIn(
        uint256 amountOut,
        uint256 reserveIn,
        uint256 reserveOut
    ) internal pure returns (uint256 amountIn) {
        require(amountOut > 0, "PULSARLIBRARY: INSUFFICIENT_OUTPUT_AMOUNT");
        require(
            reserveIn > 0 && reserveOut > 0,
            "PULSARLIBRARY: INSUFFICIENT_LIQUIDITY"
        );
        uint256 numerator = reserveIn.mul(amountOut).mul(1000);
        uint256 denominator = reserveOut.sub(amountOut).mul(997);
        amountIn = (numerator / denominator).add(1);
    }

    // performs chained getAmountOut calculations on any number of pairs
    function getAmountsOut(
        address factory,
        uint256 amountIn,
        address[] memory path
    ) internal view returns (uint256[] memory amounts) {
        require(path.length >= 2, "PULSARLIBRARY: INVALID_PATH");
        amounts = new uint256[](path.length);
        amounts[0] = amountIn;
        for (uint256 i; i < path.length - 1; i++) {
            (uint256 reserveIn, uint256 reserveOut) = getReserves(
                factory,
                path[i],
                path[i + 1]
            );
            amounts[i + 1] = getAmountOut(amounts[i], reserveIn, reserveOut);
        }
    }

    // performs chained getAmountIn calculations on any number of pairs
    function getAmountsIn(
        address factory,
        uint256 amountOut,
        address[] memory path
    ) internal view returns (uint256[] memory amounts) {
        require(path.length >= 2, "PULSARLIBRARY: INVALID_PATH");
        amounts = new uint256[](path.length);
        amounts[amounts.length - 1] = amountOut;
        for (uint256 i = path.length - 1; i > 0; i--) {
            (uint256 reserveIn, uint256 reserveOut) = getReserves(
                factory,
                path[i - 1],
                path[i]
            );
            amounts[i - 1] = getAmountIn(amounts[i], reserveIn, reserveOut);
        }
    }

    // given the input termamountA and termamountB of two assets and pair reserves, returns the maximum output termamountA of the other asset
    function getTermAmountAOut(
        uint256 termamountAIn,
        uint256 termamountBIn,
        uint256 reserveA,
        uint256 reserveB
    ) internal pure returns (uint256 termamountAOut) {
        require(
            termamountAIn >= 0 && termamountBIn >= 0,
            "PULSARLIBRARY: INSUFFICIENT_INPUT_AMOUNT"
        );
        require(
            reserveA > 0 && reserveB > 0,
            "PULSARLIBRARY: INSUFFICIENT_LIQUIDITY"
        );
        if (termamountBIn == 0) {
            termamountAOut == 0;
        }
        if (termamountBIn != 0 && termamountAIn == 0) {
            termamountAOut = getAmountOut(termamountBIn, reserveB, reserveA);
        }
        if (termamountAIn != 0 && termamountBIn != 0) {
            uint256 k = reserveA.mul(reserveB);
            int256 c1 = (
                Math.sqrt(reserveA.mul(termamountBIn)).sub(
                    Math.sqrt(reserveB.mul(termamountAIn))
                )
            ).div(
                    Math.sqrt(reserveA.mul(termamountBIn)).add(
                        Math.sqrt(reserveB.mul(termamountAIn))
                    )
                );
            uint256 d = Math.sqrt(termamountAIn.mul(termamountBIn).div(k)).mul(
                2
            );
            require(
                -c1 < ExponentMath.exp(d) && c1 < ExponentMath.exp(d),
                "PULSARLIBRARY: INSUFFICIENT_AMOUNT"
            );
            uint256 reserveAafter = Math
                .sqrt(k.mul(termamountAIn).div(termamountBIn))
                .mul(
                    (ExponentMath.exp(d).add(c1)).div(
                        ExponentMath.exp(d).sub(c1)
                    )
                );
            termamountAOut = (reserveA.add(termamountAIn).sub(reserveAafter))
                .mul(997)
                .div(1000);
        }
    }

    // given the input termamountA and termamountB of two assets and pair reserves, returns the maximum output termamountB of the other asset
    function getTermAmountBOut(
        uint256 termamountAIn,
        uint256 termamountBIn,
        uint256 reserveA,
        uint256 reserveB
    ) internal pure returns (uint256 termamountBOut) {
        require(
            termamountAIn >= 0 && termamountBIn >= 0,
            "PULSARLIBRARY: INSUFFICIENT_INPUT_AMOUNT"
        );
        require(
            reserveA > 0 && reserveB > 0,
            "PULSARLIBRARY: INSUFFICIENT_LIQUIDITY"
        );
        if (termamountAIn == 0) {
            termamountBOut == 0;
        }
        if (termamountAIn != 0 && termamountBIn == 0) {
            termamountBOut = getAmountOut(termamountAIn, reserveA, reserveB);
        }
        if (termamountAIn != 0 && termamountBIn != 0) {
            uint256 k = reserveA.mul(reserveB);
            int256 c2 = (
                Math.sqrt(reserveB.mul(termamountAIn)).sub(
                    Math.sqrt(reserveA.mul(termamountBIn))
                )
            ).div(
                    Math.sqrt(reserveA.mul(termamountBIn)).add(
                        Math.sqrt(reserveB.mul(termamountAIn))
                    )
                );
            uint256 d = Math.sqrt(termamountAIn.mul(termamountBIn).div(k)).mul(
                2
            );
            require(
                -c2 < ExponentMath.exp(d) && c2 < ExponentMath.exp(d),
                "PULSARLIBRARY: INSUFFICIENT_AMOUNT"
            );
            uint256 reserveBafter = Math
                .sqrt(k.mul(termamountBIn).div(termamountAIn))
                .mul(
                    (ExponentMath.exp(d).add(c2)).div(
                        ExponentMath.exp(d).sub(c2)
                    )
                );
            termamountBOut = (reserveB.add(termamountBIn).sub(reserveBafter))
                .mul(997)
                .div(1000);
        }
    }
}
