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
  let stakingFacet = (await ethers.getContractAt(
    "StakingFacet",
    maticStakingAddress
  )) as StakingFacet;

  const frensBefore = await stakingFacet.frens(
    "0xee5cDa91E4DdCde24D44daFd74BEd4Ba068f8ac2",
    { blockTag: 23302659 }
  );
  console.log("frens before:", ethers.utils.formatEther(frensBefore));

  const frensAfter = await stakingFacet.frens(
    "0xee5cDa91E4DdCde24D44daFd74BEd4Ba068f8ac2",
    { blockTag: 23302660 }
  );
  console.log("frens after:", ethers.utils.formatEther(frensAfter));
}

if (require.main === module) {
  checkFrens()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
