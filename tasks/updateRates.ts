import { task } from "hardhat/config";

import {
  gasPrice,
  getDiamondSigner,
  maticStakingAddress,
} from "../scripts/helperFunctions";

import { HardhatRuntimeEnvironment } from "hardhat/types";
import { StakingFacet } from "../typechain";
import { PoolObject } from "../types";

export interface UpdateRateTaskArgs {
  rateManagerAddress: string;
  epoch: string;
  poolsAndRates: string;
}

export function convertPoolsAndRatesToString(
  poolsAndRates: PoolObject[]
): string {
  let finalString = "";

  poolsAndRates.forEach((obj) => {
    finalString = finalString.concat(
      `#${obj._poolAddress}_${obj._poolReceiptToken}_${obj._rate}_${obj._poolName}_${obj._poolUrl}`
    );
  });
  return finalString;
}

export function convertStringToPoolsAndRates(
  input: string,
  hre: HardhatRuntimeEnvironment
): PoolObject[] {
  const finalArray: PoolObject[] = [];
  const stringArray = input.split("#");
  stringArray.forEach((objectString) => {
    if (objectString.length > 0) {
      let objectArray = objectString.split("_");

      if (validateAddress(objectArray[0], hre)) {
        finalArray.push({
          _poolAddress: objectArray[0],
          _poolReceiptToken: objectArray[1],
          _rate: objectArray[2],
          _poolName: objectArray[3],
          _poolUrl: objectArray[4],
        });
      } else {
        throw new Error("Address is not valid");
      }
    }
  });

  return finalArray;
}

function validateAddress(address: string, hre: HardhatRuntimeEnvironment) {
  return hre.ethers.utils.isAddress(address);
}

task("updateRates", "Updates the pool rates with specified pools and rates")
  .addParam("rateManagerAddress", "Address of the multisig signer")
  .addParam("epoch", "The current epoch")
  .addParam("poolsAndRates", "Stringified array of pools and rates to add")
  .setAction(
    async (taskArgs: UpdateRateTaskArgs, hre: HardhatRuntimeEnvironment) => {
      const signer = await getDiamondSigner(
        hre.ethers,
        hre.network,
        taskArgs.rateManagerAddress,
        false
      );

      const pools = convertStringToPoolsAndRates(taskArgs.poolsAndRates, hre);

      console.log("pools:", pools);

      const stakingFacet = (await hre.ethers.getContractAt(
        "StakingFacet",
        maticStakingAddress,
        signer
      )) as StakingFacet;

      const tx = await stakingFacet.updateRates(taskArgs.epoch, pools, {
        gasPrice: gasPrice,
      });
      console.log("Initiating epoch:", tx.hash);
      let receipt = await tx.wait();
      if (!receipt.status) {
        throw Error(`Updating accounts failed: ${tx.hash}`);
      }
      console.log("Epoch created");
    }
  );
