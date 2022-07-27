//SPDX-License-Identifier: GPL-3.0
pragma solidity =0.8.11;

import {Test} from "forge-std/Test.sol";

import {RainbowRouter} from "src/RainbowRouter.sol";

contract IntegrationTests is Test {
    RainbowRouter public rr;

    /// @notice Deploy the contracts
    function setUp() public {
        rr = new RainbowRouter();
    }

    /// @notice Validate setup
    function testSetup() public {
        assertEq(rr.owner(), address(this));
    }

}

