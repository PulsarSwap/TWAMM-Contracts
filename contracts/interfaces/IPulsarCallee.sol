// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.9;

interface IPulsarCallee {
    function PulsarCall(
        address sender,
        uint256 amount0,
        uint256 amount1,
        bytes calldata data
    ) external;

    function PulsarTermCall(
        address sender0,
        address sender1,
        uint256 amount0,
        uint256 amount1,
        bytes calldata data
    ) external;
}
