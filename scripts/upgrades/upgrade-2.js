
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

async function deployFacets (facetNames) {
  const facets = Object.create(null)
  for (const facetName of facetNames) {
    console.log('Deploying ', facetName)
    const factory = await ethers.getContractFactory(facetName)
    const facet = await factory.deploy()
    await facet.deployed()
    console.log('Deployed ' + facetName)
    facets[facetName] = facet
  }
  return facets
}

async function main () {
  const ghstStakingDiamondAddress = '0xA02d547512Bb90002807499F05495Fe9C4C3943f'

  const facets = await deployFacets([
    'GHSTStakingTokenFacet',
    'MetaTransactionsFacet',
    'StakingFacet',
    'TicketsFacet'
  ])

  const FacetCutAction = { Add: 0, Replace: 1, Remove: 2 }
  const newFunction = getSelector('function setAavegotchiDiamond(address _aavegotchiDiamond) external')
  // console.log(newFunction)
  let ticketsSelectors = getSelectors(facets.TicketsFacet)
  // console.log(ticketsSelectors)
  ticketsSelectors = ticketsSelectors.filter(selector => selector !== newFunction)
  // console.log(ticketsSelectors)

  // console.log(facets)
  //   for (const [name, facet] of Object.entries(facets)) {
  //     console.log(name)
  //     console.log(getSelectors(facet))
  //   }

  const cut = [
    {
      facetAddress: facets.TicketsFacet.address,
      action: FacetCutAction.Add,
      functionSelectors: [newFunction]
    },
    {
      facetAddress: facets.TicketsFacet.address,
      action: FacetCutAction.Replace,
      functionSelectors: ticketsSelectors
    },
    {
      facetAddress: facets.GHSTStakingTokenFacet.address,
      action: FacetCutAction.Replace,
      functionSelectors: getSelectors(facets.GHSTStakingTokenFacet)
    },
    {
      facetAddress: facets.MetaTransactionsFacet.address,
      action: FacetCutAction.Add,
      functionSelectors: getSelectors(facets.MetaTransactionsFacet)
    },
    {
      facetAddress: facets.StakingFacet.address,
      action: FacetCutAction.Replace,
      functionSelectors: getSelectors(facets.StakingFacet)
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

  const metaTx = await ethers.getContractAt('MetaTransactionsFacet', ghstStakingDiamondAddress)
  tx = await metaTx.setDomainSeparator('GHSTStakingDiamond', 'V1')
  console.log('Setting domaind separator:', tx.hash)
  receipt = await tx.wait()
  if (!receipt.status) {
    throw Error(`Setting domaind separator failed: ${tx.hash}`)
  }
  console.log('Completed setting domain separator: ', tx.hash)

//   stakingFacet = await ethers.getContractAt('StakingFacet', ghstStakingDiamondAddress)
//   const ghstUsdcToken = '0x096c5ccb33cfc5732bcd1f3195c13dbefc4c82f4'
//   // 10 percent more than 1 GHST per day
//   tx = await stakingFacet.setGhstUsdcToken(ghstUsdcToken, stkGHSTUSDC.address, ethers.BigNumber.from('74062104'))
//   receipt = await tx.wait()
//   if (!receipt.status) {
//     throw Error(`Failed to set GhstUsdcToken: ${tx.hash}`)
//   }
//   console.log('Set GhstUsdcToken:', tx.hash)
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
