import { ethers } from "hardhat";
import { StakingFacet } from "../typechain";
import * as fs from 'fs';

const diamondAdd='0xA02d547512Bb90002807499F05495Fe9C4C3943f'

let stakingDiamond;
let filter1;
let filter2;
let filter3
let results
let addresses:string[]=[]

function removeDups(arr:string[]){
    const unique:string[]=[]
const dups=[]
for(let i=0;i<arr.length;i++){
    if(unique.includes(arr[i])){
dups.push(arr[i])
    }
    else{unique.push(arr[i])}   
}
console.log("we have",dups.length,'duplicates')   
return unique;
   
}




async function getFrenDifferences(account:string) {
    let stakingFacet = (await ethers.getContractAt(
      "StakingFacet",
      diamondAdd
    )) as StakingFacet;
  
    const frensBefore = await stakingFacet.frens(
      account,
      { blockTag: 23302659 }
    );
    console.log("frens before for" ,account,":", ethers.utils.formatEther(frensBefore));
  
    const frensAfter = await stakingFacet.frens(
      account,
      { blockTag: 23302660 }
    );
    console.log("frens after for",account,":", ethers.utils.formatEther(frensAfter));
    
  }

async function fetchStakers(){

 
stakingDiamond=  await ethers.getContractAt("StakingFacet",diamondAdd) as StakingFacet;

filter1=stakingDiamond.filters.StakeInEpoch()
filter2=stakingDiamond.filters.WithdrawInEpoch()
filter3= stakingDiamond.filters.TransferBatch()


const result1=await stakingDiamond.queryFilter(filter1,23302659)
const result2=await stakingDiamond.queryFilter(filter2,23302659)
const result3=await stakingDiamond.queryFilter(filter3,23302659)
results=result1.concat(result2)

for(let index=0;index<results.length;index++){
    addresses.push(results[index].args._account)
}
for(let index=0;index<result3.length;index++){
    addresses.push(result3[index].args._to)
}

addresses=removeDups(addresses)
console.log(addresses.length)
fs.writeFileSync("addresses2.ts",JSON.stringify(addresses))

//get differences
// for(let index=0;index<addresses.length;index++){

//     await getFrenDifferences(addresses[index])
// }
}






fetchStakers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
