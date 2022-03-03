//import { impersonate, maticStakingAddress } from "../scripts/helperFunctions";
import { ERC20, StakingFacet } from "../typechain";
import { expect } from "chai";
import { network } from "hardhat";
import { ethers } from "hardhat";
// import { PoolObject } from "../types";
// import { BigNumber } from "@ethersproject/bignumber";
import {
  contractAddresses,
  GHST,
  ghstOwner,
  poolAddress,
  stakingDiamond,
  sufficientAmnt,
  amGHST,
} from "../scripts/deploystkwamGHST";
import { Signer } from "ethers";

const { upgrade } = require("../scripts/upgrades/upgrade-wamGHST");
const { deploy } = require("../scripts/deploystkwamGHST");

let deployedAddresses: contractAddresses;
let ghstContract: ERC20;
let amGHSTContract: ERC20;
let stakeFacet: StakingFacet;
let overDraft: string;
let amGHSTsigner: Signer;
const secondAddress = "0x92fedfc12357771c3f4cf2374714904f3690fbe1";
const amGHSTHolder = "0xd553294b42bdfeb49d8f5a64e8b2d3a65fc673a9";

describe("Perform all staking calculations", async function () {
  before(async function () {
    this.timeout(200000000);

    console.log("upgrading");
    await upgrade();

    //get deployed contract addresses
    deployedAddresses = await deploy();

    //set signer
    const accounts = await ethers.getSigners();
    overDraft = "10000000000000000000000"; //10000ghst
    let testing = ["hardhat", "localhost"].includes(network.name);
    let signer: Signer;

    if (testing) {
      await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [ghstOwner],
      });
      signer = await ethers.provider.getSigner(ghstOwner);
      amGHSTsigner = await ethers.provider.getSigner(amGHSTHolder);
    } else if (network.name === "matic") {
      signer = accounts[0];
    } else {
      throw Error("Incorrect network selected");
    }

    ghstContract = (await ethers.getContractAt(
      "contracts/test/GHST/ERC20.sol:ERC20",
      GHST,
      signer
    )) as ERC20;

    amGHSTContract = (await ethers.getContractAt(
      "contracts/test/GHST/ERC20.sol:ERC20",
      amGHST,
      amGHSTsigner
    )) as ERC20;

    stakeFacet = await ethers.getContractAt(
      "StakingFacet",
      stakingDiamond,
      signer
    );
  });

  it("User can wrap ghst and stake in the same transaction", async function () {
    //user approves router to spend his ghst
    await ghstContract.approve(
      deployedAddresses.router.address,
      sufficientAmnt
    );

    //user needs to approve staking diamond to spend wAmGhst
    await deployedAddresses.wamGHST.approve(stakingDiamond, sufficientAmnt);

    //user also approves router diamond to spend wAmGhst
    // await deployedAddresses.wAmGHST.approve(
    //   deployedAddresses.router.address,
    //   sufficientAmnt
    // );

    //depositing ghst into the router contract
    //THIS SHOULD REVERT
    await expect(
      deployedAddresses.router.wrapAndDeposit(
        sufficientAmnt,
        secondAddress,
        true
      )
    ).to.be.revertedWith("StakingFacet: Not authorized");

    await deployedAddresses.router.wrapAndDeposit(
      sufficientAmnt,
      ghstOwner,
      true
    );

    let frens = await stakeFacet.frens(ghstOwner);
    //frens should be 0
    console.log("before frens:", frens.toString());

    //increase by a day
    ethers.provider.send("evm_increaseTime", [86400]);
    ethers.provider.send("evm_mine", []);

    frens = await stakeFacet.frens(ghstOwner);
    //frens should be approx 1000
    console.log("after frens:", frens.toString());
  });

  it("User can unwrap stkwamghst and get ghst back in the same txn", async function () {
    const balBefore = await ghstContract.balanceOf(ghstOwner);
    console.log("bal before", balBefore);
    //@ts-ignore
    const pools = await stakeFacet.stakedInEpoch(
      ghstOwner,
      await stakeFacet.currentEpoch()
    );
    // console.log("Pool is", pools);

    //withdrawing stkwamghst from staking diamond
    //SHOULD REVERT
    await expect(
      deployedAddresses.router.unwrapAndWithdraw(
        pools[0].amount,
        secondAddress,
        true
      )
    ).to.be.revertedWith("StakingFacet: Not authorized");

    await deployedAddresses.router.unwrapAndWithdraw(
      pools[0].amount,
      ghstOwner,
      true
    );

    const balAfter = await ghstContract.balanceOf(ghstOwner);
    console.log("ghst balance after", balAfter);

    // //check wmatic balance
    // const matic=await ethers.getContractAt("contracts/test/GHST/ERC20.sol:ERC20","0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270");
    // console.log(await (await matic.balanceOf(deployedAddresses.wamGHST.address)).toString())
  });

  it("Allow direct deposit of amGHST and withdrawal to amGHST", async function () {
    //deposit amGHST directly from account with no amGHST
    //SHOULD FAIL
    await expect(
      deployedAddresses.router.wrapAndDeposit(sufficientAmnt, ghstOwner, false)
    ).to.be.revertedWith("ERC20: transfer amount exceeds balance");

    //deposit amGHST with account that has sufficient amGHST
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [amGHSTHolder],
    });

    //approve router to spend amGHST and wamGHST
    await amGHSTContract.approve(
      deployedAddresses.router.address,
      sufficientAmnt
    );

    await deployedAddresses.wamGHST
      .connect(amGHSTsigner)
      .approve(stakingDiamond, "1000000000000000000000000");

    console.log(
      `amGHST balance before`,
      await amGHSTContract.balanceOf(amGHSTHolder)
    );

    await deployedAddresses.router
      .connect(amGHSTsigner)
      .wrapAndDeposit(sufficientAmnt, amGHSTHolder, false);

    //increase by a day
    ethers.provider.send("evm_increaseTime", [86400]);
    ethers.provider.send("evm_mine", []);
    console.log(await stakeFacet.frens(amGHSTHolder));

    const pools = await stakeFacet.stakedInEpoch(
      amGHSTHolder,
      await stakeFacet.currentEpoch()
    );
    console.log("amount to withdraw", pools[0].amount);
    //withdrawal
    await deployedAddresses.router
      .connect(amGHSTsigner)
      .unwrapAndWithdraw(pools[0].amount, amGHSTHolder, false);
    console.log(
      `amGHST balance after`,
      await amGHSTContract.balanceOf(amGHSTHolder)
    );
  });
  it("Make sure StakingFacet is still secure", async function () {
    //user needs to approve staking diamond to spend GHST
    await ghstContract.approve(stakingDiamond, overDraft);

    //user tries to stake GHST for someone else
    await expect(
      stakeFacet.stakeIntoPoolForUser(GHST, sufficientAmnt, secondAddress)
    ).to.be.revertedWith("StakingFacet: Not authorized");

    //user stakes GHST for himself
    await stakeFacet.stakeGhst(sufficientAmnt);

    //user tries to withdraw GHST for someone else
    await expect(
      stakeFacet.withdrawFromPoolForUser(GHST, sufficientAmnt, secondAddress)
    ).to.be.revertedWith("StakingFacet: Not authorized");

    //user tries to withdraw more than he staked
    await expect(
      stakeFacet.withdrawFromPoolForUser(GHST, overDraft, ghstOwner)
    ).to.be.revertedWith(
      "StakingFacet: Can't withdraw more tokens than staked"
    );

    //user can withdraw his ghst normally
    await stakeFacet.withdrawFromPool(GHST, sufficientAmnt);
  });
});
