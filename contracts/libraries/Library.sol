// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.9;

import "../interfaces/IPair.sol";
import "./SafeMath.sol";

library Library {
    using SafeMath for uint256;

    // returns sorted token addresses, used to handle return values from pairs sorted in this order
    function sortTokens(address token0, address token1)
        internal
        pure
        returns (address tokenA, address tokenB)
    {
        require(token0 != token1, "LIBRARY: IDENTICAL_ADDRESSES");
        (tokenA, tokenB) = token0 < token1
            ? (token0, token1)
            : (token1, token0);
        require(tokenA != address(0), "LIBRARY: ZERO_ADDRESS");
    }

    // calculates the CREATE2 address for a pair without making any external calls
    function pairFor(
        address factory,
        address token0,
        address token1
    ) internal pure returns (address pair) {
        (address tokenA, address tokenB) = sortTokens(token0, token1);
        pair = address(
            uint160(
                uint256(
                    keccak256(
                        abi.encodePacked(
                            hex"ff",
                            factory,
                            keccak256(abi.encodePacked(tokenA, tokenB)),
                            hex"57f900fec4f9ef5dbff745cf1cbc43e5812bb34ebb13d0e8c948c689ba0ba59b" // init code hash
                        )
                    )
                )
            )
        );
    }

    // fetches and sorts the reserves for a pair
    function getReserves(
        address factory,
        address token0,
        address token1
    ) internal view returns (uint256 reserve0, uint256 reserve1) {
        (address tokenA, ) = sortTokens(token0, token1);
        uint256 reserveA = IPair(pairFor(factory, token0, token1))
            .tokenAReserves();
        uint256 reserveB = IPair(pairFor(factory, token0, token1))
            .tokenBReserves();
        (reserve0, reserve1) = token0 == tokenA
            ? (reserveA, reserveB)
            : (reserveB, reserveA);
    }

    // given some amount of an asset and pair reserves, returns an equivalent amount of the other asset
    function quote(
        uint256 amount0,
        uint256 reserve0,
        uint256 reserve1
    ) internal pure returns (uint256 amount1) {
        require(amount0 > 0, "LIBRARY: INSUFFICIENT_AMOUNT");
        require(
            reserve0 > 0 && reserve1 > 0,
            "LIBRARY: INSUFFICIENT_LIQUIDITY"
        );
        amount1 = amount0.mul(reserve1) / reserve0;
    }
}
