// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.9;

import "./interfaces/IPulsarFactory.sol";
import "./PulsarPair.sol";

contract PulsarFactory is IPulsarFactory {
    address public override owner;
    address public override feeTo;

    mapping(address => mapping(address => address)) public override getPair;
    address[] public override allPairs;

    constructor() {
        owner = msg.sender;
    }

    function allPairsLength() external view override returns (uint256) {
        return allPairs.length;
    }

    function createPair(address tokenA, address tokenB)
        external
        override
        returns (address pair)
    {
        require(tokenA != tokenB, "PULSAR: IDENTICAL_ADDRESSES");
        (address token0, address token1) = tokenA < tokenB
            ? (tokenA, tokenB)
            : (tokenB, tokenA);
        require(token0 != address(0), "PULSAR: ZERO_ADDRESS");
        require(getPair[token0][token1] == address(0), "PULSAR: PAIR_EXISTS"); // single check is sufficient
        bytes memory bytecode = type(PulsarPair).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(token0, token1));
        assembly {
            pair := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        IPulsarPair(pair).initialize(token0, token1);
        getPair[token0][token1] = pair;
        getPair[token1][token0] = pair; // populate mapping in the reverse direction
        allPairs.push(pair);
        emit PairCreated(token0, token1, pair, allPairs.length);
    }

    function setOwner(address _owner) external override {
        require(msg.sender == owner, "PULSAR: FORBIDDEN");
        owner = _owner;
        emit OwnerSet(owner);
    }

    function setFeeTo(address _feeTo) external override {
        require(msg.sender == owner, "PULSAR: FORBIDDEN");
        feeTo = _feeTo;
    }
}
