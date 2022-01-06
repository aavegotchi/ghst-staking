import { run, ethers, network } from "hardhat";
import {
  convertFacetAndSelectorsToString,
  DeployUpgradeTaskArgs,
  FacetsAndAddSelectors,
} from "../../tasks/deployUpgrade";
import { StakingFacet__factory } from "../../typechain";
import { StakingFacetInterface } from "../../typechain/StakingFacet";
import { PoolObject } from "../../types";
import { stakers, amounts } from "../../rollback";
import {
  impersonate,
  maticDiamondAddress,
  maticStakingAddress,
  stakingDiamondUpgrader,
} from "../helperFunctions";

async function upgrade() {
  let stakingFacet = await ethers.getContractAt(
    "StakingFacet",
    maticStakingAddress
  );

  //Migrate balanaces back
  const finalStakers: string[] = [];
  const finalAmounts: string[] = [];

  for (let index = 0; index < amounts.length; index++) {
    const amount = amounts[index];
    const staker = stakers[index];

    if (Number(amount) > 0) {
      const isaddress = await ethers.utils.getAddress(stakers[index]);

      if (isaddress) {
        finalStakers.push(stakers[index]);
        finalAmounts.push(ethers.utils.parseEther(amount).toString());
      }
    }
  }

  console.log("stakers:", finalStakers);
  console.log("amounts:", finalAmounts);
  if (finalStakers.length !== finalAmounts.length) {
    throw new Error("Mismatched stakers");
  }

  console.log("length:", finalStakers.length);

  const signer = await ethers.getSigners();
  const currentBlock = await signer[0].provider?.getBlockNumber();

  console.log("current block:", currentBlock);

  const ownershipFacet = await ethers.getContractAt(
    "OwnershipFacet",
    maticStakingAddress
  );
  const owner = await ownershipFacet.owner();

  stakingFacet = await impersonate(owner, stakingFacet, ethers, network);

  const tx = await stakingFacet.adjustFrensDown(finalStakers, finalAmounts);
  await tx.wait();
  console.log("tx:", tx.gasLimit.toString());

  for (let index = 0; index < stakers.length; index++) {
    const address = stakers[index];
    console.log("**Address**", address);
    const frensBefore = await stakingFacet.frens(address, {
      blockTag: 23302659, //before bug block
    });
    console.log("frens before:", ethers.utils.formatEther(frensBefore));

    const frensAfter = await stakingFacet.frens(address, {
      blockTag: 23302660, //after bug block
    });
    console.log("frens after:", ethers.utils.formatEther(frensAfter));

    const frensBeforeUpdate = await stakingFacet.frens(address, {
      blockTag: currentBlock,
    });
    console.log(
      "frens before update:",
      ethers.utils.formatEther(frensBeforeUpdate)
    );

    const currentBalance = await stakingFacet.frens(address);
    console.log("current balance:", ethers.utils.formatEther(currentBalance));
  }
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
