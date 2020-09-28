// SPDX-License-Identifier: MIT
pragma solidity ^0.7.1;
pragma experimental ABIEncoderV2;

import "../libraries/Storage.sol";
import "../interfaces/IERC20.sol";

// import "@nomiclabs/buidler/console.sol";

contract Upgrade1 is Storage {
    function init(bytes memory _calldata) external {
        address ghstContract = abi.decode(_calldata, (address));
        s.ghstContract = ghstContract;
    }

    function updateFrens() internal {
        Account storage account = s.accounts[msg.sender];
        account.frens = uint40(frens(msg.sender));
        account.lastUpdate = uint32(block.timestamp);
    }

    function frens(address _account) internal view returns (uint256 frens_) {
        Account memory account = s.accounts[_account];
        // 86400 the number of seconds in 1 day
        // frens are generated 1 fren for each GHST over 24 hours
        frens_ = account.frens + (account.ghst * (block.timestamp - account.lastUpdate)) / 86400;
    }

    function withdrawStake() external {
        updateFrens();
        uint256 bal = s.accounts[msg.sender].ghst;
        s.accounts[msg.sender].ghst = uint40(0);
        IERC20(s.ghstContract).transfer(msg.sender, bal);
    }
}
