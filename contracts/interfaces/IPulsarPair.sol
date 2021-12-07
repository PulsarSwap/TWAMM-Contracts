// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.9;

import "./IPulsarERC20.sol";

interface IPulsarPair is IPulsarERC20 {
    event Mint(address indexed sender, uint256 amount0, uint256 amount1);
    event Burn(
        address indexed sender,
        uint256 amount0,
        uint256 amount1,
        address indexed to
    );
    event Swap(
        address indexed sender,
        uint256 amount0In,
        uint256 amount1In,
        uint256 amount0Out,
        uint256 amount1Out,
        address indexed to
    );
    event TermSwap(
        uint256 termamount0In,
        uint256 termamount1In,
        uint256 termamount0Out,
        uint256 termamount1Out,
        address indexed user
    );
    event Sync(uint112 reserve0, uint112 reserve1);

    function MINIMUM_LIQUIDITY() external pure returns (uint256);

    function factory() external view returns (address);

    function token0() external view returns (address);

    function token1() external view returns (address);

    function price0CumulativeLast() external view returns (uint256);

    function price1CumulativeLast() external view returns (uint256);

    function kLast() external view returns (uint256);

    function getReserves()
        external
        view
        returns (
            uint112 reserve0,
            uint112 reserve1,
            uint32 lastTimestamp
        );

    function initialize(address, address) external;

    function mint(address to) external returns (uint256 liquidity);

    function burn(address to)
        external
        returns (uint256 amount0, uint256 amount1);

    function swap(
        uint256 amount0Out,
        uint256 amount1Out,
        address to,
        bytes calldata data
    ) external;

    function termswap(
        uint256 termamount0Out,
        uint256 termamount1Out,
        address user,
        bytes calldata data
    ) external;

    function skim(address to) external;

    function sync() external;
}
