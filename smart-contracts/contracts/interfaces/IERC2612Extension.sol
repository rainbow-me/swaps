//SPDX-License-Identifier: GPL-3.0
pragma solidity =0.8.11;

import "./IERC2612.sol";

interface IERC2612Extension is IERC2612 {
    function _nonces(address owner) external view returns (uint256);

    function version() external view returns (string memory);
}
