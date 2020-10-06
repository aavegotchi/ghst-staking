// SPDX-License-Identifier: MIT
pragma solidity ^0.7.1;

import "../libraries/AppStorage.sol";
import "../libraries/LibDiamond.sol";
import "../libraries/LibERC20.sol";
import "../interfaces/IERC20.sol";
import "../interfaces/IERC1155TokenReceiver.sol";
import "../interfaces/IUniswapV2Pair.sol";

contract StakingFacet {
    AppStorage internal s;
    bytes4 internal constant ERC1155_BATCH_ACCEPTED = 0xbc197c81; // Return value from `onERC1155BatchReceived` call if a contract accepts receipt (i.e `bytes4(keccak256("onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)"))`).
    event TransferBatch(address indexed _operator, address indexed _from, address indexed _to, uint256[] _ids, uint256[] _values);

    function frens(address _account) public view returns (uint256 frens_) {
        Account memory account = s.accounts[_account];
        // this cannot underflow or overflow
        uint256 timePeriod = block.timestamp - account.lastUpdate;
        frens_ = account.frens;
        // 86400 the number of seconds in 1 day
        // 100 frens are generated for each LP token over 24 hours
        frens_ += ((uint256(account.uniV2PoolTokens) * 100) * timePeriod) / 86400;
        // 1 fren is generated for each GHST over 24 hours
        frens_ += (account.ghst * timePeriod) / 86400;
    }

    function updateFrens() internal {
        Account storage account = s.accounts[msg.sender];
        account.frens = uint104(frens(msg.sender));
        account.lastUpdate = uint40(block.timestamp);
    }

    function stakeGhst(uint256 _ghstValue) external {
        updateFrens();
        s.accounts[msg.sender].ghst += uint96(_ghstValue);
        LibERC20.transferFrom(s.ghstContract, msg.sender, address(this), _ghstValue);
    }

    function stakeUniV2PoolTokens(uint256 _uniV2PoolTokens) external {
        updateFrens();
        s.accounts[msg.sender].uniV2PoolTokens += uint96(_uniV2PoolTokens);
        LibERC20.transferFrom(s.uniV2PoolContract, msg.sender, address(this), _uniV2PoolTokens);
    }

    function staked(address _account) external view returns (uint256 ghst_, uint256 uniV2PoolTokens_) {
        ghst_ = s.accounts[_account].ghst;
        uniV2PoolTokens_ = s.accounts[_account].uniV2PoolTokens;
    }

    function withdrawGhstStake(uint256 _ghstValue) external {
        updateFrens();
        uint256 bal = s.accounts[msg.sender].ghst;
        require(bal >= _ghstValue, "Staking: Can't withdraw more than staked");
        s.accounts[msg.sender].ghst = uint96(bal - _ghstValue);
        LibERC20.transfer(s.ghstContract, msg.sender, _ghstValue);
    }

    function withdrawUniV2PoolStake(uint256 _uniV2PoolTokens) external {
        updateFrens();
        uint256 bal = s.accounts[msg.sender].uniV2PoolTokens;
        require(bal >= _uniV2PoolTokens, "Staking: Can't withdraw more than staked");
        s.accounts[msg.sender].uniV2PoolTokens = uint96(bal - _uniV2PoolTokens);
        LibERC20.transfer(s.uniV2PoolContract, msg.sender, _uniV2PoolTokens);
    }

    function withdrawGhstStake() external {
        updateFrens();
        uint256 bal = s.accounts[msg.sender].ghst;
        s.accounts[msg.sender].ghst = uint96(0);
        LibERC20.transfer(s.ghstContract, msg.sender, bal);
    }

    function withdrawUniV2PoolStake() external {
        updateFrens();
        uint256 bal = s.accounts[msg.sender].uniV2PoolTokens;
        s.accounts[msg.sender].uniV2PoolTokens = uint96(0);
        LibERC20.transfer(s.uniV2PoolContract, msg.sender, bal);
    }

    function claimTickets(uint256[] calldata _ids) external {
        updateFrens();
        uint256[] memory values = new uint256[](_ids.length);
        uint256 frensBal = s.accounts[msg.sender].frens;
        for (uint256 i; i < _ids.length; i++) {
            uint256 id = _ids[i];
            require(id < 6, "Staking: Ticket not found");
            uint256 cost = ticketCost(id);
            values[i] = 1;
            require(frensBal >= cost, "Staking: Not enough frens points");
            frensBal -= cost;
            s.tickets[id].accountBalances[msg.sender] += 1;
            s.tickets[id].totalSupply += 1;
        }
        s.accounts[msg.sender].frens = uint104(frensBal);
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
                "Staking: Ticket transfer rejected/failed"
            );
        }
    }

    function ticketCost(uint256 _id) public pure returns (uint256 _frensCost) {
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
        } else {
            revert("Staking: _id does not exist");
        }
    }
}
