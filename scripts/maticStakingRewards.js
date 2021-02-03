/* global ethers */

const fs = require('fs')

const abi = [
  'event Transfer(address indexed src, address indexed dst, uint val)'
]

const ghstStakingDiamondAddress = '0xA02d547512Bb90002807499F05495Fe9C4C3943f'
const diamondCreationBlock = 9833113

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
// rewardTokenAddress, totalRewardAmount, trackedTokenAddress, startingBlock, endingBlock

async function main () {
  async function sendRewards (rewardTokenAddress, totalRewardAmount, trackedTokenAddress, startingBlock, endingBlock) {
    if (endingBlock == null) {
      endingBlock = await ethers.provider.getBlockNumber()
    }
    console.log('endingBlog:', endingBlock)
    const signers = await ethers.getSigners()
    const signer = signers[0]
    const oneHour = 1800 // 2 second blocks
    const trackedToken = await ethers.getContractAt('IERC20', trackedTokenAddress)
    console.log('Getting pool transfers in')
    let trackedTokenFilter = trackedToken.filters.Transfer(null, ghstStakingDiamondAddress)
    const trackedTokenTransfersIn = await trackedToken.queryFilter(trackedTokenFilter, diamondCreationBlock, endingBlock)
    console.log(`Got ${trackedTokenTransfersIn.length} transfers in`)
    trackedTokenFilter = trackedToken.filters.Transfer(ghstStakingDiamondAddress, null)
    console.log('Getting transfers out')
    const trackedTokenTransfersOut = await trackedToken.queryFilter(trackedTokenFilter, diamondCreationBlock, endingBlock)
    console.log(`Got ${trackedTokenTransfersOut.length} transfers out`)

    // get the set of all staker addresses
    const stakers = new Set()
    for (const transfer of trackedTokenTransfersIn) {
      stakers.add(transfer.args[0])
    }
    const stakerInfo = new Map()
    for (const staker of stakers) {
      stakerInfo.set(staker, {
        currentBalance: ethers.BigNumber.from('0'),
        snapShotTotal: ethers.BigNumber.from('0'),
        totalAdded: ethers.BigNumber.from('0'),
        totalRemoved: ethers.BigNumber.from('0')
      })
    }

    for (const transfer of trackedTokenTransfersIn) {
      const stakerAddress = transfer.args[0]
      const info = stakerInfo.get(stakerAddress)
      info.totalAdded = info.totalAdded.add(transfer.args[2])
    }

    for (const transfer of trackedTokenTransfersOut) {
      const stakerAddress = transfer.args[1]
      const info = stakerInfo.get(stakerAddress)
      info.totalRemoved = info.totalRemoved.add(transfer.args[2])
    }

    // throw ('pause')
    console.log('Putting transfers together')
    const transfers = []
    let indexIn = 0
    for (const transfer of trackedTokenTransfersOut) {
      while (indexIn < trackedTokenTransfersIn.length && trackedTokenTransfersIn[indexIn].blockNumber <= transfer.blockNumber) {
        transfers.push(trackedTokenTransfersIn[indexIn])
        indexIn++
      } // -- missing last transfers
      transfers.push(transfer)
    }
    for (; indexIn < trackedTokenTransfersIn.length; indexIn++) {
      transfers.push(trackedTokenTransfersIn[indexIn])
    }

    if (transfers.length !== trackedTokenTransfersIn.length + trackedTokenTransfersOut.length) {
      throw Error('Wrong number of transfers in transfers variable')
    }

    // const filePath = `./saved/transfers.${trackedTokenAddress}.json`
    // fs.writeFileSync(filePath, JSON.stringify(poolTransfers))

    // const transfers = JSON.parse(fs.readFileSync(filePath))
    // console.log('Total poolTransfers:', transfers.length)

    let nextSnapShot = startingBlock
    let transferIndex = 0
    for (let currentBlockNumber = diamondCreationBlock; currentBlockNumber < endingBlock; currentBlockNumber++) {
      let transfer = transfers[transferIndex]
      while (transferIndex < transfers.length && transfer.blockNumber === currentBlockNumber) {
        let info
        let newBalance
        if (transfer.args[1] === ghstStakingDiamondAddress) {
          const stakerAddress = transfer.args[0]
          info = stakerInfo.get(stakerAddress)
          newBalance = info.currentBalance.add(transfer.args[2])
        } else if (transfer.args[0] === ghstStakingDiamondAddress) {
          const stakerAddress = transfer.args[1]
          info = stakerInfo.get(stakerAddress)
          newBalance = info.currentBalance.sub(transfer.args[2])
        }
        // console.log(ethers.utils.formatEther(transfer.args[2]))
        info.currentBalance = newBalance
        transferIndex++
        transfer = transfers[transferIndex]
      }
      if (currentBlockNumber === nextSnapShot) {
        for (const info of stakerInfo) {
          info[1].snapShotTotal = info[1].snapShotTotal.add(info[1].currentBalance)
        }
        nextSnapShot += oneHour
      }
    }

    for (const info of stakerInfo) {
      const stakerAddress = info[0]
      const balance = info[1].currentBalance
      const snapShot = info[1].snapShotTotal
      const added = info[1].totalAdded
      const removed = info[1].totalRemoved

      if (!balance.eq(added.sub(removed))) {
        console.log('Balance is off')
        console.log('Staker:', stakerAddress)
        console.log('Balance:', ethers.utils.formatEther(balance))
        console.log('SnapShotTotal:', ethers.utils.formatEther(snapShot))
        console.log('added:', ethers.utils.formatEther(added))
        console.log('removed:', ethers.utils.formatEther(removed))
        throw (Error('Balance is off'))
      }

      if (snapShot.eq(0)) {
        console.log('Address:', stakerAddress)
        console.log('Balance:', ethers.utils.formatEther(balance))
        console.log('SnapShotTotal:', ethers.utils.formatEther(snapShot))
        console.log('added:', ethers.utils.formatEther(added))
        console.log('removed:', ethers.utils.formatEther(removed))
        console.log('')
      }

      // console.log('---------------', stakerAddress, '--------------')
      // console.log('Balance:', ethers.utils.formatEther(balance))
      // console.log('SnapShotTotal:', ethers.utils.formatEther(snapShot))
      // console.log('added:', ethers.utils.formatEther(added))
      // console.log('removed:', ethers.utils.formatEther(removed))
      // console.log('')
    }

    const snapShotTotal = [...stakerInfo].reduce((acc, info) => {
      return acc.add(info[1].snapShotTotal)
    }, ethers.BigNumber.from('0'))
    // console.log(snapShotTotal)
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
      if (reward.eq(0)) {
        continue
      }
      const userAddress = info[0]
      // if (rewardTokenAddress === 'Matic') {
      //   tx = await signer.sendTransaction({ to: userAddress, value: reward })
      // } else {
      //   tx = await rewardToken.transfer(userAddress, reward)
      // }
      // console.log(`Sending ${ethers.utils.formatEther(reward)} to `, userAddress)
      // receipt = await tx.wait()
      // if (!receipt.status)
      //   throw Error(`Transaction sending ${ethers.utils.formatEther(reward)} to ${userAddress} failed, tx hash: ${tx.hash}`)
      // }
      count = count.add(reward)
      // if (reward.gt(ethers.utils.parseEther('1'))) {
      //   console.log(userAddress, ethers.utils.formatEther(reward))
      // }
      console.log(userAddress, ethers.utils.formatEther(reward))
    // console.log(userAddress, reward.toString())
    }
    console.log('Reward count: ', ethers.utils.formatEther(count))

    // console.log(stakerInfo)
    console.log('Number of stakers:', stakers.size)
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

  const startingBlock = 10190000
  // const endingBlock = 10033242
  // const endingBlock = 10292727
  const endingBlock = null

  const totalRewardAmount = ethers.utils.parseEther('100')
  await sendRewards(rewardTokenAddress, totalRewardAmount, trackedTokenAddress, startingBlock, endingBlock)
  // const accountAddress = '0x3C8876aEC0345c1c9EFc46138bD54A2D593fc676'
  // await accountTransfers(accountAddress, trackedTokenAddress, endingBlock)

  async function accountTransfers (accountAddress, trackedTokenAddress, endingBlock) {
    if (endingBlock == null) {
      endingBlock = await ethers.provider.getBlockNumber()
    }
    const trackedToken = await ethers.getContractAt('IERC20', trackedTokenAddress)
    console.log('Getting pool transfers in')
    let trackedTokenFilter = trackedToken.filters.Transfer(accountAddress, ghstStakingDiamondAddress)
    const trackedTokenTransfersIn = await trackedToken.queryFilter(trackedTokenFilter, diamondCreationBlock, endingBlock)
    console.log(`Got pool ${trackedTokenTransfersIn.length} transfers in`)
    trackedTokenFilter = trackedToken.filters.Transfer(ghstStakingDiamondAddress, accountAddress)
    console.log('Getting pool transfers out')
    const trackedTokenTransfersOut = await trackedToken.queryFilter(trackedTokenFilter, diamondCreationBlock, endingBlock)
    console.log(`Got ${trackedTokenTransfersOut.length} pool transfers out`)

    console.log('Transfers in:')
    for (const transfer of trackedTokenTransfersIn) {
      console.log('Blocknumber:', transfer.blockNumber)
      console.log('Amount added:', ethers.utils.formatEther(transfer.args._value))
    }
    console.log('-------------')
    console.log()
    console.log('Transfers out:')
    for (const transfer of trackedTokenTransfersOut) {
      console.log('Blocknumber:', transfer.blockNumber)
      console.log('Amount removed:', ethers.utils.formatEther(transfer.args._value))
    }
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
