// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;
pragma experimental ABIEncoderV2;

import "../interfaces/IERC1155.sol";
import "../interfaces/IERC1155TokenReceiver.sol";
import "../libraries/AppStorage.sol";
import "../libraries/LibDiamond.sol";
import "../libraries/LibStrings.sol";
import "../libraries/LibMeta.sol";

interface IERC1155Marketplace {
    function updateERC1155Listing(address _erc1155TokenAddress, uint256 _erc1155TypeId, address _owner) external;

    function updateBatchERC1155Listing(address _erc1155TokenAddress, uint256[] calldata _erc1155TypeIds, address _owner) external;
}

contract TicketsFacetMock is IERC1155 {
    AppStorage s;
    bytes4 internal constant ERC1155_ACCEPTED = 0xf23a6e61; // Return value from `onERC1155Received` call if a contract accepts receipt (i.e `bytes4(keccak256("onERC1155Received(address,address,uint256,uint256,bytes)"))`).
    bytes4 internal constant ERC1155_BATCH_ACCEPTED = 0xbc197c81; // Return value from `onERC1155BatchReceived` call if a contract accepts receipt (i.e `bytes4(keccak256("onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)"))`).

    function setAavegotchiDiamond(address _aavegotchiDiamond) external {
        LibDiamond.enforceIsContractOwner();
        s.aavegotchiDiamond = _aavegotchiDiamond;
    }

    function setBaseURI(string memory _value) external {
        LibDiamond.enforceIsContractOwner();
        s.ticketsBaseUri = _value;
        for (uint256 i; i < 7; i++) {
            emit URI(string(abi.encodePacked(_value, LibStrings.uintStr(i))), i);
        }
    }

    function uri(uint256 _id) external view returns (string memory) {
        require(_id < 7, "_id not found for  ticket");
        return string(abi.encodePacked(s.ticketsBaseUri, LibStrings.uintStr(_id)));
    }

    /**
        @notice Transfers `_value` amount of an `_id` from the `_from` address to the `_to` address specified (with safety call).
        @dev Caller must be approved to manage the tokens being transferred out of the `_from` account (see "Approval" section of the standard).
        MUST revert if `_to` is the zero address.
        MUST revert if balance of holder for token `_id` is lower than the `_value` sent.
        MUST revert on any other error.
        MUST emit the `TransferSingle` event to reflect the balance change (see "Safe Transfer Rules" section of the standard).
        After the above conditions are met, this function MUST check if `_to` is a smart contract (e.g. code size > 0). If so, it MUST call `onERC1155Received` on `_to` and act appropriately (see "Safe Transfer Rules" section of the standard).
        @param _from    Source address
        @param _to      Target address
        @param _id      ID of the token type
        @param _value   Transfer amount
        @param _data    Additional data with no specified format, MUST be sent unaltered in call to `onERC1155Received` on `_to`
    */
    function safeTransferFrom(address _from, address _to, uint256 _id, uint256 _value, bytes calldata _data) external override {
        require(_to != address(0), "Tickets: Can't transfer to 0 address");
        address sender = LibMeta.msgSender();
        require(_from == sender || s.accounts[_from].ticketsApproved[sender], "Tickets: Not approved to transfer");
        uint256 bal = s.tickets[_id].accountBalances[_from];
        require(bal >= _value, "Tickets: _value greater than balance");
        s.tickets[_id].accountBalances[_from] = bal - _value;
        s.tickets[_id].accountBalances[_to] += _value;
        emit TransferSingle(sender, _from, _to, _id, _value);
        address aavegotchiDiamond = s.aavegotchiDiamond;
        if (aavegotchiDiamond != address(0)) {
            IERC1155Marketplace(aavegotchiDiamond).updateERC1155Listing(address(this), _id, _from);
        }
        uint256 size;
        assembly {
            size := extcodesize(_to)
        }
        if (size > 0) {
            require(
                ERC1155_ACCEPTED == IERC1155TokenReceiver(_to).onERC1155Received(sender, _from, _id, _value, _data),
                "Tickets: Transfer rejected/failed by _to"
            );
        }
    }

    /**
        @notice Transfers `_values` amount(s) of `_ids` from the `_from` address to the `_to` address specified (with safety call).
        @dev Caller must be approved to manage the tokens being transferred out of the `_from` account (see "Approval" section of the standard).
        MUST revert if `_to` is the zero address.
        MUST revert if length of `_ids` is not the same as length of `_values`.
        MUST revert if any of the balance(s) of the holder(s) for token(s) in `_ids` is lower than the respective amount(s) in `_values` sent to the recipient.
        MUST revert on any other error.
        MUST emit `TransferSingle` or `TransferBatch` event(s) such that all the balance changes are reflected (see "Safe Transfer Rules" section of the standard).
        Balance changes and events MUST follow the ordering of the arrays (_ids[0]/_values[0] before _ids[1]/_values[1], etc).
        After the above conditions for the transfer(s) in the batch are met, this function MUST check if `_to` is a smart contract (e.g. code size > 0). If so, it MUST call the relevant `ERC1155TokenReceiver` hook(s) on `_to` and act appropriately (see "Safe Transfer Rules" section of the standard).
        @param _from    Source address
        @param _to      Target address
        @param _ids     IDs of each token type (order and length must match _values array)
        @param _values  Transfer amounts per token type (order and length must match _ids array)
        @param _data    Additional data with no specified format, MUST be sent unaltered in call to the `ERC1155TokenReceiver` hook(s) on `_to`
    */
    function safeBatchTransferFrom(
        address _from,
        address _to,
        uint256[] calldata _ids,
        uint256[] calldata _values,
        bytes calldata _data
    ) external override {
        require(_to != address(0), "Tickets: Can't transfer to 0 address");
        require(_ids.length == _values.length, "Tickets: _ids not the same length as _values");
        address sender = LibMeta.msgSender();
        require(_from == sender || s.accounts[_from].ticketsApproved[sender], "Tickets: Not approved to transfer");
        for (uint256 i; i < _ids.length; i++) {
            uint256 id = _ids[i];
            uint256 value = _values[i];
            uint256 bal = s.tickets[id].accountBalances[_from];
            require(bal >= value, "Tickets: _value greater than balance");
            s.tickets[id].accountBalances[_from] = bal - value;
            s.tickets[id].accountBalances[_to] += value;
        }
        emit TransferBatch(sender, _from, _to, _ids, _values);
        address aavegotchiDiamond = s.aavegotchiDiamond;
        if (aavegotchiDiamond != address(0)) {
            IERC1155Marketplace(aavegotchiDiamond).updateBatchERC1155Listing(address(this), _ids, _from);
        }
        uint256 size;
        assembly {
            size := extcodesize(_to)
        }
        if (size > 0) {
            require(
                ERC1155_BATCH_ACCEPTED == IERC1155TokenReceiver(_to).onERC1155BatchReceived(sender, _from, _ids, _values, _data),
                "Tickets: Transfer rejected/failed by _to"
            );
        }
    }

    function totalSupplies() external view returns (uint256[] memory totalSupplies_) {
        totalSupplies_ = new uint256[](7);
        for (uint256 i; i < 7; i++) {
            totalSupplies_[i] = s.tickets[i].totalSupply;
        }
    }

    function totalSupply(uint256 _id) external view returns (uint256 totalSupply_) {
        require(_id < 7, "Tickets:  Ticket not found");
        totalSupply_ = s.tickets[_id].totalSupply;
    }

    function balanceOfAll(address _owner) external view returns (uint256[] memory balances_) {
        balances_ = new uint256[](7);
        for (uint256 i; i < 7; i++) {
            balances_[i] = s.tickets[i].accountBalances[_owner];
        }
    }

    /**
        @notice Get the balance of an account's tokens.
        @param _owner    The address of the token holder
        @param _id       ID of the token
        @return balance_ The _owner's balance of the token type requested
     */
    function balanceOf(address _owner, uint256 _id) external view override returns (uint256 balance_) {
        balance_ = s.tickets[_id].accountBalances[_owner];
    }

    /**
        @notice Get the balance of multiple account/token pairs
        @param _owners    The addresses of the token holders
        @param _ids       ID of the tokens
        @return balances_ The _owner's balance of the token types requested (i.e. balance for each (owner, id) pair)
     */
    function balanceOfBatch(address[] calldata _owners, uint256[] calldata _ids) external view override returns (uint256[] memory balances_) {
        require(_owners.length == _ids.length, "Tickets: _owners not same length as _ids");
        balances_ = new uint256[](_owners.length);
        for (uint256 i; i < _owners.length; i++) {
            balances_[i] = s.tickets[_ids[i]].accountBalances[_owners[i]];
        }
    }

    /**
        @notice Enable or disable approval for a third party ("operator") to manage all of the caller's tokens.
        @dev MUST emit the ApprovalForAll event on success.
        @param _operator  Address to add to the set of authorized operators
        @param _approved  True if the operator is approved, false to revoke approval
    */
    function setApprovalForAll(address _operator, bool _approved) external override {
        address sender = LibMeta.msgSender();
        s.accounts[sender].ticketsApproved[_operator] = _approved;
        emit ApprovalForAll(sender, _operator, _approved);
    }

    /**
        @notice Queries the approval status of an operator for a given owner.
        @param _owner     The owner of the tokens
        @param _operator  Address of authorized operator
        @return           True if the operator is approved, false if not
    */
    function isApprovedForAll(address _owner, address _operator) external view override returns (bool) {
        return s.accounts[_owner].ticketsApproved[_operator];
    }

    struct TicketOwner {
        address owner;
        uint256[] ids;
        uint256[] values;
    }

    function migrateTickets(TicketOwner[] calldata _ticketOwners) external {
        LibDiamond.enforceIsContractOwner();
        address sender = LibMeta.msgSender();
        for (uint256 i; i < _ticketOwners.length; i++) {
            TicketOwner calldata ticketOwner = _ticketOwners[i];
            require(ticketOwner.ids.length == ticketOwner.values.length, "TicketFacet: ids and values not the same length");
            for (uint256 j; j < ticketOwner.ids.length; j++) {
                uint256 id = ticketOwner.ids[j];
                uint256 value = ticketOwner.values[j];
                s.tickets[id].accountBalances[ticketOwner.owner] += value;
                s.tickets[id].totalSupply += uint96(value);
            }
            emit TransferBatch(sender, address(0), ticketOwner.owner, ticketOwner.ids, ticketOwner.values);
        }
    }

    function mint(uint256 id, uint256 value) external {
        address sender = LibMeta.msgSender();
        s.tickets[id].accountBalances[sender] += value;
        s.tickets[id].totalSupply += uint96(value);
    }
}
