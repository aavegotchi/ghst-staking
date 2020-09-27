// SPDX-License-Identifier: MIT
pragma solidity ^0.7.1;
pragma experimental ABIEncoderV2;

interface IGHSTStaking {
    function wearableVoucherCosts(uint256 _id) external pure returns (uint256 _frensCost);

    // ids are 0 through 5.  0 is the lowest level and 5 is the highest level
    function claimWearableVouchers(uint256[] calldata _ids) external;

    // get how many frens points an account has
    function frens(address _account) external view returns (uint256 frens_);

    // stake ghst for frens points
    function stake(uint256 _ghstValue) external;

    // get how much ghst an account has staked for frens
    function staked(address _account) external view returns (uint256 staked_);

    // unstake and withdraw ghst back to the user
    function withdrawStake(uint256 _ghstValue) external;

    // Wearable Vouchers functions

    // set URIs for the six different wearable vouchers
    function setURIs(string[] calldata _values, uint256[] calldata _ids) external;

    // get the URIs for the wearable vouchers
    function uris() external view returns (string[] memory uris_);

    function safeTransferFrom(
        address _from,
        address _to,
        uint256 _id,
        uint256 _value,
        bytes calldata _data
    ) external;

    function safeBatchTransferFrom(
        address _from,
        address _to,
        uint256[] calldata _ids,
        uint256[] calldata _values,
        bytes calldata _data
    ) external;

    // total supply of wearable voucher
    function totalSupply(uint256 _id) external view returns (uint256 totalSupply_);

    function totalSupplies() external view returns (uint256[] memory totalSupplies_);

    // balance of specific Wearable Voucher
    function balanceOf(address _owner, uint256 _id) external view returns (uint256 balance_);

    // get balance for each Wearable Voucher
    function balanceOfAll(address _owner) external view returns (uint256[] memory balances_);

    function balanceOfBatch(address[] calldata _owners, uint256[] calldata _ids) external view returns (uint256[] memory balances_);

    function setApprovalForAll(address _operator, bool _approved) external;

    function isApprovedForAll(address _owner, address _operator) external view returns (bool);
}
