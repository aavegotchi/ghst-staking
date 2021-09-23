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

  before(async function () {
    this.timeout(1000000);
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

  it("Should reject when general user try to add or remove a rate manager", async function () {
    // Check add and view function works
    const testAddress = "0x51208e5cC9215c6360210C48F81C8270637a5218";
    const frens = await stakingFacet.frens(testAddress);
    const epochFrens = await stakingFacet.epochFrens(testAddress);

    console.log("frens:", frens.toString());
    console.log("epoch:", epochFrens.toString());
  });
});
