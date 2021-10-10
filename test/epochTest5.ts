import { impersonate, maticStakingAddress } from "../scripts/helperFunctions";
import { StakingFacet } from "../typechain";
import { expect } from "chai";
import { network } from "hardhat";
import { ethers } from "hardhat";
import { PoolObject } from "../types";

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
    console.log("user:", userEpoch.toString());
    expect(userEpoch).to.equal(0);

    stakingFacet = (await impersonate(
      rateManager,
      stakingFacet,
      ethers,
      network
    )) as StakingFacet;

    //Add a few epochs, then try using bump function
    for (let index = 0; index < 3; index++) {
      const rand1 = Math.floor(Math.random() * 10000).toString();
      const rand2 = Math.floor(Math.random() * 10000).toString();
      const rand3 = Math.floor(Math.random() * 10000).toString();
      const rand4 = Math.floor(Math.random() * 10000).toString();

      const pools: PoolObject[] = [
        {
          _poolAddress: "0x385Eeac5cB85A38A9a07A70c73e0a3271CfB54A7",
          _poolReceiptToken: ethers.constants.AddressZero,
          _rate: rand1,
          _poolName: "GHST",
          _poolUrl: "",
        },
        {
          _poolAddress: "0x8b1fd78ad67c7da09b682c5392b65ca7caa101b9",
          _poolReceiptToken: "0xA02d547512Bb90002807499F05495Fe9C4C3943f",
          _rate: rand2,
          _poolName: "GHST-QUICK",
          _poolUrl: "",
        },
        {
          _poolAddress: "0x096c5ccb33cfc5732bcd1f3195c13dbefc4c82f4",
          _poolReceiptToken: "0x04439eC4ba8b09acfae0E9b5D75A82cC63b19f09",
          _rate: rand3,
          _poolName: "GHST-USDC",
          _poolUrl: "",
        },
        {
          _poolAddress: "0xccb9d2100037f1253e6c1682adf7dc9944498aff",
          _poolReceiptToken: "0x388E2a3d389F27504212030c2D42Abf0a8188cd1",
          _rate: rand4,
          _poolName: "GHST-WETH",
          _poolUrl: "",
        },
      ];

      console.log("going ahead in time, current index is:", index);
      ethers.provider.send("evm_increaseTime", [86400]);
      ethers.provider.send("evm_mine", []);
      await stakingFacet.updateRates(pools);
    }

    let current = await stakingFacet.currentEpoch();

    await expect(
      stakingFacet.bumpEpoch(testAddress, current)
    ).to.be.revertedWith("StakingFacet: Can only bump migrated user");

    await stakingFacet.migrateToV2([testAddress]);

    //Add a few epochs, then try using bump function
    for (let index = 0; index < 3; index++) {
      const rand1 = Math.floor(Math.random() * 10000).toString();
      const rand2 = Math.floor(Math.random() * 10000).toString();
      const rand3 = Math.floor(Math.random() * 10000).toString();
      const rand4 = Math.floor(Math.random() * 10000).toString();

      const pools: PoolObject[] = [
        {
          _poolAddress: "0x385Eeac5cB85A38A9a07A70c73e0a3271CfB54A7",
          _poolReceiptToken: ethers.constants.AddressZero,
          _rate: rand1,
          _poolName: "GHST",
          _poolUrl: "",
        },
        {
          _poolAddress: "0x8b1fd78ad67c7da09b682c5392b65ca7caa101b9",
          _poolReceiptToken: "0xA02d547512Bb90002807499F05495Fe9C4C3943f",
          _rate: rand2,
          _poolName: "GHST-QUICK",
          _poolUrl: "",
        },
        {
          _poolAddress: "0x096c5ccb33cfc5732bcd1f3195c13dbefc4c82f4",
          _poolReceiptToken: "0x04439eC4ba8b09acfae0E9b5D75A82cC63b19f09",
          _rate: rand3,
          _poolName: "GHST-USDC",
          _poolUrl: "",
        },
        {
          _poolAddress: "0xccb9d2100037f1253e6c1682adf7dc9944498aff",
          _poolReceiptToken: "0x388E2a3d389F27504212030c2D42Abf0a8188cd1",
          _rate: rand4,
          _poolName: "GHST-WETH",
          _poolUrl: "",
        },
      ];

      console.log("going ahead in time, current index is:", index);
      ethers.provider.send("evm_increaseTime", [86400]);
      ethers.provider.send("evm_mine", []);
      await stakingFacet.updateRates(pools);
    }

    userEpoch = await stakingFacet.userEpoch(testAddress);

    current = await stakingFacet.currentEpoch();

    await stakingFacet.bumpEpoch(testAddress, current);

    userEpoch = await stakingFacet.userEpoch(testAddress);
    expect(userEpoch).to.equal(current);
  });
});
