import { ethers } from "hardhat";

const lzEndpointAddressGotchichain = process.env
  .LZ_ENDPOINT_ADDRESS_GOTCHICHAIN;

// validate env variables


async function main() {
  const tickets = await deployTestGotchichain();
  await deployBridge(tickets.address);
}

async function deployTestGotchichain() {
  console.log("Deploying Tickets");

  const accounts = await ethers.getSigners();
  const signer = accounts[0];

  const ticketsFactory = await ethers.getContractFactory("Tickets", signer);
  const tickets = await ticketsFactory.deploy();

  await tickets.deployed();

  console.log("Tickets contract deployed to:", tickets.address);

  return tickets;
}

async function deployBridge(ticketsAddress: string) {
  if (!lzEndpointAddressGotchichain) {
    throw new Error("LZ_ENDPOINT_ADDRESS_GOTCHICHAIN env variable not set");
  }
  const BridgeGotchichainSide = await ethers.getContractFactory(
    "TicketsBridgeGotchichainSide"
  );

  const bridgeGotchichainSide = await BridgeGotchichainSide.deploy(
    lzEndpointAddressGotchichain,
    ticketsAddress
  );
  await bridgeGotchichainSide.deployed();

  console.log(
    "BridgeGotchichainSide deployed to:",
    bridgeGotchichainSide.address
  );
  return bridgeGotchichainSide;
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
