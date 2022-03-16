/* global ethers hre */
import { ethers } from "hardhat";
import { stakingDiamond } from "./deploystkwamGHST";

async function main() {
  const stakingFacet = await ethers.getContractAt(
    "StakingFacet",
    stakingDiamond
  );

  const addresses = [
    "0x9b9d0767248e4cDddb552dB92b0136Cc20406876",
    "0xa370f2ADd2A9Fba8759147995d6A0641F8d7C119",
  ];

  for (let index = 0; index < addresses.length; index++) {
    const element = addresses[index];

    const isRateManager = await stakingFacet.isRateManager(element);

    console.log(`Is ${element} rate manager? ${isRateManager}`);
  }

  // for (let index = 74; index < runs; index++) {
  //   // const element = array[index];

  //   results = await diamond.queryFilter(
  //     filter,
  //     diamondCreationBlock + batchSize * index,
  //     diamondCreationBlock + batchSize * (index + 1)
  //   );

  //   console.log("index:", index);

  //   for (let index = 0; index < results.length; index++) {
  //     const result = results[index];
  //     // console.log("result:", result.args);

  //     const transaction = await result.getTransaction(result.transactionHash);

  //     const data = transaction.data;
  //     //console.log("trans:", transaction);

  //     const sig = "0x691d716c";

  //     if (data.includes(sig)) {
  //       console.log("block:", transaction.blockNumber);
  //       console.log("found:", result);
  //     } else {
  //       console.log("nothing found in block::", transaction.blockNumber);
  //     }
  //   }

  //   final.push(results);
  // }

  //console.log("final:", final);

  /*
  for (const result of results) {
    const args = result.args;

    console.log("args:", args);

    /* console.log(
      `${args.experience.toString()} Experience transferred from ${args._fromTokenId.toString()} to ${args._toTokenId.toString()} in block number ${
        result.blockNumber
      }`
    );
    *
  }
  */
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
