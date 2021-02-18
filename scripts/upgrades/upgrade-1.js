
/* global ethers */

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

async function main () {
  const ghstStakingDiamondAddress = '0xA02d547512Bb90002807499F05495Fe9C4C3943f'

  const StkGHSTUSDC = await ethers.getContractFactory('StkGHSTUSDC')
  const stkGHSTUSDC = await StkGHSTUSDC.deploy(ghstStakingDiamondAddress)
  await stkGHSTUSDC.deployed()
  console.log('Deployed stkGHSTUSDC:', stkGHSTUSDC.address)

  const oldStakingFacetAddress = '0x45d5b2A69b6210e9024A772FF9DA7Fe7337ee739'

  const FacetCutAction = { Add: 0, Replace: 1, Remove: 2 }
  const diamondLoupeFacet = await ethers.getContractAt('DiamondLoupeFacet', ghstStakingDiamondAddress)
  const oldSelectors = await diamondLoupeFacet.facetFunctionSelectors(oldStakingFacetAddress)

  const StakingFacet = await ethers.getContractFactory('StakingFacet')
  let stakingFacet = await StakingFacet.deploy()
  await stakingFacet.deployed()
  console.log('Deployed new StakingFacet:', stakingFacet.address)

  console.log('Old functions:', oldSelectors)
  console.log()
  console.log('New Functions:', getSelectors(stakingFacet))

  const cut = [
    {
      facetAddress: ethers.constants.AddressZero,
      action: FacetCutAction.Remove,
      functionSelectors: oldSelectors
    },
    {
      facetAddress: stakingFacet.address,
      action: FacetCutAction.Add,
      functionSelectors: getSelectors(stakingFacet)
    }
  ]

  const diamondCut = await ethers.getContractAt('IDiamondCut', ghstStakingDiamondAddress)
  let tx = await diamondCut.diamondCut(cut, ethers.constants.AddressZero, '0x', { gasLimit: 5000000 })
  console.log('Diamond cut tx:', tx.hash)
  let receipt = await tx.wait()
  if (!receipt.status) {
    throw Error(`Diamond upgrade failed: ${tx.hash}`)
  }
  console.log('Completed diamond cut: ', tx.hash)

  stakingFacet = await ethers.getContractAt('StakingFacet', ghstStakingDiamondAddress)
  const ghstUsdcToken = '0x096c5ccb33cfc5732bcd1f3195c13dbefc4c82f4'
  // 10 percent more than 1 GHST per day
  tx = await stakingFacet.setGhstUsdcToken(ghstUsdcToken, stkGHSTUSDC.address, ethers.BigNumber.from('74062104'))
  receipt = await tx.wait()
  if (!receipt.status) {
    throw Error(`Failed to set GhstUsdcToken: ${tx.hash}`)
  }
  console.log('Set GhstUsdcToken:', tx.hash)
}

// Deployed stkGHSTUSDC: 0x04439eC4ba8b09acfae0E9b5D75A82cC63b19f09
// Deployed new StakingFacet: 0xc87f3dC7c12F090617112D3892eC284483D8B633

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
