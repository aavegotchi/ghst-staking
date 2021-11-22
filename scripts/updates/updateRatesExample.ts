import { run, ethers, network } from "hardhat";
import {
  convertPoolsAndRatesToString,
  UpdateRateTaskArgs,
} from "../../tasks/updateRates";
import { PoolObject } from "../../types";
import { impersonate, maticStakingAddress } from "../helperFunctions";

const examplePools: PoolObject[] = [
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
    _poolUrl: "",
  },
  {
    _poolAddress: "0x096c5ccb33cfc5732bcd1f3195c13dbefc4c82f4",
    _poolReceiptToken: "0x04439eC4ba8b09acfae0E9b5D75A82cC63b19f09",
    _rate: "61093569",
    _poolName: "GHST-USDC",
    _poolUrl: "",
  },
  {
    _poolAddress: "0xccb9d2100037f1253e6c1682adf7dc9944498aff",
    _poolReceiptToken: "0x388E2a3d389F27504212030c2D42Abf0a8188cd1",
    _rate: "12478823",
    _poolName: "GHST-WETH",
    _poolUrl: "",
  },
];

async function updateRates() {
  const taskArgs: UpdateRateTaskArgs = {
    poolsAndRates: convertPoolsAndRatesToString(examplePools),
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

    // let tx = await stakingFacet.addRateManagers([
    //   "0x258cC4C495Aef8D809944aD94C6722ef41216ef3",
    // ]);
    // await tx.wait();
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
