import { impersonate, maticStakingAddress } from "../scripts/helperFunctions";
import { ERC20, StakingFacet, WrappedAToken } from "../typechain";
import { expect } from "chai";
import { network } from "hardhat";
import { ethers } from "hardhat";
import {
  contractAddresses,
  GHST,
  ghstOwner,
  stakingDiamond,
  sufficientAmnt,
  amGHSTv2,
} from "../scripts/deploystkwamGHST";
import { Signer, BigNumber } from "ethers";

const { deploy } = require("../scripts/deploystkwamGHST");

let deployedAddresses: contractAddresses;
let amGHSTContract: ERC20;
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

    deployedAddresses = await deploy();

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
      signer = await ethers.provider.getSigner(ghstOwner);
      amGHSTsigner = await ethers.provider.getSigner(amGHSTHolder);
    } else if (network.name === "matic") {
      signer = accounts[0];
    } else {
      throw Error("Incorrect network selected");
    }
    amGHSTContract = (await ethers.getContractAt(
      "contracts/test/GHST/ERC20.sol:ERC20",
      amGHSTv2,
      amGHSTsigner
    )) as ERC20;
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

  it("Should make an empty wamGHST contract", async () => {
    const WamGHST = await ethers.getContractFactory("WrappedAToken");
    wamGHST = (await WamGHST.connect(signer).deploy()) as WrappedAToken;
    console.log(await signer.getAddress());
    const aToken = await ethers.getContractAt(
      "contracts/interfaces/IERC20.sol:IERC20",
      amGHSTv2,
      signer
    );
    await aToken.approve(wamGHST.address, ethers.utils.parseEther("0.1"));
    await wamGHST
      .connect(signer)
      .initialize(
        amGHSTv2,
        rewardsController,
        daoTreasury,
        amGHSTHolder,
        0,
        "Wrapped AAVE Polygon GHST",
        "WaPolGHST"
      );
    console.log("amGHST balance of signer");
    let amGHSTSignerBalance = await amGHSTContract.balanceOf(
      await amGHSTsigner.getAddress()
    );
    await amGHSTContract
      .connect(amGHSTsigner)
      .approve(wamGHST.address, amGHSTSignerBalance);
    console.log(amGHSTSignerBalance.toString());
  });

  it("Should deposit 10 atokens and receive wamGHST 1:1", async () => {
    const depositAmount = ethers.utils.parseEther("10");
    await wamGHST.connect(amGHSTsigner).enter(depositAmount);
    expect(await wamGHST.balanceOf(await amGHSTsigner.getAddress())).to.equal(
      depositAmount
    );
    expect(await amGHSTContract.balanceOf(wamGHST.address)).to.be.gte(
      depositAmount
    );
  });

  it("Should withdraw at least 5 aTokens, and the contract must retain at least 5 aTokens", async () => {
    const redemptionAmount = ethers.utils.parseEther("5");
    const balanceBefore = await amGHSTContract.balanceOf(
      await amGHSTsigner.getAddress()
    );
    await wamGHST.connect(amGHSTsigner).leave(redemptionAmount);
    expect(await wamGHST.balanceOf(await amGHSTsigner.getAddress())).to.equal(
      redemptionAmount
    );
    expect(
      await amGHSTContract.balanceOf(await amGHSTsigner.getAddress())
    ).to.be.gte(balanceBefore.add(redemptionAmount));
    expect(await amGHSTContract.balanceOf(wamGHST.address)).to.be.gte(
      redemptionAmount
    );
  });
  it("Should withdraw the rest of the aTokens", async () => {
    const redemptionAmount = ethers.utils.parseEther("5");
    await wamGHST.connect(amGHSTsigner).leave(redemptionAmount);
    expect(await wamGHST.balanceOf(await amGHSTsigner.getAddress())).to.equal(
      0
    );
    expect(await amGHSTContract.balanceOf(wamGHST.address)).to.equal(0);
  });
  it(
    "Should be able to claim rewards (Difficult to test, and likely not necessary to test tbh)"
  );
});
