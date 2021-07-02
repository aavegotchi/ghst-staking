const { expect } = require('chai')
const { ethers } = require('hardhat')
const { deployRateManager } = require('../scripts/upgrades/upgrade-rateManager.js')

describe('Deploying', async function () {
  const diamondAddress = '0xA02d547512Bb90002807499F05495Fe9C4C3943f'
  let txData, owner, rateManager, generalUser, signer, stakingFacet, rateManagerStakingFacet, ownerStakingFacet, generalUserStakingFacet

  before(async function () {
    this.timeout(1000000)
    await deployRateManager()

    owner = await (await ethers.getContractAt('OwnershipFacet', diamondAddress)).owner()
    signer = await ethers.provider.getSigner(owner);
    [rateManager, generalUser] = await ethers.getSigners()
    stakingFacet = (await ethers.getContractAt('StakingFacet', diamondAddress))
    ownerStakingFacet = await stakingFacet.connect(signer)
    generalUserStakingFacet = await stakingFacet.connect(generalUser)
    rateManagerStakingFacet = await stakingFacet.connect(rateManager)
  })

  it('Should reject when general user try to add or remove a rate manager', async function () {
    // Check add and view function works
    let isManager = await generalUserStakingFacet.isRateManager(rateManager.address)
    expect(isManager).to.equal(false)

    // Add Rate Manager
    await expect(generalUserStakingFacet.addRateManagers([rateManager.address])).to.be.revertedWith('LibDiamond: Must be contract owner')

    // Remove Rate Manager
    await expect(generalUserStakingFacet.removeRateManagers([rateManager.address])).to.be.revertedWith('LibDiamond: Must be contract owner')
  })

  it('Should allow only owner to add or remove a rate manager', async function () {
    // Check add and view function works
    let isManager = await ownerStakingFacet.isRateManager(rateManager.address)
    expect(isManager).to.equal(false)

    // Add Rate Manager
    let addTx = await ownerStakingFacet.addRateManagers([rateManager.address])
    txData = await addTx.wait()

    // Check view function works
    isManager = await ownerStakingFacet.isRateManager(rateManager.address)
    expect(isManager).to.equal(true)

    // Remove Rate Manager
    let removeTx = await ownerStakingFacet.removeRateManagers([rateManager.address])
    txData = await removeTx.wait()

    // Check remove and view function works
    isManager = await ownerStakingFacet.isRateManager(rateManager.address)
    expect(isManager).to.equal(false)
  })

  it('Should reject when non-rate manager try to update pool tokens rate', async function () {
    await expect(generalUserStakingFacet.updatePoolTokensRate(10)).to.be.revertedWith('StakingFacet: Must be rate manager')
  })

  it('Should allow only rate manager to update pool tokens rate', async function () {
    let oldRate = (await generalUserStakingFacet.poolTokensRate()).toNumber()

    // Add Rate Manager and update pool tokens rate
    let tx = await ownerStakingFacet.addRateManagers([rateManager.address])
    await tx.wait()

    tx = await rateManagerStakingFacet.updatePoolTokensRate(oldRate + 10)
    await tx.wait()

    let newRate = await generalUserStakingFacet.poolTokensRate()
    expect(newRate.toNumber()).to.equal(oldRate + 10)
  })

  it('Should reject when non-rate manager try to update GHST/USDC rate', async function () {
    await expect(generalUserStakingFacet.updateGhstUsdcRate(10)).to.be.revertedWith('StakingFacet: Must be rate manager')
  })

  it('Should allow only rate manager to update GHST/USDC rate', async function () {
    let oldRate = (await generalUserStakingFacet.ghstUsdcRate()).toNumber()

    // Add Rate Manager and update pool tokens rate
    let tx = await ownerStakingFacet.addRateManagers([rateManager.address])
    await tx.wait()

    tx = await rateManagerStakingFacet.updateGhstUsdcRate(oldRate + 10)
    await tx.wait()

    let newRate = await generalUserStakingFacet.ghstUsdcRate()
    expect(newRate.toNumber()).to.equal(oldRate + 10)
  })
})
