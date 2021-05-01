/* global ethers hre */

const diamondAddress = '0xA02d547512Bb90002807499F05495Fe9C4C3943f'
// kovan
// const diamondAddress = '0xE47d2d47aA7fd150Fe86045e81509B09454a4Ee5'

async function main () {
  const diamond = await ethers.getContractAt('OwnershipFacet', diamondAddress)
  // console.log(diamond)
  const owner = await diamond.owner()
  console.log('Owner:  ', owner)
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
}
