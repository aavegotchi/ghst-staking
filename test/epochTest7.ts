import { impersonate, maticStakingAddress } from "../scripts/helperFunctions";
import { StakingFacet } from "../typechain";
import { expect } from "chai";
import { network } from "hardhat";
import { ethers } from "hardhat";
import { initPools } from "../scripts/upgrades/upgrade-epoch";

const { upgrade } = require("../scripts/upgrades/upgrade-epoch.ts");

const testAddress = "0x3Da7D21f1A06C7Ce19EE593f76148FAe6e952ca3";
const rateManager = "0xa370f2ADd2A9Fba8759147995d6A0641F8d7C119";

let stakingFacet: StakingFacet;

describe("Stake in different pools and different epochs", async function () {
  const diamondAddress = maticStakingAddress;

  before(async function () {
    this.timeout(2000000000);
    await upgrade();

    stakingFacet = (await ethers.getContractAt(
      "StakingFacet",
      diamondAddress
    )) as StakingFacet;

    stakingFacet = (await impersonate(
      testAddress,
      stakingFacet,
      ethers,
      network
    )) as StakingFacet;
  });
  it("Stake in pool GHST in first epoch", async function () {
    const pools = await stakingFacet.poolRatesInEpoch("0");
    const frensBefore = await stakingFacet.frens(testAddress)
    console.log("frensBefore",ethers.utils.formatUnits(frensBefore))
    for(let i = 0; i < 30; i++) {
      await stakingFacet.stakeIntoPool(pools[1].poolAddress, ethers.utils.parseUnits("1"))
      await stakingFacet.withdrawFromPool(pools[1].poolAddress, ethers.utils.parseUnits("1"))
    }
    const frensAfter = await stakingFacet.frens(testAddress)
    console.log("frensAfter",ethers.utils.formatUnits(frensAfter))
    for(let i = 0; i < 30; i++) {
      await stakingFacet.stakeIntoPool(pools[0].poolAddress, ethers.utils.parseUnits("1"))
      await stakingFacet.withdrawFromPool(pools[0].poolAddress, ethers.utils.parseUnits("1"))
    }
    const frensAfter2 = await stakingFacet.frens(testAddress)
    console.log("frensAfter2",ethers.utils.formatUnits(frensAfter2))
  });
  // it("get pool info", async function() {
  //   const pools = await stakingFacet.poolRatesInEpoch("0");
  //   // console.log("pools",pools)
  //   const pi = await stakingFacet.getPoolInfo(pools[0].poolAddress, 0)
  //   console.log(pi)
  // })
});
