import { ethers } from "hardhat";

const lzChainIdMumbai = process.env.LZ_CHAIN_ID_MUMBAI as string;
const bridgePolygonSide = process.env.BRIDGE_POLYGON_ADDRESS as string;
const bridgeGotchichainAddress = process.env
  .BRIDGE_GOTCHICHAIN_ADDRESS as string;
const ticketsAddress = process.env.TICKETS_ADDRESS as string;

// validate env variables
if (!lzChainIdMumbai) {
  throw new Error("LZ_CHAIN_ID_MUMBAI env variable not set");
}
if (!bridgePolygonSide) {
  throw new Error("BRIDGE_POLYGON_ADDRESS env variable not set");
}
if (!bridgeGotchichainAddress) {
  throw new Error("BRIDGE_GOTCHICHAIN_ADDRESS env variable not set");
}
if (!ticketsAddress) {
  throw new Error("TICKETS_ADDRESS env variable not set");
}

async function main() {
  await setupBridge();
}

async function setupBridge() {
  const bridgeGotchichainSide = await ethers.getContractAt(
    "TicketsBridgeGotchichainSide",
    bridgeGotchichainAddress
  );

  const tickets = await ethers.getContractAt("Tickets", ticketsAddress);

  console.log(`Setting trusted remote`);
  let tx = await bridgeGotchichainSide.setTrustedRemote(
    lzChainIdMumbai,
    ethers.utils.solidityPack(
      ["address", "address"],
      [bridgePolygonSide, bridgeGotchichainSide.address]
    )
  );
  console.log(`tx hash: ${tx.hash}`);
  await tx.wait();

  console.log(`Setting min dst gas`);
  tx = await bridgeGotchichainSide.setMinDstGas(lzChainIdMumbai, 1, 35000);
  console.log(`tx hash: ${tx.hash}`);
  await tx.wait();

  console.log(`Setting use custom adapter params`);
  tx = await bridgeGotchichainSide.setUseCustomAdapterParams(true);
  console.log(`tx hash: ${tx.hash}`);
  await tx.wait();

  console.log(`Setting layer zero bridge address`);
  tx = await tickets.setLayerZeroBridge(bridgeGotchichainSide.address);
  console.log(`tx hash: ${tx.hash}`);
  await tx.wait();
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
