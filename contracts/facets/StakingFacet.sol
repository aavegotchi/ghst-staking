// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

import "../libraries/AppStorage.sol";
import "../libraries/LibDiamond.sol";
import "../libraries/LibERC20.sol";
import "../interfaces/IERC20.sol";
import "../interfaces/IERC1155TokenReceiver.sol";
import "../libraries/LibMeta.sol";

interface IERC1155Marketplace {
    function updateBatchERC1155Listing(
        address _erc1155TokenAddress,
        uint256[] calldata _erc1155TypeIds,
        address _owner
    ) external;
}

interface IERC20Mintable {
    function mint(address _to, uint256 _amount) external;

    function burn(address _to, uint256 _amount) external;
}

contract StakingFacet {
    AppStorage internal s;
    bytes4 internal constant ERC1155_BATCH_ACCEPTED = 0xbc197c81; // Return value from `onERC1155BatchReceived` call if a contract accepts receipt (i.e `bytes4(keccak256("onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)"))`).
    event TransferBatch(address indexed _operator, address indexed _from, address indexed _to, uint256[] _ids, uint256[] _values);
    event Transfer(address indexed _from, address indexed _to, uint256 _value);
    event PoolTokensRate(uint256 _newRate);
    event GhstUsdcRate(uint256 _newRate);
    event RateManagerAdded(address indexed rateManager_);
    event RateManagerRemoved(address indexed rateManager_);
    event GhstWethRate(uint256 _newRate);

    function frens(address _account) public view returns (uint256 frens_) {
        Account storage account = s.accounts[_account];
        // this cannot underflow or overflow
        uint256 timePeriod = block.timestamp - account.lastFrensUpdate;
        frens_ = account.frens;
        // 86400 the number of seconds in 1 day
        // 100 frens are generated for each LP token over 24 hours
        frens_ += ((account.poolTokens * s.poolTokensRate) * timePeriod) / 24 hours;

        frens_ += ((account.ghstUsdcPoolTokens * s.ghstUsdcRate) * timePeriod) / 24 hours;
        // 1 fren is generated for each GHST over 24 hours
        frens_ += (account.ghst * timePeriod) / 24 hours;

        //Add in frens for GHST-WETH
        frens_ += ((account.ghstWethPoolTokens * s.ghstWethRate) * timePeriod) / 24 hours;
    }

    function bulkFrens(address[] calldata _accounts) public view returns (uint256[] memory frens_) {
        frens_ = new uint256[](_accounts.length);
        for (uint256 i; i < _accounts.length; i++) {
            frens_[i] = frens(_accounts[i]);
        }
    }

    function updateFrens() internal {
        address sender = LibMeta.msgSender();
        Account storage account = s.accounts[sender];
        account.frens = frens(sender);
        account.lastFrensUpdate = uint40(block.timestamp);
    }

    function updateAccounts(address[] calldata _accounts) external onlyRateManager {
        for (uint256 i; i < _accounts.length; i++) {
            address accountAddress = _accounts[i];
            Account storage account = s.accounts[accountAddress];
            account.frens = frens(accountAddress);
            account.lastFrensUpdate = uint40(block.timestamp);
        }
    }

    function updatePoolTokensRate(uint256 _newRate) external onlyRateManager {
        s.poolTokensRate = _newRate;
        emit PoolTokensRate(_newRate);
    }

    function poolTokensRate() external view returns (uint256) {
        return s.poolTokensRate;
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

    function switchFrens(address _old, address _new) external {
        LibDiamond.enforceIsContractOwner();
        Account storage oldAccount = s.accounts[_old];
        Account storage newAccount = s.accounts[_new];
        (oldAccount.frens, newAccount.frens) = (newAccount.frens, oldAccount.frens);
        oldAccount.lastFrensUpdate = uint40(block.timestamp);
        newAccount.lastFrensUpdate = uint40(block.timestamp);
    }

    function stakeGhst(uint256 _ghstValue) external {
        updateFrens();
        address sender = LibMeta.msgSender();
        s.accounts[sender].ghst += uint96(_ghstValue);
        LibERC20.transferFrom(s.ghstContract, sender, address(this), _ghstValue);
    }

    function stakePoolTokens(uint256 _poolTokens) external {
        updateFrens();
        address sender = LibMeta.msgSender();
        Account storage account = s.accounts[sender];
        account.ghstStakingTokens += _poolTokens;
        account.poolTokens += _poolTokens;
        s.ghstStakingTokensTotalSupply += _poolTokens;
        emit Transfer(address(0), sender, _poolTokens);
        LibERC20.transferFrom(s.poolContract, sender, address(this), _poolTokens);
    }

    function getGhstUsdcPoolToken() external view returns (address) {
        return s.ghstUsdcPoolToken;
    }

    function getStkGhstUsdcToken() external view returns (address) {
        return s.stkGhstUsdcToken;
    }

    function setGhstUsdcToken(
        address _ghstUsdcPoolToken,
        address _stkGhstUsdcToken,
        uint256 _ghstUsdcRate
    ) external {
        LibDiamond.enforceIsContractOwner();
        s.ghstUsdcPoolToken = _ghstUsdcPoolToken;
        s.stkGhstUsdcToken = _stkGhstUsdcToken;
        s.ghstUsdcRate = _ghstUsdcRate;
    }

    function updateGhstUsdcRate(uint256 _newRate) external onlyRateManager {
        s.ghstUsdcRate = _newRate;
        emit GhstUsdcRate(_newRate);
    }

    function ghstUsdcRate() external view returns (uint256) {
        return s.ghstUsdcRate;
    }

    function stakeGhstUsdcPoolTokens(uint256 _poolTokens) external {
        updateFrens();
        address sender = LibMeta.msgSender();
        Account storage account = s.accounts[sender];
        account.ghstUsdcPoolTokens += _poolTokens;
        IERC20Mintable(s.stkGhstUsdcToken).mint(sender, _poolTokens);
        LibERC20.transferFrom(s.ghstUsdcPoolToken, sender, address(this), _poolTokens);
    }

    function getGhstWethPoolToken() external view returns (address) {
        return s.ghstWethPoolToken;
    }

    function getStkGhstWethToken() external view returns (address) {
        return s.stkGhstWethToken;
    }

    function setGhstWethToken(
        address _ghstWethPoolToken,
        address _stkGhstWethToken,
        uint256 _ghstWethRate
    ) external {
        LibDiamond.enforceIsContractOwner();
        s.ghstWethPoolToken = _ghstWethPoolToken;
        s.stkGhstWethToken = _stkGhstWethToken;
        s.ghstWethRate = _ghstWethRate;
    }

    function updateGhstWethRate(uint256 _newRate) external onlyRateManager {
        s.ghstWethRate = _newRate;
        emit GhstWethRate(_newRate);
    }

    function ghstWethRate() external view returns (uint256) {
        return s.ghstWethRate;
    }

    function stakeGhstWethPoolTokens(uint256 _poolTokens) external {
        updateFrens();
        address sender = LibMeta.msgSender();
        Account storage account = s.accounts[sender];
        account.ghstWethPoolTokens += _poolTokens;
        IERC20Mintable(s.stkGhstWethToken).mint(sender, _poolTokens);
        LibERC20.transferFrom(s.ghstWethPoolToken, sender, address(this), _poolTokens);
    }

    function staked(address _account)
        external
        view
        returns (
            uint256 ghst_,
            uint256 poolTokens_,
            uint256 ghstUsdcPoolToken_,
            uint256 ghstWethPoolToken_
        )
    {
        ghst_ = s.accounts[_account].ghst;
        poolTokens_ = s.accounts[_account].poolTokens;
        ghstUsdcPoolToken_ = s.accounts[_account].ghstUsdcPoolTokens;
        ghstWethPoolToken_ = s.accounts[_account].ghstWethPoolTokens;
    }

    function withdrawGhstStake(uint256 _ghstValue) external {
        updateFrens();
        address sender = LibMeta.msgSender();
        uint256 bal = s.accounts[sender].ghst;
        require(bal >= _ghstValue, "Can't withdraw more GHST than staked");
        s.accounts[sender].ghst = uint96(bal - _ghstValue);
        LibERC20.transfer(s.ghstContract, sender, _ghstValue);
    }

    function withdrawPoolStake(uint256 _poolTokens) external {
        updateFrens();
        address sender = LibMeta.msgSender();
        uint256 bal = s.accounts[sender].ghstStakingTokens;
        require(bal >= _poolTokens, "Can't withdraw more ghstStakingToken than in account");
        s.accounts[sender].ghstStakingTokens = bal - _poolTokens;
        s.ghstStakingTokensTotalSupply -= _poolTokens;
        uint256 accountPoolTokens = s.accounts[sender].poolTokens;
        require(accountPoolTokens >= _poolTokens, "Can't withdraw more poolTokens than in account");
        s.accounts[sender].poolTokens = accountPoolTokens - _poolTokens;
        emit Transfer(sender, address(0), _poolTokens);
        LibERC20.transfer(s.poolContract, sender, _poolTokens);
    }

    function withdrawGhstUsdcPoolStake(uint256 _poolTokens) external {
        updateFrens();
        address sender = LibMeta.msgSender();
        uint256 bal = IERC20(s.stkGhstUsdcToken).balanceOf(sender);
        require(bal >= _poolTokens, "Must have enough stkGhstUsdcTokens");
        IERC20Mintable(s.stkGhstUsdcToken).burn(sender, _poolTokens);
        uint256 accountPoolTokens = s.accounts[sender].ghstUsdcPoolTokens;
        require(accountPoolTokens >= _poolTokens, "Can't withdraw more poolTokens than in account");
        s.accounts[sender].ghstUsdcPoolTokens = accountPoolTokens - _poolTokens;
        LibERC20.transfer(s.ghstUsdcPoolToken, sender, _poolTokens);
    }

    function withdrawGhstWethPoolStake(uint256 _poolTokens) external {
        updateFrens();
        address sender = LibMeta.msgSender();
        uint256 bal = IERC20(s.stkGhstWethToken).balanceOf(sender);
        require(bal >= _poolTokens, "Must have enough stkGhstWethTokens");
        IERC20Mintable(s.stkGhstWethToken).burn(sender, _poolTokens);
        uint256 accountPoolTokens = s.accounts[sender].ghstWethPoolTokens;
        require(accountPoolTokens >= _poolTokens, "Can't withdraw more poolTokens than in account");
        s.accounts[sender].ghstWethPoolTokens = accountPoolTokens - _poolTokens;
        LibERC20.transfer(s.ghstWethPoolToken, sender, _poolTokens);
    }

    function claimTickets(uint256[] calldata _ids, uint256[] calldata _values) external {
        require(_ids.length == _values.length, "Staking: _ids not the same length as _values");
        updateFrens();
        address sender = LibMeta.msgSender();
        uint256 frensBal = s.accounts[sender].frens;
        for (uint256 i; i < _ids.length; i++) {
            uint256 id = _ids[i];
            uint256 value = _values[i];
            require(id < 7, "Staking: Ticket not found");
            uint256 l_ticketCost = ticketCost(id);
            uint256 cost = l_ticketCost * value;
            require(cost / l_ticketCost == value, "Staking: multiplication overflow");
            require(frensBal >= cost, "Staking: Not enough frens points");
            frensBal -= cost;
            s.tickets[id].accountBalances[sender] += value;
            s.tickets[id].totalSupply += uint96(value);
        }
        s.accounts[sender].frens = frensBal;
        emit TransferBatch(sender, address(0), sender, _ids, _values);
        uint256 size;
        assembly {
            size := extcodesize(sender)
        }
        if (size > 0) {
            require(
                ERC1155_BATCH_ACCEPTED == IERC1155TokenReceiver(sender).onERC1155BatchReceived(sender, address(0), _ids, _values, new bytes(0)),
                "Staking: Ticket transfer rejected/failed"
            );
        }
    }

    function convertTickets(uint256[] calldata _ids, uint256[] calldata _values) external {
        require(_ids.length == _values.length, "Staking: _ids not the same length as _values");
        address sender = LibMeta.msgSender();
        uint256 totalCost;
        uint256 dropTicketId = 6;
        uint256 dropTicketCost = ticketCost(dropTicketId);
        for (uint256 i; i < _ids.length; i++) {
            uint256 id = _ids[i];
            uint256 value = _values[i];
            // Can't convert drop ticket itself to another drop ticket
            require(id != dropTicketId, "Staking: Cannot convert Drop Ticket");
            uint256 l_ticketCost = ticketCost(id);
            uint256 cost = l_ticketCost * value;
            require(cost / l_ticketCost == value, "Staking: multiplication overflow");
            require(s.tickets[id].accountBalances[sender] >= value, "Staking: Not enough Ticket balance");
            totalCost += cost;

            s.tickets[id].accountBalances[sender] -= value;
            s.tickets[id].totalSupply -= uint96(value);
        }
        require(totalCost > 0, "Staking: Invalid Ticket Ids and Values");
        require(totalCost % dropTicketCost == 0, "Staking: Cannot partially convert Drop Tickets");

        emit TransferBatch(sender, sender, address(0), _ids, _values);

        uint256 newDropTickets = totalCost / dropTicketCost;
        uint256[] memory eventTicketIds = new uint256[](1);
        eventTicketIds[0] = dropTicketId;

        uint256[] memory eventTicketValues = new uint256[](1);
        eventTicketValues[0] = newDropTickets;

        s.tickets[dropTicketId].accountBalances[sender] += newDropTickets;
        s.tickets[dropTicketId].totalSupply += uint96(newDropTickets);

        if (s.aavegotchiDiamond != address(0)) {
            IERC1155Marketplace(s.aavegotchiDiamond).updateBatchERC1155Listing(address(this), _ids, sender);
        }
        emit TransferBatch(sender, address(0), sender, eventTicketIds, eventTicketValues);

        uint256 size;
        assembly {
            size := extcodesize(sender)
        }
        if (size > 0) {
            require(
                ERC1155_BATCH_ACCEPTED ==
                    IERC1155TokenReceiver(sender).onERC1155BatchReceived(sender, address(0), eventTicketIds, eventTicketValues, new bytes(0)),
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
        } else if (_id == 6) {
            _frensCost = 10_000e18;
        } else {
            revert("Staking: _id does not exist");
        }
    }

    modifier onlyRateManager {
        require(isRateManager(msg.sender), "StakingFacet: Must be rate manager");
        _;
    }

    function isRateManager(address account) public view returns (bool) {
        return s.rateManagers[account];
    }

    function addRateManagers(address[] calldata rateManagers_) external {
        LibDiamond.enforceIsContractOwner();
        for (uint256 index = 0; index < rateManagers_.length; index++) {
            s.rateManagers[rateManagers_[index]] = true;
            emit RateManagerAdded(rateManagers_[index]);
        }
    }

    function removeRateManagers(address[] calldata rateManagers_) external {
        LibDiamond.enforceIsContractOwner();
        for (uint256 index = 0; index < rateManagers_.length; index++) {
            s.rateManagers[rateManagers_[index]] = false;
            emit RateManagerRemoved(rateManagers_[index]);
        }
    }
}
