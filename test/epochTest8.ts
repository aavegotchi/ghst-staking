import { impersonate, maticStakingAddress } from "../scripts/helperFunctions";
import { StakingFacet } from "../typechain";
import { expect } from "chai";
import { network } from "hardhat";
import { ethers } from "hardhat";
import { PoolObject } from "../types";
import { BigNumber } from "@ethersproject/bignumber";

const { upgrade } = require("../scripts/upgrades/upgrade-epoch.ts");

const testAddress = "0x027Ffd3c119567e85998f4E6B9c3d83D5702660c";
const rateManager = "0xa370f2ADd2A9Fba8759147995d6A0641F8d7C119";

let stakingFacet: StakingFacet;

describe("Testing 10 epochs after migrating", async function () {
  const diamondAddress = maticStakingAddress;

  before(async function () {
    this.timeout(2000000000);
    await upgrade();

    stakingFacet = (await ethers.getContractAt(
      "StakingFacet",
      diamondAddress
    )) as StakingFacet;

    stakingFacet = await impersonate(
      rateManager,
      stakingFacet,
      ethers,
      network
    );
  });
  it("Earned FRENS equals the correct rate over many epochs", async function () {
    const currentEpoch = await stakingFacet.currentEpoch();
    const initialFrens = await stakingFacet.frens(testAddress);

    stakingFacet = await impersonate(
      testAddress,
      stakingFacet,
      ethers,
      network
    );

    let stakedPools = await stakingFacet.stakedInCurrentEpoch(testAddress);

    for (let index = 0; index < stakedPools.length; index++) {
      const pool = stakedPools[index];
      await stakingFacet.withdrawFromPool(pool.poolAddress, pool.amount);
    }

    const pools = await stakingFacet.poolRatesInEpoch(currentEpoch);
    await stakingFacet.stakeIntoPool(
      pools[0].poolAddress,
      ethers.utils.parseEther("100")
    );

    let totalEarnedFrens = 0;

    stakingFacet = await impersonate(
      rateManager,
      stakingFacet,
      ethers,
      network
    );

    const staked = await stakingFacet.staked(testAddress);
    const stakedGhst = ethers.utils.formatEther(staked[0]);
    console.log("staked ghst:", stakedGhst);
    for (let index = 0; index < 10; index++) {
      const rand1 = Math.floor(Math.random() * 10000).toString();

      const pools: PoolObject[] = [
        {
          _poolAddress: "0x385Eeac5cB85A38A9a07A70c73e0a3271CfB54A7",
          _poolReceiptToken: ethers.constants.AddressZero,
          _rate: rand1,
          _poolName: "GHST",
          _poolUrl: "",
        },
      ];

      const currentEpoch = await stakingFacet.currentEpoch();
      await stakingFacet.updateRates(currentEpoch, pools);
      const frensBefore = await stakingFacet.frens(testAddress);
      console.log("going ahead in time, current index is:", index);
      ethers.provider.send("evm_increaseTime", [86400]);
      ethers.provider.send("evm_mine", []);
      const earned = Number(stakedGhst) * Number(rand1);
      console.log(`Earned ${earned} FRENS with rate ${rand1}`);
      const currentFrens = await stakingFacet.frens(testAddress);
      totalEarnedFrens = totalEarnedFrens + earned;
      console.log("currentFrens", ethers.utils.formatUnits(currentFrens));
      console.log("frensBefore", ethers.utils.formatUnits(frensBefore));
      console.log("earned", earned);
      const difference =
        Number(ethers.utils.formatUnits(currentFrens)) -
        (Number(ethers.utils.formatUnits(frensBefore)) + earned);
      console.log("difference", difference);
      expect(difference).to.lessThanOrEqual(20);
    }
    console.log("--------------------------------");
    const finalFrens = await stakingFacet.frens(testAddress);
    console.log("final frens", ethers.utils.formatUnits(finalFrens));
    console.log("total earned frens:", totalEarnedFrens);
    console.log("initial frens", ethers.utils.formatUnits(initialFrens));
    const difference =
      Number(ethers.utils.formatUnits(finalFrens)) -
      (Number(ethers.utils.formatUnits(initialFrens)) + totalEarnedFrens);
    console.log("difference", difference);
  });
});
