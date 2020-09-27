/* global ethers */
// We require the Buidler Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
// When running the script with `buidler run <script>` you'll find the Buidler
// Runtime Environment's members available in the global scope.
// eslint-disable-next-line no-unused-vars
const bre = require('@nomiclabs/buidler')

const FacetCutAction = {
  Add: 0,
  Replace: 1,
  Remove: 2
}

// eslint-disable-next-line no-unused-vars
function getSignatures (contract) {
  return Object.keys(contract.interface.functions)
}

function getSelectors (contract) {
  const signatures = Object.keys(contract.interface.functions)
  const selectors = signatures.reduce((acc, val) => {
    acc.push(contract.interface.getSighash(val))
    return acc
  }, [])
  return selectors
}

async function deployFacets (...facetNames) {
  console.log('--')
  const deployed = []
  for (const name of facetNames) {
    const facetFactory = await ethers.getContractFactory(name)
    console.log(`Deploying ${name}`)
    deployed.push([name, await facetFactory.deploy()])
  }
  for (const [name, deployedFactory] of deployed) {
    await deployedFactory.deployed()
    console.log('--')
    console.log(`${name} deployed: ${deployedFactory.address}`)
  }
  return deployed
}

async function deployDiamond (diamondName, owner, facets) {
  const diamondFactory = await ethers.getContractFactory(diamondName)
  const diamondCut = []
  console.log('--')
  console.log('Setting up diamondCut args')
  console.log('--')
  for (const [name, deployedFacet] of facets) {
    console.log(name)
    console.log(getSignatures(deployedFacet))
    console.log('--')
    diamondCut.push([deployedFacet.address, FacetCutAction.Add, getSelectors(deployedFacet)])
  }
  console.log('--')
  console.log(`Deploying ${diamondName}`)
  const deployedDiamond = await diamondFactory.deploy(owner, diamondCut)
  await deployedDiamond.deployed()
  console.log(`${diamondName} deployed: ${deployedDiamond.address}`)
  console.log('--')
}

async function main () {
  // Buidler always runs the compile task when running scripts through it.
  // If this runs in a standalone fashion you may want to call compile manually
  // to make sure everything is compiled
  // await bre.run('compile');

  const accounts = await ethers.getSigners()
  const account = await accounts[0].getAddress()
  console.log('Account: ' + account)
  console.log('---')
  const deployedFacets = await deployFacets(
    'DiamondCutFacet',
    'DiamondLoupeFacet',
    'OwnershipFacet',
    'Staking',
    'WearableVouchers'
  )
  await deployDiamond('GHSTStaking', account, deployedFacets)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
