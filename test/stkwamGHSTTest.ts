import { impersonate, maticStakingAddress } from "../scripts/helperFunctions";
import { ERC20, StakingFacet, WrappedAToken } from "../typechain";
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
  amGHSTv2,
  aaveLendingContract,
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
let wamGHST: WrappedAToken;
let signer: Signer;
let junkSigner: Signer;
const secondAddress = "0x92fedfc12357771c3f4cf2374714904f3690fbe1";
const amGHSTHolder = "0x40bcbA5032F5f7746835ADd89CE9025D8593d20A";
const daoTreasury = "0x6fb7e0AAFBa16396Ad6c1046027717bcA25F821f";
const rewardsController = "0x929EC64c34a17401F460460D4B9390518E5B473e";

describe("Perform all staking calculations", async function () {
  before(async function () {
    this.timeout(200000000);

    // console.log("upgrading");
    // await upgrade();

    //get deployed contract addresses
    deployedAddresses = await deploy();

    //set signer
    const accounts = await ethers.getSigners();
    overDraft = "10000000000000000000000"; //10000ghst
    let testing = ["hardhat", "localhost"].includes(network.name);

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
      amGHSTv2,
      amGHSTsigner
    )) as ERC20;

    stakeFacet = await ethers.getContractAt(
      "StakingFacet",
      stakingDiamond,
      signer
    );

    console.log("wamghst:", deployedAddresses);

    wamGHST = await ethers.getContractAt(
      "WrappedAToken",
      deployedAddresses.wamGHST.address
    );
  });

  it("Owner should be deployer", async function () {
    const owner = await wamGHST.owner();
    expect(owner.toLowerCase()).to.equal(ghstOwner.toLowerCase());
  });

  it("Non-owner cannot change owner", async function () {
    wamGHST = await impersonate(secondAddress, wamGHST, ethers, network);
    await expect(wamGHST.transferOwnership(secondAddress)).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );
  });

  it("Owner can change owner", async function () {
    wamGHST = await impersonate(ghstOwner, wamGHST, ethers, network);
    await wamGHST.transferOwnership(secondAddress);
    const owner = await wamGHST.owner();
    expect(owner.toLowerCase()).to.equal(secondAddress.toLowerCase());
  });

  // it("User can wrap ghst and stake in the same transaction", async function () {
  //   //user approves router to spend his ghst
  //   await ghstContract.approve(
  //     deployedAddresses.router.address,
  //     "1000000000000000000000000000"
  //   );
  //   //aprove router to spend wamGHST
  //   await deployedAddresses.wamGHST.approve(
  //     deployedAddresses.router.address,
  //     "1000000000000000000000000000"
  //   );

  //   //user needs to approve staking diamond to spend wAmGhst
  //   await deployedAddresses.wamGHST.approve(stakingDiamond, sufficientAmnt);

  //   //user also approves router diamond to spend wAmGhst
  //   // await deployedAddresses.wAmGHST.approve(
  //   //   deployedAddresses.router.address,
  //   //   sufficientAmnt
  //   // );

  //   //depositing ghst into the router contract
  //   //THIS SHOULD REVERT
  //   await expect(
  //     deployedAddresses.router.wrapAndDeposit(
  //       sufficientAmnt,
  //       secondAddress,
  //       true
  //     )
  //   ).to.be.revertedWith("StakingFacet: Not authorized");

  //   await deployedAddresses.router.wrapAndDeposit(
  //     sufficientAmnt,
  //     ghstOwner,
  //     true
  //   );

  //   let frens = await stakeFacet.frens(ghstOwner);
  //   //frens should be 0
  //   console.log("before frens:", frens.toString());

  //   //increase by a day
  //   ethers.provider.send("evm_increaseTime", [86400]);
  //   ethers.provider.send("evm_mine", []);

  //   frens = await stakeFacet.frens(ghstOwner);
  //   //frens should be approx 1000
  //   console.log("after frens:", frens.toString());
  // });

  // it("User can unwrap stkwamghst and get ghst back in the same txn", async function () {
  //   const balBefore = await ghstContract.balanceOf(ghstOwner);
  //   console.log("bal before", balBefore);
  //   //@ts-ignore
  //   const pools = await stakeFacet.stakedInEpoch(
  //     ghstOwner,
  //     await stakeFacet.currentEpoch()
  //   );
  //   // console.log("Pool is", pools);

  //   //withdrawing stkwamghst from staking diamond
  //   //SHOULD REVERT
  //   await expect(
  //     deployedAddresses.router.unwrapAndWithdraw(
  //       pools[5].amount,
  //       secondAddress,
  //       true
  //     )
  //   ).to.be.revertedWith("StakingFacet: Not authorized");

  //   await deployedAddresses.router.unwrapAndWithdraw(
  //     pools[5].amount,
  //     ghstOwner,
  //     true
  //   );

  //   const balAfter = await ghstContract.balanceOf(ghstOwner);
  //   console.log("ghst balance after", balAfter);

  //   // //check wmatic balance
  //   // const matic=await ethers.getContractAt("contracts/test/GHST/ERC20.sol:ERC20","0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270");
  //   // console.log(await (await matic.balanceOf(deployedAddresses.wamGHST.address)).toString())
  // });

  // it("Allow direct deposit of amGHST and withdrawal to amGHST", async function () {
  //   //deposit amGHST directly from account with no amGHST
  //   //SHOULD FAIL
  //   await expect(
  //     deployedAddresses.router.wrapAndDeposit(sufficientAmnt, ghstOwner, false)
  //   ).to.be.revertedWith("ERC20: transfer amount exceeds balance");

  //   //deposit amGHST with account that has sufficient amGHST
  //   await network.provider.request({
  //     method: "hardhat_impersonateAccount",
  //     params: [amGHSTHolder],
  //   });

  //   //approve router to spend amGHST and wamGHST
  //   await amGHSTContract.approve(
  //     deployedAddresses.router.address,
  //     "10000000000000000000000000000000000000000000"
  //   );
  //   await deployedAddresses.wamGHST
  //     .connect(amGHSTsigner)
  //     .approve(
  //       deployedAddresses.router.address,
  //       "1000000000000000000000000000"
  //     );

  //   await deployedAddresses.wamGHST
  //     .connect(amGHSTsigner)
  //     .approve(stakingDiamond, "1000000000000000000000000000");

  //   console.log(
  //     `amGHST balance before`,
  //     await amGHSTContract.balanceOf(amGHSTHolder)
  //   );

  //   await deployedAddresses.router
  //     .connect(amGHSTsigner)
  //     .wrapAndDeposit(sufficientAmnt, amGHSTHolder, false);

  //   //increase by a day
  //   ethers.provider.send("evm_increaseTime", [86400]);
  //   ethers.provider.send("evm_mine", []);
  //   console.log(await stakeFacet.frens(amGHSTHolder));

  //   const pools = await stakeFacet.stakedInEpoch(
  //     amGHSTHolder,
  //     await stakeFacet.currentEpoch()
  //   );

  //   console.log("amount to withdraw", pools[5].amount);
  //   //withdrawal
  //   await deployedAddresses.router
  //     .connect(amGHSTsigner)
  //     .unwrapAndWithdraw(pools[5].amount, amGHSTHolder, false);
  //   console.log(
  //     `amGHST balance after`,
  //     await amGHSTContract.balanceOf(amGHSTHolder)
  //   );
  // });
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
  it("Allows only owners to withdraw", async function () {
    const bal1 = await amGHSTContract.balanceOf(secondAddress);

    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [amGHSTHolder],
    });
    //approve
    await amGHSTContract.approve(
      deployedAddresses.wamGHST.address,
      sufficientAmnt
    );

    //deposit some  amGHST for wamGHST directly
    await deployedAddresses.wamGHST
      .connect(amGHSTsigner)
      .enter("100000000000000000000");
    const ownerBalance1 = await deployedAddresses.wamGHST.balanceOf(
      amGHSTHolder
    );

    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [ghstOwner],
    });

    //you cannot withdraw for someone else
    await expect(deployedAddresses.wamGHST
      .connect(signer)
      .redeem("10000000000000000000", secondAddress, await signer.getAddress())).to.be.revertedWith("ERC20: burn amount exceeds balance");
    const ownerBalance2 = await deployedAddresses.wamGHST.balanceOf(
      amGHSTHolder
    );

    await deployedAddresses.wamGHST
      .connect(amGHSTsigner)
      .redeem("10000000000000000000", ghstOwner, await amGHSTsigner.getAddress());
    const bal2 = await amGHSTContract.balanceOf(secondAddress);
    //no balance change
    expect(bal1).to.equal(bal2);
    expect(ownerBalance1).to.equal(ownerBalance2);
  });


  it("Should make an empty wamGHST contract", async() => {
    const WamGHST = await ethers.getContractFactory("WrappedAToken");
    wamGHST = await WamGHST.deploy() as WrappedAToken;
    await wamGHST.initialize(
      amGHSTv2,
      rewardsController,
      daoTreasury,
      amGHSTHolder,
      "Wrapped AAVE Polygon GHST",
      "WaPolGHST",
    );
    console.log("amGHST balance of signer");
    let amGHSTSignerBalance = await amGHSTContract.balanceOf(await amGHSTsigner.getAddress());
    await amGHSTContract.connect(amGHSTsigner).approve(wamGHST.address, amGHSTSignerBalance);
    console.log(amGHSTSignerBalance.toString());
  });
  
  it("Should deposit 1000 atokens and receive wamGHST 1:1", async() => { 
    await wamGHST.connect(amGHSTsigner).enter(1000);
    expect(await wamGHST.balanceOf(await amGHSTsigner.getAddress())).to.equal(1000);
    expect(await amGHSTContract.balanceOf(wamGHST.address)).to.be.gte(1000);
  });

  it("Should withdraw at least 500 aTokens", async() => { 
    await wamGHST.connect(amGHSTsigner).leave(500);
    expect(await wamGHST.balanceOf(await amGHSTsigner.getAddress())).to.equal(500);
    expect(await amGHSTContract.balanceOf(wamGHST.address)).to.be.gte(500);
  });

  it("Should deposit 1000 with receipt token going to another address", async() => {
    junkSigner = await ethers.getSigner(ethers.utils.computeAddress(ethers.utils.keccak256(ethers.utils.hexlify(42069))));
    console.log((await wamGHST.totalSupply()).toString());
    console.log((await wamGHST.totalAssets()).toString());
    await wamGHST.connect(amGHSTsigner).deposit(1000, await junkSigner.getAddress());
    console.log((await wamGHST.totalSupply()).toString());
    console.log((await wamGHST.totalAssets()).toString());
    expect(await wamGHST.balanceOf(await junkSigner.getAddress())).to.be.gte(990);
    expect(await wamGHST.balanceOf(await junkSigner.getAddress())).to.be.lte(1000);
    expect(await amGHSTContract.balanceOf(wamGHST.address)).to.be.gte(1500);
  });

  it("Should withdraw 500 to another address", async() => {
    await wamGHST.connect(amGHSTsigner).redeem(500, await junkSigner.getAddress(), await amGHSTsigner.getAddress());
    expect(await wamGHST.balanceOf(await junkSigner.getAddress())).to.be.lte(1000);
    expect(await wamGHST.balanceOf(await junkSigner.getAddress())).to.be.gte(990);
    expect(await wamGHST.balanceOf(await amGHSTsigner.getAddress())).to.equal(0);
    expect(await amGHSTContract.balanceOf(wamGHST.address)).to.be.gte(1000);
    expect(await amGHSTContract.balanceOf(await junkSigner.getAddress())).to.be.gte(500);
  });

  it("Should not allow anyone but the owner to redeem");
  it("Should revert on deposit if the user doesn't have enough amtokens");
  it("Should not let aTokens be rescued");
  it("Should be able to claim rewards (Difficult to test, and likely not necessary to test tbh)");

});
