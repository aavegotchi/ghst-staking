/* global ethers */

async function main () {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  const accounts = await ethers.getSigners()
  // const account = await accounts[0].getAddress()

  // We get the contract to deploy
  const airdrop = await ethers.getContractAt('Airdrop', '0x3D429DbB062A195a42A113D61FeC687b398b4a6e')
  console.log('Starting balance account 0: ', ethers.utils.formatEther(await accounts[0].getBalance()))
  console.log('Starting balance account 1: ', ethers.utils.formatEther(await accounts[1].getBalance()))
  console.log('Starting balance account 2: ', ethers.utils.formatEther(await accounts[2].getBalance()))

  const receivers = [await accounts[1].getAddress(), await accounts[2].getAddress()]
  const amounts = [ethers.utils.parseEther('1'), ethers.utils.parseEther('2')]
  const tx = await airdrop.airdropMatic(receivers, amounts, { value: ethers.utils.parseEther('3') })

    .console.log('Airdrop contract deployed to:', airdrop.address)

  // airdrop contract address: 0x3D429DbB062A195a42A113D61FeC687b398b4a6e
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
