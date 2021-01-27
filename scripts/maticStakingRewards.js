/* global ethers */

const fs = require('fs')

const abi = [
  'event Transfer(address indexed src, address indexed dst, uint val)'
]

const ghstStakingDiamondAddress = '0xA02d547512Bb90002807499F05495Fe9C4C3943f'

function addCommas (nStr) {
  nStr += ''
  const x = nStr.split('.')
  let x1 = x[0]
  const x2 = x.length > 1 ? '.' + x[1] : ''
  var rgx = /(\d+)(\d{3})/
  while (rgx.test(x1)) {
    x1 = x1.replace(rgx, '$1' + ',' + '$2')
  }
  return x1 + x2
}

function strDisplay (str) {
  return addCommas(str.toString())
}

async function main (rewardTokenAddress, totalRewardAmount, trackedTokenAddress, startingBlock, endingBlock) {
  const signers = await ethers.getSigners()
  const signer = signers[0]
  const diamondCreationBlock = 9833113
  const oneHour = 1800 // 2 second blocks
  const trackedToken = await ethers.getContractAt('IERC20', trackedTokenAddress)
  console.log('Getting pool transfers in')
  let trackedTokenFilter = trackedToken.filters.Transfer(null, ghstStakingDiamondAddress)
  const trackedTokenTransfersIn = await trackedToken.queryFilter(trackedTokenFilter, diamondCreationBlock, endingBlock)
  console.log(`Got pool ${trackedTokenTransfersIn.length} transfers in`)
  trackedTokenFilter = trackedToken.filters.Transfer(ghstStakingDiamondAddress, null)
  console.log('Getting pool transfers out')
  const trackedTokenTransfersOut = await trackedToken.queryFilter(trackedTokenFilter, diamondCreationBlock, endingBlock)
  console.log(`Got ${trackedTokenTransfersOut.length} pool transfers out`)
  console.log('Putting transfers together')
  const poolTransfers = []
  let indexIn = 0
  for (const transfer of trackedTokenTransfersOut) {
    while (indexIn < trackedTokenTransfersIn.length && trackedTokenTransfersIn[indexIn].blockNumber <= transfer.blockNumber) {
      poolTransfers.push(trackedTokenTransfersIn[indexIn])
      indexIn++
    }
    poolTransfers.push(transfer)
  }
  const filePath = `./saved/transfers.${trackedTokenAddress}.json`
  fs.writeFileSync(filePath, JSON.stringify(poolTransfers))

  const transfers = JSON.parse(fs.readFileSync(filePath))
  console.log('Total poolTransfers:', transfers.length)
  // console.log(transfers[50].blockNumber)
  // console.log(transfers[transfers.length - 50].blockNumber)

  // console.log(transfers[44].args)
  // console.log(transfers)
  const stakers = new Set()
  for (const transfer of transfers) {
    if (transfer.args[1] === ghstStakingDiamondAddress) {
      stakers.add(transfer.args[0])
    }
  }
  const stakerInfo = new Map()
  for (const staker of stakers) {
    stakerInfo.set(staker, { currentBalance: ethers.BigNumber.from('0'), snapShotTotal: ethers.BigNumber.from('0') })
  }

  let nextSnapShot = startingBlock
  for (const transfer of transfers) {
    let info
    let newBalance
    if (transfer.args[1] === ghstStakingDiamondAddress) {
      const stakerAddress = transfer.args[0]
      info = stakerInfo.get(stakerAddress)
      newBalance = info.currentBalance.add(transfer.args[2])
    }
    if (transfer.args[0] === ghstStakingDiamondAddress) {
      const stakerAddress = transfer.args[1]
      info = stakerInfo.get(stakerAddress)
      newBalance = info.currentBalance.sub(transfer.args[2])
    }
    info.currentBalance = newBalance
    if (transfer.blockNumber >= nextSnapShot) {
      for (const info of stakerInfo) {
        info[1].snapShotTotal = info[1].snapShotTotal.add(info[1].currentBalance)
      }
      nextSnapShot += oneHour
    }
  }

  // for (const info of stakerInfo) {
  //   console.log(info[0], ethers.utils.formatEther(info[1].currentBalance), ethers.utils.formatEther(info[1].snapShotTotal))
  // }
  const snapShotTotal = [...stakerInfo].reduce((acc, info) => {
    return acc.add(info[1].snapShotTotal)
  }, ethers.BigNumber.from('0'))
  let rewardToken
  if (rewardTokenAddress !== 'Matic') {
    rewardToken = await ethers.getContractAt('IERC20', rewardTokenAddress)
  }
  let tx
  let receipt
  // console.log(ethers.utils.formatEther(snapShotTotal))
  let count = ethers.BigNumber.from('0')
  for (const info of stakerInfo) {
    const balance = info[1].snapShotTotal
    const reward = totalRewardAmount.mul(balance).div(snapShotTotal)
    const userAddress = info[0]
    if (rewardTokenAddress === 'Matic') {
      // tx = signer.sendTransaction({ value: reward })
    } else {
    // tx = rewardToken.transfer(userAddress, reward)
    }
    // console.log(`Sending ${ethers.utils.formatEther(reward)} to `, userAddress)
    // receipt = await tx.wait()
    // if (!receipt.status)
    //   throw Error(`Transaction sending ${ethers.utils.formatEther(reward)} to ${userAddress} failed, tx hash: ${tx.hash}`)
    // }
    count = count.add(reward)
    console.log(userAddress, ethers.utils.formatEther(reward))
  }
  console.log('Reward count: ', ethers.utils.formatEther(count))

  // console.log(stakerInfo)
  console.log(stakers.size)
  console.log()
}

// ghst
// const trackedTokenAddress = '0x385eeac5cb85a38a9a07a70c73e0a3271cfb54a7'
// ghstQuickPair
const trackedTokenAddress = '0x8b1fd78ad67c7da09b682c5392b65ca7caa101b9'

// ghst
const rewardTokenAddress = '0x385eeac5cb85a38a9a07a70c73e0a3271cfb54a7'
// matic
// const rewardTokenAddress = 'Matic'

const startingBlock = 9839405
// const endingBlock = 10033242
const endingBlock = 10079417

const totalRewardAmount = ethers.utils.parseEther('100')

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main(rewardTokenAddress, totalRewardAmount, trackedTokenAddress, startingBlock, endingBlock)
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
