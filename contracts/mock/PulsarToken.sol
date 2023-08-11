// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

/**
 * @title PulsarToken
 * @dev Create a Pulsar ERC20 standard token
 * @author Pulsar Protocol (https://pulsarswap.com)
 */

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract PulsarToken is ERC20 {
    // for PulsarDAO.
    uint256 public constant MAX_SUPPLY = uint248(1e9 ether);
    address public constant ADDR_DAO =
        0x54D56f7070dd1fEf1ac17eB3b4913d4cc2a66708;

    constructor() ERC20("Pulsar Token", "PUL") {
        _mint(ADDR_DAO, MAX_SUPPLY);
    }
}
