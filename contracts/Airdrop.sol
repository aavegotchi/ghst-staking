// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;
pragma experimental ABIEncoderV2;

import "./libraries/LibERC20.sol";

contract Airdrop {
    function airdropToken(
        address _token,
        address[] calldata _receivers,
        uint256[] calldata _amounts
    ) external {
        require(_receivers.length == _amounts.length, "_receivers.length not the same as _amounts.length");
        require(_receivers.length <= 200, "Too many transfers");
        for (uint256 i; i < _receivers.length; i++) {
            LibERC20.transferFrom(_token, msg.sender, _receivers[i], _amounts[i]);
        }
    }

    function airdropMatic(address payable[] calldata _receivers, uint256[] calldata _amounts) external payable {
        require(_receivers.length == _amounts.length, "_receivers.length not the same as _amounts.length");
        require(_receivers.length <= 200, "Too many transfers");
        for (uint256 i; i < _receivers.length; i++) {
            (bool success, bytes memory data) = _receivers[i].call{value: _amounts[i]}("");
            if (!success) {
                if (data.length > 0) {
                    // bubble up any reason for revert
                    revert(string(data));
                } else {
                    revert("sending Matic failed");
                }
            }
        }
    }
}
