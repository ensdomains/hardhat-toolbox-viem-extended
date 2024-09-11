// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract AnotherTest {
    string public message;

    constructor() {
        message = "Goodbye, World!";
    }

    function getMessage2() public view returns (string memory) {
        return message;
    }
}
