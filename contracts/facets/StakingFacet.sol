// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;
pragma experimental ABIEncoderV2;

import "../libraries/AppStorage.sol";
import "../libraries/LibDiamond.sol";
import "../libraries/LibERC20.sol";
import "../interfaces/IERC20.sol";
import "../interfaces/IERC1155TokenReceiver.sol";
import "../libraries/LibMeta.sol";
import {Epoch} from "../libraries/AppStorage.sol";

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

    //Epoch events
    event StakeInEpoch(address indexed _account, address indexed _poolAddress, uint256 indexed _epoch, uint256 _amount);
    event WithdrawInEpoch(address indexed _account, address indexed _poolAddress, uint256 indexed _epoch, uint256 _amount);
    event PoolAddedInEpoch(address indexed _poolAddress, uint256 indexed _epoch);
    event EpochIncreased(uint256 indexed _newEpoch);
    event UserMigrated(address indexed _account);

    struct PoolInput {
        address _poolAddress;
        address _poolReceiptToken; //The receipt token for staking into this pool. Can be address(0) if empty
        uint256 _rate;
        string _poolName;
        string _poolUrl;
    }

    struct PoolStakedOutput {
        address poolAddress;
        string poolName;
        string poolUrl;
        uint256 rate;
        uint256 amount;
    }

    /***********************************|
   |  External Epoch Read Functions     |
   |__________________________________*/

    function userEpoch(address _account) external view returns (uint256) {
        return s.accounts[_account].userCurrentEpoch;
    }

    function getPoolInfo(address _poolAddress, uint256 _epoch) external view returns (PoolInput memory _poolInfo) {
        Pool storage pool = s.pools[_poolAddress];
        return PoolInput(_poolAddress, pool.receiptToken, pool.epochPoolRate[_epoch], pool.name, pool.url);
    }

    function poolRatesInEpoch(uint256 _epoch) external view returns (PoolStakedOutput[] memory _rates) {
        Epoch storage epoch = s.epochs[_epoch];
        _rates = new PoolStakedOutput[](epoch.supportedPools.length);

        for (uint256 index = 0; index < epoch.supportedPools.length; index++) {
            address poolAddress = epoch.supportedPools[index];
            uint256 rate = s.pools[poolAddress].epochPoolRate[_epoch];
            string memory poolName = s.pools[poolAddress].name;
            string memory url = s.pools[poolAddress].url;
            _rates[index] = PoolStakedOutput(poolAddress, poolName, url, rate, 0);
        }
    }

    function currentEpoch() external view returns (uint256) {
        return s.currentEpoch;
    }

    function hasMigrated(address _account) public view returns (bool) {
        return s.accounts[_account].hasMigrated;
    }

    function stakedInCurrentEpoch(address _account) external view returns (PoolStakedOutput[] memory _staked) {
        return stakedInEpoch(_account, s.currentEpoch);
    }

    /***********************************|
   |    Public Epoch Read Functions      |
   |__________________________________*/

    function frens(address _account) public view returns (uint256 frens_) {
        if (s.accounts[_account].hasMigrated) return _epochFrens(_account);
        else return _deprecatedFrens(_account);
    }

    function bulkFrens(address[] calldata _accounts) public view returns (uint256[] memory frens_) {
        frens_ = new uint256[](_accounts.length);
        for (uint256 i; i < _accounts.length; i++) {
            frens_[i] = frens(_accounts[i]);
        }
    }

    function stakedInEpoch(address _account, uint256 _epoch) public view returns (PoolStakedOutput[] memory _staked) {
        Epoch storage epoch = s.epochs[_epoch];
        _staked = new PoolStakedOutput[](epoch.supportedPools.length);

        for (uint256 index = 0; index < epoch.supportedPools.length; index++) {
            address poolAddress = epoch.supportedPools[index];
            Pool storage pool = s.pools[poolAddress];
            uint256 rate = pool.epochPoolRate[_epoch];
            uint256 amount = s.accounts[_account].accountStakedTokens[poolAddress];
            _staked[index] = PoolStakedOutput(poolAddress, pool.name, pool.url, rate, amount);
        }
    }

    /***********************************|
   |  Internal Epoch Read Functions    |
   |__________________________________*/

    function _frensForEpoch(address _account, uint256 _epoch) internal view returns (uint256) {
        Epoch memory epoch = s.epochs[_epoch];
        address[] memory supportedPools = epoch.supportedPools;
        uint256 lastFrensUpdate = s.accounts[_account].lastFrensUpdate;

        uint256 duration = 0;

        //When epoch is not over yet
        if (epoch.endTime == 0) {
            uint256 epochDuration = block.timestamp - epoch.beginTime;
            uint256 timeSinceLastFrensUpdate = block.timestamp - lastFrensUpdate;
            //Time since last update is longer than the current epoch, so only use epoch time
            if (timeSinceLastFrensUpdate > epochDuration) {
                duration = epochDuration;
            } else {
                //Otherwise use timeSinceLastFrensUpdate
                duration = timeSinceLastFrensUpdate;
            }
        }
        //When epoch is over
        else {
            duration = epoch.endTime - epoch.beginTime;
        }

        uint256 accumulatedFrens = 0;

        for (uint256 index = 0; index < supportedPools.length; index++) {
            address poolAddress = supportedPools[index];

            uint256 poolHistoricRate = s.pools[poolAddress].epochPoolRate[_epoch];
            uint256 stakedTokens = s.accounts[_account].accountStakedTokens[poolAddress];
            accumulatedFrens += (stakedTokens * poolHistoricRate * duration) / 24 hours;
        }

        return accumulatedFrens;
    }

    //Gets the amount of FRENS for a given user up to a specific epoch.
    function _epochFrens(address _account) internal view returns (uint256 frens_) {
        Account storage account = s.accounts[_account];

        frens_ = account.frens;

        uint256 epochsBehind = s.currentEpoch - account.userCurrentEpoch;

        //Get frens for current epoch
        frens_ += _frensForEpoch(_account, s.currentEpoch);

        for (uint256 i = 1; i <= epochsBehind; i++) {
            uint256 historicEpoch = s.currentEpoch - i;
            frens_ += _frensForEpoch(_account, historicEpoch);
        }
    }

    function _deprecatedFrens(address _account) internal view returns (uint256 frens_) {
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
        return frens_;
    }

    function _validPool(address _poolContractAddress) internal view returns (bool) {
        //Validate that pool exists in current epoch
        bool validPool = false;
        Epoch memory epoch = s.epochs[s.currentEpoch];
        for (uint256 index = 0; index < epoch.supportedPools.length; index++) {
            address pool = epoch.supportedPools[index];
            if (_poolContractAddress == pool) {
                validPool = true;
                break;
            }
        }
        return validPool;
    }

    /***********************************|
   |   External Epoch Write Functions   |
   |__________________________________*/

    function migrateToV2(address[] memory _accounts) external {
        for (uint256 index = 0; index < _accounts.length; index++) {
            _migrateAndUpdateFrens(_accounts[index]);
        }
    }

    function initiateEpoch(PoolInput[] calldata _pools) external {
        LibDiamond.enforceIsContractOwner();
        require(s.epochs[0].supportedPools.length == 0, "StakingFacet: Can only be called on first epoch");
        require(_pools.length > 0, "StakingFacet: Pools length cannot be zero");

        Epoch storage firstEpoch = s.epochs[0];
        firstEpoch.beginTime = block.timestamp;

        //Update the pool rates for each pool in this epoch
        _addPools(_pools);
        emit EpochIncreased(0);
    }

    function updateRates(uint256 _currentEpoch, PoolInput[] calldata _newPools) external onlyRateManager {
        require(_newPools.length > 0, "StakingFacet: Pools length cannot be zero");
        //Used to prevent duplicate rate updates from happening in bad network conditions
        require(_currentEpoch == s.currentEpoch, "StakingFacet: Incorrect epoch given");

        //End current epoch
        Epoch storage epochNow = s.epochs[s.currentEpoch];
        epochNow.endTime = block.timestamp;

        //Increase epoch counter
        s.currentEpoch++;

        //Begin new epoch
        Epoch storage newEpoch = s.epochs[s.currentEpoch];
        newEpoch.beginTime = block.timestamp;

        //Add pools
        _addPools(_newPools);
        emit EpochIncreased(s.currentEpoch);
    }

    //Escape hatch mechanism callable by anyone to bump a user to a certain epoch.
    function bumpEpoch(address _account, uint256 _epoch) external {
        Account storage account = s.accounts[_account];
        require(account.hasMigrated == true, "StakingFacet: Can only bump migrated user");
        require(_epoch > account.userCurrentEpoch, "StakingFacet: Cannot bump to lower epoch");
        require(_epoch <= s.currentEpoch, "StakingFacet: Epoch must be lower than current epoch");
        _updateFrens(_account, _epoch);
    }

    /***********************************|
   |     Public Epoch Write Functions    |
   |__________________________________*/

    function stakeIntoPool(address _poolContractAddress, uint256 _amount) public {
        address sender = LibMeta.msgSender();

        require(_validPool(_poolContractAddress) == true, "StakingFacet: Pool is not valid in this epoch");

        require(IERC20(_poolContractAddress).balanceOf(sender) >= _amount, "StakingFacet: Insufficient token balance");

        _migrateOrUpdate(sender);

        //Credit the user's with their new LP token balance
        s.accounts[sender].accountStakedTokens[_poolContractAddress] += _amount;

        if (_poolContractAddress == s.ghstContract) {
            //Do nothing for original GHST contract
        } else if (_poolContractAddress == s.poolContract) {
            //Keep the GHST-QUICK staking token balance up to date
            s.accounts[sender].ghstStakingTokens += _amount;
            s.ghstStakingTokensTotalSupply += _amount;
            emit Transfer(address(0), sender, _amount);
        } else {
            //Use mintable for minting other stkGHST- tokens
            address stkTokenAddress = s.pools[_poolContractAddress].receiptToken;
            IERC20Mintable(stkTokenAddress).mint(sender, _amount);
        }

        //Transfer the LP tokens into the Diamond
        LibERC20.transferFrom(_poolContractAddress, sender, address(this), _amount);

        emit StakeInEpoch(sender, _poolContractAddress, s.currentEpoch, _amount);
    }

    function withdrawFromPool(address _poolContractAddress, uint256 _amount) public {
        address sender = LibMeta.msgSender();

        _migrateOrUpdate(sender);

        address receiptTokenAddress = s.pools[_poolContractAddress].receiptToken;
        uint256 stakedBalance = s.accounts[sender].accountStakedTokens[_poolContractAddress];

        //GHST does not have a receipt token
        if (receiptTokenAddress != address(0)) {
            require(IERC20(receiptTokenAddress).balanceOf(sender) >= _amount, "StakingFacet: Receipt token insufficient");
        }

        require(stakedBalance >= _amount, "StakingFacet: Can't withdraw more tokens than staked");

        //Reduce user balance of staked token
        s.accounts[sender].accountStakedTokens[_poolContractAddress] -= _amount;

        if (_poolContractAddress == s.ghstContract) {
            //Do nothing for GHST
        } else if (_poolContractAddress == s.poolContract) {
            s.accounts[sender].ghstStakingTokens -= _amount;
            s.ghstStakingTokensTotalSupply -= _amount;

            emit Transfer(sender, address(0), _amount);
        } else {
            IERC20Mintable(receiptTokenAddress).burn(sender, _amount);
        }

        //Transfer stake tokens from GHST diamond
        LibERC20.transfer(_poolContractAddress, sender, _amount);
        emit WithdrawInEpoch(sender, _poolContractAddress, s.currentEpoch, _amount);
    }

    /***********************************|
   |    Internal Epoch Write Functions   |
   |__________________________________*/

    function _migrateOrUpdate(address _account) internal {
        if (hasMigrated(_account)) {
            _updateFrens(_account, s.currentEpoch);
        } else {
            _migrateAndUpdateFrens(_account);
        }
    }

    function _addPool(PoolInput memory _pool) internal {
        address poolAddress = _pool._poolAddress;
        if (poolAddress != s.ghstContract) {
            require(_pool._poolReceiptToken != address(0), "StakingFacet: Pool must have receipt token");
        }
        s.pools[poolAddress].name = _pool._poolName;
        s.pools[poolAddress].receiptToken = _pool._poolReceiptToken;
        s.pools[poolAddress].epochPoolRate[s.currentEpoch] = _pool._rate;
        s.pools[poolAddress].url = _pool._poolUrl;

        s.epochs[s.currentEpoch].supportedPools.push(poolAddress);
        emit PoolAddedInEpoch(poolAddress, s.currentEpoch);
    }

    function _addPools(PoolInput[] memory _pools) internal {
        for (uint256 index = 0; index < _pools.length; index++) {
            _addPool(_pools[index]);
        }
    }

    function _updateFrens(address _sender, uint256 _epoch) internal {
        Account storage account = s.accounts[_sender];
        account.frens = frens(_sender);
        account.lastFrensUpdate = uint40(block.timestamp);

        //Bring this user to the specified epoch;
        s.accounts[_sender].userCurrentEpoch = _epoch;
    }

    function _migrateAndUpdateFrens(address _account) internal {
        require(s.accounts[_account].hasMigrated == false, "StakingFacet: Already migrated");
        uint256 ghst_ = s.accounts[_account].ghst;
        uint256 poolTokens_ = s.accounts[_account].poolTokens;
        uint256 ghstUsdcPoolToken_ = s.accounts[_account].ghstUsdcPoolTokens;
        uint256 ghstWethPoolToken_ = s.accounts[_account].ghstWethPoolTokens;

        //Set balances for all of the V1 pools
        s.accounts[_account].accountStakedTokens[s.ghstContract] = ghst_;
        s.accounts[_account].accountStakedTokens[s.poolContract] = poolTokens_;
        s.accounts[_account].accountStakedTokens[s.ghstUsdcPoolToken] = ghstUsdcPoolToken_;
        s.accounts[_account].accountStakedTokens[s.ghstWethPoolToken] = ghstWethPoolToken_;

        //Update FRENS with last balance
        _updateFrens(_account, s.currentEpoch);
        s.accounts[_account].hasMigrated = true;

        emit UserMigrated(_account);
    }

    /***********************************|
   |     Deprecated Write Functions     |
   |__________________________________*/

    function stakeGhst(uint256 _ghstValue) external {
        stakeIntoPool(s.ghstContract, _ghstValue);
    }

    function stakePoolTokens(uint256 _poolTokens) external {
        stakeIntoPool(s.poolContract, _poolTokens);
    }

    function stakeGhstUsdcPoolTokens(uint256 _poolTokens) external {
        stakeIntoPool(s.ghstUsdcPoolToken, _poolTokens);
    }

    function stakeGhstWethPoolTokens(uint256 _poolTokens) external {
        stakeIntoPool(s.ghstWethPoolToken, _poolTokens);
    }

    function withdrawGhstStake(uint256 _ghstValue) external {
        withdrawFromPool(s.ghstContract, _ghstValue);
    }

    function withdrawPoolStake(uint256 _poolTokens) external {
        withdrawFromPool(s.poolContract, _poolTokens);
    }

    function withdrawGhstUsdcPoolStake(uint256 _poolTokens) external {
        withdrawFromPool(s.ghstUsdcPoolToken, _poolTokens);
    }

    function withdrawGhstWethPoolStake(uint256 _poolTokens) external {
        withdrawFromPool(s.ghstWethPoolToken, _poolTokens);
    }

    /***********************************|
   |      Deprecated Read Functions     |
   |__________________________________*/

    function getGhstUsdcPoolToken() external view returns (address) {
        return s.ghstUsdcPoolToken;
    }

    function getStkGhstUsdcToken() external view returns (address) {
        return s.stkGhstUsdcToken;
    }

    function getGhstWethPoolToken() external view returns (address) {
        return s.ghstWethPoolToken;
    }

    function getStkGhstWethToken() external view returns (address) {
        return s.stkGhstWethToken;
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
        if (hasMigrated(_account)) {
            ghst_ = s.accounts[_account].accountStakedTokens[s.ghstContract];
            poolTokens_ = s.accounts[_account].accountStakedTokens[s.poolContract];
            ghstUsdcPoolToken_ = s.accounts[_account].accountStakedTokens[s.ghstUsdcPoolToken];
            ghstWethPoolToken_ = s.accounts[_account].accountStakedTokens[s.ghstWethPoolToken];
        } else {
            ghst_ = s.accounts[_account].ghst;
            poolTokens_ = s.accounts[_account].poolTokens;
            ghstUsdcPoolToken_ = s.accounts[_account].ghstUsdcPoolTokens;
            ghstWethPoolToken_ = s.accounts[_account].ghstWethPoolTokens;
        }
    }

    /***********************************|
   |           Ticket Functions          |
   |__________________________________*/

    function claimTickets(uint256[] calldata _ids, uint256[] calldata _values) external {
        require(_ids.length == _values.length, "Staking: _ids not the same length as _values");

        address sender = LibMeta.msgSender();
        _updateFrens(sender, s.currentEpoch);
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

    /***********************************|
   |       Rate Manager Functions        |
   |__________________________________*/

    modifier onlyRateManager() {
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
