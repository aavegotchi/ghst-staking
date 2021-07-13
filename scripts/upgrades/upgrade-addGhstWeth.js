const { LedgerSigner } = require('../../../aavegotchi-contracts/node_modules/@ethersproject/hardware-wallets')
const { sendToMultisig } = require('../libraries/multisig/multisig.js')

let gasPrice = 20000000000

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
  let signer
  const owner = await (await ethers.getContractAt('OwnershipFacet', ghstStakingDiamondAddress)).owner()
  const testing = ['hardhat', 'localhost'].includes(hre.network.name)

  if (testing) {
    await hre.network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [owner]
    })
    signer = await ethers.getSigner(owner)
  } else if (hre.network.name === 'matic') {
    signer = new LedgerSigner(ethers.provider)
  } else {
    throw Error('Incorrect network selected')
  }

  const StkGHSTWETHFactory = await ethers.getContractFactory('StkGHSTWETH')
  const StkGHSTWETH = await StkGHSTWETHFactory.deploy(ghstStakingDiamondAddress)
  await StkGHSTWETH.deployed()
  console.log('Deployed StkGHSTWETH:', StkGHSTWETH.address)

  const StakingFacet = await ethers.getContractFactory('StakingFacet')
  let facet = await StakingFacet.deploy({gasPrice:gasPrice})
  await facet.deployed()
  console.log('Deployed new StakingFacet:', facet.address)

  const newFuncs = [
    getSelector('function getGhstWethPoolToken() external'),
    getSelector('function getStkGhstWethToken() external'),
    getSelector('function setGhstWethToken(address _ghstWethPoolToken, address _stkGhstWethToken, uint256 _ghstWethRate) external'),
    getSelector('function updateGhstWethRate(uint256 _newRate) external'),
    getSelector('function ghstWethRate() external'),
    getSelector('function stakeGhstWethPoolTokens(uint256 _poolTokens) external'),
    getSelector('function withdrawGhstWethPoolStake(uint256 _poolTokens) external')
  ]

  let existingFuncs = getSelectors(facet)
  for (const selector of newFuncs) {
    if (!existingFuncs.includes(selector)) {
      throw Error('Selector', selector, 'not found')
    }
  }
  existingFuncs = existingFuncs.filter(selector => !newFuncs.includes(selector))

  const FacetCutAction = { Add: 0, Replace: 1, Remove: 2 }

  const cut = [
    {
      facetAddress: facet.address,
      action: FacetCutAction.Add,
      functionSelectors: newFuncs
    },
    {
      facetAddress: facet.address,
      action: FacetCutAction.Replace,
      functionSelectors: existingFuncs
    }
  ]
  console.log(cut)

  const diamondCut = (await ethers.getContractAt('IDiamondCut', ghstStakingDiamondAddress)).connect(signer)
  let tx
  let receipt

  if (testing) {
    console.log('Diamond cut')
    tx = await diamondCut.diamondCut(cut, ethers.constants.AddressZero, '0x', { gasLimit: 8000000 })
    console.log('Diamond cut tx:', tx.hash)
    receipt = await tx.wait()
    if (!receipt.status) {
      throw Error(`Diamond upgrade failed: ${tx.hash}`)
    }
    console.log('Completed diamond cut: ', tx.hash)
  } else {
    console.log('Diamond cut')
    tx = await diamondCut.populateTransaction.diamondCut(cut, ethers.constants.AddressZero, '0x', { gasLimit: 800000 })
    await sendToMultisig(process.env.DIAMOND_UPGRADER, signer, tx)
  }

  facet = (await ethers.getContractAt('StakingFacet', ghstStakingDiamondAddress)).connect(signer)
  const ghstWethToken = '0xccb9d2100037f1253e6c1682adf7dc9944498aff'
  // 10 percent more than 1 GHST per day

  // figure out the correct rate of FRENS for this token
  tx = await facet.setGhstWethToken(ghstWethToken, StkGHSTWETH.address, ethers.BigNumber.from('12077243'))
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
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error)
      process.exit(1)
    })
}
exports.addGhstWeth = main
