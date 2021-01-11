// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

import "../libraries/AppStorage.sol";
import "../libraries/LibDiamond.sol";
import "../libraries/LibERC20.sol";
import "../interfaces/IERC20.sol";
import "../interfaces/IERC1155TokenReceiver.sol";

// import "../interfaces/IUniswapV2Pair.sol";

contract StakingFacet {
    AppStorage internal s;
    bytes4 internal constant ERC1155_BATCH_ACCEPTED = 0xbc197c81; // Return value from `onERC1155BatchReceived` call if a contract accepts receipt (i.e `bytes4(keccak256("onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)"))`).
    event TransferBatch(address indexed _operator, address indexed _from, address indexed _to, uint256[] _ids, uint256[] _values);
    event Transfer(address indexed _from, address indexed _to, uint256 _value);

    function frens(address _account) public view returns (uint256 frens_) {
        Account storage account = s.accounts[_account];
        // this cannot underflow or overflow
        uint256 timePeriod = block.timestamp - account.lastFrensUpdate;
        frens_ = account.frens;
        // 86400 the number of seconds in 1 day
        // 100 frens are generated for each LP token over 24 hours
        frens_ += ((account.poolTokens * 100) * timePeriod) / 24 hours;
        // 1 fren is generated for each GHST over 24 hours
        frens_ += (account.ghst * timePeriod) / 24 hours;
    }

    function bulkFrens(address[] calldata _accounts) public view returns (uint256[] memory frens_) {
        frens_ = new uint256[](_accounts.length);
        for (uint256 i; i < _accounts.length; i++) {
            frens_[i] = frens(_accounts[i]);
        }
    }

    function updateFrens() internal {
        Account storage account = s.accounts[msg.sender];
        account.frens = frens(msg.sender);
        account.lastFrensUpdate = uint40(block.timestamp);
    }

    function migrateFrens(address[] calldata _stakers, uint256[] calldata _frens) external {
        LibDiamond.enforceIsContractOwner();
        require(_stakers.length == _frens.length, "StakingFacet: stakers not same length as frens");
        for (uint256 i; i < _stakers.length; i++) {
            Account storage account = s.accounts[_stakers[i]];
            account.frens = uint104(_frens[i]);
            account.lastFrensUpdate = uint40(block.timestamp);
        }
    }

    function stakeGhst(uint256 _ghstValue) external {
        updateFrens();
        s.accounts[msg.sender].ghst += uint96(_ghstValue);
        LibERC20.transferFrom(s.ghstContract, msg.sender, address(this), _ghstValue);
    }

    function stakePoolTokens(uint256 _poolTokens) external {
        updateFrens();
        Account storage account = s.accounts[msg.sender];
        account.ghstStakingTokens += _poolTokens;
        account.poolTokens += _poolTokens;
        s.ghstStakingTokensTotalSupply += _poolTokens;
        emit Transfer(address(0), msg.sender, _poolTokens);
        LibERC20.transferFrom(s.poolContract, msg.sender, address(this), _poolTokens);
    }

    function staked(address _account) external view returns (uint256 ghst_, uint256 poolTokens_) {
        ghst_ = s.accounts[_account].ghst;
        poolTokens_ = s.accounts[_account].poolTokens;
    }

    function withdrawGhstStake(uint256 _ghstValue) external {
        updateFrens();
        uint256 bal = s.accounts[msg.sender].ghst;
        require(bal >= _ghstValue, "Can't withdraw more GHST than staked");
        s.accounts[msg.sender].ghst = uint96(bal - _ghstValue);
        LibERC20.transfer(s.ghstContract, msg.sender, _ghstValue);
    }

    function withdrawPoolStake(uint256 _poolTokens) external {
        updateFrens();
        uint256 bal = s.accounts[msg.sender].ghstStakingTokens;
        require(bal >= _poolTokens, "Can't withdraw more ghstStakingToken than in account");
        s.accounts[msg.sender].ghstStakingTokens = bal - _poolTokens;
        s.ghstStakingTokensTotalSupply -= _poolTokens;
        uint256 accountPoolTokens = s.accounts[msg.sender].poolTokens;
        require(accountPoolTokens >= _poolTokens, "Can't withdraw more poolTokens than in account");
        s.accounts[msg.sender].poolTokens = accountPoolTokens - _poolTokens;
        emit Transfer(msg.sender, address(0), _poolTokens);
        LibERC20.transfer(s.poolContract, msg.sender, _poolTokens);
    }

    function withdrawGhstStake() external {
        updateFrens();
        uint256 bal = s.accounts[msg.sender].ghst;
        s.accounts[msg.sender].ghst = uint96(0);
        LibERC20.transfer(s.ghstContract, msg.sender, bal);
    }

    function withdrawPoolStake() external {
        updateFrens();
        uint256 bal = s.accounts[msg.sender].ghstStakingTokens;
        require(bal != 0, "Cannot withdraw zero pool stake balance");
        s.accounts[msg.sender].ghstStakingTokens = 0;
        uint256 accountPoolTokens = s.accounts[msg.sender].poolTokens;
        require(accountPoolTokens >= bal, "Can't withdraw more poolTokens than in account");
        s.accounts[msg.sender].poolTokens = accountPoolTokens - bal;
        emit Transfer(msg.sender, address(0), bal);
        LibERC20.transfer(s.poolContract, msg.sender, bal);
    }

    function claimTickets(uint256[] calldata _ids, uint256[] calldata _values) external {
        require(_ids.length == _values.length, "Staking: _ids not the same length as _values");
        updateFrens();
        uint256 frensBal = s.accounts[msg.sender].frens;
        for (uint256 i; i < _ids.length; i++) {
            uint256 id = _ids[i];
            uint256 value = _values[i];
            require(id < 6, "Staking: Ticket not found");
            uint256 cost = ticketCost(id) * value;
            require(frensBal >= cost, "Staking: Not enough frens points");
            frensBal -= cost;
            s.tickets[id].accountBalances[msg.sender] += value;
            s.tickets[id].totalSupply += uint96(value);
        }
        s.accounts[msg.sender].frens = frensBal;
        emit TransferBatch(msg.sender, address(0), msg.sender, _ids, _values);
        uint256 size;
        address to = msg.sender;
        assembly {
            size := extcodesize(to)
        }
        if (size > 0) {
            require(
                ERC1155_BATCH_ACCEPTED ==
                    IERC1155TokenReceiver(msg.sender).onERC1155BatchReceived(msg.sender, address(0), _ids, _values, new bytes(0)),
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
