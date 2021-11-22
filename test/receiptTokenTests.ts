import { ReceiptToken } from "../typechain";
import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber } from "@ethersproject/bignumber";

let receiptTokenAddress: string;
let receiptContract;
let minter: string;
let address2: string;
const testAmount: BigNumber = ethers.utils.parseEther("1");
const overDraft: BigNumber = ethers.utils.parseEther("1.1");

let receiptTokenContract: ReceiptToken;

describe("Deploy ReceiptToken and Test", async function () {
  before(async function () {
    //deploy locally,use first address as minter
    const addresses = await ethers.getSigners();

    minter = addresses[0].address;
    address2 = addresses[1].address;
    receiptContract = await ethers.getContractFactory("ReceiptToken");
    receiptContract = receiptContract.deploy(minter, "GHSTRECIPT", "RCPT");
    await (await receiptContract).deployed();
    receiptTokenAddress = (await receiptContract).address;
    console.log("deployed receipt token to", receiptTokenAddress);

    this.timeout(2000000000);

    receiptTokenContract = (await ethers.getContractAt(
      "ReceiptToken",
      receiptTokenAddress
    )) as ReceiptToken;
  });

  it("Only minter can mint tokens", async function () {
    const signer = await ethers.getSigner(address2);
    await expect(
      receiptTokenContract.connect(signer).mint(minter, testAmount)
    ).to.be.revertedWith("Must be minter to mint");
  });

  it("Should mint tokens to user", async function () {
    let balBefore = await receiptTokenContract.balanceOf(address2);

    //assuming all conditions are met from the authorised minting contracts
    await receiptTokenContract.mint(address2, testAmount);
    let balAfter = await receiptTokenContract.balanceOf(address2);
    expect(balAfter).to.equal(testAmount);
  });

  it("Only minter can burn tokens(less than or equal of owner's balance)", async function () {
    const signer = await ethers.getSigner(address2);

    //make sure only minter can burn
    await expect(
      receiptTokenContract.connect(signer).burn(minter, testAmount)
    ).to.be.revertedWith("Must be minter to burn");

    //assume minter role is satisfied
    await expect(
      receiptTokenContract.burn(minter, overDraft)
    ).to.be.revertedWith("Can't burn more than person has");

    //assume the amount limit is satisfied
    await receiptTokenContract.burn(address2, testAmount);
    let balAfter = await receiptTokenContract.balanceOf(address2);
    expect(balAfter).to.equal(0);

    //refuel his token balance
    await receiptTokenContract.mint(address2, testAmount);
  });

  it("Allow owner of tokens to perform token transfers and approvals)", async function () {
    const signer = await ethers.getSigner(address2);

    //make sure owner can only transfer less than or equal to his tokens
    await expect(
      receiptTokenContract.connect(signer).transfer(address2, overDraft)
    ).to.be.revertedWith("Not enough ReceiptToken to transfer");

    // quickly confirm approval changes
    await receiptTokenContract.connect(signer).approve(minter, testAmount);
    expect(await receiptTokenContract.allowance(address2, minter)).to.equal(
      testAmount
    );

    //perform token transfer and make sure approval decreases
    const tx = await receiptTokenContract.transferFrom(
      address2,
      minter,
      testAmount
    );
    await tx.wait();
    expect(await receiptTokenContract.allowance(address2, minter)).to.equal(0);

    //refuel his token balance
    await receiptTokenContract.mint(address2, testAmount);

    //test allowance increase
    await receiptTokenContract
      .connect(signer)
      .increaseAllowance(minter, overDraft);
    expect(await receiptTokenContract.allowance(address2, minter)).to.equal(
      overDraft
    );

    //test allowance decrease
    await receiptTokenContract
      .connect(signer)
      .decreaseAllowance(minter, testAmount);

    expect(await receiptTokenContract.allowance(address2, minter)).to.equal(
      ethers.utils.parseEther("0.1")
    );
  });

  it("Only minter can set  new minters)", async function () {
    const signer = await ethers.getSigner(address2);

    //make sure only minter can burn
    await expect(
      receiptTokenContract.connect(signer).setMinter(address2)
    ).to.be.revertedWith("Must be minter to change minter");

    //assume minter role is satisfied
    await receiptTokenContract.setMinter(address2);

    //now set minter with new minter
    await receiptTokenContract
      .connect(signer)
      .setMinter(ethers.constants.AddressZero);
  });
});
