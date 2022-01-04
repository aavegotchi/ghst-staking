import { ethers } from "hardhat";
import { StakingFacet } from "../typechain";
import * as fs from "fs";

const diamondAdd = "0xA02d547512Bb90002807499F05495Fe9C4C3943f";

let stakingDiamond;
let filter1;
let filter2;
let filter3;
let results;
let addresses: string[] = [];

function removeDups(arr: string[]) {
  const unique: string[] = [];
  const dups = [];
  for (let i = 0; i < arr.length; i++) {
    if (unique.includes(arr[i])) {
      dups.push(arr[i]);
    } else {
      unique.push(arr[i]);
    }
  }
  console.log("we have", dups.length, "duplicates");
  return unique;
}

async function getFrenDifferences(account: string) {
  let stakingFacet = (await ethers.getContractAt(
    "StakingFacet",
    diamondAdd
  )) as StakingFacet;

  const frensBefore = await stakingFacet.frens(account, { blockTag: 23302659 });
  // console.log(
  //   "frens before for",
  //   account,
  //   ":",
  //   ethers.utils.formatEther(frensBefore)
  // );

  const frensAfter = await stakingFacet.frens(account, { blockTag: 23302660 });
  // console.log(
  //   "frens after for",
  //   account,
  //   ":",
  //   ethers.utils.formatEther(frensAfter)
  // );

  console.log(
    `${account} before: ${ethers.utils.formatEther(
      frensBefore
    )}, after: ${ethers.utils.formatEther(frensAfter)}`
  );
}

async function fetchStakers() {
  stakingDiamond = (await ethers.getContractAt(
    "StakingFacet",
    diamondAdd
  )) as StakingFacet;

  filter1 = stakingDiamond.filters.StakeInEpoch();
  filter2 = stakingDiamond.filters.WithdrawInEpoch();
  filter3 = stakingDiamond.filters.TransferBatch();

  const stakeResult = await stakingDiamond.queryFilter(filter1, 23302659);
  const withdrawResult = await stakingDiamond.queryFilter(filter2, 23302659);
  const ticketResult = await stakingDiamond.queryFilter(filter3, 23302659);

  let ticketTally: any = {
    0: 0,
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    6: 0,
  };

  ticketResult.forEach((result) => {
    result.args._ids.forEach((id, i) => {
      const index = Number(id.toString());

      ticketTally[index] =
        ticketTally[index] + Number(result.args._values[i].toString());
    });
  });

  console.log("ticket tally:", ticketTally);

  results = stakeResult.concat(withdrawResult);

  for (let index = 0; index < results.length; index++) {
    addresses.push(results[index].args._account);
  }

  for (let index = 0; index < ticketResult.length; index++) {
    addresses.push(ticketResult[index].args._to);
  }

  addresses = removeDups(addresses);
  console.log(addresses.length);
  fs.writeFileSync("addresses2.ts", JSON.stringify(addresses));

  //get differences
  for (let index = 0; index < addresses.length; index++) {
    await getFrenDifferences(addresses[index]);
  }
}

fetchStakers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
