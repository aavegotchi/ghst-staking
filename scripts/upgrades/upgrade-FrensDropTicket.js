/* global ethers hre */
/* eslint prefer-const: "off" */

const { LedgerSigner } = require('@ethersproject/hardware-wallets')
const { sendToMultisig } = require('../libraries/multisig/multisig.js')

const getSelectors = (contract) => {
  const signatures = Object.keys(contract.interface.functions)
  const selectors = signatures.reduce((acc, val) => {
    if (val !== 'init(bytes)') {
      acc.push(contract.interface.getSighash(val))
    }
    return acc
  }, [])
  return selectors
}

const getSelector = (func) => {
  const abiInterface = new ethers.utils.Interface([func])
  return abiInterface.getSighash(ethers.utils.Fragment.from(func))
}

async function main () {
// TODO: get new functions and function upgrades from ghst staking contract
const ghstStakingDiamondAddress = '0xA02d547512Bb90002807499F05495Fe9C4C3943f';
const diamondAddress = '0x86935F11C86623deC8a25696E1C19a8659CbF95d';

let signer,
    stakingFacet,
    ticketsFacet;

let owner = await (await ethers.getContractAt('OwnershipFacet', diamondAddress)).owner();

const testing = ['hardhat', 'localhost'].includes(hre.network.name);

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

const StakingFacet = await ethers.getContractFactory('StakingFacet');
stakingFacet = await StakingFacet.deploy();
console.log("Deployed facet: ", stakingFacet.address);

const TicketsFacet = await ethers.getContractFactory('TicketsFacet');
ticketsFacet = await TicketsFacet.deploy();
console.log("Deployed facet: ", ticketsFacet.address);

const newStakingFuncs = [
  getSelector('function claimTickets(uint256[] calldata _ids, uint256[] calldata _values) external',
              'function convertTickets(uint256[] calldata _ids, uint256[] calldata  _values) external',
              'function ticketCost(uint256 _id) public pure returns')
]

let existingStakingFuncs = getSelectors(stakingFacet);
for (const selector of newStakingFuncs) {
  if (!existingStakingFuncs.includes(selector)) {
    throw Error(`Selector ${selector} not found`);
  }
}

existingStakingFuncs = existingStakingFuncs.filter(selector => !newStakingFuncs.includes(selector));

const newTicketsFuncs = [
  getSelector('function setBaseURI(string memory _value) external',
              'function uri(uint256 _id) external view returns (string memory)',
              'function totalSupplies() external view returns (uint256[] memory totalSupplies_)',
              'function totalSupply(uint256 _id) external view returns (uint256 totalSupply_)',
              'function balanceOfAll(address _owner) external view returns (uint256[] memory balances_)')
]

let existingTicketsFuncs = getSelectors(ticketsFacet);
for (const selector of newTicketsFuncs) {
  if (!existingTicketsFuncs.includes(selector)) {
    throw Error(`Selector ${selector} not found`);
  }
}

existingTicketsFuncs = existingTicketsFuncs.filter(selector => !newTicketsFuncs.includes(selector));

const FacetCutAction = { Add: 0, Replace: 1, Remove: 2 }

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
    action: FacetCutAction.Add,
    functionSelectors: newTicketsFuncs
  },
  {
    facetAddress: ticketsFacet.address,
    action: FacetCutAction.Replace,
    functionSelectors: existingTicketsFuncs
  }
]
console.log(cut);

const diamondCut = (await ethers.getContractAt('IDiamondCut', ghstStakingDiamondAddress)).connect(signer);
let tx;
let receipt;

if(testing) {
  console.log('Diamond cut');
  tx = await diamondCut.diamondCut(cut, ethers.constants.AddressZero, '0x', { gasLimit: 8000000 });
  console.log('Diamond cut tx:', tx.hash)
  receipt = await tx.wait();
  if (!receipt.status) {
     throw Error(`Diamond upgrade failed: ${tx.hash}`)
   }
  console.log('Completed diamond cut: ', tx.hash);

  } else {
     console.log('Diamond cut');
     tx = await diamondCut.populateTransaction.diamondCut(cut, ethers.constants.AddressZero, '0x', { gasLimit: 800000 });
     await sendToMultisig(process.env.DIAMOND_UPGRADER, signer, tx);
  }
}

if(require.main === module){
  main()
    .then(() => process.exit(0))
      .catch(error => {
        console.error(error)
        process.exit(1)
    });

}

exports.dropTicketScript = main;
