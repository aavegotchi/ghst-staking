/* global ethers hre */

async function main() {
  const diamondCreationBlock = 9834076; //10000000;
  const aavegotchiDiamondAddress = "0xA02d547512Bb90002807499F05495Fe9C4C3943f";

  let diamond;
  diamond = await ethers.getContractAt(
    "TicketsFacet",
    aavegotchiDiamondAddress
  );
  let filter;
  filter = diamond.filters.TransferBatch(
    undefined,
    "0x0000000000000000000000000000000000000000"
  );
  let results;

  let range = 7426530;
  let batchSize = 99999;
  let runs = range / batchSize;

  const final = [];

  for (let index = 74; index < runs; index++) {
    // const element = array[index];

    results = await diamond.queryFilter(
      filter,
      diamondCreationBlock + batchSize * index,
      diamondCreationBlock + batchSize * (index + 1)
    );

    console.log("index:", index);

    for (let index = 0; index < results.length; index++) {
      const result = results[index];
      // console.log("result:", result.args);

      const transaction = await result.getTransaction(result.transactionHash);

      const data = transaction.data;
      //console.log("trans:", transaction);

      const sig = "0x691d716c";

      if (data.includes(sig)) {
        console.log("block:", transaction.blockNumber);
        console.log("found:", result);
      } else {
        console.log("nothing found in block::", transaction.blockNumber);
      }
    }

    final.push(results);
  }

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
