

async function impersonate (address, contract) {
    await network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [address]
    })
    let signer = await ethers.getSigner(address)
    contract = contract.connect(signer)
    return contract
  }

async function main () {

    const accounts = await ethers.getSigners()
    const account = await accounts[0].getAddress()

  const ghstWethLP = '0xccb9d2100037f1253e6c1682adf7dc9944498aff'
  let signer
 
  let owner = "0x027Ffd3c119567e85998f4E6B9c3d83D5702660c"
 

 
    await hre.network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [owner]
    })
    signer = await ethers.getSigner(owner)
  
    const erc20 = await ethers.getContractAt("ERC20",ghstWethLP)

    const balance = await erc20.balanceOf(owner)

    const signedErc20 = await impersonate(owner, erc20)

    console.log('balance:',balance.toString())

    await signedErc20.transfer(account, balance.toString())

 
}

// Deployed StkGHSTWETH: 0x04439eC4ba8b09acfae0E9b5D75A82cC63b19f09
// Deployed new StakingFacet: 0xc87f3dC7c12F090617112D3892eC284483D8B633

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error)
      process.exit(1)
    })
}
exports.addGhstWeth = main
