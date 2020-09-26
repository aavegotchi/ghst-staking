// SPDX-License-Identifier: MIT
pragma solidity ^0.7.1;

contract Storage {
    struct Account {
        uint40 ghst;
        uint40 frens;
        uint32 lastUpdate;
    }

    struct AppStorage {
        // user address => tokenId  => balance
        mapping(address => mapping(uint256 => uint256)) erc1155balances;
        mapping(address => mapping(address => bool)) approved;
        mapping(address => Account) accounts;
        address contractOwner;
        address ghstContract;
    }

    AppStorage s;
}
