import { Contract } from "@ethersproject/contracts";
import { impersonate, maticStakingAddress } from "../scripts/helperFunctions";
import { StakingFacet } from "../typechain";
import { expect } from "chai";
import { network } from "hardhat";
import { BigNumber, BigNumberish } from "@ethersproject/bignumber";
import { Signer } from "@ethersproject/abstract-signer";
import { ethers } from "hardhat";

// const { ethers } = require("hardhat");
const { upgrade } = require("../scripts/upgrades/upgrade-epoch.ts");

interface PoolObject {
  _poolAddress: string;
  _poolReceiptToken: string;
  _rate: BigNumberish;
  _poolName: string;
}

const testAddress = "0x51208e5cC9215c6360210C48F81C8270637a5218";
const testAddress2 = "0x027Ffd3c119567e85998f4E6B9c3d83D5702660c";
let owner: string, signer: Signer, stakingFacet: StakingFacet;

describe("Epoch Tests (GHST Only)", async function () {
  const diamondAddress = maticStakingAddress;

  before(async function () {
    this.timeout(20000000);
    await upgrade();

    owner = await (
      await ethers.getContractAt("OwnershipFacet", diamondAddress)
    ).owner();
    signer = await ethers.provider.getSigner(owner);

    stakingFacet = (await ethers.getContractAt(
      "StakingFacet",
      diamondAddress
    )) as StakingFacet;
  });

  it("Can initiate epoch", async function () {
    const pools = [];
    pools.push({
      _poolAddress: "0x385Eeac5cB85A38A9a07A70c73e0a3271CfB54A7",
      _poolReceiptToken: ethers.constants.AddressZero,
      _rate: "1",
      _poolName: "GHST",
    });

    const tx = await stakingFacet.initiateEpoch(pools);
    await tx.wait();
    const currentEpoch = await stakingFacet.currentEpoch();
    expect(currentEpoch).to.equal("0");
  });

  it("Can migrate user", async function () {
    // Check add and view function works

    let frens = await stakingFacet.frens(testAddress);
    let epochFrens = await stakingFacet.epochFrens(testAddress);

    const tx = await stakingFacet._migrateToV2(testAddress);
    await tx.wait();

    frens = await stakingFacet.frens(testAddress);
    epochFrens = await stakingFacet.epochFrens(testAddress);

    // console.log("frens:", ethers.utils.formatEther(frens));
    // console.log("epoch frens:", ethers.utils.formatEther(epochFrens));

    // expect(epochFrens.sub(frens)).to.lessThanOrEqual(1);

    const hasMigrated = await stakingFacet.hasMigrated(testAddress);
    expect(hasMigrated).to.equal(true);

    // expect(frens).to.equal(epochFrens);
  });
  it("Can update rate and create new epoch", async function () {
    const pools: PoolObject[] = [];
    pools.push({
      _poolAddress: "0x385Eeac5cB85A38A9a07A70c73e0a3271CfB54A7",
      _poolReceiptToken: ethers.constants.AddressZero,
      _rate: "2",
      _poolName: "GHST",
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
    const before = await stakingFacet.epochFrens(testAddress);

    ethers.provider.send("evm_increaseTime", [86400]);
    ethers.provider.send("evm_mine", []);

    const after = await stakingFacet.epochFrens(testAddress);
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
    const before = await stakingFacet.epochFrens(testAddress);

    ethers.provider.send("evm_increaseTime", [86400]);
    ethers.provider.send("evm_mine", []);

    const after = await stakingFacet.epochFrens(testAddress);
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

  it("User can unstake GHST-QUICK", async function () {});

  it("User can re-stake GHST-QUICK", async function () {});

  it("User can unstake GHST-USDC", async function () {});

  it("User can re-stake GHST-USDC", async function () {});

  it("User can unstake GHST-WETH", async function () {});

  it("User can re-stake GHST-WETH", async function () {});

  it("FRENS stop being emitted when rate is zero", async function () {
    const pools: PoolObject[] = [];

    const before = await stakingFacet.epochFrens(testAddress);
    console.log("before:", before.toString());

    const tx = await stakingFacet.updateRates(pools);
    await tx.wait();

    const currentEpoch = await stakingFacet.currentEpoch();
    expect(currentEpoch).to.equal("3");

    const rates = await stakingFacet.poolRatesInEpoch(currentEpoch);
    expect(rates.length).to.equal(0);

    ethers.provider.send("evm_increaseTime", [86400 * 3]);
    ethers.provider.send("evm_mine", []);

    const after = await stakingFacet.epochFrens(testAddress);
    // console.log("after:", after.toString());

    const difference = after.sub(before);
    // console.log("difference:", ethers.utils.formatEther(difference));
    expect(Number(difference.toString())).to.be.lessThan(
      Number(ethers.utils.parseEther("1"))
    );
  });
});
