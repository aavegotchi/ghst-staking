import { impersonate, maticStakingAddress } from "../scripts/helperFunctions";
import { IERC20, StakingFacet } from "../typechain";
import { expect } from "chai";
import { network } from "hardhat";
import { ethers } from "hardhat";
import { BigNumber } from "@ethersproject/bignumber";

const { updateRates } = require("../scripts/updates/updateRates2.ts");

const testAddress = "0xb7601193f559de56d67fb8e6a2af219b05bd36c7";
const rateManager = "0xa370f2ADd2A9Fba8759147995d6A0641F8d7C119";
let ghstMaticStakeAmount: BigNumber = ethers.utils.parseEther("10");

let stakingFacet: StakingFacet;

describe("Unstake and re-stake pools tokens", async function () {
  const diamondAddress = maticStakingAddress;

  before(async function () {
    this.timeout(2000000000);

    await updateRates();

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

  it("User can stake GHST-MATIC token balance", async function () {
    stakingFacet = (await impersonate(
      testAddress,
      stakingFacet,
      ethers,
      network
    )) as StakingFacet;
    let staked = await stakingFacet.stakedInCurrentEpoch(testAddress);
    let stakedGhstMatic = staked[4];
    expect(stakedGhstMatic.amount).to.equal(0);

    let poolToken = (await ethers.getContractAt(
      "ERC20",
      stakedGhstMatic.poolAddress
    )) as IERC20;
    poolToken = (await impersonate(
      testAddress,
      poolToken,
      ethers,
      network
    )) as IERC20;

    await poolToken.approve(diamondAddress, ghstMaticStakeAmount);

    await stakingFacet.stakeIntoPool(
      stakedGhstMatic.poolAddress,
      ghstMaticStakeAmount
    );

    staked = await stakingFacet.stakedInCurrentEpoch(testAddress);
    stakedGhstMatic = staked[4];
    expect(stakedGhstMatic.amount).to.equal(ghstMaticStakeAmount);
  });

  it("Check frens calculation", async function () {
    const stakedDays = 1;
    const beforeFrens = await stakingFacet.frens(testAddress);

    console.log("befofre frens:", ethers.utils.formatEther(beforeFrens));

    const currentEpoch = await stakingFacet.currentEpoch();
    const rates = await stakingFacet.poolRatesInEpoch(currentEpoch);

    ethers.provider.send("evm_increaseTime", [86400 * stakedDays]);
    ethers.provider.send("evm_mine", []);

    const afterFrens = await stakingFacet.frens(testAddress);
    const estimatedFrens = rates[4].rate
      .mul(ghstMaticStakeAmount)
      .mul(stakedDays);

    const finalDifference = ethers.utils.formatEther(
      beforeFrens.add(estimatedFrens).sub(afterFrens)
    );

    expect(Math.abs(Number(finalDifference))).to.be.lessThan(1);
  });

  it("User can unstake GHST-MATIC token balance", async function () {
    let staked = await stakingFacet.stakedInCurrentEpoch(testAddress);
    let stakedGhstMatic = staked[4];

    await stakingFacet.withdrawFromPool(
      stakedGhstMatic.poolAddress,
      stakedGhstMatic.amount
    );

    staked = await stakingFacet.stakedInCurrentEpoch(testAddress);
    stakedGhstMatic = staked[4];
    expect(stakedGhstMatic.amount).to.equal(0);
  });
});
