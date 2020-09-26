// SPDX-License-Identifier: MIT
pragma solidity ^0.7.1;

import "../libraries/Storage.sol";
import "../interfaces/IERC20.sol";

contract Staking is Storage {
    function frens(address _account) public view returns (uint256 frens_) {
        Account memory account = s.accounts[_account];
        // generate 5 percent of GHST in frens per year
        // 31536000 seconds in a year * 20 (5 percent) = 630720000
        // Conceptually this is: frens_ = account.frens + (account.ghst / 630720000) * (block.timestamp - account.lastUpdate);
        // but how it is below is greater precision
        frens_ = account.frens + (account.ghst * (block.timestamp - account.lastUpdate)) / 630720000;
    }

    function updateFrens() internal {
        Account storage account = s.accounts[msg.sender];
        account.frens = uint40(frens(msg.sender));
        account.lastUpdate = uint32(block.timestamp);
    }

    function stake(uint256 _ghstValue) external {
        updateFrens();
        s.accounts[msg.sender].ghst += uint40(_ghstValue);
        IERC20(s.ghstContract).transferFrom(msg.sender, address(this), _ghstValue);
    }

    function staked(address _account) external view returns (uint256 staked_) {
        staked_ = s.accounts[_account].ghst;
    }

    function withdrawStake(uint256 _ghstValue) external {
        updateFrens();
        uint256 bal = s.accounts[msg.sender].ghst;
        require(bal >= _ghstValue, "Staking: Can't withdraw more than staked");
        s.accounts[msg.sender].ghst = uint40(bal - _ghstValue);
        IERC20(s.ghstContract).transfer(msg.sender, _ghstValue);
    }

    // function claimVouchers(uint256 _tokenId) {}
}
