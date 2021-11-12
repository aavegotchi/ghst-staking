import { impersonate, maticStakingAddress } from "../scripts/helperFunctions";
import { StakingFacet } from "../typechain";
import { expect } from "chai";
import { network } from "hardhat";
import { ethers } from "hardhat";
import { initPools } from "../scripts/upgrades/upgrade-epoch";

const { upgrade } = require("../scripts/upgrades/upgrade-epoch.ts");

const testAddress = "0x027Ffd3c119567e85998f4E6B9c3d83D5702660c";
const rateManager = "0xa370f2ADd2A9Fba8759147995d6A0641F8d7C119";

let stakingFacet: StakingFacet;

describe("User re-staking within the same epoch", async function () {
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

  it("Can stake in first epoch", async function () {
    let frens = await stakingFacet.frens(testAddress);
    console.log("frens:", frens.toString());
    const stakeAmount = ethers.utils.parseEther("20");

    const pools = await stakingFacet.poolRatesInEpoch("0");

    await stakingFacet.stakeIntoPool(pools[0].poolAddress, stakeAmount);

    frens = await stakingFacet.frens(testAddress);
    console.log("frens:", ethers.utils.formatEther(frens));
  });

  it("Can update stake", async function () {
    let frens;
    stakingFacet = (await impersonate(
      rateManager,
      stakingFacet,
      ethers,
      network
    )) as StakingFacet;

    frens = await stakingFacet.frens(testAddress);
    console.log("frens:", ethers.utils.formatEther(frens));

    let currentEpoch = await stakingFacet.currentEpoch();
    await stakingFacet.updateRates(currentEpoch, initPools);

    stakingFacet = (await impersonate(
      testAddress,
      stakingFacet,
      ethers,
      network
    )) as StakingFacet;

    const stakeAmount = ethers.utils.parseEther("10");
    currentEpoch = await stakingFacet.currentEpoch();
    const pools = await stakingFacet.poolRatesInEpoch(currentEpoch);

    const userPools = await stakingFacet.stakedInEpoch(
      testAddress,
      currentEpoch
    );

    console.log("user pools", userPools);

    for (let index = 0; index < pools.length; index++) {
      const pool = pools[index];
      console.log("Withdrawing from pools", pool.poolName);
      await stakingFacet.withdrawFromPool(
        pool.poolAddress,
        userPools[index].amount
      );
    }

    const userPoolsAfter = await stakingFacet.stakedInEpoch(testAddress, "0");
    userPoolsAfter.forEach((pool) => {
      expect(pool.amount).to.equal(0);
    });

    //Round 1
    await stakingFacet.stakeIntoPool(pools[0].poolAddress, stakeAmount);
    let stakedAmount = ethers.utils.formatEther(
      (await stakingFacet.stakedInEpoch(testAddress, currentEpoch))[0].amount
    );

    // console.log("round 1staked amount:", stakedAmount);

    let beforeFrens = ethers.utils.formatEther(
      await stakingFacet.frens(testAddress)
    );
    // console.log("frens:", beforeFrens);

    ethers.provider.send("evm_increaseTime", [86400]);
    ethers.provider.send("evm_mine", []);
    let afterFrens = ethers.utils.formatEther(
      await stakingFacet.frens(testAddress)
    );
    // expect(Number(afterFrens) - Number(beforeFrens)).to.equal(
    //   Number(stakedAmount)
    // );
    console.log(
      "Round 1 difference:",
      Number(afterFrens) - Number(beforeFrens)
    );

    //Round 2

    beforeFrens = ethers.utils.formatEther(
      await stakingFacet.frens(testAddress)
    );
    // console.log("before frens:", beforeFrens);

    await stakingFacet.stakeIntoPool(pools[0].poolAddress, stakeAmount);
    ethers.provider.send("evm_increaseTime", [86400]);
    ethers.provider.send("evm_mine", []);

    stakedAmount = ethers.utils.formatEther(
      (await stakingFacet.stakedInEpoch(testAddress, "0"))[0].amount
    );
    // console.log("round 2 staked amount:", stakedAmount);

    afterFrens = ethers.utils.formatEther(
      await stakingFacet.frens(testAddress)
    );
    console.log(
      "Round 2 difference:",
      Number(afterFrens) - Number(beforeFrens)
    );

    expect(Math.floor(Number(afterFrens) - Number(beforeFrens))).to.equal(
      Number(stakedAmount)
    );

    //Round 3
    beforeFrens = ethers.utils.formatEther(
      await stakingFacet.frens(testAddress)
    );
    await stakingFacet.stakeIntoPool(pools[0].poolAddress, stakeAmount);

    ethers.provider.send("evm_increaseTime", [86400]);
    ethers.provider.send("evm_mine", []);

    stakedAmount = ethers.utils.formatEther(
      (await stakingFacet.stakedInEpoch(testAddress, "0"))[0].amount
    );

    // console.log("staked amount:", stakedAmount);

    afterFrens = ethers.utils.formatEther(
      await stakingFacet.frens(testAddress)
    );
    console.log(
      "Round 3 difference:",
      Number(afterFrens) - Number(beforeFrens)
    );
    expect(Math.floor(Number(afterFrens) - Number(beforeFrens))).to.equal(
      Number(stakedAmount)
    );

    //Round 4
    const smallStakeAmount = ethers.utils.parseEther("1");

    beforeFrens = ethers.utils.formatEther(
      await stakingFacet.frens(testAddress)
    );

    await stakingFacet.stakeIntoPool(pools[0].poolAddress, smallStakeAmount);
    await stakingFacet.stakeIntoPool(pools[0].poolAddress, smallStakeAmount);
    await stakingFacet.stakeIntoPool(pools[0].poolAddress, smallStakeAmount);
    afterFrens = ethers.utils.formatEther(
      await stakingFacet.frens(testAddress)
    );

    console.log(
      "Round 4 difference:",
      Number(afterFrens) - Number(beforeFrens)
    );
  });
});
