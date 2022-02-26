// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity =0.8.9;

import "../Pair.sol";

contract CallHash {
    function getInitCodeHash() public pure returns (bytes32) {
        bytes memory bytecode = type(Pair).creationCode;
        return keccak256(abi.encodePacked(bytecode));
    }
}
