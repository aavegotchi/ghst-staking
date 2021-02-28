/* global ethers */

const ghstStakingDiamondAddress = '0xA02d547512Bb90002807499F05495Fe9C4C3943f'
const diamondCreationBlock = 9833113

async function main () {
  const trackedTokenAddress = '0x8b1fd78ad67c7da09b682c5392b65ca7caa101b9'
  const trackedToken = await ethers.getContractAt('IERC20', trackedTokenAddress)
  console.log('Getting pool transfers in')
  const trackedTokenFilter = trackedToken.filters.Transfer(null, ghstStakingDiamondAddress)
  const trackedTokenTransfersIn = await trackedToken.queryFilter(trackedTokenFilter, diamondCreationBlock)
  console.log(`Got ${trackedTokenTransfersIn.length} transfers in`)

  const stakers = new Set()
  for (const transfer of trackedTokenTransfersIn) {
    stakers.add(transfer.args[0])
  }
  const stakingFacet = await ethers.getContractAt('StakingFacet', ghstStakingDiamondAddress)
  const value = await stakingFacet.poolTokensRate()
  console.log(value.toString())
  let tx = await stakingFacet.updateAccounts(Array.from(stakers))
  console.log('Updating accounts:', tx.hash)
  let receipt = await tx.wait()
  if (!receipt.status) {
    throw Error(`Updating accounts failed: ${tx.hash}`)
  }
  console.log('Accounts updated successfully')
  tx = await stakingFacet.updatePoolTokensRate(47)
  console.log('Setting GHST-QUICK rate:', tx.hash)
  receipt = await tx.wait()
  if (!receipt.status) {
    throw Error(`Failed to set pool rate: ${tx.hash}`)
  }
  console.log('Successfully set rate')

  for (const staker of stakers) {
    console.log(staker)
  }
  console.log(stakers.size)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
