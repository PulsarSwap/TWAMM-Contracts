// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.9;

interface IFactory {
    event PairCreated(
        address indexed tokenA,
        address indexed tokenB,
        address pair,
        uint256
    );

    function getPair(address token0, address token1)
        external
        view
        returns (address pair);

    function allPairs(uint256) external view returns (address pair);

    function allPairsLength() external view returns (uint256);

    function initialize(address twammAdd) external;

    function returnTwammAddress() external view returns (address);

    function createPair(address token0, address token1)
        external
        returns (address pair);
}
