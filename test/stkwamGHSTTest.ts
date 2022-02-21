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
} from "../scripts/deploystkwamGHST";
import { Signer } from "ethers";

const { upgrade } = require("../scripts/upgrades/upgrade-wamGHST");
const { deploy } = require("../scripts/deploystkwamGHST");

let deployedAddresses: contractAddresses;
let ghstContract: ERC20;
let stakeFacet: StakingFacet;
let overDraft: string;
const secondAddress = "0x92fedfc12357771c3f4cf2374714904f3690fbe1";

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
      deployedAddresses.router.wrapAndDeposit(sufficientAmnt, secondAddress)
    ).to.be.revertedWith("StakingFacet: Not authorized");

    await deployedAddresses.router.wrapAndDeposit(sufficientAmnt, ghstOwner);

    let frens = await stakeFacet.frens(ghstOwner);
    //frens should be 86400
    console.log("before frens:", frens.toString());

    //increase by a day
    ethers.provider.send("evm_increaseTime", [86400]);
    ethers.provider.send("evm_mine", []);

    frens = await stakeFacet.frens(ghstOwner);
    //frens should be approx 1000
    console.log("after frens:", frens.toString());
  });

  it("User can unwwrap stkWAmghst and get ghst back in the same txn", async function () {
    let balBefore = await ghstContract.balanceOf(ghstOwner);
    console.log("bal before", balBefore);
    //@ts-ignore
    const pools = await stakeFacet.stakedInEpoch(
      ghstOwner,
      await stakeFacet.currentEpoch()
    );
    console.log("Pool is", pools);

    //withdrawing stkWAmghst from staking diamond
    //SHOULD REVERT
    await expect(
      deployedAddresses.router.unwrapAndWithdraw(pools[0].amount, secondAddress)
    ).to.be.revertedWith("StakingFacet: Not authorized");

    await deployedAddresses.router.unwrapAndWithdraw(
      pools[0].amount,
      ghstOwner
    );

    const balAfter = await ghstContract.balanceOf(ghstOwner);
    console.log("ghst balance after", balAfter);

    // //check wmatic balance
    // const matic=await ethers.getContractAt("contracts/test/GHST/ERC20.sol:ERC20","0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270");
    // console.log(await (await matic.balanceOf(deployedAddresses.wamGHST.address)).toString())
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
