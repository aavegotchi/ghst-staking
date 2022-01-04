import { run, ethers, network } from "hardhat";
import {
  convertFacetAndSelectorsToString,
  DeployUpgradeTaskArgs,
  FacetsAndAddSelectors,
} from "../../tasks/deployUpgrade";
import { StakingFacet__factory } from "../../typechain";
import { StakingFacetInterface } from "../../typechain/StakingFacet";
import { PoolObject } from "../../types";
import { stakers, amounts } from "../../stakers";
import {
  impersonate,
  maticStakingAddress,
  stakingDiamondUpgrader,
} from "../helperFunctions";

async function upgrade() {
  const facets: FacetsAndAddSelectors[] = [
    {
      facetName: "StakingFacet",
      addSelectors: [
        "function adjustFrensDown(address[] calldata _stakers, uint256[] calldata _amounts) external",
      ],
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

  // let stakingFacet = await ethers.getContractAt(
  //   "StakingFacet",
  //   maticStakingAddress
  // );

  // //First check those who have not updated stake during the period
  // let frensBefore = await stakingFacet.frens(
  //   "0x51208e5cC9215c6360210C48F81C8270637a5218",
  //   { blockTag: 23302659 }
  // );
  // console.log("frens before:", ethers.utils.formatEther(frensBefore));

  // let frensAfter = await stakingFacet.frens(
  //   "0x51208e5cC9215c6360210C48F81C8270637a5218",
  //   { blockTag: 23302660 }
  // );
  // console.log("frens after:", ethers.utils.formatEther(frensAfter));

  // const frensAfter = await stakingFacet.frens(
  //   "0x585E06CA576D0565a035301819FD2cfD7104c1E8"
  // );
  // console.log("frens after upgrade:", ethers.utils.formatEther(frensAfter));

  // //Then check those who have updated stake during the period

  // frensBefore = await stakingFacet.frens(
  //   "0x7B1672Ad97506551645dacaFE0F7E6F008bcE2EF",
  //   { blockTag: 23302659 }
  // );
  // console.log("frens before:", ethers.utils.formatEther(frensBefore));

  // frensAfter = await stakingFacet.frens(
  //   "0x7B1672Ad97506551645dacaFE0F7E6F008bcE2EF"
  // );
  // console.log("frens after:", ethers.utils.formatEther(frensAfter));

  // const ownership = await ethers.getContractAt(
  //   "OwnershipFacet",
  //   maticStakingAddress
  // );
  // const owner = await ownership.owner();

  // console.log("owner:", owner);

  // stakingFacet = await impersonate(owner, stakingFacet, ethers, network);

  // await stakingFacet.adjustFrensDown(
  //   ["0x7B1672Ad97506551645dacaFE0F7E6F008bcE2EF"],
  //   [frensAfter.sub(frensBefore).toString()]
  // );

  // const frensFinal = await stakingFacet.frens(
  //   "0x7B1672Ad97506551645dacaFE0F7E6F008bcE2EF"
  // );
  // console.log("frens final:", ethers.utils.formatEther(frensFinal));

  // //Migrate balanaces back
  // const finalStakers: string[] = [];
  // const finalAmounts: string[] = [];

  // amounts.forEach((amount, index) => {
  //   if (Number(amount) > 0) {
  //     finalStakers.push(stakers[index]);
  //     finalAmounts.push(ethers.utils.parseEther(amount).toString());
  //   }
  // });

  // console.log("stakers:", finalStakers);
  // console.log("amounts:", finalAmounts);

  // if (finalStakers.length !== finalAmounts.length) {
  //   throw new Error("Mismatched stakers");
  // }
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
