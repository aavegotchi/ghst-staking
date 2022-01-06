import { ethers } from "hardhat";
import { StakingFacet } from "../../typechain";
import * as fs from "fs";
import { frenDifferences } from "../../frenDifferences";

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
  const signer = await ethers.getSigners();
  const currentBlock = await signer[0].provider?.getBlockNumber();

  let stakingFacet = (await ethers.getContractAt(
    "StakingFacet",
    diamondAdd
  )) as StakingFacet;

  const frensBefore = await stakingFacet.frens(account, { blockTag: 23302659 });

  const frensAfter = await stakingFacet.frens(account, { blockTag: 23302660 });

  const frensBeforeUpdate = await stakingFacet.frens(account, {
    blockTag: currentBlock,
  });

  console.log(
    `${account} before: ${ethers.utils.formatEther(
      frensBefore
    )}, after: ${ethers.utils.formatEther(
      frensAfter
    )}, currently: ${ethers.utils.formatEther(frensBeforeUpdate)}`
  );

  return {
    account: account,
    before: ethers.utils.formatEther(frensBefore),
    after: ethers.utils.formatEther(frensAfter),
    current: ethers.utils.formatEther(frensBeforeUpdate),
  };
}

async function fetchStakers() {
  stakingDiamond = (await ethers.getContractAt(
    "StakingFacet",
    diamondAdd
  )) as StakingFacet;

  filter1 = stakingDiamond.filters.StakeInEpoch();
  filter2 = stakingDiamond.filters.WithdrawInEpoch();
  filter3 = stakingDiamond.filters.TransferBatch();

  // const stakeResult = await stakingDiamond.queryFilter(
  //   filter1,
  //   23302659,
  //   23358712
  // );
  // const withdrawResult = await stakingDiamond.queryFilter(
  //   filter2,
  //   23302659,
  //   23358712
  // );
  const ticketResult = await stakingDiamond.queryFilter(
    filter3,
    23302659,
    23358712
  );

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

  // console.log("ticket tally:", ticketTally);

  // results = stakeResult.concat(withdrawResult);

  // for (let index = 0; index < results.length; index++) {
  //   addresses.push(results[index].args._account);
  // }

  // console.log("differences:", frenDifferences);
  // const frensDifferences;

  const finalJson = [];

  for (let index = 0; index < frenDifferences.length; index++) {
    const difference = frenDifferences[index];

    const ticket = ticketResult.find((acc) => {
      //console.log("acc:", acc.args._to, ticketResult[index].args._to);
      return acc.args._to === difference.account;
    });

    let frensSpent = 0;
    if (ticket) {
      const prices = [50, 250, 500, 2500, 10000, 50000, 10000];

      const _ids = ticket?.args._ids.map((id) => id.toString());
      const _values = ticket?.args._values.map((val) => val.toString());

      _ids?.forEach((id, index) => {
        //@ts-ignore
        const quantity = Number(_values[index]);
        const price = prices[Number(id)];

        frensSpent += quantity * price;
      });
      let newDifference = { ...difference, frensSpent, _ids, _values };
      finalJson.push(newDifference);
    } else {
      finalJson.push({
        ...difference,
        frensSpent,
        _ids: [],
        _values: [],
      });
    }
  }

  console.log("final json:", finalJson);

  // addresses = removeDups(addresses);
  // console.log(addresses.length);
  // fs.writeFileSync("addresses2.ts", JSON.stringify(addresses));

  // //get differences
  // for (let index = 0; index < addresses.length; index++) {
  //   const differences = await getFrenDifferences(addresses[index]);
  //   frenDifferences.push(differences);
  // }

  fs.writeFileSync("frenDifferencesFinal.ts", JSON.stringify(finalJson));
}

fetchStakers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
