// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.9;

interface IWETH {

    function balanceOf(address) external view returns (uint256);
    
    function deposit() external payable;

    function transfer(address to, uint256 value) external returns (bool);

    function withdraw(uint256) external;
}
