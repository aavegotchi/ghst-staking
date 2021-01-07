/* global ethers */

const abi = [
  'event Transfer(address indexed src, address indexed dst, uint val)'
]
const ghstAddress = '0x3f382dbd960e3a9bbceae22651e88158d2791550'
const ghstEthPairAddress = '0xaB659deE3030602c1aF8C29D146fAcD4aeD6EC85'

const stakingAddress = '0x93eA6ec350Ace7473f7694D43dEC2726a515E31A'

async function main () {
  const ghst = await ethers.getContractAt(abi, ghstAddress)
  const ghstStakersFilter = ghst.filters.Transfer(null, stakingAddress)
  const ghstTransfers = await ghst.queryFilter(ghstStakersFilter)
  const ghstStakers = new Set()
  for (const transfer of ghstTransfers) {
    ghstStakers.add(transfer.args.src)
  }
  console.log('GHST stakers:', ghstStakers.size)

  const ghstEthPair = await ethers.getContractAt(abi, ghstEthPairAddress)

  const ghstEthPairStakersFilter = ghstEthPair.filters.Transfer(null, stakingAddress)
  const ghstEthPairTransfers = await ghstEthPair.queryFilter(ghstEthPairStakersFilter)
  const ghstEthPairStakers = new Set()
  for (const transfer of ghstEthPairTransfers) {
    ghstEthPairStakers.add(transfer.args.src)
  }
  console.log('GHST-ETH pair stakers:', ghstEthPairStakers.size)

  const stakers = new Set([...ghstStakers, ...ghstEthPairStakers])

  console.log('All stakers: ', stakers.size)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
