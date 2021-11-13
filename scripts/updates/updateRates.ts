import { run, ethers, network } from "hardhat";
import {
  convertPoolsAndRatesToString,
  UpdateRateTaskArgs,
} from "../../tasks/updateRates";
import { impersonate, maticStakingAddress } from "../helperFunctions";

const pools = [
  {
    _poolAddress: "0x385Eeac5cB85A38A9a07A70c73e0a3271CfB54A7",
    _poolReceiptToken: ethers.constants.AddressZero,
    _rate: "100000",
    _poolName: "GHST",
    _poolUrl: "",
  },
];

async function updateRates() {
  const taskArgs: UpdateRateTaskArgs = {
    poolsAndRates: convertPoolsAndRatesToString(pools),
    epoch: "1",
    rateManagerAddress: "0x258cC4C495Aef8D809944aD94C6722ef41216ef3",
  };

  if (["localhost", "hardhat"].includes(network.name)) {
    let stakingFacet = await ethers.getContractAt(
      "StakingFacet",
      maticStakingAddress
    );
    stakingFacet = await impersonate(
      "0x258cC4C495Aef8D809944aD94C6722ef41216ef3",
      stakingFacet,
      ethers,
      network
    );

    let tx = await stakingFacet.addRateManagers([
      "0x258cC4C495Aef8D809944aD94C6722ef41216ef3",
    ]);
    await tx.wait();
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
