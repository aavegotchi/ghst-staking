/* global ethers */
/* eslint prefer-const: "off" */

const { LedgerSigner } = require('../../aavegotchi-contracts/node_modules/@ethersproject/hardware-wallets')

async function main () {
  const signer = new LedgerSigner(ethers.provider)
  // const accounts = await ethers.getSigners()
  // const account = await accounts[0].getAddress()

  const diamondAddress = '0xA02d547512Bb90002807499F05495Fe9C4C3943f'
  // 0x258cC4C495Aef8D809944aD94C6722ef41216ef3
  const newOwner = '0x258cC4C495Aef8D809944aD94C6722ef41216ef3'
  // const stakingFacet = await ethers.getContractAt('StakingFacet', diamondAddress)
  // const result = await stakingFacet.poolTokensRate()
  // console.log(result.toString())
  const ownershipFacet = await ethers.getContractAt('OwnershipFacet', diamondAddress, signer)
  const owner = await ownershipFacet.owner()
  console.log(owner)
  const tx = await ownershipFacet.transferOwnership(newOwner)
  console.log('Transferring to new owner. Hash:', tx.hash)
  const receipt = await tx.wait()
  if (!receipt.status) {
    throw Error(`Transaction failed: ${tx.hash}`)
  }
  console.log('Accounts updated successfully')
  console.log(tx)
  console.log('New owner:', await ownershipFacet.owner())
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
