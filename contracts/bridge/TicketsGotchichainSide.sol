// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./ProxyONFT1155.sol";
import "../gotchichain/Tickets.sol";
import "../libraries/AppStorage.sol";
import "../libraries/LibDiamond.sol";
import "../libraries/LibStrings.sol";
import "../libraries/LibMeta.sol";

contract TicketsBridgeGotchichainSide is ProxyONFT1155 {
    constructor(address _lzEndpoint, address _proxyToken) ProxyONFT1155(_lzEndpoint, _proxyToken) {}

    function _debitFrom(address _from, uint16, bytes memory, uint[] memory _tokenIds, uint[] memory _amounts) internal override {
        require(_from == _msgSender(), "TicketsBridgeGotchichainSide: owner is not send caller");
        for (uint i = 0; i < _tokenIds.length; i++) {
            IERC1155(address(token)).safeTransferFrom(_from, address(this), _tokenIds[i], _amounts[i], "");
        }
    }

    function _creditTo(uint16, address _toAddress, uint[] memory _tokenIds, uint[] memory _amounts) internal override {
        for (uint i = 0; i < _tokenIds.length; i++) {
            uint256 balance = token.balanceOf(address(this), _tokenIds[i]);
            if (balance >= _amounts[i]) {
                token.safeTransferFrom(address(this), _toAddress, _tokenIds[i], _amounts[i], "");
            } else if (balance == 0) {
                Tickets(address(token)).mint(_toAddress, _tokenIds[i], _amounts[i], "");
            } else {
                uint256 mintAmount = _amounts[i] - balance;
                uint256 transferAmount = _amounts[i] - mintAmount;
                Tickets(address(token)).mint(_toAddress, _tokenIds[i], mintAmount, "");
                token.safeTransferFrom(address(this), _toAddress, _tokenIds[i], transferAmount, "");
            }
        }
    }
}
