// SPDX-License-Identifier: MIT
pragma solidity ^0.7.1;

interface IGHSTStaking {
    // get how many frens points an account has
    function frens(address _account) external view returns (uint256 frens_);

    // stake ghst for frens points
    function stake(uint256 _ghstValue) external;

    // get how much ghst an account has staked for frens
    function staked(address _account) external view returns (uint256 staked_);

    // unstake and withdraw ghst back to the user
    function withdrawStake(uint256 _ghstValue) external;

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

    function balanceOf(address _owner, uint256 _id) external view returns (uint256 balance_);

    function balanceOfBatch(address[] calldata _owners, uint256[] calldata _ids) external view returns (uint256[] memory balances_);

    function setApprovalForAll(address _operator, bool _approved) external;

    function isApprovedForAll(address _owner, address _operator) external view returns (bool);
}
