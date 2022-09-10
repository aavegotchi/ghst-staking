import { Signer } from "ethers";
import { ethers, network } from "hardhat";
import { StakingFacet } from "../../typechain";
import { stakingDiamond } from "../../helpers/constants";
import { gasPrice, getDiamondSigner } from "../helperFunctions";
import { upgrade as upgradeStakingFacet } from "./upgrade-sunsetFrens";

const poolData: any[] = [
  {
    _poolAddress: "0x385Eeac5cB85A38A9a07A70c73e0a3271CfB54A7",
    _poolReceiptToken: ethers.constants.AddressZero,
    _rate: "0",
    _poolName: "GHST",
    _poolUrl: "",
  },
  {
    _poolAddress: "0x8b1fd78ad67c7da09b682c5392b65ca7caa101b9",
    _poolReceiptToken: "0xA02d547512Bb90002807499F05495Fe9C4C3943f",
    _rate: "0",
    _poolName: "GHST-QUICK",
    _poolUrl:
      "https://quickswap.exchange/#/add/0x385Eeac5cB85A38A9a07A70c73e0a3271CfB54A7/0x831753DD7087CaC61aB5644b308642cc1c33Dc13",
  },
  {
    _poolAddress: "0x096c5ccb33cfc5732bcd1f3195c13dbefc4c82f4",
    _poolReceiptToken: "0x04439eC4ba8b09acfae0E9b5D75A82cC63b19f09",
    _rate: "0",
    _poolName: "GHST-USDC",
    _poolUrl:
      "https://quickswap.exchange/#/add/0x385Eeac5cB85A38A9a07A70c73e0a3271CfB54A7/0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
  },
  {
    _poolAddress: "0xccb9d2100037f1253e6c1682adf7dc9944498aff",
    _poolReceiptToken: "0x388E2a3d389F27504212030c2D42Abf0a8188cd1",
    _rate: "0",
    _poolName: "GHST-WETH",
    _poolUrl:
      "https://quickswap.exchange/#/add/0x385Eeac5cB85A38A9a07A70c73e0a3271CfB54A7/0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
  },
  {
    _poolAddress: "0xf69e93771f11aecd8e554aa165c3fe7fd811530c",
    _poolReceiptToken: "0x6fcac9eee338e29205a24692bbf87e0eb9431997",
    _rate: "0",
    _poolName: "GHST-MATIC",
    _poolUrl: "",
  },
  {
    _poolAddress: "0x73958d46B7aA2bc94926d8a215Fa560A5CdCA3eA",
    _poolReceiptToken: "0x102cb2F13D9fb33Fdc007EE7D273AD1dfaA73aE8",
    _rate: "0",
    _poolName: "wapGHST",
    _poolUrl:
      "https://app.aave.com/reserve-overview/?underlyingAsset=0x385eeac5cb85a38a9a07a70c73e0a3271cfb54a7&marketName=proto_polygon_v3",
  },
];

export async function deploy() {
  let testing = ["hardhat", "localhost"].includes(network.name);
  const deployer = "0xa370f2ADd2A9Fba8759147995d6A0641F8d7C119";
  let signer: Signer = await getDiamondSigner(ethers, network, deployer, true);

  let stakingFacet = (await ethers.getContractAt(
    "StakingFacet",
    stakingDiamond,
    signer
  )) as StakingFacet;

  await upgradeStakingFacet();

  let currentEpoch = await stakingFacet.currentEpoch();
  console.log(`Current epoch before upgrade: ${currentEpoch}`);
  let currentPoolRates = await stakingFacet.poolRatesInEpoch(currentEpoch);
  console.log(
    `Current pools before upgrade: ${JSON.stringify(currentPoolRates)}`
  );

  // console.log("Updating rates...");
  // if (testing) {
  //   const addTx = await stakingFacet.updateRates(currentEpoch, poolData);
  //   console.log("tx hash:", addTx.hash);
  //   await addTx.wait();
  // } else {
  //   const tx = await stakingFacet.updateRates(currentEpoch, poolData, {
  //     gasPrice: gasPrice,
  //   });
  //   console.log("tx hash:", tx.hash);

  //   await tx.wait();
  // }

  currentEpoch = await stakingFacet.currentEpoch();
  console.log(`Current epoch after upgrade: ${currentEpoch}`);
  currentPoolRates = await stakingFacet.poolRatesInEpoch(currentEpoch);
  console.log(
    `Current pools after upgrade: ${JSON.stringify(currentPoolRates)}`
  );
}

if (require.main === module) {
  deploy()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

exports.deploy = deploy;
