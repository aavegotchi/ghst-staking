import { LedgerSigner } from "@anders-t/ethers-ledger";
import { ethers } from "hardhat";
import { WrappedAToken } from "../typechain";

async function main() {
  const signer = new LedgerSigner(ethers.provider);

  const contractAddress = "0x73958d46B7aA2bc94926d8a215Fa560A5CdCA3eA";
  const ownershipFacet = (await ethers.getContractAt(
    "WrappedAToken",
    contractAddress,
    signer
  )) as WrappedAToken;

  // console.log("powneraship:", ownershipFacet);

  const owner = await ownershipFacet.owner();
  console.log("Old owner:", owner);

  // 0x258cC4C495Aef8D809944aD94C6722ef41216ef3
  const newOwner = "0x258cC4C495Aef8D809944aD94C6722ef41216ef3";

  const tx = await ownershipFacet.transferOwnership(newOwner);
  console.log("Transferring to new owner. Hash:", tx.hash);
  const receipt = await tx.wait();
  if (!receipt.status) {
    throw Error(`Transaction failed: ${tx.hash}`);
  }
  console.log("Accounts updated successfully");
  console.log(tx);
  console.log("New owner:", await ownershipFacet.owner());
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
