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

  it("Cannot initiate with zero pools", async function () {
    const pools: PoolObject[] = [];
    await expect(stakingFacet.initiateEpoch(pools)).to.be.revertedWith(
      "StakingFacet: Pools length cannot be zero"
    );
  });

  it("Cannot add pool without a receipt token (except GHST)", async function () {
    const pools: PoolObject[] = [
      {
        _poolAddress: "0x8b1fd78ad67c7da09b682c5392b65ca7caa101b9",
        _poolReceiptToken: ethers.constants.AddressZero,
        _rate: "83",
        _poolName: "GHST-QUICK",
      },
    ];

    await expect(stakingFacet.initiateEpoch(pools)).to.be.revertedWith(
      "StakingFacet: Pool must have receipt token"
    );
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

  it("Cannot re-initiate epoch 0", async function () {
    const pools = [];
    pools.push({
      _poolAddress: "0x385Eeac5cB85A38A9a07A70c73e0a3271CfB54A7",
      _poolReceiptToken: ethers.constants.AddressZero,
      _rate: "1",
      _poolName: "GHST",
    });

    await expect(stakingFacet.initiateEpoch(pools)).to.be.revertedWith(
      "StakingFacet: Can only be called on first epoch"
    );
  });

  it("Can migrate user", async function () {
    // Check add and view function works

    let frens = await stakingFacet.frens(testAddress);
    let epochFrens = await stakingFacet.epochFrens(testAddress);

    const tx = await stakingFacet.migrateToV2([testAddress]);
    await tx.wait();

    frens = await stakingFacet.frens(testAddress);
    epochFrens = await stakingFacet.epochFrens(testAddress);

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
    });
    const tx = await stakingFacet.updateRates(pools);
    await tx.wait();

    const currentEpoch = await stakingFacet.currentEpoch();
    expect(currentEpoch).to.equal("1");
  });

  it("Epoch rates should be correct", async function () {
    let rates = await stakingFacet.poolRatesInEpoch("0");
    console.log("rates:", rates[0].toString());
    expect(rates[0].rate).to.equal("1");

    rates = await stakingFacet.poolRatesInEpoch("1");
    expect(rates[0].rate).to.equal("2");
    console.log("rates:", rates[0].toString());
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

  /*
  it("FRENS stop being emitted when rate is zero", async function () {
    const pools: PoolObject[] = [];

    const before = await stakingFacet.epochFrens(testAddress);

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
  */
});
