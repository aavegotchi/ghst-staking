const { expect } = require('chai');
const { ethers } = require('hardhat')
const { DropTicketListing } = require('../scripts/upgrades/upgrade-DropTicketListing.js');

const eightBillion = '8000000000000000000000000000'

describe('Frens Drop Ticket', async function(){
  const aavegotchiAddress = '0x86935F11C86623deC8a25696E1C19a8659CbF95d';
  const diamondAddress = '0xA02d547512Bb90002807499F05495Fe9C4C3943f';
  const marketplaceAddress = '0x1e09Fc5511fbFc4b4cf718b22962D1870804c279';
  const dropTicketId = 6;
  let erc1155MarketplaceFacet, txData, owner, signer, ticketHolder, stakingFacet, holderStakingFacet, ownerStakingFacet, ticketsFacet;

  before(async function(){
    this.timeout(1000000);
    await DropTicketListing();

    stakingFacet = await ethers.getContractAt('StakingFacet', diamondAddress)
    owner = await (await ethers.getContractAt('OwnershipFacet', diamondAddress)).owner();
    signer = await ethers.provider.getSigner(owner);

    const abi = [
      "function updateERC1155Listing(address _erc1155TokenAddress, uint256 _erc1155TypeId, address _owner) external",
      "function updateBatchERC1155Listing(address _erc1155TokenAddress, uint256[] calldata _erc1155TypeIds, address _owner) external",
      "function getERC1155Listings(uint256 _category, string memory _sort, uint256 _length) external view returns (ERC1155Listing[] memory listings_)",
      "function getOwnerERC1155Listings(address _owner, uint256 _category, string memory _sort, uint256 _length) external"
    ];
    erc1155MarketplaceFacet = new ethers.Contract(marketplaceAddress, abi, signer);
    // erc1155MarketplaceFacet = await (await ethers.getContractAt('Erc1155MarketplaceFacet', aavegotchiAddress)).connect(signer);
    ticketsFacet = await (await ethers.getContractAt('TicketsFacet', diamondAddress)).connect(signer);
    [ticketHolder] = await ethers.getSigners();
    ownerStakingFacet = await stakingFacet.connect(signer);
    holderStakingFacet = await stakingFacet.connect(ticketHolder);
  });

  // it.only('test', async function() {
  //   const dropTicketBalance = await ticketsFacet.balanceOf(ticketHolder.address, dropTicketId)
  //   const listings = await erc1155MarketplaceFacet.getOwnerERC1155Listings(ticketHolder.address, 3, 'listed', parseInt(dropTicketBalance) + 1)
  //   console.log('listings', parseInt(listings.value));
  //   return;
    // const dropTicketBalance = await ticketsFacet.balanceOf(ticketHolder.address, dropTicketId)
    
    // console.log('Drop Ticket Balance', dropTicketBalance);
    // const listings = await erc1155MarketplaceFacet.getERC1155Listings(5, 'listed', parseInt(dropTicketBalance) + 1)
    // console.log('Listings', listings);
    // const value = await listings.wait();
    // console.log('Value', value);
  // }).timeout(50000);

  it('cant claim tickets if user balance is not enough', async function() {
    await expect(holderStakingFacet.claimTickets([dropTicketId], [1])).to.be.revertedWith('Not enough frens points');
  });

  it('should claim tickets', async function() {
    await ownerStakingFacet.migrateFrens([ticketHolder.address], [eightBillion]);
    const totalSupplyBefore = await ticketsFacet.totalSupply(dropTicketId)
    await holderStakingFacet.claimTickets([0, 1, 2, 3, 4, 5, 6], [100, 100, 100, 100, 1, 1, 1])
    expect(await ticketsFacet.totalSupply(dropTicketId)).to.equal(parseInt(totalSupplyBefore) + 1)
  }).timeout(50000);

  it('should convert tickets to drop ticket', async function(){
    await expect(holderStakingFacet.convertTickets([dropTicketId], [1])).to.be.revertedWith('Cannot convert Drop Ticket');

    const totalSupplyBefore = await ticketsFacet.totalSupply(dropTicketId)
    const secondSupplyBefore = await ticketsFacet.totalSupply(2)

    const ownerDropTicketBefore = await ticketsFacet.balanceOf(ticketHolder.address, dropTicketId)
    const ownerTicketBefore = await ticketsFacet.balanceOf(ticketHolder.address, 2)

    // Convert 7 drop tickets
    await holderStakingFacet.convertTickets([2, 3, 4, 5], [5, 3, 1, 1])
    expect(await ticketsFacet.totalSupply(dropTicketId)).to.equal((parseInt(totalSupplyBefore) + 7))
    expect(await ticketsFacet.totalSupply('2')).to.equal((parseInt(secondSupplyBefore) - 5))

    expect(await ticketsFacet.balanceOf(ticketHolder.address, 6)).to.equal((parseInt(ownerDropTicketBefore) + 7))
    expect(await ticketsFacet.balanceOf(ticketHolder.address, 2)).to.equal((parseInt(ownerTicketBefore) - 5))


    /* Invalid number of tickets */


    //0 values for tickets
    await expect(holderStakingFacet.convertTickets([2,3],[0,0])).to.be.revertedWith('Staking: Invalid Ticket Ids and Values')
    

    //Partially converted 
    await expect(holderStakingFacet.convertTickets([2, 3], [5, 2])).to.be.revertedWith('Staking: Cannot partially convert Drop Tickets');

    //Too many tickets
    await expect(holderStakingFacet.convertTickets([2,3],[1000,1000])).to.be.revertedWith('Staking: Not enough Ticket balance')
  });

  it('should update listings', async function(){
    const dropTicketBalance = await ticketsFacet.balanceOf(ticketHolder.address, dropTicketId)
    console.log(dropTicketBalance);
    
    const listings = await erc1155MarketplaceFacet.getERC1155Listings(3, 'listed', parseInt(dropTicketBalance) + 1)
    console.log(listings);
    expect(parseInt(listings.value)).to.equal(parseInt(dropTicketBalance))
  });
});
