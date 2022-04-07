// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.9;

// import "hardhat/console.sol";
import "./interfaces/IFactory.sol";
import "./Pair.sol";

contract Factory is IFactory {
    address public feeTo;
    address public feeToSetter;
    mapping(address => mapping(address => address)) public override getPair;
    address[] public override allPairs;

    function allPairsLength() external view override returns (uint256) {
        return allPairs.length;
    }

    constructor(address _feeToSetter) {
        feeToSetter = _feeToSetter;
    }

    function createPair(address token0, address token1)
        external
        override
        returns (address pair)
    {
        require(token0 != token1, "Factory: Identical_Addresses");
        (address tokenA, address tokenB) = token0 < token1
            ? (token0, token1)
            : (token1, token0);
        require(tokenA != address(0), "Factory: Zero_Address");
        require(getPair[tokenA][tokenB] == address(0), "Factory: Pair_Exists"); // single check is sufficient
        bytes memory bytecode = type(Pair).creationCode;
        bytes memory bytecodeArg = abi.encodePacked(
            bytecode,
            abi.encode(tokenA, tokenB)
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

    function setFeeTo(address _feeTo) external {
        require(msg.sender == feeToSetter, "Factory: Forbidden");
        feeTo = _feeTo;
    }

    function setFeeToSetter(address _feeToSetter) external {
        require(msg.sender == feeToSetter, "Factory: Forbidden");
        feeToSetter = _feeToSetter;
    }
}
