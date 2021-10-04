/* global ethers */
/* eslint prefer-const: "off" */

import { gasPrice, getDiamondSigner } from "./helperFunctions";

import { network, ethers } from "hardhat";
import { StakingFacet } from "../typechain";
import { PoolObject } from "../types";
/*
const { LedgerSigner } = require('../../aavegotchi-contracts/node_modules/@ethersproject/hardware-wallets')
*/

const ghstStakingDiamondAddress = "0xA02d547512Bb90002807499F05495Fe9C4C3943f";

async function main() {
  const signer = await getDiamondSigner(
    ethers,
    network,
    "0x258cC4C495Aef8D809944aD94C6722ef41216ef3",
    false
  );

  const stakingFacet = (await ethers.getContractAt(
    "StakingFacet",
    ghstStakingDiamondAddress,
    signer
  )) as StakingFacet;

  let tx = await stakingFacet.addRateManagers([
    "0x258cC4C495Aef8D809944aD94C6722ef41216ef3",
  ]);
  await tx.wait();

  const pools: PoolObject[] = [
    {
      _poolAddress: "0x385Eeac5cB85A38A9a07A70c73e0a3271CfB54A7",
      _poolReceiptToken: ethers.constants.AddressZero,
      _rate: "4",
      _poolName: "GHST",
      _poolUrl: "",
    },
    {
      _poolAddress: "0x8b1fd78ad67c7da09b682c5392b65ca7caa101b9",
      _poolReceiptToken: "0xA02d547512Bb90002807499F05495Fe9C4C3943f",
      _rate: "83",
      _poolName: "GHST-QUICK",
      _poolUrl: "",
    },
    {
      _poolAddress: "0x096c5ccb33cfc5732bcd1f3195c13dbefc4c82f4",
      _poolReceiptToken: "0x04439eC4ba8b09acfae0E9b5D75A82cC63b19f09",
      _rate: "74000000",
      _poolName: "GHST-USDC",
      _poolUrl: "",
    },
    {
      _poolAddress: "0xccb9d2100037f1253e6c1682adf7dc9944498aff",
      _poolReceiptToken: "0x388E2a3d389F27504212030c2D42Abf0a8188cd1",
      _rate: "12000000",
      _poolName: "GHST-WETH",
      _poolUrl: "",
    },
  ];

  tx = await stakingFacet.updateRates(pools, {
    gasPrice: gasPrice,
  });
  console.log("Iniating epoch:", tx.hash);
  let receipt = await tx.wait();
  if (!receipt.status) {
    throw Error(`Updating accounts failed: ${tx.hash}`);
  }
  console.log("Epoch created");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
