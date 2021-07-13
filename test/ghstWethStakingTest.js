const { expect } = require('chai')
const { ethers } = require('hardhat')
const { addGhstWeth } = require('../scripts/upgrades/upgrade-addGhstWeth.js')

describe('Deploying', async function () {
  const diamondAddress = '0xA02d547512Bb90002807499F05495Fe9C4C3943f'
  const userAddress = '0x027Ffd3c119567e85998f4E6B9c3d83D5702660c'
  const stakeAmount = 10000

  let owner, user, signer, stakingFacet, ownerStakingFacet, userStakingFacet, ghstWethPoolToken, userGhstWethPoolToken,
    stkGhstWethToken,
    userGhstWethPoolTokenBalance

  before(async function () {
    this.timeout(1000000)
    await addGhstWeth()

    owner = await (await ethers.getContractAt('OwnershipFacet', diamondAddress)).owner()
    signer = await ethers.provider.getSigner(owner)
    await hre.network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [userAddress]
    })
    user = await ethers.provider.getSigner(userAddress)

    stakingFacet = await ethers.getContractAt('StakingFacet', diamondAddress)
    ownerStakingFacet = await stakingFacet.connect(signer)
    userStakingFacet = await stakingFacet.connect(user)
    ghstWethPoolToken = await ethers.getContractAt('ERC20', (await userStakingFacet.getGhstWethPoolToken()))
    stkGhstWethToken = await ethers.getContractAt('ERC20', (await userStakingFacet.getStkGhstWethToken()))
    userGhstWethPoolToken = await ghstWethPoolToken.connect(user)
    userGhstWethPoolTokenBalance = (await ghstWethPoolToken.balanceOf(userAddress)).toNumber()
  })

  it('Should reject when non-rate manager try to update GHST/WETH rate', async function () {
    await expect(userStakingFacet.updateGhstWethRate(10)).to.be.revertedWith('StakingFacet: Must be rate manager')
  })

  it('Should allow only rate manager to update GHST/WETH rate', async function () {
    const oldRate = (await userStakingFacet.ghstWethRate()).toNumber()

    let tx = await ownerStakingFacet.addRateManagers([userAddress])
    await tx.wait()

    tx = await userStakingFacet.updateGhstWethRate(oldRate + 10)
    await tx.wait()

    const newRate = await userStakingFacet.ghstWethRate()
    expect(newRate.toNumber()).to.equal(oldRate + 10)
  })

  it('Should reject if stake more than balance of GHST/WETH pool token', async function () {
    await expect(userStakingFacet.stakeGhstWethPoolTokens(userGhstWethPoolTokenBalance + 10)).to.be.reverted
  })

  it('Should stake if stake less than balance of GHST/WETH pool token', async function () {
    expect(userGhstWethPoolTokenBalance).to.greaterThan(stakeAmount)

    let staked = await userStakingFacet.staked(userAddress)
    const poolTokenAmountBeforeStake = staked['ghstWethPoolToken_'].toNumber()
    const stkTokenBalanceBeforeStake = (await stkGhstWethToken.balanceOf(userAddress)).toNumber()

    const allowance = await ghstWethPoolToken.allowance(userAddress, stakingFacet.address)
    if (allowance.lt(stakeAmount)) {
      const tx = await userGhstWethPoolToken.approve(stakingFacet.address, stakeAmount)
      const receipt = await tx.wait()
      if (!receipt.status) {
        throw Error(`Transaction approving  address failed: ${tx.hash}`)
      }
    }
    await userStakingFacet.stakeGhstWethPoolTokens(stakeAmount)

    staked = await userStakingFacet.staked(userAddress)
    const poolTokenAmountAfterStake = staked['ghstWethPoolToken_'].toNumber()
    expect(poolTokenAmountAfterStake).to.equal(poolTokenAmountBeforeStake + stakeAmount)

    const stkTokenBalanceAfterStake = (await stkGhstWethToken.balanceOf(userAddress)).toNumber()
    expect(stkTokenBalanceAfterStake).to.equal(stkTokenBalanceBeforeStake + stakeAmount)

    it('Should reject if withdraw more than staked amount of GHST/WETH pool stake token', async function () {
      await expect(userStakingFacet.withdrawGhstWethPoolStake(stkTokenBalanceAfterStake + 10)).to.be.reverted
    })

    it('Should stake if withdraw less than balance of GHST/WETH pool stake token', async function () {
      await userStakingFacet.withdrawGhstWethPoolStake(stakeAmount)

      staked = await userStakingFacet.staked(userAddress)
      const poolTokenAmountAfterWithdraw = staked['ghstWethPoolToken_'].toNumber()
      expect(poolTokenAmountAfterWithdraw).to.equal(poolTokenAmountAfterStake - stakeAmount)

      const stkTokenBalanceAfterWithdraw = (await stkGhstWethToken.balanceOf(userAddress)).toNumber()
      expect(stkTokenBalanceAfterWithdraw).to.equal(stkTokenBalanceAfterStake - stakeAmount)
    })
  })
})
