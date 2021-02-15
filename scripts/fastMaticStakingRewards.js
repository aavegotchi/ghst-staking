/* global ethers */

const ghstStakingDiamondAddress = '0xA02d547512Bb90002807499F05495Fe9C4C3943f'
const diamondCreationBlock = 9833113

async function main () {
  const airdrop = await ethers.getContractAt('Airdrop', '0x3D429DbB062A195a42A113D61FeC687b398b4a6e')

  async function sendRewards (rewardTokenAddress, totalRewardAmount, trackedTokenAddress, startingBlock, endingBlock) {
    let erc20
    if (rewardTokenAddress !== 'Matic') {
      erc20 = await ethers.getContractAt('IERC20', rewardTokenAddress)
      const accounts = await ethers.getSigners()
      const accountAddress = await accounts[0].getAddress()
      const allowance = await erc20.allowance(accountAddress, airdrop.address)
      if (allowance.lt(totalRewardAmount)) {
        console.log('Does not have allowance. Getting approval')
        const tx = await erc20.approve(airdrop.address, ethers.constants.MaxUint256)
        const receipt = await tx.wait()
        if (!receipt.status) {
          throw Error(`Transaction approving airdrop ${airdrop.address} to transfer funds failed: ${tx.hash}`)
        }
        console.log('Got token approcal to send')
      } else {
        console.log('Already has token approval to send')
      }
    }
    if (endingBlock == null) {
      endingBlock = await ethers.provider.getBlockNumber()
    }
    console.log('startingBlock:', startingBlock)
    console.log('endingBlock:', endingBlock)
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
      }
      transfers.push(transfer)
    }
    for (; indexIn < trackedTokenTransfersIn.length; indexIn++) {
      transfers.push(trackedTokenTransfersIn[indexIn])
    }

    if (transfers.length !== trackedTokenTransfersIn.length + trackedTokenTransfersOut.length) {
      throw Error('Wrong number of transfers in transfers variable')
    }

    // get snapshots
    let nextSnapShot = startingBlock
    let transferIndex = 0
    for (let currentBlockNumber = diamondCreationBlock; currentBlockNumber <= endingBlock; currentBlockNumber++) {
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

    // Check that balances match adds and removes of token
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

      // if (snapShot.eq(0)) {
      //   console.log('Address:', stakerAddress)
      //   console.log('Balance:', ethers.utils.formatEther(balance))
      //   console.log('SnapShotTotal:', ethers.utils.formatEther(snapShot))
      //   console.log('added:', ethers.utils.formatEther(added))
      //   console.log('removed:', ethers.utils.formatEther(removed))
      //   console.log('')
      // }

      // console.log('---------------', stakerAddress, '--------------')
      // console.log('Balance:', ethers.utils.formatEther(balance))
      // console.log('SnapShotTotal:', ethers.utils.formatEther(snapShot))
      // console.log('added:', ethers.utils.formatEther(added))
      // console.log('removed:', ethers.utils.formatEther(removed))
      // console.log('')
    }

    let stakersThatEarnRewards = 0
    const snapShotTotal = [...stakerInfo].reduce((acc, info) => {
      return acc.add(info[1].snapShotTotal)
    }, ethers.BigNumber.from('0'))

    let tx
    let receipt
    // console.log(ethers.utils.formatEther(snapShotTotal))
    let count = ethers.BigNumber.from('0')
    // let start = false

    // send rewards in batches
    let batchAddresses = []
    let batchAmounts = []
    let index = 0
    for (const info of stakerInfo) {
      index++
      const balance = info[1].snapShotTotal
      const reward = totalRewardAmount.mul(balance).div(snapShotTotal)

      const userAddress = info[0]
      count = count.add(reward)
      if (reward.gt(0)) {
        batchAddresses.push(userAddress)
        batchAmounts.push(reward)
        stakersThatEarnRewards++
      }

      if (batchAddresses.length === 200 || (index === stakerInfo.size && batchAddresses.length > 0)) {
        console.log('--------------Sending Batch--------------------')
        if (rewardTokenAddress === 'Matic') {
          const totalBatchAmount = batchAmounts.reduce((acc, value) => {
            return acc.add(value)
          })
          tx = await airdrop.airdropMatic(batchAddresses, batchAmounts, { value: totalBatchAmount })
        } else {
          tx = await airdrop.airdropToken(rewardTokenAddress, batchAddresses, batchAmounts)
        }
        receipt = await tx.wait()
        if (!receipt.status) {
          throw Error(`Transaction sending batch failed, tx hash: ${tx.hash}`)
        }
        for (const [index, address] of batchAddresses.entries()) {
          const amount = batchAmounts[index]
          console.log(`Sent ${ethers.utils.formatEther(amount)} to `, address)
        }
        batchAddresses = []
        batchAmounts = []
      }
    }
    console.log('Reward count: ', ethers.utils.formatEther(count))

    // console.log(stakerInfo)
    console.log('Number of stakers with rewards:', stakersThatEarnRewards)
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

  const startingBlock = 10478371
  // const endingBlock = 10033242
  // const endingBlock = 10292727
  const endingBlock = 10771677
  // total: 28278
  // 30 percent of that is:
  const totalRewardAmount = ethers.utils.parseEther('19794.6')
  await sendRewards(rewardTokenAddress, totalRewardAmount, trackedTokenAddress, startingBlock, endingBlock)
  // const accountAddress = '0x9fB3847872B3694139d4C19ffffB914520E926Aa'
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
