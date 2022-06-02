// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.9;

import "./interfaces/ITWAMM.sol";
import "./interfaces/IPair.sol";
import "./interfaces/IFactory.sol";
import "./libraries/Library.sol";

contract TWAMM is ITWAMM {
    using Library for address;

    address public immutable override factory;
    address public immutable override WETH;

    modifier ensure(uint256 deadline) {
        require(deadline >= block.timestamp, "TWAMM: Expired");
        _;
    }

    constructor(
        address _factory,
        address _WETH,
        address _twammInstantSwap,
        address _twammTermSwap,
        address _twammLiquidity
    ) {
        factory = _factory;
        WETH = _WETH;
        IFactory(factory).initialize(
            address(this),
            _twammInstantSwap,
            _twammTermSwap,
            _twammLiquidity
        );
    }

    function obtainReserves(address token0, address token1)
        external
        view
        override
        returns (uint256 reserve0, uint256 reserve1)
    {
        (reserve0, reserve1) = Library.getReserves(factory, token0, token1);
    }

    function obtainTotalSupply(address pair)
        external
        view
        override
        returns (uint256)
    {
        return IPair(pair).getTotalSupply();
    }

    function obtainPairAddress(address token0, address token1)
        external
        view
        override
        returns (address)
    {
        return IFactory(factory).getPair(token0, token1);
    }

    function createPairWrapper(
        address token0,
        address token1,
        uint256 deadline
    ) external virtual override ensure(deadline) {
        require(
            IFactory(factory).getPair(token0, token1) == address(0),
            "Pair Existing Already!"
        );
        IFactory(factory).createPair(token0, token1);
    }

    function executeVirtualOrdersWrapper(address pair, uint256 blockNumber)
        external
        virtual
        override
    {
        IPair(pair).executeVirtualOrders(blockNumber);
    }
}
