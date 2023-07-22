import { ethers } from "hardhat";

const {LZ_ENDPOINT_ADDRESS_MUMBAI: lzEndpointAddressMumbai, AAVEGOTCHI_DIAMOND_ADDRESS_MUMBAI: aavegotchiDiamondAddressMumbai} = process.env;

// validate env variables



async function main() {
  await deployBridge();
}

async function deployBridge() {
  if (!lzEndpointAddressMumbai) {
    throw new Error("LZ_ENDPOINT_ADDRESS_MUMBAI env variable not set");
  }
  if (!aavegotchiDiamondAddressMumbai) {
    throw new Error("AAVEGOTCHI_DIAMOND_ADDRESS_MUMBAI env variable not set");
  }
  const BridgePolygonSide = await ethers.getContractFactory("ProxyONFT1155");

  const bridgePolygonSide = await BridgePolygonSide.deploy(
    lzEndpointAddressMumbai,
    aavegotchiDiamondAddressMumbai
  );
  await bridgePolygonSide.deployed();

  console.log("BridgePolygonSide deployed to:", bridgePolygonSide.address);

  return bridgePolygonSide;
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
