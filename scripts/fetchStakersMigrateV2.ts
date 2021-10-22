/* global ethers */
/* eslint prefer-const: "off" */

import { gasPrice, getDiamondSigner, impersonate, maticStakingAddress } from "./helperFunctions";

import { network, ethers } from "hardhat";
import { StakingFacet } from "../typechain";
const { upgrade } = require("./upgrades/upgrade-epoch.ts");

const diamondCreationBlock = 9833113
const trackedTokenAddress = '0x8b1fd78ad67c7da09b682c5392b65ca7caa101b9'
const rateManager = "0xa370f2ADd2A9Fba8759147995d6A0641F8d7C119";
let stakingFacet: StakingFacet;

async function main() {
  await upgrade();

  const currentBlockNumber = await ethers.provider.getBlockNumber()
  console.log('Current blocknumber:', currentBlockNumber)
  const trackedToken = await ethers.getContractAt('IERC20', trackedTokenAddress)
  console.log('Getting pool transfers in')
  const trackedTokenFilter = trackedToken.filters.Transfer(null, maticStakingAddress)
  const stakers = new Set()

  let blockNumber = diamondCreationBlock
  while (blockNumber < currentBlockNumber) {
    let nextBlockNumber = blockNumber + 10000
    const trackedTokenTransfersIn = await trackedToken.queryFilter(trackedTokenFilter, blockNumber, nextBlockNumber)
    console.log(`Got ${trackedTokenTransfersIn.length} transfers in from ${blockNumber} to ${nextBlockNumber}`)
    blockNumber = nextBlockNumber
    for (const transfer of trackedTokenTransfersIn) {
      stakers.add(transfer.args[0])
    }
  }
  console.log('GHST stakers:', stakers.size)

  stakingFacet = (await ethers.getContractAt(
    "StakingFacet",
    maticStakingAddress
  )) as StakingFacet;

  stakingFacet = (await impersonate(
    rateManager,
    stakingFacet,
    ethers,
    network
  )) as StakingFacet;

  const stakerArray = Array.from(stakers)
  let startIndex = 0
  while (startIndex < stakers.size) {
    let endIndex = startIndex + 50

    const subArr = (endIndex > stakers.size ? stakerArray.slice(startIndex) : stakerArray.slice(startIndex, endIndex)) as string[];
    const tx = await stakingFacet.migrateToV2(subArr);
    let receipt = await tx.wait();
    if (!receipt.status) {
      throw Error(`Migrating from ${startIndex} to ${endIndex} failed: ${tx.hash}`);
    }

    console.log(`Migrated from ${startIndex} to ${endIndex}`)
    startIndex = endIndex
  }

  console.log("Migrated completed")
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
