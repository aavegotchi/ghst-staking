import { PopulatedTransaction } from "ethers";
import { run, ethers, network } from "hardhat";

import {
  impersonate,
  maticStakingAddress,
  stakingDiamondUpgrader,
} from "../helperFunctions";
import { sendToMultisig } from "../libraries/multisig/multisig";

async function togglePause() {
  let stakingFacet = await ethers.getContractAt(
    "StakingFacet",
    maticStakingAddress
  );

  const ownershipFacet = await ethers.getContractAt(
    "OwnershipFacet",
    maticStakingAddress
  );
  const owner = await ownershipFacet.owner();

  if (network.name === "matic") {
    const tx: PopulatedTransaction =
      await stakingFacet.populateTransaction.togglePauseTickets();

    console.log("tx data:", tx.data);

    console.log(
      "Please submit data to multisig address: 0x258cC4C495Aef8D809944aD94C6722ef41216ef3"
    );
  } else {
    stakingFacet = await impersonate(owner, stakingFacet, ethers, network);

    await stakingFacet.togglePauseTickets();
  }
}

if (require.main === module) {
  togglePause()
    .then(() => process.exit(0))
    // .then(() => console.log('upgrade completed') /* process.exit(0) */)
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

exports.upgrade = togglePause;
