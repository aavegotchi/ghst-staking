import { run } from "hardhat";
import { StakingFacet } from "../../typechain";
import {
  maticStakingAddress,
  stakingDiamondUpgrader,
} from "../helperFunctions";
import {
  convertFacetAndSelectorsToString,
  DeployUpgradeTaskArgs,
  FacetsAndAddSelectors,
} from "../../tasks/deployUpgrade";

export async function upgrade() {
  const facets: FacetsAndAddSelectors[] = [
    {
      facetName: "StakingFacet",
      addSelectors: [],
      removeSelectors: [],
    },
  ];

  const joined = convertFacetAndSelectorsToString(facets);

  const args: DeployUpgradeTaskArgs = {
    diamondUpgrader: stakingDiamondUpgrader,
    diamondAddress: maticStakingAddress,
    facetsAndAddSelectors: joined,
    useLedger: true,
    useMultisig: true,
  };

  await run("deployUpgrade", args);
}

if (require.main === module) {
  upgrade()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

exports.upgrade = upgrade;
