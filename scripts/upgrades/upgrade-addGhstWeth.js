
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

function getSelector (func) {
  const abiInterface = new ethers.utils.Interface([func])
  return abiInterface.getSighash(ethers.utils.Fragment.from(func))
}

async function main () {
  const ghstStakingDiamondAddress = '0xA02d547512Bb90002807499F05495Fe9C4C3943f'

  const StkGHSTWETH = await ethers.getContractFactory('StkGHSTWETH')
  const StkGHSTWETH = await StkGHSTWETH.deploy(ghstStakingDiamondAddress)
  await StkGHSTWETH.deployed()
  console.log('Deployed StkGHSTWETH:', StkGHSTWETH.address)

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
  const ghstWethToken = '0xccb9d2100037f1253e6c1682adf7dc9944498aff'
  // 10 percent more than 1 GHST per day
  
  //figure out the correct rate of FRENS for this token
  
  tx = await stakingFacet.setGhstWethToken(ghstWethToken, StkGHSTWETH.address, ethers.BigNumber.from('xxx'))
  receipt = await tx.wait()
  if (!receipt.status) {
    throw Error(`Failed to set GhstWethToken: ${tx.hash}`)
  }
  console.log('Set GhstWethToken:', tx.hash)
}

// Deployed StkGHSTWETH: 0x04439eC4ba8b09acfae0E9b5D75A82cC63b19f09
// Deployed new StakingFacet: 0xc87f3dC7c12F090617112D3892eC284483D8B633

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
