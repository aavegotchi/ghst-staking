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
    getSelector('function claimTickets(uint256[] calldata _ids, uint256[] calldata _values) external'),
    getSelector('function convertTickets(uint256[] calldata _ids, uint256[] calldata  _values) external'),
    getSelector('function ticketCost(uint256 _id) public pure')
  ]

  let existingStakingFuncs = getSelectors(stakingFacet)

  existingStakingFuncs = existingStakingFuncs.filter(selector => !newStakingFuncs.includes(selector))

  const FacetCutAction = { Add: 0, Replace: 1, Remove: 2 }

  const stakingCut = [
    {
      facetAddress: stakingFacet.address,
      action: FacetCutAction.Add,
      functionSelectors: newStakingFuncs
    },
    {
      facetAddress: stakingFacet.address,
      action: FacetCutAction.Replace,
      functionSelectors: existingStakingFuncs
    }
  ]

  const ticketFacet = await ethers.getContractFactory('contracts/facets/TicketsFacet.sol:TicketsFacet')
  ticketsFacet = await ticketFacet.deploy()
  await ticketsFacet.deployed()
  console.log('Deployed ticketsFacet:', ticketsFacet.address)

  const newTicketsFuncs = [
    getSelector('function claimTickets(uint256[] calldata _ids, uint256[] calldata _values) external'),
    getSelector('function convertTickets(uint256[] calldata _ids, uint256[] calldata  _values) external'),
    getSelector('function ticketCost(uint256 _id) public pure')
  ]

  let existingTicketsFuncs = getSelectors(ticketsFacet)

  existingTicketsFuncs = existingTicketsFuncs.filter(selector => !newTicketsFuncs.includes(selector))

  const ticketsCut = [
    {
      facetAddress: ticketsFacet.address,
      action: FacetCutAction.Add,
      functionSelectors: newStakingFuncs
    },
    {
      facetAddress: ticketsFacet.address,
      action: FacetCutAction.Replace,
      functionSelectors: existingStakingFuncs
    }
  ]
  const diamondCut = (await ethers.getContractAt('IDiamondCut', diamondAddress)).connect(signer)
  let tx
  let receipt

  if (testing) {
    console.log('Diamond cut')
    tx = await diamondCut.diamondCut(stakingCut, ethers.constants.AddressZero, '0x', { gasLimit: 8000000 })
    receipt = await tx.wait()
    if (!receipt.status) {
      throw Error(`Staking Diamond upgrade failed: ${tx.hash}`)
    }

    console.log('Completed Staking Diamond cut: ', tx.hash)

    tx = await diamondCut.diamondCut(ticketsCut, ethers.constants.AddressZero, '0x', { gasLimit: 8000000 })
    receipt = await tx.wait()
    if (!receipt.status) {
      throw Error(`Tickets Diamond upgrade failed: ${tx.hash}`)
    }

    console.log('Completed Tickets Diamond cut: ', tx.hash)
  } else {
    console.log('Diamond cut')
    tx = await diamondCut.populateTransaction.diamondCut(stakingCut, ethers.constants.AddressZero, '0x', { gasLimit: 800000 })
    await sendToMultisig(process.env.DIAMOND_UPGRADER, signer, tx)
    tx = await diamondCut.populateTransaction.diamondCut(ticketsCut, ethers.constants.AddressZero, '0x', { gasLimit: 800000 })
    await sendToMultisig(process.env.DIAMOND_UPGRADER, signer, tx)
  }
}

// main()
//   .then(() => console.log('upgrade completed') /* process.exit(0) */)
//   .catch(error => {
//     console.error(error)
//     process.exit(1)
//   })

exports.DropTicket = main
