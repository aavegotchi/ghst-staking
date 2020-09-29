/* global ethers */
// We require the Buidler Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
// When running the script with `buidler run <script>` you'll find the Buidler
// Runtime Environment's members available in the global scope.
// eslint-disable-next-line no-unused-vars
// const bre = require('@nomiclabs/buidler')
// const { ethers } = require('ethers')
// import { ethers } from 'ethers'

const util = require('./diamond-util.js')

async function main () {
  // Buidler always runs the compile task when running scripts through it.
  // If this runs in a standalone fashion you may want to call compile manually
  // to make sure everything is compiled
  // await bre.run('compile');

  const accounts = await ethers.getSigners()
  const account = await accounts[0].getAddress()
  console.log('Account: ' + account)
  console.log('---')
  const deployedFacets = await util.deployFacets(
    'DiamondCutFacet',
    'DiamondLoupeFacet',
    'OwnershipFacet',
    'Staking',
    'WearableTickets'
  )

  const ghstContractAddress = '0xeDaA788Ee96a0749a2De48738f5dF0AA88E99ab5'

  const deployedDiamond = await util.deployDiamond('GHSTStaking', account, deployedFacets, ghstContractAddress)
  console.log(deployedDiamond.address)

  // const abiEncodedAddress = ethers.utils.defaultAbiCoder.encode(['address'], [deployedDiamond.address])
  // // eslint-disable-next-line no-unused-vars
  // const result = await util.upgradeDiamond({
  //   diamondAddress: deployedDiamond.address,
  //   facetNames: ['Upgrade1'],
  //   selectorsToRemove: [],
  //   initFacetName: 'Upgrade1',
  //   initArgs: [abiEncodedAddress]
  // })
  // console.log(result)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
