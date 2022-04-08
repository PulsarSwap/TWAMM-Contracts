// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.9;

// import "hardhat/console.sol";
import "./interfaces/IFactory.sol";
import "./Pair.sol";

contract Factory is IFactory {
    mapping(address => mapping(address => address)) public override getPair;
    address[] public override allPairs;
    bool private isInitialized = false;
    address private twammTheOnlyCaller = address(0);

    function allPairsLength() external view override returns (uint256) {
        return allPairs.length;
    }

    //     function initialize(address twamm
    //   ) public {
    //     require(!isInitialized, 'Contract is already initialized!');
    //     isInitialized = true;
    //     safeCaller = twamm;
    //   }

    function returnTwammAddress() external view returns (address) {
        return twammTheOnlyCaller;
    }

    function createPair(
        address token0,
        address token1,
        address caller
    ) external override returns (address pair) {
        require(token0 != token1, "Factory: Identical Addresses");
        if (isInitialized != true) {
            twammTheOnlyCaller = caller;
            isInitialized = false;
        }
        require(twammTheOnlyCaller != address(0), "Invalid TWAMM Caller");
        (address tokenA, address tokenB) = token0 < token1
            ? (token0, token1)
            : (token1, token0);
        require(tokenA != address(0), "Factory: Zero Address");
        // require(safeCaller != address(0), "Please Initialize Facotry First");
        require(getPair[tokenA][tokenB] == address(0), "Factory: Pair Exists"); // single check is sufficient
        bytes memory bytecode = type(Pair).creationCode;
        bytes memory bytecodeArg = abi.encodePacked(
            bytecode,
            abi.encode(tokenA, tokenB, twammTheOnlyCaller)
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
}
