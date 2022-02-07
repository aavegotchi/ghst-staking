import { run, ethers } from "hardhat";
import {
  convertFacetAndSelectorsToString,
  DeployUpgradeTaskArgs,
  FacetsAndAddSelectors,
} from "../../tasks/deployUpgrade";
import {
  maticStakingAddress,
  stakingDiamondUpgrader,
} from "../helperFunctions";

async function upgrade() {
  const facets: FacetsAndAddSelectors[] = [
    {
      facetName: "StakingFacet",
      addSelectors: [
        ` function stakeIntoPoolForUser( address _poolContractAddress, uint256 _amount,address _sender ) public`,
        ` function withdrawFromPoolForUser(address _poolContractAddress,uint256 _amount, address _sender ) public`,
        ` function stakeIntoPool(address _poolContractAddress, uint256 _amount) public `,
        ` function withdrawFromPool(address _poolContractAddress, uint256 _amount) public`,
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
    initAddress: maticStakingAddress,
    initCalldata: "0x",
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
