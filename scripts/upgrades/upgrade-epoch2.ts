import { run, ethers } from "hardhat";
import {
  convertFacetAndSelectorsToString,
  DeployUpgradeTaskArgs,
  FacetsAndAddSelectors,
} from "../../tasks/deployUpgrade";
import { StakingFacet } from "../../typechain";
import {
  maticStakingAddress,
  stakingDiamondUpgrader,
} from "../helperFunctions";

async function upgrade() {
  const facets: FacetsAndAddSelectors[] = [
    {
      facetName: "StakingFacet",
      addSelectors: [
        `function deprecatedFrens(address _account) public view returns (uint256 frens_)`,
        // `function frens(address _account) public view returns (uint256 frens_)`,
      ],
      removeSelectors: [],
    },
  ];

  const joined = convertFacetAndSelectorsToString(facets);

  const args: DeployUpgradeTaskArgs = {
    diamondUpgrader: stakingDiamondUpgrader,
    diamondAddress: maticStakingAddress,
    facetsAndAddSelectors: joined,
    useLedger: false,
    useMultisig: false,
  };

  await run("deployUpgrade", args);

  const stakingFacet = (await ethers.getContractAt(
    "StakingFacet",
    maticStakingAddress
  )) as StakingFacet;
  const addy = "0x585E06CA576D0565a035301819FD2cfD7104c1E8";
  const frens = await stakingFacet.frens(addy);
  console.log("frens:", frens.toString());

  const dep = await stakingFacet.deprecatedFrens(addy);
  console.log("deprecated frens:", dep.toString());
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
