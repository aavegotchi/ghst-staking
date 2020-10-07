// SPDX-License-Identifier: MIT
pragma solidity 0.7.1;
pragma experimental ABIEncoderV2;

/******************************************************************************\
* Author: Nick Mudge
*
* Implementation of an example of a diamond.
/******************************************************************************/

import "./libraries/LibDiamond.sol";
import "./interfaces/IDiamondLoupe.sol";
import "./interfaces/IDiamondCut.sol";
import "./interfaces/IERC173.sol";
import "./interfaces/IERC165.sol";
import "./libraries/AppStorage.sol";
import "./interfaces/IERC1155Metadata_URI.sol";

contract GHSTStakingDiamond {
    AppStorage s;    
    event TransferSingle(address indexed _operator, address indexed _from, address indexed _to, uint256 _id, uint256 _value);

    constructor(IDiamondCut.FacetCut[] memory _diamondCut, address _owner, address _ghstContract, address _uniV2PoolContract) {
        LibDiamond.diamondCut(_diamondCut, address(0), new bytes(0));
        LibDiamond.setContractOwner(_owner);

        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        
        s.ghstContract = _ghstContract;
        s.uniV2PoolContract = _uniV2PoolContract;
        s.ticketsBaseUri = 'https://aavegotchi.com/metadata/';

        // used to calculate frens points from staked GHST
        // s.ghstFrensMultiplier = 1;
        // s.uniV2PoolTokensFrensMultiplier = 100;
        
        // adding ERC165 data
        // ERC165
        ds.supportedInterfaces[IERC165.supportsInterface.selector] = true;

        // DiamondCut
        // ds.supportedInterfaces[IDiamondCut.diamondCut.selector] = true;

       // DiamondLoupe
        ds.supportedInterfaces[
            IDiamondLoupe.facets.selector ^
            IDiamondLoupe.facetFunctionSelectors.selector ^
            IDiamondLoupe.facetAddresses.selector ^
            IDiamondLoupe.facetAddress.selector
        ] = true;
        
        // ERC173
        ds.supportedInterfaces[
            IERC173.transferOwnership.selector ^ 
            IERC173.owner.selector
        ] = true;
        
        // ERC1155
        // ERC165 identifier for the main token standard.
        ds.supportedInterfaces[0xd9b67a26] = true;

        // ERC1155
        // ERC1155Metadata_URI        
        ds.supportedInterfaces[IERC1155Metadata_URI.uri.selector] = true;

        // create wearable tickets:
        emit TransferSingle(msg.sender, address(0), address(0), 0, 0);
        emit TransferSingle(msg.sender, address(0), address(0), 1, 0);
        emit TransferSingle(msg.sender, address(0), address(0), 2, 0);
        emit TransferSingle(msg.sender, address(0), address(0), 3, 0);
        emit TransferSingle(msg.sender, address(0), address(0), 4, 0);
        emit TransferSingle(msg.sender, address(0), address(0), 5, 0);

    }

    // Find facet for function that is called and execute the
    // function if a facet is found and return any value.
    fallback() external payable {
        LibDiamond.DiamondStorage storage ds;
        bytes32 position = LibDiamond.DIAMOND_STORAGE_POSITION;
        assembly {
            ds.slot := position
        }
        address facet = address(bytes20(ds.facets[msg.sig]));
        require(facet != address(0), "GHSTSTaking: Function does not exist");
        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), facet, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
                case 0 {
                    revert(0, returndatasize())
                }
                default {
                    return(0, returndatasize())
                }
        }
    }

    receive() external payable {
        revert("GHSTStaking: Does not accept either");
    }
}
