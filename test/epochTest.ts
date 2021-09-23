import { Contract } from "@ethersproject/contracts";
import { maticStakingAddress } from "../scripts/helperFunctions";
import { StakingFacet } from "../typechain";

const { expect } = require("chai");
const { ethers } = require("hardhat");
const { upgrade } = require("../scripts/upgrades/upgrade-epoch.ts");

describe("Deploying", async function () {
  const diamondAddress = maticStakingAddress;
  let owner: string,
    rateManager: string,
    generalUser,
    signer,
    stakingFacet: StakingFacet,
    ownerStakingFacet: Contract;
  const testAddress = "0x51208e5cC9215c6360210C48F81C8270637a5218";

  before(async function () {
    this.timeout(20000000);
    await upgrade();

    owner = await (
      await ethers.getContractAt("OwnershipFacet", diamondAddress)
    ).owner();
    signer = await ethers.provider.getSigner(owner);
    [rateManager, generalUser] = await ethers.getSigners();
    stakingFacet = (await ethers.getContractAt(
      "StakingFacet",
      diamondAddress
    )) as StakingFacet;
    ownerStakingFacet = await stakingFacet.connect(signer);
  });

  it("Can initiate epoch", async function () {
    const pools = [];
    pools.push({
      _poolAddress: "0x385Eeac5cB85A38A9a07A70c73e0a3271CfB54A7",
      _poolReceiptToken: "0x385Eeac5cB85A38A9a07A70c73e0a3271CfB54A7",
      _rate: "1",
      _poolName: "GHST",
    });

    const tx = await stakingFacet.initiateEpoch(pools);
    await tx.wait();
  });

  it("Can migrate user", async function () {
    // Check add and view function works

    let frens = await stakingFacet.frens(testAddress);
    let epochFrens = await stakingFacet.epochFrens(testAddress);

    console.log("frens:", frens.toString());
    console.log("epoch:", epochFrens.toString());

    const tx = await stakingFacet._migrateToV2(testAddress);
    await tx.wait();

    frens = await stakingFacet.frens(testAddress);
    epochFrens = await stakingFacet.epochFrens(testAddress);

    console.log("frens:", frens.toString());
    console.log("epoch:", epochFrens.toString());
  });
  it("Can update rate and create new epoch", async function () {
    const pools = [];
    pools.push({
      _poolAddress: "0x385Eeac5cB85A38A9a07A70c73e0a3271CfB54A7",
      _poolReceiptToken: "0x385Eeac5cB85A38A9a07A70c73e0a3271CfB54A7",
      _rate: "2",
      _poolName: "GHST",
    });
    const tx = await stakingFacet.updateRates(pools);
    await tx.wait();

    const frens = await stakingFacet.frens(testAddress);
    const epochFrens = await stakingFacet.epochFrens(testAddress);

    console.log("frens:", frens.toString());
    console.log("epoch:", epochFrens.toString());
  });
});
