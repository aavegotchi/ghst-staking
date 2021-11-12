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

describe("More checks", async function () {
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

  it("Cannot stake into pool that does not exist in epoch", async function () {
    const stakeAmount = ethers.utils.parseEther("100");

    await expect(
      stakingFacet.stakeIntoPool(
        "0xa370f2ADd2A9Fba8759147995d6A0641F8d7C119",
        stakeAmount
      )
    ).to.be.revertedWith("StakingFacet: Pool is not valid in this epoch");
  });

  it("Can bump user to latest epoch without changing FRENS", async function () {
    let userEpoch = await stakingFacet.userEpoch(testAddress);
    expect(userEpoch).to.equal(0);

    const beforeFrens = ethers.utils.formatEther(
      await stakingFacet.frens(testAddress)
    );

    stakingFacet = (await impersonate(
      rateManager,
      stakingFacet,
      ethers,
      network
    )) as StakingFacet;

    //Add a few epochs, then try using bump function

    for (let index = 0; index < 3; index++) {
      const currentEpoch = await stakingFacet.currentEpoch();
      console.log("Updating rates, current index is:", index);
      await stakingFacet.updateRates(currentEpoch, initPools);
    }

    let current = await stakingFacet.currentEpoch();

    await expect(
      stakingFacet.bumpEpoch(testAddress, current)
    ).to.be.revertedWith("StakingFacet: Can only bump migrated user");

    await stakingFacet.migrateToV2([testAddress]);

    //Add a few epochs, then try using bump function
    for (let index = 0; index < 3; index++) {
      console.log("Updating rates, current index is:", index);
      const currentEpoch = await stakingFacet.currentEpoch();
      await stakingFacet.updateRates(currentEpoch, initPools);
    }

    userEpoch = await stakingFacet.userEpoch(testAddress);

    current = await stakingFacet.currentEpoch();
    await stakingFacet.bumpEpoch(testAddress, current.sub(2));

    let afterFrens = ethers.utils.formatEther(
      await stakingFacet.frens(testAddress)
    );

    console.log("frens after first bump:", afterFrens);
    current = await stakingFacet.currentEpoch();
    await stakingFacet.bumpEpoch(testAddress, current);

    userEpoch = await stakingFacet.userEpoch(testAddress);
    expect(userEpoch).to.equal(current);

    afterFrens = ethers.utils.formatEther(
      await stakingFacet.frens(testAddress)
    );
    console.log("frens after second bump:", afterFrens);
    expect(Number(afterFrens) - Number(beforeFrens)).to.lessThan(10);
  });

  it("Cannot bump user lower than their current epoch", async function () {
    const current = await stakingFacet.userEpoch(testAddress);
    await expect(
      stakingFacet.bumpEpoch(testAddress, current.sub(1))
    ).to.be.revertedWith("StakingFacet: Cannot bump to lower epoch");
  });

  it("Cannot bump user higher than current epoch", async function () {
    await expect(stakingFacet.bumpEpoch(testAddress, "100")).to.be.revertedWith(
      "StakingFacet: Epoch must be lower than current epoch"
    );
  });
});
