// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.9;
import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract YOK is ERC20 {
    constructor() ERC20("YOK TEST", "YOK") {
        _mint(msg.sender, 10000 * 10**18);
    }
}
