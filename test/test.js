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


    const GHSTFacet = await ethers.getContractFactory('GHSTFacet')
    const ghstFacet = ethers.getContractAt(GHSTFacet.interface, ghstDiamond.address)

    await ghstFacet.mint()
  })

  it('Should have more than 30 frens', async function () {

    let frens = 30
    expect(frens === 30, "Frens should equal 30")

    // const balance = await

    // console.log('address: ' + ghstDiamond.address)


  })
})
