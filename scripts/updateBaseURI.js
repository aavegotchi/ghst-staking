const {
  LedgerSigner,
} = require("../../aavegotchi-contracts/node_modules/@ethersproject/hardware-wallets");
const { sendToMultisig } = require("./libraries/multisig/multisig.js");

let gasPrice = 20000000000;

async function main() {
  const diamondAddress = "0xA02d547512Bb90002807499F05495Fe9C4C3943f";
  let signer;

  const owner = await (
    await ethers.getContractAt("OwnershipFacet", diamondAddress)
  ).owner();

  const testing = ["hardhat", "localhost"].includes(hre.network.name);

  if (testing) {
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [owner],
    });
    signer = await ethers.getSigner(owner);
  } else if (hre.network.name === "matic") {
    signer = new LedgerSigner(ethers.provider);
  } else {
    throw Error("Incorrect network selected");
  }

  const ticketContract = await ethers.getContractAt(
    "TicketsFacet",
    diamondAddress,
    signer
  );

  let uri = await ticketContract.uri("0");

  console.log("current:", uri);

  const newURI = "https://aavegotchi.com/metadata/polygon/tickets/";

  if (testing) {
    await ticketContract.setBaseURI(newURI);

    uri = await ticketContract.uri("0");

    console.log("uri:", uri);
  } else {
    console.log("Updating URI ");
    tx = await ticketContract.populateTransaction.setBaseURI(newURI, {
      gasLimit: 800000,
    });
    await sendToMultisig(process.env.DIAMOND_UPGRADER, signer, tx);
  }
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    // .then(() => console.log('upgrade completed') /* process.exit(0) */)
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
exports.deployRateManager = main;
