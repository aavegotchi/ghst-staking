/* global ethers */
/* eslint prefer-const: "off" */

import {
  gasPrice,
  getDiamondSigner,
  impersonate,
  maticStakingAddress,
} from "./helperFunctions";

import { network, ethers } from "hardhat";
import { StakingFacet } from "../typechain";

import { stakers } from "../data/stakers";
import { Signer } from "@ethersproject/abstract-signer";

let stakingFacet: StakingFacet;

async function main() {
  // await upgrade();

  const stakers = {
    data: [
      {
        address: "0x585E06CA576D0565a035301819FD2cfD7104c1E8",
      },
    ],
  };

  const signer: Signer = await getDiamondSigner(ethers, network);
  console.log("ghst stakers:", stakers);

  stakingFacet = (await ethers.getContractAt(
    "StakingFacet",
    maticStakingAddress,
    signer
  )) as StakingFacet;

  const batchSize = 5;

  console.log("signer:", await signer.getAddress());

  const stakerArray = stakers.data;
  let startIndex = 0;
  while (startIndex < stakers.data.length) {
    let endIndex = startIndex + batchSize;

    let subArray = stakerArray.slice(startIndex, endIndex);

    let finalArray = [];

    for (let index = 0; index < subArray.length; index++) {
      const staker = subArray[index];

      console.log("staker:", staker.address);

      const hasMigrated = await stakingFacet.hasMigrated(staker.address);

      if (!hasMigrated) {
        finalArray.push(staker.address);
      }
    }

    const tx = await stakingFacet.migrateToV2(finalArray, {
      gasPrice: gasPrice,
    });
    console.log("hash:", tx.hash);
    let receipt = await tx.wait();
    if (!receipt.status) {
      throw Error(
        `Migrating from ${startIndex} to ${endIndex} failed: ${tx.hash}`
      );
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
