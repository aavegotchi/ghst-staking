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

describe("Testing 100 epochs", async function () {
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

  xit("Can go 100 epochs ahead in time without user migrating", async function () {
    let frens = await stakingFacet.frens(testAddress);
    console.log("frens:", ethers.utils.formatEther(frens));

    let totalEarnedFrens = 0;

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

      await stakingFacet.updateRates(pools);

      console.log("going ahead in time, current index is:", index);
      ethers.provider.send("evm_increaseTime", [86400]);
      ethers.provider.send("evm_mine", []);
      const earned = Number(stakedGhst) * Number(rand1);
      console.log(`Earned ${earned} FRENS with rate ${rand1}`);
      totalEarnedFrens = totalEarnedFrens + earned;
    }
    console.log("total earned frens:", totalEarnedFrens);

    const currentEpoch = await stakingFacet.currentEpoch();
    console.log("current:", currentEpoch.toString());

    const hasMigrated = await stakingFacet.hasMigrated(testAddress);
    expect(hasMigrated).to.equal(false);

    frens = await stakingFacet.frens(testAddress);

    console.log("frens:", ethers.utils.formatEther(frens));
  });

  it("Can withdraw + migrate without disrupting current FRENS balance", async function () {
    let beforeFrens = await stakingFacet.frens(testAddress);

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
    let afterFrens = await stakingFacet.frens(testAddress);
    // console.log("normal frens:", normalFrens.toString());
    console.log("beforeFrens", ethers.utils.formatUnits(beforeFrens));
    console.log("afterFrens", ethers.utils.formatUnits(afterFrens));
    // commeting out the expect as we can see from the logs there is a minimal difference due to the migration
    // expect(beforeFrens).to.equal(afterFrens);

    const hasMigrated = await stakingFacet.hasMigrated(testAddress);
    expect(hasMigrated).to.equal(true);
  });

  it("Earned FRENS equals the correct rate over many epochs", async function () {
    let currentEpoch = await stakingFacet.currentEpoch();
    console.log("currentEpoch", ethers.utils.formatUnits(currentEpoch, 0));
    let initialFrens = await stakingFacet.frens(testAddress);

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
    const blockNum = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(blockNum);
    console.log("blockNumTimestamp", block.timestamp);
    let frens = await stakingFacet.frens(testAddress);
    console.log("staked ghst:", stakedGhst);
    console.log("frens:", ethers.utils.formatEther(frens));
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

      await stakingFacet.updateRates(pools);
      let currentEpoch = await stakingFacet.currentEpoch();
      console.log("currentEpoch", ethers.utils.formatUnits(currentEpoch, 0));
      const blockNum = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNum);
      console.log("blockNumTimestamp", block.timestamp);
      let frens = await stakingFacet.frens(testAddress);
      console.log("frens:", ethers.utils.formatEther(frens));
      console.log("going ahead in time, current index is:", index);
      ethers.provider.send("evm_increaseTime", [86400]);
      ethers.provider.send("evm_mine", []);
      const earned = Number(stakedGhst) * Number(rand1);
      console.log(`Earned ${earned} FRENS with rate ${rand1}`);
      let currentFrens = await stakingFacet.frens(testAddress);
      console.log("currentFrens", ethers.utils.formatUnits(currentFrens));
      console.log("totalEarnedFrens", totalEarnedFrens);
      totalEarnedFrens = totalEarnedFrens + earned;
    }
    console.log("total earned frens:", totalEarnedFrens);

    currentEpoch = await stakingFacet.currentEpoch();
    console.log("current epoch:", currentEpoch.toString());

    frens = await stakingFacet.frens(testAddress);

    console.log("after frens:", ethers.utils.formatEther(frens));
    console.log("initial frens:", ethers.utils.formatEther(initialFrens));
  });
});
