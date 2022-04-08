// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.9;

// import "hardhat/console.sol";
import "./interfaces/IFactory.sol";
import "./Pair.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract Factory is IFactory, Initializable {
    mapping(address => mapping(address => address)) public override getPair;
    address[] public override allPairs;
    // bool private isInitialized = false;
    address private twammTheOnlyCaller = address(0);

    function allPairsLength() external view override returns (uint256) {
        return allPairs.length;
    }

    function initialize(address twammAdd) public initializer {
        twammTheOnlyCaller = twammAdd;
    }

    function returnTwammAddress() external view returns (address) {
        return twammTheOnlyCaller;
    }

    function createPair(address token0, address token1)
        external
        override
        returns (address pair)
    {
        require(
            msg.sender == twammTheOnlyCaller,
            "Invalid user, Only TWAMM can create pair!"
        );
        require(
            twammTheOnlyCaller != address(0),
            "Factory not initialized by TWAMM yet."
        );

        require(token0 != token1, "Factory: Identical Addresses");

        (address tokenA, address tokenB) = token0 < token1
            ? (token0, token1)
            : (token1, token0);
        require(tokenA != address(0), "Factory: Zero Address");

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
