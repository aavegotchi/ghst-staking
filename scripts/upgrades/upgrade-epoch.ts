import { run, ethers } from "hardhat";
import {
  convertFacetAndSelectorsToString,
  DeployUpgradeTaskArgs,
  FacetsAndAddSelectors,
} from "../../tasks/deployUpgrade";
import { getSelector, maticDiamondAddress } from "../helperFunctions";

async function upgrade() {
  const diamondUpgrader = "0x35fe3df776474a7b24b3b1ec6e745a830fdad351";

  const facets: FacetsAndAddSelectors[] = [
    {
      facetName: "StakingFacet",
      addSelectors: [
        "function initiateEpoch(PoolInfo[] calldata _pools) external",

        "function updateRates(PoolInfo[] calldata _pools) external onlyRateManager",

        "function epochFrens(address _account) public view returns (uint256 frens_)",
        "function stakeIntoPool(address _poolContractAddress, uint256 _amount) public",
        "function withdrawFromPool(address _poolContractAddress, uint256 _amount) public",
      ],
    },
  ];
  const joined = convertFacetAndSelectorsToString(facets);

  /*
  -updatePoolTokensRate
-poolTokensRate
-migrateFrens
-switchFrens
-updateGhstUsdcRate
-setGhstWethToken
-updateGhstWethRate
-setGhstUsdcToken
*/

  const removeSelectors: string[] = [];

  const args: DeployUpgradeTaskArgs = {
    diamondUpgrader: diamondUpgrader,
    diamondAddress: maticDiamondAddress,
    facetsAndAddSelectors: joined,
    removeSelectors: JSON.stringify(removeSelectors),
    useLedger: true,
    useMultisig: true,
  };

  await run("deployUpgrade", args);
}

upgrade()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

exports.upgrade = upgrade;
