import { run, ethers } from "hardhat";
import {
  convertFacetAndSelectorsToString,
  DeployUpgradeTaskArgs,
  FacetsAndAddSelectors,
} from "../../tasks/deployUpgrade";
import { StakingFacet__factory } from "../../typechain";
import { StakingFacetInterface } from "../../typechain/StakingFacet";
import { PoolObject } from "../../types";
import {
  maticStakingAddress,
  stakingDiamondUpgrader,
} from "../helperFunctions";

async function upgrade() {
  const facets: FacetsAndAddSelectors[] = [
    {
      facetName: "StakingFacet",
      addSelectors: [],
      removeSelectors: [],
    },
  ];

  const joined = convertFacetAndSelectorsToString(facets);

  let iface: StakingFacetInterface = new ethers.utils.Interface(
    StakingFacet__factory.abi
  ) as StakingFacetInterface;

  const calldata = iface.encodeFunctionData("togglePauseTickets");

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

  const stakingFacet = await ethers.getContractAt(
    "StakingFacet",
    maticStakingAddress
  );

  const frensBefore = await stakingFacet.frens(
    "0xC3c2e1Cf099Bc6e1fA94ce358562BCbD5cc59FE5",
    { blockTag: 23302659 }
  );
  console.log("frens before:", ethers.utils.formatEther(frensBefore));

  const frensAfter = await stakingFacet.frens(
    "0xC3c2e1Cf099Bc6e1fA94ce358562BCbD5cc59FE5"
  );
  console.log("frens after:", ethers.utils.formatEther(frensAfter));
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
