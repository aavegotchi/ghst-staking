// SPDX-License-Identifier: MIT
pragma solidity ^0.7.1;

import "../interfaces/IERC173.sol";
import "../libraries/Storage.sol";

contract OwnershipFacet is Storage, IERC173 {
    function transferOwnership(address newOwner) external override {
        address currentOwner = s.contractOwner;
        require(msg.sender == currentOwner, "Must own the contract.");
        s.contractOwner = newOwner;
        emit OwnershipTransferred(currentOwner, newOwner);
    }

    function owner() external override view returns (address) {
        return s.contractOwner;
    }
}
