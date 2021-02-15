/* global ethers */

async function main () {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // const accounts = await ethers.getSigners()
  // const account = await accounts[0].getAddress()

  // const tokenA = '0x9719d867A500Ef117cC201206B8ab51e794d3F82'
  // const tokenB = '0xE0b22E0037B130A9F56bBb537684E6fA18192341'
  // maUSDC/maDAI pair: 0x6Fc2a79b1f0c31Ec4DC4343157cBD8becb0f6aaF

  //   const tokenA = '0x9719d867A500Ef117cC201206B8ab51e794d3F82'
  //   const tokenB = '0x20D3922b4a1A8560E1aC99FBA4faDe0c849e2142'
  //   maUSDC/maWETH pair: 0x95E6c356C87A5AB6Cc415040F1C794e82015207E

  // const tokenA = '0x9719d867A500Ef117cC201206B8ab51e794d3F82'
  // const tokenB = '0x823CD4264C1b951C9209aD0DeAea9988fE8429bF'
  // maUSDC/maAAVE pair: 0xaCe1E8B717202bC122a7d98C308824C33f4cC20D

  // const tokenA = '0x9719d867A500Ef117cC201206B8ab51e794d3F82'
  // const tokenB = '0x98ea609569bD25119707451eF982b90E3eb719cD'
  // maUSDC/maLiINK pair: 0xd94cBaE5484f510A44d905956b590c9f5E668Ed0

  // const tokenA = '0x9719d867A500Ef117cC201206B8ab51e794d3F82'
  // const tokenB = '0xDAE5F1590db13E3B40423B5b5c5fbf175515910b'
  // maUSDC/maUSDT pair: 0x2EeA2D478787DFCAA4aa5398622556b9d775f194

  // const tokenA = '0x9719d867A500Ef117cC201206B8ab51e794d3F82'
  // const tokenB = '0xF4b8888427b00d7caf21654408B7CBA2eCf4EbD9'
  // maUSDC/maTUSD pair: 0xc8f51057e1aeA189f18011A278432ef2dC6D204a

  // const tokenA = '0x9719d867A500Ef117cC201206B8ab51e794d3F82'
  // const tokenB = '0x8c8bdBe9CeE455732525086264a4Bf9Cf821C498'
  // maUSDC/maUNI pair: 0xca84c15C5F46d39EE3fd0cD9278CE19579424Dc2

  // const tokenA = '0x9719d867A500Ef117cC201206B8ab51e794d3F82'
  // const tokenB = '0xe20f7d1f0eC39C4d5DB01f53554F2EF54c71f613'
  // maUSDC/maYFI pair: 0x0C7131aA808dbc1132515cE7B83fc3c84a603c91

  // const tokenA = '0x9719d867A500Ef117cC201206B8ab51e794d3F82'
  // const tokenB = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'
  // maUSDC / USDC pair: 0x7295304b10740BA8e037826787d3e9386FD99925

  // const tokenA = '0x9719d867A500Ef117cC201206B8ab51e794d3F82'
  // const tokenB = '0x831753DD7087CaC61aB5644b308642cc1c33Dc13'
  // maUSDC / QUICK pair: 0x1697D88Dda5e913D9a29111e858292855CA0d9cF

  // const tokenA = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'
  // const tokenB = '0x831753DD7087CaC61aB5644b308642cc1c33Dc13'
  // USDC / QUICK pair: 0x1F1E4c845183EF6d50E9609F16f6f9cAE43BC9Cb

  // const tokenA = '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619'
  // const tokenB = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'
  // ETH / USDC pair: 0x853Ee4b2A13f8a742d64C8F088bE7bA2131f670d

  // const tokenA = '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619'
  // const tokenB = '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270'
  // ETH / MATIC pair: 0xadbF1854e5883eB8aa7BAf50705338739e558E5b

  // const tokenA = '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270'
  // const tokenB = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'
  // Matic / USDC pair: 0x6e7a5FAFcec6BB1e78bAE2A1F0B612012BF14827

  // const tokenA = '0xA02d547512Bb90002807499F05495Fe9C4C3943f'
  // const tokenB = '0x831753DD7087CaC61aB5644b308642cc1c33Dc13'
  // stkQUICK-0xA02d547512Bb90002807499F05495Fe9C/ QUICK pair:

  // const tokenA = ''
  // const tokenB = ''
  // GHST / USDCpair:

  // const tokenA = ''
  // const tokenB = ''
  // / pair:

  // const tokenA = ''
  // const tokenB = ''
  // / pair:

  // const tokenA = ''
  // const tokenB = ''
  // / pair:

  const factoryAddress = '0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32'
  const abi = ['function getPair(address tokenA, address tokenB) external view returns (address pair)']
  const factory = await ethers.getContractAt(abi, factoryAddress)
  let token0
  let token1
  if (ethers.BigNumber.from(tokenA) < ethers.BigNumber.from(tokenB)) {
    token0 = tokenA
    token1 = tokenB
  } else {
    token0 = tokenB
    token1 = tokenA
  }
  const pairAddress = await factory.getPair(token0, token1)
  console.log('Pair addres is: ', pairAddress)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
