// SPDX-License-Identifier: MIT
pragma solidity ^0.7.1;

contract Storage {
    struct Account {
        uint40 ghst;
        uint40 frens;
        uint32 lastUpdate;
    }

    struct WearableVoucher {
        // user address => balance
        mapping(address => uint256) accountBalances;
        string uri;
        uint40 totalSupply;
    }

    struct AppStorage {
        mapping(address => mapping(address => bool)) approved;
        mapping(address => Account) accounts;
        mapping(uint256 => WearableVoucher) wearableVouchers;
        // enables us to add additional map slots here
        bytes32[1000] emptyMapSlots;
        address contractOwner;
        address ghstContract;
    }

    AppStorage s;
}
