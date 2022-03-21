// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.9;
import "hardhat/console.sol";
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
contract WETH is ERC20 {
    constructor() ERC20('Wrapped ETH Test', 'WETHERC20') {
        _mint(msg.sender, 1000000 * 10 ** 18);
    }
}