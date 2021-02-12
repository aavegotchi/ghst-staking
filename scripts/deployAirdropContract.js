async function main () {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  const AirdropContract = await ethers.getContractFactory('Airdrop')
  const airdrop = await AirdropContract.deploy()

  await airdrop.deployed()

  console.log('Airdrop contract deployed to:', airdrop.address)

  //airdrop contract address: 0x3D429DbB062A195a42A113D61FeC687b398b4a6e
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
