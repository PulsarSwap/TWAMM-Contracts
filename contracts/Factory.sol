// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.9;

// import "hardhat/console.sol";
import "./interfaces/IFactory.sol";
import "./Pair.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract Factory is IFactory, Initializable {
    mapping(address => mapping(address => address)) public override getPair;
    address[] public override allPairs;

    uint32 public override feeArg;
    address public override feeTo;
    address public override feeToSetter;
    address private twammAddr;
    address private twammInstantSwapAddr;
    address private twammLiquidityInAddr;
    address private twammLiquidityOutAddr;
    address private twammTermSwapInAddr;
    address private twammTermSwapOutAddr;


    constructor(address _feeToSetter) {
        feeToSetter = _feeToSetter;
    }

    // function allPairsLength() external view override returns (uint256) {
    //     return allPairs.length;
    // }

    function initialize(
        address _twammAddr,
        address _twammInstantSwapAddr, 
        address _twammLiquidityInAddr, 
        address _twammLiquidityOutAddr,
        address _twammTermSwapInAddr, 
        address _twammTermSwapOutAddr) external override initializer {
        twammAddr = _twammAddr;
        twammInstantSwapAddr = _twammInstantSwapAddr;
        twammLiquidityInAddr = _twammLiquidityInAddr;
        twammLiquidityOutAddr = _twammLiquidityOutAddr;
        twammTermSwapInAddr = _twammTermSwapInAddr;
        twammTermSwapOutAddr = _twammTermSwapOutAddr;
    }

    // function returnTwammAddress() external view override returns (address) {
    //     return twammTheOnlyCaller;
    // }

    function createPair(address token0, address token1)
        external
        override
        returns (address pair)
    {
        require(
            msg.sender == twammAddr,
            "Invalid User, Only TWAMM Can Create Pair"
        );
        require(
            twammAddr != address(0),
            "Factory Not Initialized By TWAMM Yet"
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
            abi.encode(tokenA, tokenB)
        );
        bytes32 salt = keccak256(abi.encodePacked(tokenA, tokenB));
        assembly {
            pair := create2(0, add(bytecodeArg, 0x20), mload(bytecodeArg), salt)
        }
        require(pair != address(0), "Create2: Failed On Deploy");
        IPair(pair).initialize(
            twammAddr,
            twammInstantSwapAddr,
            twammLiquidityInAddr,
            twammLiquidityOutAddr,
            twammTermSwapInAddr,
            twammTermSwapOutAddr);
        getPair[tokenA][tokenB] = pair;
        getPair[tokenB][tokenA] = pair; // populate mapping in the reverse direction
        allPairs.push(pair);
        emit PairCreated(tokenA, tokenB, pair, allPairs.length);
    }

    function setFeeArg(uint32 _feeArg) external override {
        require(msg.sender == feeToSetter, "Factory: Forbidden");
        feeArg = _feeArg;
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
