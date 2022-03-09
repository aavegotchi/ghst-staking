import { LedgerSigner } from "../../../aavegotchi-contracts/node_modules/@ethersproject/hardware-wallets/lib";
import { sendToMultisig } from "../libraries/multisig/multisig";
import { ethers, network } from "hardhat";
import { StakingFacet, TicketsFacet } from "../../typechain";
import { Signer } from "ethers";

async function main() {
  const diamondAddress = "0xA02d547512Bb90002807499F05495Fe9C4C3943f";
  let signer: Signer;
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
    //@ts-ignore
    signer = new LedgerSigner(ethers.provider);
  } else {
    throw Error("Incorrect network selected");
  }

  let ticketsFacet = (await ethers.getContractAt(
    "TicketsFacet",
    diamondAddress,
    signer
  )) as TicketsFacet;
  let tx;
  let receipt;

  const currentURI = await ticketsFacet.uri("0");
  console.log("current uri:", currentURI);

  const newURI = "https://app.aavegotchi.com/metadata/polygon/tickets/";

  if (testing) {
    tx = await ticketsFacet.setBaseURI(newURI);

    receipt = await tx.wait();
    if (!receipt.status) {
      throw Error(`Updating URI failed ${tx.hash}`);
    }
    console.log("Updating base URI succeeded succeeded:", tx.hash);

    const setURI = await ticketsFacet.uri("0");
    console.log("new uri:", setURI);
  } else {
    tx = await ticketsFacet.populateTransaction.setBaseURI(newURI);

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
