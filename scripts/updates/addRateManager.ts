import { LedgerSigner } from "../../../aavegotchi-contracts/node_modules/@ethersproject/hardware-wallets";
import { sendToMultisig } from "../libraries/multisig/multisig";
import { ethers, network } from "hardhat";
import { StakingFacet } from "../../typechain";

async function main() {
  const diamondAddress = "0xA02d547512Bb90002807499F05495Fe9C4C3943f";
  let signer;
  let owner = await (
    await ethers.getContractAt("OwnershipFacet", diamondAddress)
  ).owner();
  const testing = ["hardhat", "localhost"].includes(network.name);
  if (testing) {
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [owner],
    });
    signer = await ethers.provider.getSigner(owner);
  } else if (network.name === "matic") {
    signer = new LedgerSigner(ethers.provider);
  } else {
    throw Error("Incorrect network selected");
  }

  let stakingFacet = (await ethers.getContractAt(
    "StakingFacet",
    diamondAddress,
    signer
  )) as StakingFacet;
  let tx;
  let receipt;

  let rateManager;

  if (testing) {
    rateManager = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";
  } else {
    rateManager = "0xa370f2ADd2A9Fba8759147995d6A0641F8d7C119";
  }

  let rateManagers = [rateManager];
  console.log("Adding item managers");

  if (testing) {
    tx = await stakingFacet.addRateManagers(rateManagers);
    console.log("Adding rate managers tx:", tx.hash);
    receipt = await tx.wait();
    if (!receipt.status) {
      throw Error(`Adding rate manager failed: ${tx.hash}`);
    }
    console.log("Adding rate manager succeeded:", tx.hash);
  } else {
    tx = await stakingFacet.populateTransaction.addRateManagers(rateManagers);

    //@ts-ignore
    await sendToMultisig(process.env.DIAMOND_UPGRADER, signer, tx, ethers);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
