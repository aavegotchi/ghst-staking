// SPDX-License-Identifier: MIT
pragma solidity ^0.7.1;
pragma experimental ABIEncoderV2;

interface IGHSTStakingDiamond {
    function ticketCost(uint256 _id) external pure returns (uint256 _frensCost);

    // ids are 0 through 5.  0 is the lowest level and 5 is the highest level
    function claimTickets(uint256[] calldata _ids) external;

    // get how many frens points an account has
    function frens(address _account) external view returns (uint256 frens_);

    function stakeGhst(uint256 _ghstValue) external;

    function stakeUniV2PoolTokens(uint256 _uniV2PoolTokens) external;

    function staked(address _account) external view returns (uint256 ghst_, uint256 uniV2PoolTokens_);

    function withdrawGhstStake(uint256 _ghstValue) external;

    function withdrawUniV2PoolStake(uint256 _uniV2PoolTokens) external;

    function withdrawGhstStake() external;

    function withdrawUniV2PoolStake() external;

    // set URIs for the six different  tickets
    function setBaseURI(string memory _value) external;

    // get the URIs for the  tickets
    function uri(uint256 _id) external view returns (string memory);

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

    // total supply of  voucher
    function totalSupply(uint256 _id) external view returns (uint256 totalSupply_);

    function totalSupplies() external view returns (uint256[] memory totalSupplies_);

    // balance of specific  Voucher
    function balanceOf(address _owner, uint256 _id) external view returns (uint256 balance_);

    // get balance for each  Voucher
    function balanceOfAll(address _owner) external view returns (uint256[] memory balances_);

    function balanceOfBatch(address[] calldata _owners, uint256[] calldata _ids) external view returns (uint256[] memory balances_);

    function setApprovalForAll(address _operator, bool _approved) external;

    function isApprovedForAll(address _owner, address _operator) external view returns (bool);
}
