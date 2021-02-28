// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;
pragma experimental ABIEncoderV2;

import "../libraries/AppStorage.sol";
import "../libraries/LibMeta.sol";

contract GHSTStakingTokenFacet {
    AppStorage s;

    uint256 constant MAX_UINT = uint256(-1);

    event Approval(address indexed _owner, address indexed _spender, uint256 _value);
    event Transfer(address indexed _from, address indexed _to, uint256 _value);

    function name() external pure returns (string memory) {
        return "Staked GHST-QUICK LP";
    }

    function symbol() external pure returns (string memory) {
        return "stkGHST-QUICK";
    }

    function decimals() external pure returns (uint8) {
        return 18;
    }

    function totalSupply() public view returns (uint256) {
        return s.ghstStakingTokensTotalSupply;
    }

    function balanceOf(address _owner) public view returns (uint256 balance_) {
        balance_ = s.accounts[_owner].ghstStakingTokens;
    }

    function transfer(address _to, uint256 _value) public returns (bool success) {
        address sender = LibMeta.msgSender();
        uint256 frombalance = s.accounts[sender].ghstStakingTokens;
        require(frombalance >= _value, "Not enough GHSTStakingToken to transfer");
        s.accounts[sender].ghstStakingTokens = frombalance - _value;
        s.accounts[_to].ghstStakingTokens += _value;
        emit Transfer(sender, _to, _value);
        success = true;
    }

    function transferFrom(
        address _from,
        address _to,
        uint256 _value
    ) public returns (bool success) {
        address sender = LibMeta.msgSender();
        uint256 fromBalance = s.accounts[_from].ghstStakingTokens;
        if (sender != _from) {
            uint256 l_allowance = s.accounts[_from].ghstStakingTokensAllowances[sender];
            require(l_allowance >= _value, "Allowance not great enough to transfer GHSTStakingToken");
            if (l_allowance != MAX_UINT) {
                s.accounts[_from].ghstStakingTokensAllowances[sender] = l_allowance - _value;
                emit Approval(_from, sender, l_allowance - _value);
            }
        }
        require(fromBalance >= _value, "Not enough GHSTStakingToken to transfer");
        s.accounts[_from].ghstStakingTokens = fromBalance - _value;
        s.accounts[_to].ghstStakingTokens += _value;
        emit Transfer(_from, _to, _value);
        success = true;
    }

    function approve(address _spender, uint256 _value) public returns (bool success_) {
        address sender = LibMeta.msgSender();
        s.accounts[sender].ghstStakingTokensAllowances[_spender] = _value;
        emit Approval(sender, _spender, _value);
        success_ = true;
    }

    function increaseAllowance(address _spender, uint256 _value) external returns (bool success) {
        address sender = LibMeta.msgSender();
        uint256 l_allowance = s.accounts[sender].ghstStakingTokensAllowances[_spender];
        uint256 newAllowance = l_allowance + _value;
        require(newAllowance >= l_allowance, "GHSTStakingToken allowance increase overflowed");
        s.accounts[sender].ghstStakingTokensAllowances[_spender] = newAllowance;
        emit Approval(sender, _spender, newAllowance);
        success = true;
    }

    function decreaseAllowance(address _spender, uint256 _value) external returns (bool success) {
        address sender = LibMeta.msgSender();
        uint256 l_allowance = s.accounts[sender].ghstStakingTokensAllowances[_spender];
        require(l_allowance >= _value, "GHSTStakingToken allowance decreased below 0");
        l_allowance -= _value;
        s.accounts[sender].ghstStakingTokensAllowances[_spender] = l_allowance;
        emit Approval(sender, _spender, l_allowance);
        success = true;
    }

    function allowance(address _owner, address _spender) public view returns (uint256 remaining_) {
        remaining_ = s.accounts[_owner].ghstStakingTokensAllowances[_spender];
    }
}
