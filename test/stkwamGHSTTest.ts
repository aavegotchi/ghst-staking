import { impersonate, maticStakingAddress } from "../scripts/helperFunctions";
import {
  ERC20,
  StakingFacet,
  WrappedAToken,
  WrappedATokenRouter,
  ReceiptToken,
} from "../typechain";
import { expect } from "chai";
import { network } from "hardhat";
import { ethers } from "hardhat";
import {
  contractAddresses,
  ghstOwner,
  sufficientAmnt,
} from "../scripts/deploystkwamGHST";
import {
  amGHSTV2,
  amGHSTV3,
  ghstAddress,
  lendingPoolV2,
  lendingPoolV3,
  stakingDiamond,
  rewardsControllerV3,
  daoTreasury,
} from "../helpers/constants";
import { Signer, BigNumber } from "ethers";

const { deploy } = require("../scripts/deploystkwamGHST");

let deployedAddresses: contractAddresses;
let ghstContract: ERC20;
let amGHSTContract: ERC20;
let receiptToken: ReceiptToken;
let amGHSTSigner: Signer;
let wamGHST: WrappedAToken;
let ghstSigner: Signer;
let router: WrappedATokenRouter;
let junkSigner: Signer;
const secondAddress = "0x92fedfc12357771c3f4cf2374714904f3690fbe1";
const amGHSTHolder = "0x40bcbA5032F5f7746835ADd89CE9025D8593d20A";

