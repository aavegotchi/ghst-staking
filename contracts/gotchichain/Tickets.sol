pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Tickets is ERC1155, Ownable {
    address public layerZeroBridge;

    constructor() ERC1155("https://app.aavegotchi.com/metadata/polygon/tickets/") {}

    modifier onlyOwnerOrLayerZero() {
        require(msg.sender == owner() || msg.sender == layerZeroBridge, "Only owner or layer zero bridge can call this function");
        _;
    }

    function setURI(string memory newuri) public onlyOwner {
        _setURI(newuri);
    }

    function setLayerZeroBridge(address _layerZeroBridge) public onlyOwner {
        layerZeroBridge = _layerZeroBridge;
    }

    function mint(address account, uint256 id, uint256 amount, bytes memory data) public onlyOwnerOrLayerZero {
        _mint(account, id, amount, data);
    }
}
