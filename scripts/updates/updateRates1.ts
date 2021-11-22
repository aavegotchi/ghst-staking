import { run, ethers, network } from "hardhat";
import {
  convertPoolsAndRatesToString,
  UpdateRateTaskArgs,
} from "../../tasks/updateRates";
import { PoolObject } from "../../types";
import { impersonate, maticStakingAddress } from "../helperFunctions";

const currentPools: PoolObject[] = [
  {
    _poolAddress: "0x385Eeac5cB85A38A9a07A70c73e0a3271CfB54A7",
    _poolReceiptToken: ethers.constants.AddressZero,
    _rate: "1",
    _poolName: "GHST",
    _poolUrl: "",
  },
  {
    _poolAddress: "0x8b1fd78ad67c7da09b682c5392b65ca7caa101b9",
    _poolReceiptToken: "0xA02d547512Bb90002807499F05495Fe9C4C3943f",
    _rate: "35",
    _poolName: "GHST-QUICK",
    _poolUrl:
      "https://quickswap.exchange/#/add/0x385Eeac5cB85A38A9a07A70c73e0a3271CfB54A7/0x831753DD7087CaC61aB5644b308642cc1c33Dc13",
  },
  {
    _poolAddress: "0x096c5ccb33cfc5732bcd1f3195c13dbefc4c82f4",
    _poolReceiptToken: "0x04439eC4ba8b09acfae0E9b5D75A82cC63b19f09",
    _rate: "61093569",
    _poolName: "GHST-USDC",
    _poolUrl:
      "https://quickswap.exchange/#/add/0x385Eeac5cB85A38A9a07A70c73e0a3271CfB54A7/0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
  },
  {
    _poolAddress: "0xccb9d2100037f1253e6c1682adf7dc9944498aff",
    _poolReceiptToken: "0x388E2a3d389F27504212030c2D42Abf0a8188cd1",
    _rate: "12478823",
    _poolName: "GHST-WETH",
    _poolUrl:
      "https://quickswap.exchange/#/add/0x385Eeac5cB85A38A9a07A70c73e0a3271CfB54A7/0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
  },
];

async function updateRates() {
  const taskArgs: UpdateRateTaskArgs = {
    poolsAndRates: convertPoolsAndRatesToString(currentPools),
    epoch: "0",
    rateManagerAddress: "0x9b9d0767248e4cDddb552dB92b0136Cc20406876",
  };

  if (["localhost", "hardhat"].includes(network.name)) {
    let stakingFacet = await ethers.getContractAt(
      "StakingFacet",
      maticStakingAddress
    );
    stakingFacet = await impersonate(
      "0x9b9d0767248e4cDddb552dB92b0136Cc20406876",
      stakingFacet,
      ethers,
      network
    );
  }

  await run("updateRates", taskArgs);
}

if (require.main === module) {
  updateRates()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
