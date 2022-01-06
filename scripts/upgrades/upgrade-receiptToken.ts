import { run, ethers } from "hardhat";
import { DeployReceiptTokenTaskArgs } from "../../tasks/deployReceiptToken";
import {
  convertFacetAndSelectorsToString,
  DeployUpgradeTaskArgs,
  FacetsAndAddSelectors,
} from "../../tasks/deployUpgrade";
import { StakingFacet__factory } from "../../typechain";
import { StakingFacetInterface } from "../../typechain/StakingFacet";

import {
  maticStakingAddress,
  stakingDiamondUpgrader,
} from "../helperFunctions";

async function upgrade() {
  const tokenArgs: DeployReceiptTokenTaskArgs = {
    name: "Staked GHST-MATIC",
    symbol: "stkGHST-MATIC",
  };
  const tokenAddress = await run("deployReceiptToken", tokenArgs);

  const facets: FacetsAndAddSelectors[] = [
    {
      facetName: "StakingFacet",
      addSelectors: [
        "function updateReceiptToken(address _poolAddress, address _tokenAddress) external",
      ],
      removeSelectors: [],
    },
  ];

  const ghstMaticAddress = "0xf69e93771F11AECd8E554aA165C3Fe7fd811530c";

  const joined = convertFacetAndSelectorsToString(facets);

  let iface: StakingFacetInterface = new ethers.utils.Interface(
    StakingFacet__factory.abi
  ) as StakingFacetInterface;

  const calldata = iface.encodeFunctionData("updateReceiptToken", [
    ghstMaticAddress,
    tokenAddress,
  ]);

  const args: DeployUpgradeTaskArgs = {
    diamondUpgrader: stakingDiamondUpgrader,
    diamondAddress: maticStakingAddress,
    facetsAndAddSelectors: joined,
    useLedger: true,
    useMultisig: true,
    initAddress: maticStakingAddress,
    initCalldata: calldata,
  };

  await run("deployUpgrade", args);
}

if (require.main === module) {
  upgrade()
    .then(() => process.exit(0))
    // .then(() => console.log('upgrade completed') /* process.exit(0) */)
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

exports.upgrade = upgrade;
