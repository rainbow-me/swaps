// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity =0.8.11;

import { Solenv } from "solenv/Solenv.sol";
import { Script } from 'forge-std/Script.sol';
import { RainbowRouter } from "src/RainbowRouter.sol";

/// @notice Deployment script
contract Deploy is Script {

    /// @notice The main script entrypoint
    function run() external returns (RainbowRouter rr) {
        // Read the owner environment variable using solenv
        Solenv.config(".env");
        address owner = vm.envAddress("OWNER");

        vm.startBroadcast();

        // Deploy the router
        rr = new RainbowRouter();

        // Transfer Ownership
        rr.transferOwnership(owner);

        // Stop the broadcast
        vm.stopBroadcast();
    }
}