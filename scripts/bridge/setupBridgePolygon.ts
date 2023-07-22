import { ethers } from "hardhat";

const lzChainIdGotchichain = process.env.LZ_CHAIN_ID_GOTCHICHAIN as string;
const bridgeGotchichainSide = process.env.BRIDGE_GOTCHICHAIN_ADDRESS as string;
const bridgePolygonSideAddress = process.env
  .BRIDGE_POLYGON_ADDRESS as string;

async function main() {
  await setupBridge();
}

async function setupBridge() {
  const bridgePolygonSide = await ethers.getContractAt(
    "TicketsBridgeGotchichainSide",
    bridgePolygonSideAddress
  );

  console.log(`Setting trusted remote`);
  let tx = await bridgePolygonSide.setTrustedRemote(
    lzChainIdGotchichain,
    ethers.utils.solidityPack(
      ["address", "address"],
      [bridgePolygonSide.address, bridgeGotchichainSide]
    )
  );
  console.log(`tx hash: ${tx.hash}`);
  await tx.wait();

  console.log(`Setting min dst gas`);
  tx = await bridgePolygonSide.setMinDstGas(lzChainIdGotchichain, 1, 35000);
  console.log(`tx hash: ${tx.hash}`);
  await tx.wait();

  console.log(`Setting use custom adapter params`);
  tx = await bridgePolygonSide.setUseCustomAdapterParams(true);
  console.log(`tx hash: ${tx.hash}`);
  await tx.wait();
  console.log("setUseCustomAdapterParams successful");
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
