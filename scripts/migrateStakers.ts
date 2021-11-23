/* global ethers */
/* eslint prefer-const: "off" */

import { gasPrice, impersonate, maticStakingAddress } from "./helperFunctions";

import { network, ethers } from "hardhat";
import { StakingFacet } from "../typechain";

import { stakers } from "../data/stakers";

const trackedTokenAddress = "0x8b1fd78ad67c7da09b682c5392b65ca7caa101b9";
let stakingFacet: StakingFacet;

async function main() {
  // await upgrade();

  const currentBlockNumber = await ethers.provider.getBlockNumber();
  console.log("Current blocknumber:", currentBlockNumber);
  const trackedToken = await ethers.getContractAt(
    "IERC20",
    trackedTokenAddress
  );
  console.log("Getting pool transfers in");
  const trackedTokenFilter = trackedToken.filters.Transfer(
    null,
    maticStakingAddress
  );

  console.log("ghst stakers:", stakers);

  stakingFacet = (await ethers.getContractAt(
    "StakingFacet",
    maticStakingAddress
  )) as StakingFacet;

  const batchSize = 100;

  const stakerArray = stakers.data;
  let startIndex = 5800;
  while (startIndex < stakers.data.length) {
    let endIndex = startIndex + batchSize;

    let subArray = stakerArray.slice(startIndex, endIndex);

    let finalArray = [];

    console.log(`Checking migrations for batch ${startIndex} - ${endIndex}`);

    for (let index = 0; index < subArray.length; index++) {
      const staker = subArray[index];

      console.log("Checking", index);

      const hasMigrated = await stakingFacet.hasMigrated(staker.address);

      if (!hasMigrated) {
        finalArray.push(staker.address);
      } else console.log(`Staker ${staker.address} has migrated`);
    }

    console.log("Sending migration txn");

    if (finalArray.length > 0) {
      const tx = await stakingFacet.migrateToV2(finalArray, {
        gasPrice: gasPrice,
      });
      console.log("tx hash:", tx.hash);
      let receipt = await tx.wait();
      if (!receipt.status) {
        throw Error(
          `Migrating from ${startIndex} to ${endIndex} failed: ${tx.hash}`
        );
      }
    }

    console.log(`Migrated from ${startIndex} to ${endIndex}`);
    startIndex = endIndex;
  }

  console.log("Migrated completed");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
