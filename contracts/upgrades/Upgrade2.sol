// SPDX-License-Identifier: MIT
pragma solidity ^0.7.1;
pragma experimental ABIEncoderV2;

import "../libraries/Storage.sol";
import "../interfaces/IERC20.sol";

// import "@nomiclabs/buidler/console.sol";

contract Upgrade2 is Storage {
    function init(bytes memory _calldata) external {
        address ghstContract = abi.decode(_calldata, (address));
        s.ghstContract = ghstContract;
    }

    function setGHSTContract(address _ghstContract) external {
        s.ghstContract = _ghstContract;
    }
}
