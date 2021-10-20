import { impersonate, maticStakingAddress } from "../scripts/helperFunctions";
import { StakingFacet } from "../typechain";
import { expect } from "chai";
import { network } from "hardhat";
import { ethers } from "hardhat";
import { PoolObject } from "../types";
import { BigNumber } from "@ethersproject/bignumber";

const { upgrade } = require("../scripts/upgrades/upgrade-epoch.ts");

const testAddressGhstQuick = "0x7af23cc86f3d96f079d5a56d0a89ebcb281060d5";
const testAddressGhstUsdc = "0x7404becad09351583443720f8f520f689e93359e";
const testAddressGhstWeth = "0x60ed33735c9c29ec2c26b8ec734e36d5b6fa1eab";
const rateManager = "0xa370f2ADd2A9Fba8759147995d6A0641F8d7C119";
let stakedAmountGhstQuick: BigNumber,
  stakedAmountGhstUsdc: BigNumber,
  stakedAmountGhstWeth: BigNumber;

let stakingFacet: StakingFacet;

describe("Unstake and re-stake pools tokens", async function () {
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
  it("User can unstake GHST-QUICK token balance", async function () {
    stakingFacet = (await impersonate(
      testAddressGhstQuick,
      stakingFacet,
      ethers,
      network
    )) as StakingFacet;
    let staked = await stakingFacet.stakedInCurrentEpoch(testAddressGhstQuick);
    let stakedGhstQuick = staked[1];
    stakedAmountGhstQuick = stakedGhstQuick.amount;
    await stakingFacet.withdrawFromPool(
      stakedGhstQuick.poolAddress,
      stakedGhstQuick.amount
    );

    staked = await stakingFacet.stakedInCurrentEpoch(testAddressGhstQuick);
    stakedGhstQuick = staked[1];
    expect(stakedGhstQuick.amount).to.equal(0);
  });

  it("User can re-stake GHST-QUICK token balance", async function () {
    stakingFacet = (await impersonate(
      testAddressGhstQuick,
      stakingFacet,
      ethers,
      network
    )) as StakingFacet;
    let staked = await stakingFacet.stakedInCurrentEpoch(testAddressGhstQuick);
    let stakedGhstQuick = staked[1];
    expect(stakedGhstQuick.amount).to.equal(0);

    await stakingFacet.stakeIntoPool(
      stakedGhstQuick.poolAddress,
      stakedAmountGhstQuick
    );

    staked = await stakingFacet.stakedInCurrentEpoch(testAddressGhstQuick);
    stakedGhstQuick = staked[1];
    expect(stakedGhstQuick.amount).to.equal(stakedAmountGhstQuick);
  });

  it("User can unstake GHST-USDC token balance", async function () {
    stakingFacet = (await impersonate(
      testAddressGhstUsdc,
      stakingFacet,
      ethers,
      network
    )) as StakingFacet;
    let staked = await stakingFacet.stakedInCurrentEpoch(testAddressGhstUsdc);
    let stakedGhstUsdc = staked[2];
    stakedAmountGhstUsdc = stakedGhstUsdc.amount;
    await stakingFacet.withdrawFromPool(
      stakedGhstUsdc.poolAddress,
      stakedGhstUsdc.amount
    );

    staked = await stakingFacet.stakedInCurrentEpoch(testAddressGhstUsdc);
    stakedGhstUsdc = staked[2];
    expect(stakedGhstUsdc.amount).to.equal(0);
  });

  it("User can re-stake GHST-USDC token balance", async function () {
    stakingFacet = (await impersonate(
      testAddressGhstUsdc,
      stakingFacet,
      ethers,
      network
    )) as StakingFacet;
    let staked = await stakingFacet.stakedInCurrentEpoch(testAddressGhstUsdc);
    let stakedGhstUsdc = staked[2];
    expect(stakedGhstUsdc.amount).to.equal(0);

    await stakingFacet.stakeIntoPool(
      stakedGhstUsdc.poolAddress,
      stakedAmountGhstUsdc
    );

    staked = await stakingFacet.stakedInCurrentEpoch(testAddressGhstUsdc);
    stakedGhstUsdc = staked[2];
    expect(stakedGhstUsdc.amount).to.equal(stakedAmountGhstUsdc);
  });

  it("User can unstake GHST-WETH token balance", async function () {
    stakingFacet = (await impersonate(
      testAddressGhstWeth,
      stakingFacet,
      ethers,
      network
    )) as StakingFacet;
    let staked = await stakingFacet.stakedInCurrentEpoch(testAddressGhstWeth);
    let stakedGhstWeth = staked[3];
    stakedAmountGhstWeth = stakedGhstWeth.amount;
    await stakingFacet.withdrawFromPool(
      stakedGhstWeth.poolAddress,
      stakedGhstWeth.amount
    );

    staked = await stakingFacet.stakedInCurrentEpoch(testAddressGhstWeth);
    stakedGhstWeth = staked[3];
    expect(stakedGhstWeth.amount).to.equal(0);
  });

  it("User can re-stake GHST-WETH token balance", async function () {
    stakingFacet = (await impersonate(
      testAddressGhstWeth,
      stakingFacet,
      ethers,
      network
    )) as StakingFacet;
    let staked = await stakingFacet.stakedInCurrentEpoch(testAddressGhstWeth);
    let stakedGhstWeth = staked[3];
    expect(stakedGhstWeth.amount).to.equal(0);

    await stakingFacet.stakeIntoPool(
      stakedGhstWeth.poolAddress,
      stakedAmountGhstWeth
    );

    staked = await stakingFacet.stakedInCurrentEpoch(testAddressGhstWeth);
    stakedGhstWeth = staked[3];
    expect(stakedGhstWeth.amount).to.equal(stakedAmountGhstWeth);
  });
});
