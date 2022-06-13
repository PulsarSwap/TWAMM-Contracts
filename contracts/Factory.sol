// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.9;

import "./interfaces/IFactory.sol";
import "./Pair.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract Factory is IFactory, Initializable {
    mapping(address => mapping(address => address)) public override getPair;
    address[] public override allPairs;

    address public override feeTo;
    address public override feeToSetter;
    address public twammAdd;
    address public twammInstantSwapAdd;
    address public twammTermSwapAdd;
    address public twammLiquidityAdd;

    constructor(address _feeToSetter) {
        feeToSetter = _feeToSetter;
    }

    function allPairsLength() external view override returns (uint256) {
        return allPairs.length;
    }

    function initialize(
        address _twammAdd,
        address _twammInstantSwapAdd,
        address _twammTermSwapAdd,
        address _twammLiquidityAdd
    ) external override initializer {
        twammAdd = _twammAdd;
        twammInstantSwapAdd = _twammInstantSwapAdd;
        twammTermSwapAdd = _twammTermSwapAdd;
        twammLiquidityAdd = _twammLiquidityAdd;
    }

    function createPair(address token0, address token1)
        external
        override
        returns (address pair)
    {
        require(
            msg.sender == twammAdd,
            "Invalid User, Only TWAMM Can Create Pair"
        );
        require(twammAdd != address(0), "Factory Not Initialized By TWAMM Yet");

        require(token0 != token1, "Factory: Identical Addresses");

        (address tokenA, address tokenB) = token0 < token1
            ? (token0, token1)
            : (token1, token0);
        require(tokenA != address(0), "Factory: Zero Address");

        require(getPair[tokenA][tokenB] == address(0), "Factory: Pair Exists"); // single check is sufficient

        bytes memory bytecode = type(Pair).creationCode;
        bytes memory bytecodeArg = abi.encodePacked(
            bytecode,
            abi.encode(
                tokenA,
                tokenB,
                twammAdd,
                twammInstantSwapAdd,
                twammTermSwapAdd,
                twammLiquidityAdd
            )
        );
        bytes32 salt = keccak256(abi.encodePacked(tokenA, tokenB));
        assembly {
            pair := create2(0, add(bytecodeArg, 0x20), mload(bytecodeArg), salt)
        }
        require(pair != address(0), "Create2: Failed On Deploy");
        getPair[tokenA][tokenB] = pair;
        getPair[tokenB][tokenA] = pair; // populate mapping in the reverse direction
        allPairs.push(pair);
        emit PairCreated(tokenA, tokenB, pair, allPairs.length);
    }

    function setFeeTo(address _feeTo) external override {
        require(msg.sender == feeToSetter, "Factory: Forbidden");
        feeTo = _feeTo;
    }

    function setFeeToSetter(address _feeToSetter) external override {
        require(msg.sender == feeToSetter, "Factory: Forbidden");
        feeToSetter = _feeToSetter;
    }
}
