/* global ethers, describe, it, before */
const { expect } = require('chai')

const diamond = require('diamond-util')

let ghstDiamond
let ghstStakingDiamond
let account

const fourBillion = '4000000000000000000000000000'

describe('GHSTStakingDiamond', async function () {
  before(async function () {
    const DiamondLoupeFacetFactory = await ethers.getContractFactory('DiamondLoupeFacet')
    const diamondLoupeFacet = await DiamondLoupeFacetFactory.deploy()
    await diamondLoupeFacet.deployed()

    const accounts = await ethers.getSigners()
    account = await accounts[0].getAddress()
    console.log('Account: ' + account)
    console.log('---')

    ghstDiamond = await diamond.deploy({
      diamondName: 'GHSTDiamond',
      owner: account,
      facets: [
        // 'DiamondCutFacet',
        ['DiamondLoupeFacet', diamondLoupeFacet],
        'OwnershipFacet',
        'GHSTFacet'
      ],
      otherArgs: []
    })

    console.log('address', ghstDiamond.address)

    ghstStakingDiamond = await diamond.deploy({
      diamondName: 'GHSTStakingDiamond',
      owner: account,
      facets: [
        // 'DiamondCutFacet',
        ['DiamondLoupeFacet', diamondLoupeFacet],
        'OwnershipFacet',
        'StakingFacet',
        'TicketsFacet'
      ],
      otherArgs: [ghstDiamond.address, ghstDiamond.address]
    })

    ghstDiamond = await ethers.getContractAt('GHSTFacet', ghstDiamond.address)
    ghstStakingDiamond = await ethers.getContractAt('IGHSTStakingDiamond', ghstStakingDiamond.address)

    await ghstDiamond.mint()
    await ghstDiamond.approve(ghstStakingDiamond.address, fourBillion)
  })

  // API here: https://www.chaijs.com/api/bdd/
  it('Should stake all GHST', async function () {
    let balance = await ghstDiamond.balanceOf(account)
    expect(balance).to.equal(fourBillion)
    await ghstStakingDiamond.stakeGhst(balance)
    // eslint-disable-next-line no-unused-vars
    const [stakedGhst, stakedUniswapTokens] = await ghstStakingDiamond.staked(account)
    expect(stakedGhst).to.equal(fourBillion)
    balance = await ghstDiamond.balanceOf(account)
    expect(balance).to.equal(0)
  })

  it('Should accumulate frens', async function () {
    await ethers.provider.send('evm_increaseTime', [1]) // add 1 seconds
    await ethers.provider.send('evm_mine') // mine the next block
    const frens = await ghstStakingDiamond.frens(account)
    // console.log('Frens:' + frens.toString())
    expect(frens).to.equal(ethers.BigNumber.from('46296296296296296296296'))
  })
})
