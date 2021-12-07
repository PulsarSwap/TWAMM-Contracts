// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.9;

interface IPulsarFactory {
    event PairCreated(
        address indexed token0,
        address indexed token1,
        address pair,
        uint256
    );
    event OwnerSet(address owner);

    function owner() external view returns (address);

    function feeTo() external view returns (address);

    function getPair(address tokenA, address tokenB)
        external
        view
        returns (address pair);

    function allPairs(uint256) external view returns (address pair);

    function allPairsLength() external view returns (uint256);

    function createPair(address tokenA, address tokenB)
        external
        returns (address pair);

    function setOwner(address) external;

    function setFeeTo(address) external;
}
