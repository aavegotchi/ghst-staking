// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

struct Account {
    // spender => amount
    mapping(address => uint256) ghstStakingTokensAllowances;
    mapping(address => bool) ticketsApproved;
    uint96 ghst;
    uint40 lastFrensUpdate;
    uint256 ghstStakingTokens;
    uint256 poolTokens;
    uint256 frens;
    uint256 ghstUsdcPoolTokens;
    uint256 ghstWethPoolTokens;
}

struct Ticket {
    // user address => balance
    mapping(address => uint256) accountBalances;
    uint96 totalSupply;
}

struct AppStorage {
    mapping(address => Account) accounts;
    mapping(uint256 => Ticket) tickets;
    address ghstContract;
    address poolContract;
    string ticketsBaseUri;
    uint256 ghstStakingTokensTotalSupply;
    uint256 poolTokensRate;
    uint256 ghstUsdcRate;
    address ghstUsdcPoolToken;
    address stkGhstUsdcToken;
    bytes32 domainSeparator;
    mapping(address => uint256) metaNonces;
    address aavegotchiDiamond;
    mapping(address => bool) rateManagers;
    //new
    address ghstWethPoolToken; //token address of GHST-WETH LP
    address stkGhstWethToken; //token address of the stkGHST-WETH receipt token
    uint256 ghstWethRate; //the FRENS rate for GHST-WETH stakers
}
