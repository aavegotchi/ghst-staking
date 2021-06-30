const { LedgerSigner } = require('@ethersproject/hardware-wallets')
const { sendToMultisig } = require('../libraries/multisig/multisig.js')

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
  const diamondAddress = '0xA02d547512Bb90002807499F05495Fe9C4C3943f'
  let signer
  let stakingFacet
  let ticketsFacet
  const owner = await (await ethers.getContractAt('OwnershipFacet', diamondAddress)).owner()
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

  const stackingFacet = await ethers.getContractFactory('contracts/facets/StakingFacet.sol:StakingFacet')
  stakingFacet = await stackingFacet.deploy()
  await stakingFacet.deployed()
  console.log('Deployed stakingFacet:', stakingFacet.address)

  const newStakingFuncs = [
    getSelector('function convertTickets(uint256[] calldata _ids, uint256[] calldata  _values) external')
  ]

  let existingStakingFuncs = getSelectors(stackingFacet);

  for (const selector of newStakingFuncs) {
    if (!existingStakingFuncs.includes(selector)) {
      throw Error(`Selector ${selector} not found`);
    }
  }

  existingStakingFuncs = existingStakingFuncs.filter(selector => !newStakingFuncs.includes(selector))


  const ticketFacet = await ethers.getContractFactory('contracts/facets/TicketsFacet.sol:TicketsFacet')
  ticketsFacet = await ticketFacet.deploy()
  await ticketsFacet.deployed()
  console.log('Deployed ticketsFacet:', ticketsFacet.address)

  let existingTicketsFuncs = getSelectors(ticketsFacet)

  const FacetCutAction = { Add: 0, Replace: 1, Remove: 2 }

  const diamondCut = (await ethers.getContractAt('IDiamondCut', diamondAddress)).connect(signer)
  let tx
  let receipt

  const cut = [
    {
      facetAddress: stakingFacet.address,
      action: FacetCutAction.Add,
      functionSelectors: newStakingFuncs
    },
    {
      facetAddress: stakingFacet.address,
      action: FacetCutAction.Replace,
      functionSelectors: existingStakingFuncs
    },
    {
      facetAddress: ticketsFacet.address,
      action: FacetCutAction.Replace,
      functionSelectors: existingTicketsFuncs
    }
    
  ]

  if (testing) {
    console.log('Diamond cut')
    tx = await diamondCut.diamondCut(cut, ethers.constants.AddressZero, '0x', { gasLimit: 8000000 })
    receipt = await tx.wait()
    if (!receipt.status) {
      throw Error(`Staking Diamond upgrade failed: ${tx.hash}`)
    }

    console.log('Completed Diamond cut: ', tx.hash)

  } else {
    console.log('Staking Cut cut')
    tx = await diamondCut.populateTransaction.diamondCut(cut, ethers.constants.AddressZero, '0x', { gasLimit: 800000 })
    await sendToMultisig(process.env.DIAMOND_UPGRADER, signer, tx)
   
  }
}

// main()
  // .then(() => console.log('upgrade completed') /* process.exit(0) */)
  // .catch(error => {
    // console.error(error)
    // process.exit(1)
  // })

exports.DropTicket = main
