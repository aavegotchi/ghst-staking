/* global ethers */
/* eslint prefer-const: "off" */

const { LedgerSigner } = require('../../aavegotchi-contracts/node_modules/@ethersproject/hardware-wallets')
const { deployRateManager } = require('./upgrades/upgrade-rateManager.js')

const ghstStakingDiamondAddress = '0xA02d547512Bb90002807499F05495Fe9C4C3943f'
const diamondCreationBlock = 9833113
// const diamondCreationBlock = 16643113

async function main () {
  let signer
  const owner = await (await ethers.getContractAt('OwnershipFacet', ghstStakingDiamondAddress)).owner()
  const testing = ['hardhat', 'localhost'].includes(hre.network.name)
  if (testing) {
    await deployRateManager()

    await hre.network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [owner]
    })
    signer = await ethers.getSigner(owner)
  } else if (hre.network.name === 'matic') {
    signer = new LedgerSigner(ethers.provider)
  } else {
    throw Error('Incorrect network selected')
  }

  const currentBlockNumber = await ethers.provider.getBlockNumber()
  console.log('Current blocknumber:', currentBlockNumber)
  const trackedTokenAddress = '0x8b1fd78ad67c7da09b682c5392b65ca7caa101b9'
  const trackedToken = await ethers.getContractAt('IERC20', trackedTokenAddress)
  console.log('Getting pool transfers in')
  const trackedTokenFilter = trackedToken.filters.Transfer(null, ghstStakingDiamondAddress)
  const stakers = new Set()

  let blockNumber = diamondCreationBlock
  while (blockNumber < currentBlockNumber) {
    let nextBlockNumber = blockNumber + 10000
    const trackedTokenTransfersIn = await trackedToken.queryFilter(trackedTokenFilter, blockNumber, nextBlockNumber)
    console.log(`Got ${trackedTokenTransfersIn.length} transfers in from ${blockNumber} to ${nextBlockNumber}`)
    blockNumber = nextBlockNumber
    for (const transfer of trackedTokenTransfersIn) {
      stakers.add(transfer.args[0])
    }
  }
  console.log('Stakers size:', stakers.size)

  const stakingFacet = await ethers.getContractAt('StakingFacet', ghstStakingDiamondAddress, signer)
  const value = await stakingFacet.poolTokensRate()
  console.log('Current pool token rate:', value.toString())

  let tx
  let receipt
  if (testing) {
    tx = await stakingFacet.addRateManagers([signer.address])
    console.log('Adding rate managers :', tx.hash)
    receipt = await tx.wait()
    if (!receipt.status) {
      throw Error(`Adding rate managers failed: ${tx.hash}`)
    }
    console.log('Rate managers added successfully')
  }

  let gas = await stakingFacet.estimateGas.updateAccountsAndPoolTokensRate(Array.from(stakers), 83)
  console.log('Estimated gas:', gas.toNumber())

  tx = await stakingFacet.updateAccountsAndPoolTokensRate(Array.from(stakers), 83, { gasLimit: 18000000 })
  console.log('Updating accounts and pool rate:', tx.hash)
  receipt = await tx.wait()
  if (!receipt.status) {
    throw Error(`Updating accounts and pool rate failed: ${tx.hash}`)
  }
  console.log('Accounts and pool rate updated successfully')

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
