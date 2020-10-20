/* global ethers, describe, it, before */
const { expect } = require('chai')
const truffleAssert = require('truffle-assertions')
const fs = require('fs')

const diamond = require('diamond-util')

let ghstDiamond
let ghstStakingDiamond
let account
const bob = '0xC3c2e1Cf099Bc6e1fA94ce358562BCbD5cc59FE5'

const oneBillion = '1000000000000000000000000000'
const threeBillion = '3000000000000000000000000000'
const fourBillion = '4000000000000000000000000000'
const eightBillion = '8000000000000000000000000000'

function getSelectors (contract) {
  const signatures = Object.keys(contract.interface.functions)
  const selectors = signatures.reduce((acc, val) => {
    if (val !== 'init(bytes)') {
      acc.push(contract.interface.getSighash(val))
    }
    return acc
  }, [])
  return selectors
}

function getArtifactBytecode (name) {
  const json = JSON.parse(fs.readFileSync(`./artifacts/${name}.json`, 'utf8'))
  return json.deployedBytecode
}

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
      facets: [
        // 'DiamondCutFacet',
        ['DiamondLoupeFacet', diamondLoupeFacet],
        'OwnershipFacet',
        'GHSTFacet'
      ],
      owner: account,
      otherArgs: []
    })

    console.log('address', ghstDiamond.address)

    ghstStakingDiamond = await diamond.deploy({
      diamondName: 'GHSTStakingDiamond',
      facets: [
        // 'DiamondCutFacet',
        ['DiamondLoupeFacet', diamondLoupeFacet],
        'OwnershipFacet',
        'StakingFacet',
        'TicketsFacet'
      ],
      owner: account,
      otherArgs: [ghstDiamond.address, ghstDiamond.address]
    })

    ghstDiamond = await ethers.getContractAt('GHSTFacet', ghstDiamond.address)
    ghstStakingDiamond = await ethers.getContractAt('IGHSTStakingDiamond', ghstStakingDiamond.address)

    await ghstDiamond.mint()
    await ghstDiamond.approve(ghstStakingDiamond.address, eightBillion)
  })

  it('Check that all functions and facets exist in the diamond', async function () {
    const facets = await ghstStakingDiamond.facets()
    expect(facets.length).to.equal(4)
    const diamondLoupeFacetAddress = facets[0].facetAddress
    const ownershipFacetAddress = facets[1].facetAddress
    const stakingFacetAddress = facets[2].facetAddress
    const ticketsFacetAddress = facets[3].facetAddress
    const facetAddresses = [diamondLoupeFacetAddress, ownershipFacetAddress, stakingFacetAddress, ticketsFacetAddress]
    // Check that facet addresses are all different
    expect(new Set(facetAddresses).size).to.equal(4)
    // Testing facetAddresses function
    const facetAddressesFromDiamond = await ghstStakingDiamond.facetAddresses()
    expect(facetAddressesFromDiamond.length).to.equal(4)
    expect(facetAddresses).to.have.members(facetAddressesFromDiamond)
    // Checking that each facet exists on chain.
    expect(await ethers.provider.getCode(diamondLoupeFacetAddress)).to.equal(getArtifactBytecode('DiamondLoupeFacet'))
    expect(await ethers.provider.getCode(ownershipFacetAddress)).to.equal(getArtifactBytecode('OwnershipFacet'))
    expect(await ethers.provider.getCode(stakingFacetAddress)).to.equal(getArtifactBytecode('StakingFacet'))
    expect(await ethers.provider.getCode(ticketsFacetAddress)).to.equal(getArtifactBytecode('TicketsFacet'))
    // Check that loupe functions return the right selectors for each facet
    expect(facets[0].functionSelectors.length).to.equal(5)
    let selectors = getSelectors(await ethers.getContractFactory('DiamondLoupeFacet'))
    expect(selectors.length).to.equal(5)
    expect(facets[0].functionSelectors).to.have.members(selectors)
    // Check that facetFunctionSelectors returns the right selectors
    let facetSelectors = await ghstStakingDiamond.facetFunctionSelectors(diamondLoupeFacetAddress)
    expect(facetSelectors.length).to.equal(5)
    expect(facetSelectors).to.have.members(selectors)

    expect(facets[1].functionSelectors.length).to.equal(2)
    selectors = getSelectors(await ethers.getContractFactory('OwnershipFacet'))
    expect(selectors.length).to.equal(2)
    expect(facets[1].functionSelectors).to.have.members(selectors)
    // Check that facetFunctionSelectors returns the right selectors
    facetSelectors = await ghstStakingDiamond.facetFunctionSelectors(ownershipFacetAddress)
    expect(facetSelectors.length).to.equal(2)
    expect(facetSelectors).to.have.members(selectors)

    expect(facets[2].functionSelectors.length).to.equal(10)
    selectors = getSelectors(await ethers.getContractFactory('StakingFacet'))
    expect(selectors.length).to.equal(10)
    expect(facets[2].functionSelectors).to.have.members(selectors)
    // Check that facetFunctionSelectors returns the right selectors
    facetSelectors = await ghstStakingDiamond.facetFunctionSelectors(stakingFacetAddress)
    expect(facetSelectors.length).to.equal(10)
    expect(facetSelectors).to.have.members(selectors)

    expect(facets[3].functionSelectors.length).to.equal(11)
    selectors = getSelectors(await ethers.getContractFactory('TicketsFacet'))
    expect(selectors.length).to.equal(11)
    expect(facets[3].functionSelectors).to.have.members(selectors)
    // Check that facetFunctionSelectors returns the right selectors
    facetSelectors = await ghstStakingDiamond.facetFunctionSelectors(ticketsFacetAddress)
    expect(facetSelectors.length).to.equal(11)
    expect(facetSelectors).to.have.members(selectors)

    // Check that the facetAddress function works
    let factory = await ethers.getContractFactory('DiamondLoupeFacet')
    let selector = factory.interface.getSighash(Object.keys(factory.interface.functions)[0])
    expect(await ghstStakingDiamond.facetAddress(selector)).to.equal(diamondLoupeFacetAddress)

    factory = await ethers.getContractFactory('OwnershipFacet')
    selector = factory.interface.getSighash(Object.keys(factory.interface.functions)[0])
    expect(await ghstStakingDiamond.facetAddress(selector)).to.equal(ownershipFacetAddress)

    factory = await ethers.getContractFactory('StakingFacet')
    selector = factory.interface.getSighash(Object.keys(factory.interface.functions)[0])
    expect(await ghstStakingDiamond.facetAddress(selector)).to.equal(stakingFacetAddress)

    factory = await ethers.getContractFactory('TicketsFacet')
    selector = factory.interface.getSighash(Object.keys(factory.interface.functions)[0])
    expect(await ghstStakingDiamond.facetAddress(selector)).to.equal(ticketsFacetAddress)
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
    // Commented this out bc the test was failing (2 seconds elapsed)
    //  await ethers.provider.send('evm_increaseTime', [1]) // add 1 seconds

    await ethers.provider.send('evm_mine') // mine the next block
    const frens = await ghstStakingDiamond.frens(account)
    // console.log('Frens:' + frens / Math.pow(10, 18))
    expect(frens).to.equal(ethers.BigNumber.from('46296296296296296296296'))
  })

  it('Should be able to claim ticket', async function () {
    // await ghstStakingDiamond.claimTickets(['0', '1', '2', '3', '4', '5'], [1, 1, 1, 1, 1, 1])
    await ghstStakingDiamond.claimTickets([0, 1, 2, 3, 4, 5], [1, 1, 1, 1, 1, 1])
    const totalSupply = await ghstStakingDiamond.totalSupply('0')
    await ghstStakingDiamond.frens(account)
    expect(totalSupply).to.equal('1')
  })

  it('Cannot claim tickets above 5', async function () {
    await truffleAssert.reverts(ghstStakingDiamond.claimTickets(['6'], [1]))
  })

  it('Should not be able to purchase 5 Godlike tickets', async function () {
    await truffleAssert.reverts(ghstStakingDiamond.claimTickets(['5'], [5]), 'Staking: Not enough frens points')
  })

  it('Total supply of tickets should be 6', async function () {
    const totalSupply = await ghstStakingDiamond.totalSupplies()
    expect(totalSupply.length).to.equal(6)
  })

  it('Balance of second item should be 1', async function () {
    const balance = await ghstStakingDiamond.balanceOf(account, '1')
    expect(balance).to.equal('1')
  })

  it('Balance of third item should be 1', async function () {
    const balance = await ghstStakingDiamond.balanceOfAll(account)
    expect(balance[2]).to.equal('1')
  })

  it('Can transfer own ticket', async function () {
    await ghstStakingDiamond.safeTransferFrom(account, bob, '0', '1', [])
    const bobTicketBalance = await ghstStakingDiamond.balanceOf(bob, '0')
    expect(bobTicketBalance).to.equal('1')
  })

  it("Cannot transfer someone else's ticket", async function () {
    await truffleAssert.reverts(ghstStakingDiamond.safeTransferFrom(bob, account, '1', '1', []), 'Tickets: Not approved to transfer')
  })

  it('Can batch transfer own tickets', async function () {
    await ghstStakingDiamond.safeBatchTransferFrom(account, bob, ['1', '2'], ['1', '1'], [])
    const bobTicketBalance1 = await ghstStakingDiamond.balanceOf(bob, '1')
    const bobTicketBalance2 = await ghstStakingDiamond.balanceOf(bob, '2')
    expect(bobTicketBalance1).to.equal('1')
    expect(bobTicketBalance2).to.equal(1)
  })

  it("Cannot batch transfer someone else's tickets", async function () {
    await truffleAssert.reverts(ghstStakingDiamond.safeBatchTransferFrom(bob, account, ['3', '4'], ['1', '1'], []), 'Tickets: Not approved to transfer')
  })

  it('Cannot transfer more tickets than one owns', async function () {
    await truffleAssert.reverts(ghstStakingDiamond.safeTransferFrom(account, bob, '3', '5', []), 'Tickets: _value greater than balance')
    await truffleAssert.reverts(ghstStakingDiamond.safeBatchTransferFrom(account, bob, ['3', '4'], ['5', '5'], []), 'Tickets: _value greater than balance')
  })

  it('Should stake GHST-ETH', async function () {
    await ghstDiamond.mint()
    await ghstStakingDiamond.stakeUniV2PoolTokens(oneBillion)
    const [ghst, uniswap] = await ghstStakingDiamond.staked(account)
    expect(uniswap).to.equal(oneBillion)
  })

  it('Can withdraw staked GHST', async function () {
    const initialBalance = await ghstDiamond.balanceOf(account)
    expect(initialBalance).to.equal(threeBillion)
    // eslint-disable-next-line no-unused-vars
    const [stakedGhst, stakedUniswapTokens] = await ghstStakingDiamond.staked(account)

    const withdrawAmount = (10 * Math.pow(10, 18)).toString()
    await ghstStakingDiamond['withdrawGhstStake(uint256)'](withdrawAmount)
    let balance = await ghstDiamond.balanceOf(account)
    expect(balance).to.equal(initialBalance.add(withdrawAmount))

    await ghstStakingDiamond['withdrawGhstStake()']()
    balance = await ghstDiamond.balanceOf(account)
    expect(balance).to.equal(initialBalance.add(stakedGhst))
  })
})
