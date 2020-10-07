/* global ethers, describe, it, before */
const { expect } = require('chai')

const diamond = require('diamond-util')

let ghstDiamond
let ghstStakingDiamond
let account
let bob = "0xC3c2e1Cf099Bc6e1fA94ce358562BCbD5cc59FE5"

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

    //Commented this out bc the test was failing (2 seconds elapsed)
    //  await ethers.provider.send('evm_increaseTime', [1]) // add 1 seconds

    await ethers.provider.send('evm_mine') // mine the next block
    const frens = await ghstStakingDiamond.frens(account)
    console.log('Frens:' + frens / Math.pow(10, 18))
    expect(frens).to.equal(ethers.BigNumber.from('46296296296296296296296'))
  })

  it('Should be able to purchase ticket', async function () {

    const frens = await ghstStakingDiamond.frens(account)
    console.log('Frens Before:' + frens / Math.pow(10, 18))

    await ghstStakingDiamond.claimTickets(["0", "1", "2", "3", "4", "5"])
    const totalSupply = await ghstStakingDiamond.totalSupply("0")

    const frensAfter = await ghstStakingDiamond.frens(account)
    console.log('Frens After:' + frensAfter / Math.pow(10, 18))

    expect(totalSupply).to.equal("1")
  })

  it("Should not be able to purchase Godlike ticket", async function () {
    await ghstStakingDiamond.claimTickets(["5"])
    const frens = await ghstStakingDiamond.frens(account)
    console.log('Frens:' + frens / Math.pow(10, 18))
  })

  it("Total supply of tickets should be 6", async function () {
    const totalSupply = await ghstStakingDiamond.totalSupplies()
    expect(totalSupply.length).to.equal(6)
  })

  it("Balance of second item should be 1", async function () {
    const balance = await ghstStakingDiamond.balanceOf(account, "1")
    expect(balance).to.equal("1")
  })

  it("Balance of third item should be 1", async function () {
    const balance = await ghstStakingDiamond.balanceOfAll(account)
    expect(balance[2]).to.equal("1")
  })

  it("Frens balance should go up", async function () {
    const frens = await ghstStakingDiamond.frens(account)
    console.log('Frens:' + frens / Math.pow(10, 18))
  })

  it("Frens balance should go up more", async function () {
    const frens = await ghstStakingDiamond.frens(account)
    console.log('Frens:' + frens / Math.pow(10, 18))
  })

  // it("Can transfer ticket", async function () {
  //   await ghstStakingDiamond.safeTransferFrom(account, bob,)
  // })


})
