/* global ethers */

const { ethers } = require('hardhat')

async function main () {
  const accounts = await ethers.getSigners()
  const account = await accounts[0].getAddress()

  const diamondAddress = '0x187DffAef821d03055aC5eAa1524c53EBB36eA97'
  const stakingFacet = await ethers.getContractAt('StakingFacet', diamondAddress)
  const result = await stakingFacet.poolTokensRate()
  console.log(result.toString())
//   const ownershipFacet = await ethers.getContractAt('OwnershipFacet', diamondAddress)
//   const owner = await ownershipFacet.owner()
//   console.log(owner)
  // const tx = await ownershipFacet.transferOwnership('0x258cC4C495Aef8D809944aD94C6722ef41216ef3')
  // console.log(tx)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
