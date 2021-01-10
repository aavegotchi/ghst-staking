/* global ethers, describe, it, before */
const { expect } = require('chai')
const truffleAssert = require('truffle-assertions')
const fs = require('fs')

const diamond = require('diamond-util')

let ghstContract
let ethGHSTPoolContract
let ghstStakingDiamond
let bobsGhstStakingDiamond
let account
let bob
let bobSigner

const oneBillion = '1000000000000000000000000000'
const threeBillion = '3000000000000000000000000000'
const fourBillion = '4000000000000000000000000000'
const eightBillion = '8000000000000000000000000000'
const oneHundredFourBillion = '104000046296296296296296296296'

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
  const json = JSON.parse(fs.readFileSync(`./artifacts/contracts/facets/${name}.sol/${name}.json`, 'utf8'))
  return json.deployedBytecode
}

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

describe('GHSTStakingDiamond', async function () {
  before(async function () {
    const accounts = await ethers.getSigners()
    account = await accounts[0].getAddress()
    bobSigner = accounts[1]
    bob = await bobSigner.getAddress()
    console.log('Account: ' + account)
    console.log('---')

    // deploy diamond
    console.log('Deploying facets and diamond:')
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
        instances.push(facetInstance)
      }
      return instances
    }
    const [
      diamondCutFacet,
      diamondLoupeFacet,
      ownershipFacet,
      stakingFacet,
      ticketsFacet,
      ghstStakingTokenFacet
    ] = await deployFacets(
      'DiamondCutFacet',
      'DiamondLoupeFacet',
      'OwnershipFacet',
      'StakingFacet',
      'TicketsFacet',
      'GHSTStakingTokenFacet'
    )

    //   address owner;
    //   address ghstContract;
    //   address uniV2PoolContract;
    //   address[] stakers;
    //   uint256[] frens;
    // matic network
    // mumbai
    // const ghstContract = '0x658809Bb08595D15a59991d640Ed5f2c658eA284'
    // matic mainnet

    const erc20ContractFactory = await ethers.getContractFactory('ERC20')
    ghstContract = await erc20ContractFactory.deploy()
    await ghstContract.deployed()
    console.log('address', ghstContract.address)

    // reusing ERC20 contract
    ethGHSTPoolContract = await erc20ContractFactory.deploy()
    ethGHSTPoolContract = await ethGHSTPoolContract.deployed()

    // eslint-disable-next-line no-unused-vars
    ghstStakingDiamond = await diamond.deploy({
      diamondName: 'GHSTStakingDiamond',
      facets: [
        ['DiamondCutFacet', diamondCutFacet],
        ['DiamondLoupeFacet', diamondLoupeFacet],
        ['OwnershipFacet', ownershipFacet],
        ['StakingFacet', stakingFacet],
        ['TicketsFacet', ticketsFacet],
        ['GHSTStakingTokenFacet', ghstStakingTokenFacet]
      ],
      args: [account, ghstContract.address, ethGHSTPoolContract.address],
      overrides: { gasLimit: 20000000 }
    })
    console.log('GHSTStaking diamond address:' + ghstStakingDiamond.address)

    ghstContract = await ethers.getContractAt('ERC20', ghstContract.address)
    ghstStakingDiamond = await ethers.getContractAt('IGHSTStakingDiamond', ghstStakingDiamond.address)
    bobsGhstStakingDiamond = ghstStakingDiamond.connect(bobSigner)

    await ghstContract.mint()
    await ghstContract.approve(ghstStakingDiamond.address, eightBillion)

    await ethGHSTPoolContract.mint()
    await ethGHSTPoolContract.approve(ghstStakingDiamond.address, eightBillion)
  })

  it('Check that all functions and facets exist in the diamond', async function () {
    const facets = await ghstStakingDiamond.facets()
    expect(facets.length).to.equal(6)
    const diamondCutFacetAddress = facets[0].facetAddress
    const diamondLoupeFacetAddress = facets[1].facetAddress
    const ownershipFacetAddress = facets[2].facetAddress
    const stakingFacetAddress = facets[3].facetAddress
    const ticketsFacetAddress = facets[4].facetAddress
    const ghstStakingTokenFacetAddress = facets[5].facetAddress
    const facetAddresses = [diamondCutFacetAddress, diamondLoupeFacetAddress, ownershipFacetAddress, stakingFacetAddress, ticketsFacetAddress, ghstStakingTokenFacetAddress]
    // Check that facet addresses are all different
    expect(new Set(facetAddresses).size).to.equal(6)
    // Testing facetAddresses function
    const facetAddressesFromDiamond = await ghstStakingDiamond.facetAddresses()
    expect(facetAddressesFromDiamond.length).to.equal(6)
    expect(facetAddresses).to.have.members(facetAddressesFromDiamond)
    // Checking that each facet exists on chain.
    expect(await ethers.provider.getCode(diamondCutFacetAddress)).to.equal(getArtifactBytecode('DiamondCutFacet'))
    expect(await ethers.provider.getCode(diamondLoupeFacetAddress)).to.equal(getArtifactBytecode('DiamondLoupeFacet'))
    expect(await ethers.provider.getCode(ownershipFacetAddress)).to.equal(getArtifactBytecode('OwnershipFacet'))
    expect(await ethers.provider.getCode(stakingFacetAddress)).to.equal(getArtifactBytecode('StakingFacet'))
    expect(await ethers.provider.getCode(ticketsFacetAddress)).to.equal(getArtifactBytecode('TicketsFacet'))
    expect(await ethers.provider.getCode(ghstStakingTokenFacetAddress)).to.equal(getArtifactBytecode('GHSTStakingTokenFacet'))
    // Check that loupe functions return the right selectors for each facet
    expect(facets[0].functionSelectors.length).to.equal(1)
    let selectors = getSelectors(await ethers.getContractFactory('DiamondCutFacet'))
    expect(selectors.length).to.equal(1)
    expect(facets[0].functionSelectors).to.have.members(selectors)
    // Check that facetFunctionSelectors returns the right selectors
    let facetSelectors = await ghstStakingDiamond.facetFunctionSelectors(diamondCutFacetAddress)
    expect(facetSelectors.length).to.equal(1)
    expect(facetSelectors).to.have.members(selectors)

    expect(facets[1].functionSelectors.length).to.equal(5)
    selectors = getSelectors(await ethers.getContractFactory('DiamondLoupeFacet'))
    expect(selectors.length).to.equal(5)
    expect(facets[1].functionSelectors).to.have.members(selectors)
    // Check that facetFunctionSelectors returns the right selectors
    facetSelectors = await ghstStakingDiamond.facetFunctionSelectors(diamondLoupeFacetAddress)
    expect(facetSelectors.length).to.equal(5)
    expect(facetSelectors).to.have.members(selectors)

    expect(facets[2].functionSelectors.length).to.equal(2)
    selectors = getSelectors(await ethers.getContractFactory('OwnershipFacet'))
    expect(selectors.length).to.equal(2)
    expect(facets[2].functionSelectors).to.have.members(selectors)
    // Check that facetFunctionSelectors returns the right selectors
    facetSelectors = await ghstStakingDiamond.facetFunctionSelectors(ownershipFacetAddress)
    expect(facetSelectors.length).to.equal(2)
    expect(facetSelectors).to.have.members(selectors)

    expect(facets[3].functionSelectors.length).to.equal(12)
    selectors = getSelectors(await ethers.getContractFactory('StakingFacet'))
    expect(selectors.length).to.equal(12)
    expect(facets[3].functionSelectors).to.have.members(selectors)
    // Check that facetFunctionSelectors returns the right selectors
    facetSelectors = await ghstStakingDiamond.facetFunctionSelectors(stakingFacetAddress)
    expect(facetSelectors.length).to.equal(12)
    expect(facetSelectors).to.have.members(selectors)

    expect(facets[4].functionSelectors.length).to.equal(12)
    selectors = getSelectors(await ethers.getContractFactory('TicketsFacet'))
    expect(selectors.length).to.equal(12)
    expect(facets[4].functionSelectors).to.have.members(selectors)
    // Check that facetFunctionSelectors returns the right selectors
    facetSelectors = await ghstStakingDiamond.facetFunctionSelectors(ticketsFacetAddress)
    expect(facetSelectors.length).to.equal(12)
    expect(facetSelectors).to.have.members(selectors)

    expect(facets[5].functionSelectors.length).to.equal(11)
    selectors = getSelectors(await ethers.getContractFactory('GHSTStakingTokenFacet'))
    expect(selectors.length).to.equal(11)
    expect(facets[5].functionSelectors).to.have.members(selectors)
    // Check that facetFunctionSelectors returns the right selectors
    facetSelectors = await ghstStakingDiamond.facetFunctionSelectors(ghstStakingTokenFacetAddress)
    expect(facetSelectors.length).to.equal(11)
    expect(facetSelectors).to.have.members(selectors)

    // Check that the facetAddress function works
    let factory = await ethers.getContractFactory('DiamondCutFacet')
    let selector = factory.interface.getSighash(Object.keys(factory.interface.functions)[0])
    expect(await ghstStakingDiamond.facetAddress(selector)).to.equal(diamondCutFacetAddress)

    factory = await ethers.getContractFactory('DiamondLoupeFacet')
    selector = factory.interface.getSighash(Object.keys(factory.interface.functions)[0])
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

    factory = await ethers.getContractFactory('GHSTStakingTokenFacet')
    selector = factory.interface.getSighash(Object.keys(factory.interface.functions)[0])
    expect(await ghstStakingDiamond.facetAddress(selector)).to.equal(ghstStakingTokenFacetAddress)
  })

  // Do not need to test upgrades because this is a single cut, immutable diamond.
  // So do not need to test replacing or removing functions and facets.
  // But tests for upgrades are here https://github.com/mudgen/diamond-2/blob/master/test/diamondTest.js
  // Here I test that upgrades are not possible in this diamond.
  // it('Check that diamond upgrades are not possible', async function () {
  //   const FacetCutAction = {
  //     Add: 0,
  //     Replace: 1,
  //     Remove: 2
  //   }
  //   // 0x618ddf52 == "myTestFunc()"
  //   const diamondCutFacet = await ethers.getContractAt('DiamondCutFacet', ghstStakingDiamond.address)
  //   await truffleAssert.reverts(
  //     diamondCutFacet.diamondCut([
  //       [ghstContract.address, FacetCutAction.Add, ['0x618ddf52']]
  //     ], ethers.constants.AddressZero, '0x'),
  //     'GHSTSTaking: Function does not exist')
  // })

  // API here: https://www.chaijs.com/api/bdd/
  it('Should stake all GHST', async function () {
    let balance = await ghstContract.balanceOf(account)
    expect(balance.toString()).to.equal(fourBillion)
    await ghstStakingDiamond.stakeGhst(balance)
    // eslint-disable-next-line no-unused-vars
    const [stakedGhst, stakedUniswapTokens] = await ghstStakingDiamond.staked(account)
    expect(stakedGhst.toString()).to.equal(fourBillion)
    balance = await ghstContract.balanceOf(account)
    expect(balance.toString()).to.equal('0')
  })

  it('Should stake GHST-ETH pool tokens', async function () {
    await ghstStakingDiamond.stakeUniV2PoolTokens(oneBillion)
    // eslint-disable-next-line no-unused-vars
    const [ghst, stakedUniswapTokens] = await ghstStakingDiamond.staked(account)
    expect(stakedUniswapTokens.toString()).to.equal(oneBillion)
  })

  it('Should accumulate frens from staked GHST and staked GHST-ETH pool tokens', async function () {
    await ethers.provider.send('evm_increaseTime', [86400]) // add 1 day

    await ethers.provider.send('evm_mine') // mine the next block
    // 1 fren per staked GHST per day
    // 1 day (plus one second) of 4 billion staked GHST equals 4 billion frens
    // 100 frens per GHST-ETH pool token per day
    // 1 day of 1 billion staked GHST-ETH pool tokens equals 100 billion frens
    // total frens is 104 billion frens
    const frens = await ghstStakingDiamond.frens(account)
    expect(frens.toString()).to.equal(oneHundredFourBillion)
  })

  it('Should be able to claim ticket', async function () {
    await ghstStakingDiamond.claimTickets([0, 1, 2, 3, 4, 5], [10, 6, 5, 3, 2, 1])
    const totalSupply = await ghstStakingDiamond.totalSupply('0')
    await ghstStakingDiamond.frens(account)
    expect(totalSupply.toString()).to.equal('10')
  })

  it('Cannot claim tickets above 5', async function () {
    await truffleAssert.reverts(ghstStakingDiamond.claimTickets(['6'], [1]))
  })

  it('Should not be able to purchase 3 million Godlike tickets', async function () {
    await truffleAssert.reverts(ghstStakingDiamond.claimTickets(['5'], [3000000]), 'Staking: Not enough frens points')
  })

  it('Total supply of all tickets should be 27', async function () {
    const totalSupplies = await ghstStakingDiamond.totalSupplies()
    let total = ethers.BigNumber.from('0')
    for (const supply of totalSupplies) {
      total = total.add(supply)
    }
    expect(Number(total)).to.equal(27)
  })

  it('Balance of second item should be 6', async function () {
    const balance = await ghstStakingDiamond.balanceOf(account, '1')
    expect(balance.toString()).to.equal('6')
  })

  it('Balance of third item should be 5', async function () {
    const balance = await ghstStakingDiamond.balanceOfAll(account)
    expect(balance[2].toString()).to.equal('5')
  })

  it('Can transfer own ticket', async function () {
    await ghstStakingDiamond.safeTransferFrom(account, bob, '0', '3', [])
    const bobTicketBalance = await ghstStakingDiamond.balanceOf(bob, '0')
    expect(Number(bobTicketBalance)).to.equal(3)
  })

  it("Cannot transfer someone else's ticket", async function () {
    await truffleAssert.reverts(ghstStakingDiamond.safeTransferFrom(bob, account, '1', '1', []), 'Tickets: Not approved to transfer')
  })

  it('Can batch transfer own tickets', async function () {
    await ghstStakingDiamond.safeBatchTransferFrom(account, bob, ['1', '2'], ['2', '1'], [])
    const bobTicketBalance1 = await ghstStakingDiamond.balanceOf(bob, '1')
    const bobTicketBalance2 = await ghstStakingDiamond.balanceOf(bob, '2')
    expect(Number(bobTicketBalance1)).to.equal(2)
    expect(Number(bobTicketBalance2)).to.equal(1)
  })

  it("Cannot batch transfer someone else's tickets", async function () {
    await truffleAssert.reverts(ghstStakingDiamond.safeBatchTransferFrom(bob, account, ['3', '4'], ['1', '1'], []), 'Tickets: Not approved to transfer')
  })

  it('Can get balance of batch', async function () {
    const result = await ghstStakingDiamond.balanceOfBatch([account, account, bob, bob, bob, bob], [0, 3, 5, 1, 0, 2])
    expect(Number(result[0])).to.equal(7)
    expect(Number(result[1])).to.equal(3)
    expect(Number(result[2])).to.equal(0)
    expect(Number(result[3])).to.equal(2)
    expect(Number(result[4])).to.equal(3)
    expect(Number(result[5])).to.equal(1)
  })

  it('Cannot transfer more tickets than one owns', async function () {
    await truffleAssert.reverts(ghstStakingDiamond.safeTransferFrom(account, bob, '3', '5', []), 'Tickets: _value greater than balance')
    await truffleAssert.reverts(ghstStakingDiamond.safeBatchTransferFrom(account, bob, ['3', '4'], ['5', '5'], []), 'Tickets: _value greater than balance')
  })

  it('Can approve transfers', async function () {
    expect(await ghstStakingDiamond.isApprovedForAll(account, bob)).to.equal(false)
    await ghstStakingDiamond.setApprovalForAll(bob, true)
    expect(await ghstStakingDiamond.isApprovedForAll(account, bob)).to.equal(true)
  })

  it('Can transfer approved transfers', async function () {
    bobsGhstStakingDiamond.safeTransferFrom(account, bob, '0', '5', [])
    let balance = await ghstStakingDiamond.balanceOf(bob, '0')
    expect(Number(balance)).to.equal(8)
    balance = await ghstStakingDiamond.balanceOf(account, '0')
    expect(Number(balance)).to.equal(2)

    bobsGhstStakingDiamond.safeBatchTransferFrom(account, bob, ['0', '3'], ['1', '2'], [])
    balance = await ghstStakingDiamond.balanceOf(bob, '0')
    expect(Number(balance)).to.equal(9)
    balance = await ghstStakingDiamond.balanceOf(account, '0')
    expect(Number(balance)).to.equal(1)

    balance = await ghstStakingDiamond.balanceOf(bob, '3')
    expect(Number(balance)).to.equal(2)
    balance = await ghstStakingDiamond.balanceOf(account, '3')
    expect(Number(balance)).to.equal(1)
  })

  it('Can withdraw staked GHST', async function () {
    const initialBalance = await ghstContract.balanceOf(account)
    expect(Number(initialBalance)).to.equal(0)
    // eslint-disable-next-line no-unused-vars
    const [stakedGhst, stakedUniswapTokens] = await ghstStakingDiamond.staked(account)

    const withdrawAmount = (10 * Math.pow(10, 18)).toString()
    await ghstStakingDiamond['withdrawGhstStake(uint256)'](withdrawAmount)
    let balance = await ghstContract.balanceOf(account)
    expect(balance.toString()).to.equal(initialBalance.add(withdrawAmount).toString())

    await ghstStakingDiamond['withdrawGhstStake()']()
    balance = await ghstContract.balanceOf(account)
    expect(balance.toString()).to.equal(initialBalance.add(stakedGhst).toString())
  })

  it('Can withdraw staked GHST-ETH pool tokens', async function () {
    const initialBalance = await ethGHSTPoolContract.balanceOf(account)
    expect(initialBalance.toString()).to.equal(threeBillion)
    // eslint-disable-next-line no-unused-vars
    const [stakedGhst, stakedUniswapTokens] = await ghstStakingDiamond.staked(account)

    const withdrawAmount = (10 * Math.pow(10, 18)).toString()
    await ghstStakingDiamond['withdrawUniV2PoolStake(uint256)'](withdrawAmount)
    let balance = await ethGHSTPoolContract.balanceOf(account)
    expect(balance.toString()).to.equal(initialBalance.add(withdrawAmount).toString())

    await ghstStakingDiamond['withdrawUniV2PoolStake()']()
    balance = await ethGHSTPoolContract.balanceOf(account)
    expect(balance.toString()).to.equal(initialBalance.add(stakedUniswapTokens).toString())
  })

  it('Cannot withdraw more than staked', async function () {
    const withdrawAmount = (10 * Math.pow(10, 18)).toString()
    await truffleAssert.reverts(ghstStakingDiamond['withdrawGhstStake(uint256)'](withdrawAmount), "Staking: Can't withdraw more than staked")
    await truffleAssert.reverts(ghstStakingDiamond['withdrawUniV2PoolStake(uint256)'](withdrawAmount), "Staking: Can't withdraw more than staked")
  })

  it('Can set setBaseURI', async function () {
    let url = await ghstStakingDiamond.uri(2)
    expect(url).to.equal('https://aavegotchi.com/metadata/2')
    await ghstStakingDiamond.setBaseURI('something_else/')
    url = await ghstStakingDiamond.uri(2)
    expect(url).to.equal('something_else/2')
  })

  it('Set contract owner', async function () {
    let owner = await ghstStakingDiamond.owner()
    expect(owner).to.equal(account)
    await ghstStakingDiamond.transferOwnership(bob)
    owner = await ghstStakingDiamond.owner()
    expect(owner).to.equal(bob)
    // wrong owner can't transfer ownership
    await truffleAssert.reverts(ghstStakingDiamond.transferOwnership(account), 'LibDiamond: Must be contract owner')
    // transfer ownership back
    await bobsGhstStakingDiamond.transferOwnership(account)
    owner = await ghstStakingDiamond.owner()
    expect(owner).to.equal(account)
  })
})
