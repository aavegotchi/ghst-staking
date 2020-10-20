# ghst-staking
Uses [EIP-2535 Diamond Standard](https://eips.ethereum.org/EIPS/eip-2535).

Uses the [diamond-2](https://github.com/mudgen/diamond-2) implementation of EIP-2535 Diamond Standard.

The functionality for GHSTStakingDiamond that can be used in the UI is here: https://github.com/aavegotchi/ghst-staking/blob/master/contracts/interfaces/IGHSTStakingDiamond.sol

The ABI for it is here: https://github.com/aavegotchi/ghst-staking/blob/master/artifacts/IGHSTStakingDiamond.json

### Overview

This repository implements `contracts/GHSTSTakingDiamond.sol`. This is a diamond that utilizes the facets found in `contracts/facets/`.

`TicketsFacet.sol` implements simple ERC1155 token functionality. The ERC1155 tokens are called 'tickets'. There are six different kinds of 'tickets'.

 `StakingFacet.sol` implements functions that enable people to stake their GHST ERC20 tokens, or to stake Uniswap pool tokens from the GHST/ETH pair contract. Staking these earns people frens or frens points which are a non-transferable points system. The frens points are calculated with the `frens` function. The `claimTickets` function enables people to claim or mint up to six different kinds of tokens.  Each different ticket kind has a different frens price which is specified in the `ticketCost` function.

 `GHSTSTakingDiamond` will be deployed as an immutable diamond, also known as a 'Single Cut Diamond'.  This means that all of the facets of the diamond will be added to it in the constructor function of the diamond. The `diamondCut` function will not be added to the diamond and so upgrades will not be possible.

 Diamonds are used to organize smart contract functionality in a modular and flexible way, and they are used for upgradeable systems and they overcome the max-contract size limitation. 

 The functionality for this repository is relatively simple being 6 ERC1155 token types and staking functions and the ability to claim tickets with frens. We chose to implement this functionality as a diamond to streamline our contract development and familiarize everyone involved with diamonds, which is the primary contract architecture for the core Aavegotchi contracts in development.

`GHSTSTakingDiamond` is deployed using the `scripts/deploy.js` script. The `DiamondCutFacet` contract is not added to the diamond to prevent adding the `diamondCut` external function.

This diamond is using a new kind of contract storage pattern dubbed 'AppStorage'. A single struct state variable of type `AppStorage` is declared and used in `GHSTStakingDiamond` and in the `StakingFacet` and `TicketsFacet` facets. This struct state variable is the primary mechanism to share state variables for the main application functionality.  Diamond storage is used for diamond specific functionality and for contract ownership/admin functionality.  

This diamond uses a direct copy of the current diamond implementation from the [diamond-2](https://github.com/mudgen/diamond-2) repository.


### On Kovan Testnet

- GHSTStakingDiamond is here: 0xA4fF399Aa1BB21aBdd3FC689f46CCE0729d58DEd
- Old GHSTStaking diamond is here: 0x5E083148DF00401cdA6D129E7688FA6c7D3B51fD

GHSTStakingDiamond is deployed from the scripts/deploy.js script.

### Ethereum Mainnet 

- GHSTStakingDiamond deployed: 0x93eA6ec350Ace7473f7694D43dEC2726a515E31A
- DiamondLoupeFacet deployed: 0x47195A03fC3Fc2881D084e8Dc03bD19BE8474E46
- OwnershipFacet deployed: 0x14aB595377e4fccCa46062A9109FFAC7FA4d3F18
- StakingFacet deployed: 0x4A271b59763D4D8A18fF55f1FAA286dE97317B15
- TicketsFacet deployed: 0xDf36944e720cf5Af30a3C5D80d36db5FB71dDE40

### Bug Bounty

Between October 2 and 8, anyone who finds a compromising fault that could lead to funds being lost or contracts being frozen in our Staking smart contracts will earn themselves a cool 10,000 DAI. We’re very confident in our work, but believe incentivizing the wider Ethereum community to examine our contracts is the right thing to do.

If you have questions or find something then please create a github issue with the details.

You can also contact Nick Mudge here: https://twitter.com/mudgen