describe("Perform all staking calculations", async function () {
  before(async function () {
    this.timeout(200000000);

    deployedAddresses = await deploy();
    receiptToken = deployedAddresses.stkwamGHST;
    //set signer
    const accounts = await ethers.getSigners();
    let testing = ["hardhat", "localhost"].includes(network.name);

    if (testing) {
      await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [ghstOwner],
      });
      await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [amGHSTHolder],
      });
      ghstSigner = await ethers.provider.getSigner(ghstOwner);
      amGHSTSigner = await ethers.provider.getSigner(amGHSTHolder);
    } else if (network.name === "matic") {
      ghstSigner = accounts[0];
    } else {
      throw Error("Incorrect network selected");
    }
    amGHSTContract = (await ethers.getContractAt(
      "contracts/test/GHST/ERC20.sol:ERC20",
      amGHSTV3,
      amGHSTSigner
    )) as ERC20;
    console.log("wamghst:", deployedAddresses);

    wamGHST = await ethers.getContractAt(
      "WrappedAToken",
      deployedAddresses.wamGHST.address
    );
    router = await ethers.getContractAt(
      "WrappedATokenRouter",
      deployedAddresses.router.address
    );
    ghstContract = (await ethers.getContractAt(
      "contracts/test/GHST/ERC20.sol:ERC20",
      ghstAddress
    )) as ERC20;
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
  it("Should be able to stake through the router with atokens", async () => {
    const amount = ethers.utils.parseEther("1");
    await amGHSTContract.connect(amGHSTSigner).approve(router.address, amount);
    await wamGHST.connect(amGHSTSigner).approve(stakingDiamond, amount);
    await router
      .connect(amGHSTSigner)
      .wrapAndDeposit(amount, await amGHSTSigner.getAddress(), false);
  });
  it("Should be able to stake through the router with GHST", async () => {
    const amount = ethers.utils.parseEther("1");
    await ghstContract.connect(ghstSigner).approve(router.address, amount);
    await wamGHST.connect(ghstSigner).approve(stakingDiamond, amount);
    await router
      .connect(ghstSigner)
      .wrapAndDeposit(amount, await ghstSigner.getAddress(), true);
  });
  it("Should be able to unstake through the router to get aTokens", async () => {
    const oldATokenBalance = await amGHSTContract.balanceOf(
      await amGHSTSigner.getAddress()
    );
    const amount = await receiptToken.balanceOf(
      await amGHSTSigner.getAddress()
    );
    await wamGHST.connect(amGHSTSigner).approve(router.address, amount);
    await router
      .connect(amGHSTSigner)
      .unwrapAndWithdraw(amount, await amGHSTSigner.getAddress(), false);

    expect(
      (await amGHSTContract.balanceOf(await amGHSTSigner.getAddress())).sub(
        oldATokenBalance
      )
    ).to.be.gt(ethers.utils.parseEther("0.9999"));
  });
  it("Should be able to unstake through the router to get GHST", async () => {
    const oldGHSTBalance = await ghstContract.balanceOf(
      await ghstSigner.getAddress()
    );
    const amount = await receiptToken.balanceOf(await ghstSigner.getAddress());
    await wamGHST.connect(ghstSigner).approve(router.address, amount);
    await router
      .connect(ghstSigner)
      .unwrapAndWithdraw(amount, await ghstSigner.getAddress(), true);
    expect(
      (await ghstContract.balanceOf(await ghstSigner.getAddress())).sub(
        oldGHSTBalance
      )
    ).to.be.gt(ethers.utils.parseEther("0.9999"));
  });

  it("Should make an empty wamGHST contract", async () => {
    const WamGHST = await ethers.getContractFactory("WrappedAToken");
    wamGHST = (await WamGHST.connect(ghstSigner).deploy()) as WrappedAToken;
    const aToken = await ethers.getContractAt(
      "contracts/interfaces/IERC20.sol:IERC20",
      amGHSTV3,
      ghstSigner
    );
    await aToken.approve(wamGHST.address, ethers.utils.parseEther("0.1"));
    await wamGHST
      .connect(ghstSigner)
      .initialize(
        amGHSTV3,
        rewardsControllerV3,
        daoTreasury,
        amGHSTHolder,
        0,
        "Wrapped AAVE Polygon GHST",
        "WaPolGHST"
      );
    let amGHSTSignerBalance = await amGHSTContract.balanceOf(
      await amGHSTSigner.getAddress()
    );
    await amGHSTContract
      .connect(amGHSTSigner)
      .approve(wamGHST.address, amGHSTSignerBalance);
  });

  it("Should deposit 10 atokens and receive wamGHST 1:1", async () => {
    const depositAmount = ethers.utils.parseEther("10");
    await wamGHST.connect(amGHSTSigner).enter(depositAmount);
    expect(await wamGHST.balanceOf(await amGHSTSigner.getAddress())).to.equal(
      depositAmount
    );
    expect(await amGHSTContract.balanceOf(wamGHST.address)).to.be.gte(
      depositAmount
    );
  });

  it("Should withdraw at least 5 aTokens, and the contract must retain at least 5 aTokens", async () => {
    const redemptionAmount = ethers.utils.parseEther("5");
    const balanceBefore = await amGHSTContract.balanceOf(
      await amGHSTSigner.getAddress()
    );
    await wamGHST.connect(amGHSTSigner).leave(redemptionAmount);
    expect(await wamGHST.balanceOf(await amGHSTSigner.getAddress())).to.equal(
      redemptionAmount
    );
    expect(
      await amGHSTContract.balanceOf(await amGHSTSigner.getAddress())
    ).to.be.gte(balanceBefore.add(redemptionAmount));
    expect(await amGHSTContract.balanceOf(wamGHST.address)).to.be.gte(
      redemptionAmount
    );
  });
  it("Should withdraw the rest of the aTokens", async () => {
    const redemptionAmount = ethers.utils.parseEther("5");
    await wamGHST.connect(amGHSTSigner).leave(redemptionAmount);
    expect(await wamGHST.balanceOf(await amGHSTSigner.getAddress())).to.equal(
      0
    );
    expect(await amGHSTContract.balanceOf(wamGHST.address)).to.equal(0);
  });
  it(
    "Should be able to claim rewards (Difficult to test, and likely not necessary to test tbh)"
  );
});
