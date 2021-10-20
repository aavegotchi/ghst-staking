import { impersonate, maticStakingAddress } from "../scripts/helperFunctions";
import { StakingFacet } from "../typechain";
import { expect } from "chai";
import { network } from "hardhat";
import { ethers } from "hardhat";
import { PoolObject } from "../types";

const { upgrade } = require("../scripts/upgrades/upgrade-epoch.ts");

const testAddress = "0x51208e5cC9215c6360210C48F81C8270637a5218";
const rateManager = "0xa370f2ADd2A9Fba8759147995d6A0641F8d7C119";
let stakingFacet: StakingFacet;

describe("Epoch Tests (GHST Only)", async function () {
  const diamondAddress = maticStakingAddress;

  before(async function () {
    this.timeout(20000000);
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

  it("Pools should be created on diamondCut", async function () {
    let rates = await stakingFacet.poolRatesInEpoch("0");
    expect(rates[0].rate).to.equal("1");
  });

  it("Can migrate user without radically changing FRENS", async function () {
    // Check add and view function works

    const frensBefore = await stakingFacet.frens(testAddress);
    const tx = await stakingFacet.migrateToV2([testAddress]);
    await tx.wait();
    const frensAfter = await stakingFacet.frens(testAddress);

    const difference = Number(
      ethers.utils.formatEther(frensAfter.sub(frensBefore))
    );
    expect(difference).to.lessThanOrEqual(10);
    const hasMigrated = await stakingFacet.hasMigrated(testAddress);
    expect(hasMigrated).to.equal(true);
  });
  it("Can update rate and create new epoch", async function () {
    const pools: PoolObject[] = [];
    pools.push({
      _poolAddress: "0x385Eeac5cB85A38A9a07A70c73e0a3271CfB54A7",
      _poolReceiptToken: ethers.constants.AddressZero,
      _rate: "2",
      _poolName: "GHST",
      _poolUrl: "",
    });
    const tx = await stakingFacet.updateRates(pools);
    await tx.wait();

    const currentEpoch = await stakingFacet.currentEpoch();
    expect(currentEpoch).to.equal("1");
  });

  it("Epoch rates should be correct", async function () {
    let rates = await stakingFacet.poolRatesInEpoch("0");
    expect(rates[0].rate).to.equal("1");
    rates = await stakingFacet.poolRatesInEpoch("1");
    expect(rates[0].rate).to.equal("2");
  });

  it("Should accrue 2x the FRENS over 24 hrs", async function () {
    const currentEpoch = await stakingFacet.currentEpoch();
    expect(currentEpoch).to.equal("1");

    //Get the current for this epoch
    const rates = await stakingFacet.poolRatesInEpoch(currentEpoch);
    const frensRate = rates[0].rate;
    expect(rates[0].rate).to.equal("2");

    const staked = await stakingFacet.stakedInEpoch(testAddress, currentEpoch);
    const before = await stakingFacet.frens(testAddress);

    ethers.provider.send("evm_increaseTime", [86400]);
    ethers.provider.send("evm_mine", []);

    const after = await stakingFacet.frens(testAddress);
    const difference = after.sub(before);
    expect(difference.div(staked[0].amount)).to.equal(frensRate);
  });

  it("Should accrue 4x the FRENS over 24 hrs", async function () {
    const pools: PoolObject[] = [];
    pools.push({
      _poolAddress: "0x385Eeac5cB85A38A9a07A70c73e0a3271CfB54A7",
      _poolReceiptToken: ethers.constants.AddressZero,
      _rate: "4",
      _poolName: "GHST",
      _poolUrl: "",
    });
    const tx = await stakingFacet.updateRates(pools);
    await tx.wait();

    const currentEpoch = await stakingFacet.currentEpoch();
    expect(currentEpoch).to.equal("2");

    //Get the current for this epoch
    const rates = await stakingFacet.poolRatesInEpoch(currentEpoch);
    const frensRate = rates[0].rate;
    expect(rates[0].rate).to.equal("4");

    const staked = await stakingFacet.stakedInEpoch(testAddress, currentEpoch);
    const before = await stakingFacet.frens(testAddress);

    ethers.provider.send("evm_increaseTime", [86400]);
    ethers.provider.send("evm_mine", []);

    const after = await stakingFacet.frens(testAddress);
    const difference = after.sub(before);
    expect(difference.div(staked[0].amount)).to.equal(frensRate);
  });

  it("User can unstake GHST token balance", async function () {
    stakingFacet = (await impersonate(
      testAddress,
      stakingFacet,
      ethers,
      network
    )) as StakingFacet;
    let staked = await stakingFacet.stakedInCurrentEpoch(testAddress);
    let stakedGhst = staked[0];
    await stakingFacet.withdrawFromPool(
      stakedGhst.poolAddress,
      stakedGhst.amount
    );

    staked = await stakingFacet.stakedInCurrentEpoch(testAddress);
    stakedGhst = staked[0];
    expect(stakedGhst.amount).to.equal(0);
  });

  it("User can re-stake GHST token balance", async function () {
    stakingFacet = (await impersonate(
      testAddress,
      stakingFacet,
      ethers,
      network
    )) as StakingFacet;
    let staked = await stakingFacet.stakedInCurrentEpoch(testAddress);
    let stakedGhst = staked[0];
    expect(stakedGhst.amount).to.equal(0);

    const stakeAmount = ethers.utils.parseEther("100");

    await stakingFacet.stakeIntoPool(stakedGhst.poolAddress, stakeAmount);

    staked = await stakingFacet.stakedInCurrentEpoch(testAddress);
    stakedGhst = staked[0];
    expect(stakedGhst.amount).to.equal(stakeAmount);
  });

  it("FRENS stop being emitted when rate is zero", async function () {
    const pools: PoolObject[] = [];
    pools.push({
      _poolAddress: "0x385Eeac5cB85A38A9a07A70c73e0a3271CfB54A7",
      _poolReceiptToken: ethers.constants.AddressZero,
      _rate: "0",
      _poolName: "GHST",
      _poolUrl: "",
    });

    const before = ethers.utils.formatEther(
      await stakingFacet.frens(testAddress)
    );

    stakingFacet = (await impersonate(
      rateManager,
      stakingFacet,
      ethers,
      network
    )) as StakingFacet;

    const tx = await stakingFacet.updateRates(pools);
    await tx.wait();

    const currentEpoch = await stakingFacet.currentEpoch();
    expect(currentEpoch).to.equal("3");

    const rates = await stakingFacet.poolRatesInEpoch(currentEpoch);
    expect(rates.length).to.equal(1);
    expect(rates[0].rate).to.equal(0);

    ethers.provider.send("evm_increaseTime", [86400 * 3]);
    ethers.provider.send("evm_mine", []);

    const after = ethers.utils.formatEther(
      await stakingFacet.frens(testAddress)
    );

    const difference = Number(after) - Number(before);
    expect(Number(difference)).to.be.lessThan(
      Number(ethers.utils.parseEther("1"))
    );
  });
});
