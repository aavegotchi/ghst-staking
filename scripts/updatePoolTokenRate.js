/* global ethers */
/* eslint prefer-const: "off" */

const { LedgerSigner } = require('../../aavegotchi-contracts/node_modules/@ethersproject/hardware-wallets')

const ghstStakingDiamondAddress = '0xA02d547512Bb90002807499F05495Fe9C4C3943f'
const diamondCreationBlock = 9833113

async function main () {
  const signer = new LedgerSigner(ethers.provider)
  const currentBlockNumber = await ethers.provider.getBlockNumber()
  console.log('Current blocknumber:', currentBlockNumber)
  const trackedTokenAddress = '0x8b1fd78ad67c7da09b682c5392b65ca7caa101b9'
  const trackedToken = await ethers.getContractAt('IERC20', trackedTokenAddress)
  console.log('Getting pool transfers in')
  const trackedTokenFilter = trackedToken.filters.Transfer(null, ghstStakingDiamondAddress)
  const stakers = new Set()

  let blockNumber = diamondCreationBlock
  while (blockNumber < currentBlockNumber) {
    let nextBlockNumber = blockNumber + 250000
    const trackedTokenTransfersIn = await trackedToken.queryFilter(trackedTokenFilter, blockNumber, nextBlockNumber)
    console.log(`Got ${trackedTokenTransfersIn.length} transfers in from ${blockNumber} to ${nextBlockNumber}`)
    blockNumber = nextBlockNumber
    for (const transfer of trackedTokenTransfersIn) {
      stakers.add(transfer.args[0])
    }
  }

  const stakingFacet = await ethers.getContractAt('StakingFacet', ghstStakingDiamondAddress, signer)
  const value = await stakingFacet.poolTokensRate()
  console.log('Current pool token rate:', value.toString())

  const firstStakers = Array.from(stakers).slice(0, stakers.size / 2)
  const secondStakers = Array.from(stakers).slice(stakers.size / 2)

  let tx = await stakingFacet.updateAccounts(firstStakers, { gasLimit: 18000000 })
  console.log('Updating accounts:', tx.hash)
  let receipt = await tx.wait()
  if (!receipt.status) {
    throw Error(`Updating accounts failed: ${tx.hash}`)
  }
  console.log('Accounts updated successfully')

  tx = await stakingFacet.updateAccounts(secondStakers, { gasLimit: 18000000 })
  console.log('Updating accounts:', tx.hash)
  receipt = await tx.wait()
  if (!receipt.status) {
    throw Error(`Updating accounts failed: ${tx.hash}`)
  }
  console.log('Accounts updated successfully')

  tx = await stakingFacet.updatePoolTokensRate(83)
  console.log('Setting GHST-QUICK rate:', tx.hash)
  receipt = await tx.wait()
  if (!receipt.status) {
    throw Error(`Failed to set pool rate: ${tx.hash}`)
  }
  console.log('Successfully set rate')

  // for (const staker of stakers) {
  //   console.log(staker)
  // }
  console.log('Stakers size:', stakers.size)

  const newValue = await stakingFacet.poolTokensRate()
  console.log('Current pool token rate:', newValue.toString())
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
