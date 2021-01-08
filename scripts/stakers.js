/* global ethers */

const diamond = require('diamond-util')
const { ethers } = require('hardhat')
const { createImportSpecifier } = require('typescript')
const local = require('../.local.config.js')

const abi = [
  'event Transfer(address indexed src, address indexed dst, uint val)'
]
const ghstAddress = '0x3f382dbd960e3a9bbceae22651e88158d2791550'
const ghstEthPairAddress = '0xaB659deE3030602c1aF8C29D146fAcD4aeD6EC85'

const stakingAddress = '0x93eA6ec350Ace7473f7694D43dEC2726a515E31A'

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

async function main () {
  const accounts = await ethers.getSigners()
  const account = await accounts[0].getAddress()
  let totalGasUsed = ethers.BigNumber.from('0')
  const ethereumProvider = new ethers.providers.JsonRpcProvider(local.mainnetUrl)

  const ghst = await ethers.getContractAt(abi, ghstAddress, ethereumProvider)
  const ghstStakersFilter = ghst.filters.Transfer(null, stakingAddress)
  const ghstTransfers = await ghst.queryFilter(ghstStakersFilter)
  const ghstStakers = new Set()
  for (const transfer of ghstTransfers) {
    ghstStakers.add(transfer.args.src)
  }
  console.log('GHST stakers:', ghstStakers.size)

  const ghstEthPair = await ethers.getContractAt(abi, ghstEthPairAddress, ethereumProvider)

  const ghstEthPairStakersFilter = ghstEthPair.filters.Transfer(null, stakingAddress)
  const ghstEthPairTransfers = await ghstEthPair.queryFilter(ghstEthPairStakersFilter)
  const ghstEthPairStakers = new Set()
  for (const transfer of ghstEthPairTransfers) {
    ghstEthPairStakers.add(transfer.args.src)
  }
  console.log('GHST-ETH pair stakers:', ghstEthPairStakers.size)

  const stakers = Array.from(new Set([...ghstStakers, ...ghstEthPairStakers]))

  console.log('All stakers: ', stakers.length)

  const stakingAbi = [
    'function frens(address _account) public view returns (uint256 frens_)'
  ]
  const staking = await ethers.getContractAt(stakingAbi, stakingAddress, ethereumProvider)
  const frens = []
  for (let i = 0; i < stakers.length; i++) {
    frens.push(await staking.frens(stakers[i] /*, { blockTag: 11608862 } */))
    console.log(stakers[i], ethers.utils.formatEther(frens[i]), i)
  }

  const signer = accounts[0]

  async function deployFacets (...facets) {
    const instances = []
    for (let facet of facets) {
      let constructorArgs = []
      if (Array.isArray(facet)) {
        ;[facet, constructorArgs] = facet
      }
      const factory = await ethers.getContractFactory(facet, signer)
      const facetInstance = await factory.deploy(...constructorArgs)
      await facetInstance.deployed()
      const tx = facetInstance.deployTransaction
      const receipt = await tx.wait()
      console.log(`${facet} deploy gas used:` + strDisplay(receipt.gasUsed))
      totalGasUsed = totalGasUsed.add(receipt.gasUsed)
      instances.push(facetInstance)
    }
    return instances
  }
  let [
    diamondCutFacet,
    diamondLoupeFacet,
    ownershipFacet,
    stakingFacet,
    ticketsFacet
  ] = await deployFacets(
    'DiamondCutFacet',
    'DiamondLoupeFacet',
    'OwnershipFacet',
    'StakingFacet',
    'TicketsFacet'
  )

  //   address owner;
  //   address ghstContract;
  //   address uniV2PoolContract;
  //   address[] stakers;
  //   uint256[] frens;
  // matic network
  const ghstContract = '0x658809Bb08595D15a59991d640Ed5f2c658eA284'
  const poolContract = '0x658809Bb08595D15a59991d640Ed5f2c658eA284'

  // eslint-disable-next-line no-unused-vars
  const ghstStakingDiamondDiamond = await diamond.deploy({
    diamondName: 'GHSTStakingDiamond',
    facets: [
      ['DiamondCutFacet', diamondCutFacet],
      ['DiamondLoupeFacet', diamondLoupeFacet],
      ['OwnershipFacet', ownershipFacet],
      ['StakingFacet', stakingFacet],
      ['TicketsFacet', ticketsFacet]
    ],
    args: [account, ghstContract, poolContract],
    overrides: { gasLimit: 20000000 }
  })
  console.log('GHSTStaking diamond address:' + ghstStakingDiamondDiamond.address)

  let tx = ghstStakingDiamondDiamond.deployTransaction
  let receipt = await tx.wait()
  console.log('GHSTStaking diamond deploy gas used:' + strDisplay(receipt.gasUsed))
  totalGasUsed = totalGasUsed.add(receipt.gasUsed)

  stakingFacet = await ethers.getContractAt('StakingFacet', ghstStakingDiamondDiamond.address)
  for (let i = 0; i < stakers.length; i += 400) {
    let end = i + 400
    if (end > stakers.length) {
      end = stakers.length
    }
    console.log(i, end)
    tx = await stakingFacet.migrateFrens(stakers.slice(i, end), frens.slice(i, end))
    receipt = await tx.wait()
    console.log('Frens migration gas used:' + strDisplay(receipt.gasUsed))
    totalGasUsed = totalGasUsed.add(receipt.gasUsed)
  }

  console.log('Total gas used:' + strDisplay(totalGasUsed))
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
