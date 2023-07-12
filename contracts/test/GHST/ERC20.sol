// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;
pragma experimental ABIEncoderV2;

import "./AppStorage.sol";

contract ERC20 {
    AppStorage s;

    uint256 constant MAX_UINT = 2**256 - 1;

    event Approval(address indexed _owner, address indexed _spender, uint256 _value);
    event Transfer(address indexed _from, address indexed _to, uint256 _value);

    function name() external pure returns (string memory) {
        return "ERC20";
    }

    function symbol() external pure returns (string memory) {
        return "ERC20";
    }

    function decimals() external pure returns (uint8) {
        return 18;
    }

    function totalSupply() public view returns (uint256) {
        return s.totalSupply;
    }

    function balanceOf(address _owner) public view returns (uint256 balance) {
        balance = s.balances[_owner];
    }

    function transfer(address _to, uint256 _value) public returns (bool success) {
        uint256 frombalances = s.balances[msg.sender];
        require(frombalances >= _value, "GHST: Not enough GHST to transfer");
        s.balances[msg.sender] = frombalances - _value;
        s.balances[_to] += _value;
        emit Transfer(msg.sender, _to, _value);
        success = true;
    }

    function approvedContracts() external view returns (address[] memory contracts_) {
        contracts_ = s.approvedContracts;
    }

    function transferFrom(
        address _from,
        address _to,
        uint256 _value
    ) public returns (bool success) {
        uint256 fromBalance = s.balances[_from];
        if (msg.sender == _from || s.approvedContractIndexes[msg.sender] > 0) {
            // pass
        } else {
            uint256 l_allowance = s.allowances[_from][msg.sender];
            require(l_allowance >= _value, "GHST: Not allowed to transfer");
            if (l_allowance != MAX_UINT) {
                s.allowances[_from][msg.sender] = l_allowance - _value;
                emit Approval(_from, msg.sender, l_allowance - _value);
            }
        }
        require(fromBalance >= _value, "GHST: Not enough GHST to transfer");
        s.balances[_from] = fromBalance - _value;
        s.balances[_to] += _value;
        emit Transfer(_from, _to, _value);
        success = true;
    }

    function approve(address _spender, uint256 _value) public returns (bool success) {
        s.allowances[msg.sender][_spender] = _value;
        emit Approval(msg.sender, _spender, _value);
        success = true;
    }

    function increaseAllowance(address _spender, uint256 _value) external returns (bool success) {
        uint256 l_allowance = s.allowances[msg.sender][_spender];
        uint256 newAllowance = l_allowance + _value;
        require(newAllowance >= l_allowance, "GHSTFacet: Allowance increase overflowed");
        s.allowances[msg.sender][_spender] = newAllowance;
        emit Approval(msg.sender, _spender, newAllowance);
        success = true;
    }

    function decreaseAllowance(address _spender, uint256 _value) external returns (bool success) {
        uint256 l_allowance = s.allowances[msg.sender][_spender];
        require(l_allowance >= _value, "GHSTFacet: Allowance decreased below 0");
        l_allowance -= _value;
        s.allowances[msg.sender][_spender] = l_allowance;
        emit Approval(msg.sender, _spender, l_allowance);
        success = true;
    }

    function allowance(address _owner, address _spender) public view returns (uint256 remaining) {
        remaining = s.allowances[_owner][_spender];
    }

    function mint() external {
        uint256 amount = 4_000_000_000e18;
        s.balances[msg.sender] += amount;
        s.totalSupply += uint96(amount);
        emit Transfer(address(0), msg.sender, amount);
    }
}
