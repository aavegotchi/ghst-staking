// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

library LibEvents {
    event Transfer(address indexed _from, address indexed _to, uint256 _value);
    event TransferBatch(address indexed _operator, address indexed _from, address indexed _to, uint256[] _ids, uint256[] _values);
}
