// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

interface IStakingFacet {
    struct PoolInput {
        address _poolAddress;
        address _poolReceiptToken; //The receipt token for staking into this pool.
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

    function addRateManagers(address[] memory rateManagers_) external;

    function bulkFrens(address[] memory _accounts) external view returns (uint256[] memory frens_);

    function bumpEpoch(address _account, uint256 _epoch) external;

    function claimTickets(uint256[] memory _ids, uint256[] memory _values) external;

    function convertTickets(uint256[] memory _ids, uint256[] memory _values) external;

    function currentEpoch() external view returns (uint256);

    function frens(address _account) external view returns (uint256 frens_);

    function getGhstUsdcPoolToken() external view returns (address);

    function getGhstWethPoolToken() external view returns (address);

    function getPoolInfo(address _poolAddress, uint256 _epoch) external view returns (PoolInput memory);

    function getStkGhstUsdcToken() external view returns (address);

    function getStkGhstWethToken() external view returns (address);

    function hasMigrated(address _account) external view returns (bool);

    function initiateEpoch(PoolInput[] memory _pools) external;

    function isRateManager(address account) external view returns (bool);

    function migrateToV2(address[] memory _accounts) external;

    function poolRatesInEpoch(uint256 _epoch) external view returns (PoolStakedOutput[] memory _rates);

    function removeRateManagers(address[] memory rateManagers_) external;

    function stakeGhst(uint256 _ghstValue) external;

    function stakeGhstUsdcPoolTokens(uint256 _poolTokens) external;

    function stakeGhstWethPoolTokens(uint256 _poolTokens) external;

    function stakeIntoPool(address _poolContractAddress, uint256 _amount) external;

    function stakePoolTokens(uint256 _poolTokens) external;

    function withdrawFromPoolForUser(
        address _poolContractAddress,
        uint256 _amount,
        address _sender
    ) external;

    function stakeIntoPoolForUser(
        address _poolContractAddress,
        uint256 _amount,
        address _sender
    ) external;

    function staked(address _account)
        external
        view
        returns (
            uint256 ghst_,
            uint256 poolTokens_,
            uint256 ghstUsdcPoolToken_,
            uint256 ghstWethPoolToken_
        );

    function stakedInCurrentEpoch(address _account) external view returns (PoolStakedOutput[] memory _staked);

    function stakedInEpoch(address _account, uint256 _epoch) external view returns (PoolStakedOutput[] memory _staked);

    function ticketCost(uint256 _id) external pure returns (uint256 _frensCost);

    function updateRates(uint256 _currentEpoch, PoolInput[] memory _newPools) external;

    function userEpoch(address _account) external view returns (uint256);

    function withdrawFromPool(address _poolContractAddress, uint256 _amount) external;

    function withdrawGhstStake(uint256 _ghstValue) external;

    function withdrawGhstUsdcPoolStake(uint256 _poolTokens) external;

    function withdrawGhstWethPoolStake(uint256 _poolTokens) external;

    function withdrawPoolStake(uint256 _poolTokens) external;
}
