//SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

contract ActionTarget {
    uint256 public state;
    address public caller;

    function targetFun(uint256 number) external returns (bool) {
        state += number;
        caller = msg.sender;
        return true;
    }
}
