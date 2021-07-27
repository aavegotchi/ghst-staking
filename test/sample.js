const { expect } = require('chai');
const { ethers } = require('hardhat')
const marketplaceABI = require('./ERC1155MarketplaceFacet.json');

describe('Frens Drop Ticket', async function(){
  const aavegotchiAddress = '0x86935F11C86623deC8a25696E1C19a8659CbF95d';
  const diamondAddress = '0xA02d547512Bb90002807499F05495Fe9C4C3943f';
  const marketplaceAddress = '0x1e09Fc5511fbFc4b4cf718b22962D1870804c279';
  const dropTicketId = 6;
  let marketplaceInstance

  before(async function(){
    this.timeout(1000000);

    marketplaceInstance = new web3.eth.Contract(marketplaceABI, aavegotchiAddress);
  });

  it.only('test', async function() {

    owner = await (await ethers.getContractAt('OwnershipFacet', aavegotchiAddress)).owner();
    signer = await ethers.provider.getSigner(owner);
    [ticketHolder] = await ethers.getSigners();
    const tester = await ethers.getSigner('0x743b6f02B9970b9AFD8DB1Deea0A84DBD6eC28c9');
    
    const account = web3.eth.getAccounts()[0];
    const listings = await marketplaceInstance.methods.getOwnerERC1155Listings(tester.address, 3, 'purchased', 3)
    .call();

    console.log(listings);
  }).timeout(100000);

});
