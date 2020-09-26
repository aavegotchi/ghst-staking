// SPDX-License-Identifier: MIT
pragma solidity ^0.7.1;

interface IERC20 {
    function transferFrom(
        address _from,
        address _to,
        uint256 _value
    ) external returns (bool success);

    function transfer(address _to, uint256 _value) external returns (bool success);
}

// useful on unkown ERC20 token transfers
// (bool success, bytes memory result) = s.ghstContract.call(
//     abi.encodeWithSelector(IERC20.transferFrom.selector, msg.sender, address(this), _ghstValue)
// );
// if (success) {
//     if (result.length > 0) {
//         require(abi.decode(result, (bool)) == true, "Staking: GHST contract transfer failed");
//     }
// } else {
//     if (result.length > 0) {
//         revert(string(result));
//     } else {
//         revert("Staking: GHST contract reverted on transfer");
//     }
// }
