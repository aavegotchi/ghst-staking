// SPDX-License-Identifier: MIT
pragma solidity ^0.7.1;

import "../interfaces/IERC173.sol";
import "../libraries/AppStorage.sol";

contract OwnershipFacet is IERC173 {
    AppStorage s;

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
