import { PopulatedTransaction } from "@ethersproject/contracts";
import { ethers, network } from "hardhat";
import { StakingFacet } from "../../typechain";

import {
  gasPrice,
  impersonate,
  maticStakingAddress,
  stakingDiamondUpgrader,
} from "../helperFunctions";
import { sendToMultisig } from "../libraries/multisig/multisig";

async function checkFrens() {
  const address = "0x46Db73fC5fD98c9dAF2d79f8653398d2D4dcA958";

  let stakingFacet = (await ethers.getContractAt(
    "StakingFacet",
    maticStakingAddress
  )) as StakingFacet;

  const frensBefore = await stakingFacet.frens(address, { blockTag: 23302659 });
  console.log("frens before:", ethers.utils.formatEther(frensBefore));

  const frensAfter = await stakingFacet.frens(address, { blockTag: 23302660 });
  console.log("frens after:", ethers.utils.formatEther(frensAfter));

  const currentBalance = await stakingFacet.frens(address);
  console.log("current balance:", ethers.utils.formatEther(currentBalance));
}

if (require.main === module) {
  checkFrens()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
