/* global describe, it, ethers before */
const { expect } = require('chai')

const diamond = require('diamond-util')
// const { ethers } = require('ethers')

let ghstDiamond
let ghstStakingDiamond
let account

describe('GHSTStakingDiamond', function () {
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
      otherArgs: []
    })

    await ghstStakingDiamond.mint()
  })

  it('Should have more than 30 frens', async function () {
    // const balance = await

    // console.log('address: ' + ghstDiamond.address)
    /*
    const Greeter = await ethers.getContractFactory('Greeter')
    const greeter = await Greeter.deploy('Hello, world!')

    await greeter.deployed()
    expect(await greeter.greet()).to.equal('Hello, world!')

    await greeter.setGreeting('Hola, mundo!')
    expect(await greeter.greet()).to.equal('Hola, mundo!')
    */
  })
})
