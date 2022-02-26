// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.9;
import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract CKB is ERC20 {
    constructor() ERC20("CKB TEST", "CKB") {
        _mint(msg.sender, 10000 * 10**18);
    }
}
