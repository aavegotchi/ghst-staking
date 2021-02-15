/* global ethers */

async function main () {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  const AirdropContract = await ethers.getContractFactory('Airdrop')
  let airdrop = await AirdropContract.deploy()

  await airdrop.deployed()

  console.log('Airdrop contract deployed to:', airdrop.address)

  const accounts = await ethers.getSigners()
  // const account = await accounts[0].getAddress()

  //   const address1 = '0x66E7960EC00D100Ffc035f5d422107BcFA2A29a3'
  //   const address2 = '0x819C3fc356bb319035f9D2886fAc9E57DF0343F5'
  //   const address3 = '0x84b5DC7713a139dbbC9648A3e198b155655936e5'

  const address1 = await accounts[1].getAddress()
  const address2 = await accounts[0].getAddress()
  const address3 = await accounts[2].getAddress()
  // We get the contract to deploy
  airdrop = await ethers.getContractAt('Airdrop', airdrop.address)
  const provider = ethers.provider
  console.log('Starting balance account 0: ', ethers.utils.formatEther(await provider.getBalance(address1)))
  console.log('Starting balance account 1: ', ethers.utils.formatEther(await provider.getBalance(address2)))
  console.log('Starting balance account 2: ', ethers.utils.formatEther(await provider.getBalance(address3)))

  const receivers = [address1, address3]
  const amounts = [ethers.utils.parseEther('1'), ethers.utils.parseEther('2')]
  console.log(receivers)
  const tx = await airdrop.airdropMatic(receivers, amounts, { value: ethers.utils.parseEther('3') })
  await tx.wait()

  console.log('Ending balance account 0: ', ethers.utils.formatEther(await provider.getBalance(address1)))
  console.log('Ending balance account 1: ', ethers.utils.formatEther(await provider.getBalance(address2)))
  console.log('Ending balance account 2: ', ethers.utils.formatEther(await provider.getBalance(address3)))

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
