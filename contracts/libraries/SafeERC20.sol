// SPDX-License-Identifier: MIT
pragma solidity ^0.7.1;

/******************************************************************************\
* Author: Nick Mudge
*
/******************************************************************************/

library SafeERC20 {
    function transferFrom(
        address _token,
        address _from,
        address _to,
        uint256 _value
    ) internal {
        uint256 size;
        assembly {
            size := extcodesize(_token)
        }
        require(size > 0, "SafeERC20: ERC20 token address has no code");
        // transferFrom(address,address,uint256) == 0x23b872dd
        (bool success, bytes memory result) = _token.call(abi.encodeWithSelector(0x23b872dd, _from, _to, _value));
        handleReturn(success, result);
    }

    function transfer(
        address _token,
        address _to,
        uint256 _value
    ) internal {
        uint256 size;
        assembly {
            size := extcodesize(_token)
        }
        require(size > 0, "SafeERC20: ERC20 token address has no code");
        // transfer(address,uint256) == 0xa9059cbb
        (bool success, bytes memory result) = _token.call(abi.encodeWithSelector(0xa9059cbb, _to, _value));
        handleReturn(success, result);
    }

    function handleReturn(bool _success, bytes memory _result) internal pure {
        if (_success) {
            if (_result.length > 0) {
                require(abi.decode(_result, (bool)), "SafeERC20: transfer or transferFrom returned false");
            }
        } else {
            if (_result.length > 0) {
                // bubble up any reason for revert
                revert(string(_result));
            } else {
                revert("SafeERC20: transfer or transferFrom reverted");
            }
        }
    }
}
