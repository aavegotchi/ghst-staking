import { PopulatedTransaction } from "ethers";
import { run, ethers, network } from "hardhat";

import {
  getDiamondSigner,
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

  const signer = await getDiamondSigner(ethers, network, undefined, true);

  if (network.name === "matic") {
    const tx: PopulatedTransaction =
      await stakingFacet.populateTransaction.togglePauseTickets();

    console.log("tx data:", tx.data);

    await sendToMultisig(stakingDiamondUpgrader, signer, tx, ethers);
  } else {
    stakingFacet = await impersonate(owner, stakingFacet, ethers, network);

    await stakingFacet.togglePauseTickets();

    stakingFacet = await impersonate(
      "0x51208e5cC9215c6360210C48F81C8270637a5218",
      stakingFacet,
      ethers,
      network
    );

    await stakingFacet.claimTickets([0], [1]);
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
