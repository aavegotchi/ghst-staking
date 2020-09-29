// SPDX-License-Identifier: MIT
pragma solidity ^0.7.1;
pragma experimental ABIEncoderV2;

import "../libraries/Storage.sol";
import "../interfaces/IERC20.sol";
import "../interfaces/IERC1155TokenReceiver.sol";

// import "@nomiclabs/buidler/console.sol";

contract Upgrade3 is Storage {
    bytes4 constant ERC1155_BATCH_ACCEPTED = 0xbc197c81; // Return value from `onERC1155BatchReceived` call if a contract accepts receipt (i.e `bytes4(keccak256("onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)"))`).
    event TransferBatch(address indexed _operator, address indexed _from, address indexed _to, uint256[] _ids, uint256[] _values);

    function frens(address _account) internal view returns (uint256 frens_) {
        Account memory account = s.accounts[_account];
        // 86400 the number of seconds in 1 day
        // frens are generated 1 fren for each GHST over 24 hours
        frens_ = account.frens + (account.ghst * (block.timestamp - account.lastUpdate)) / 86400;
    }

    function updateFrens() internal {
        Account storage account = s.accounts[msg.sender];
        account.frens = uint96(frens(msg.sender));
        account.lastUpdate = uint32(block.timestamp);
    }

    function claimWearableTickets(uint256[] calldata _ids) external {
        updateFrens();
        uint256[] memory values = new uint256[](_ids.length);
        uint256 frensBal = s.accounts[msg.sender].frens;
        for (uint256 i; i < _ids.length; i++) {
            uint256 id = _ids[i];
            require(id < 6, "Staking: Wearable Ticket not found");
            uint256 cost = wearableTicketCost(id);
            values[i] = cost;
            require(frensBal >= cost, "Staking: Not enough frens points");
            frensBal -= cost;
            s.wearableTickets[id].accountBalances[msg.sender] += 1;
            s.wearableTickets[id].totalSupply += 1;
        }
        s.accounts[msg.sender].frens = uint96(frensBal);
        emit TransferBatch(address(this), address(0), msg.sender, _ids, values);
        uint256 size;
        address to = msg.sender;
        assembly {
            size := extcodesize(to)
        }
        if (size > 0) {
            require(
                ERC1155_BATCH_ACCEPTED ==
                    IERC1155TokenReceiver(msg.sender).onERC1155BatchReceived(address(this), address(0), _ids, values, new bytes(0)),
                "Staking: Wearable Ticket transfer rejected/failed"
            );
        }
    }

    function wearableTicketCost(uint256 _id) public pure returns (uint256 _frensCost) {
        if (_id == 0) {
            _frensCost = 50e18;
        } else if (_id == 1) {
            _frensCost = 250e18;
        } else if (_id == 2) {
            _frensCost = 500e18;
        } else if (_id == 3) {
            _frensCost = 2_500e18;
        } else if (_id == 4) {
            _frensCost = 10_000e18;
        } else if (_id == 5) {
            _frensCost = 50_000e18;
        }
    }
}
