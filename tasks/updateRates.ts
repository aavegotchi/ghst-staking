import { task } from "hardhat/config";

import {
  gasPrice,
  getDiamondSigner,
  maticStakingAddress,
} from "../scripts/helperFunctions";

import { HardhatRuntimeEnvironment } from "hardhat/types";
import { StakingFacet } from "../typechain";
import { PoolObject } from "../types";
import { ReceiptToken } from "../typechain/ReceiptToken";

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

export function convertStringToPoolsAndRates(input: string): PoolObject[] {
  const finalArray: PoolObject[] = [];
  const stringArray = input.split("#");
  stringArray.forEach((objectString) => {
    if (objectString.length > 0) {
      let objectArray = objectString.split("_");

      finalArray.push({
        _poolAddress: objectArray[0],
        _poolReceiptToken: objectArray[1],
        _rate: objectArray[2],
        _poolName: objectArray[3],
        _poolUrl: objectArray[4],
      });
    }
  });

  return finalArray;
}

async function validatePoolToken(
  address: string,
  hre: HardhatRuntimeEnvironment
) {
  if (!hre.ethers.utils.isAddress(address)) {
    throw new Error(`${address} is not a valid address`);
  }
  return hre.ethers.utils.isAddress(address);
}

async function validateReceiptToken(
  address: string,
  hre: HardhatRuntimeEnvironment
) {
  //These tokens do not have the "minter()" function, but are valid
  let legacyReceiptTokens = [
    "0x0000000000000000000000000000000000000000", //ghst
    "0xA02d547512Bb90002807499F05495Fe9C4C3943f", //stkghst-quick
    "0x04439eC4ba8b09acfae0E9b5D75A82cC63b19f09", //stkghst-usdc
    "0x388E2a3d389F27504212030c2D42Abf0a8188cd1", //stkghst-weth
  ];

  //Ensure this token is whitelisted
  if (!legacyReceiptTokens.includes(address)) {
    const receiptToken = (await hre.ethers.getContractAt(
      "ReceiptToken",
      address
    )) as ReceiptToken;

    console.log("rt address:", address);

    const minter = await receiptToken.minter();
    if (minter !== maticStakingAddress) {
      throw new Error(
        `Minter of ${address} is not Staking address. This token cannot be added as a Receipt Token for its pair.`
      );
    }
  }
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

      const pools = convertStringToPoolsAndRates(taskArgs.poolsAndRates);

      for (let index = 0; index < pools.length; index++) {
        const pool = pools[index];

        await validateReceiptToken(pool._poolReceiptToken, hre);
        validatePoolToken(pool._poolAddress, hre);
      }

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
