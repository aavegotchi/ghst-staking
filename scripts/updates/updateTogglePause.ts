import { PopulatedTransaction } from "ethers";
import { run, ethers, network } from "hardhat";

import {
  impersonate,
  maticStakingAddress,
  stakingDiamondUpgrader,
} from "../helperFunctions";
import { sendToMultisig } from "../libraries/multisig/multisig";

async function upgrade() {
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
    const {
      LedgerSigner,
    } = require("../../aavegotchi-contracts/node_modules/@ethersproject/hardware-wallets");

    const signer = new LedgerSigner(ethers.provider);

    const tx: PopulatedTransaction =
      await stakingFacet.populateTransaction.togglePauseTickets();
    await sendToMultisig(stakingDiamondUpgrader, signer, tx, ethers);

    console.log("Sent to multisig");
  } else {
    stakingFacet = await impersonate(owner, stakingFacet, ethers, network);

    await stakingFacet.togglePauseTickets();
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
