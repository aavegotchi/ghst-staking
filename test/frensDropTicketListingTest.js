const { expect } = require('chai');
const { ethers } = require('hardhat')
// const { DropTicketListing } = require('../scripts/upgrades/upgrade-DropTicketListing.js');
const marketplaceABI = require('./ERC1155MarketplaceFacet.json');
const eightBillion = '8000000000000000000000000000'

describe('Frens Drop Ticket', async function(){
  const aavegotchiAddress = '0x86935F11C86623deC8a25696E1C19a8659CbF95d';
  const diamondAddress = '0xA02d547512Bb90002807499F05495Fe9C4C3943f';
  const dropTicketId = 6;
  let marketplaceInstance, owner, marketplaceOwner, signer, tester, ticketHolder, stakingFacet, holderStakingFacet, ownerStakingFacet, testerTicketsFacet, ticketsFacet;

  before(async function(){
    this.timeout(1000000);

    // await DropTicketListing();

    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: ["0xC3c2e1Cf099Bc6e1fA94ce358562BCbD5cc59FE5"],
    });

    stakingFacet = await ethers.getContractAt('StakingFacet', diamondAddress)
    owner = await (await ethers.getContractAt('OwnershipFacet', diamondAddress)).owner();
    signer = await ethers.provider.getSigner(owner);
    [ticketHolder] = await ethers.getSigners();

    tester = await ethers.getSigner('0xC3c2e1Cf099Bc6e1fA94ce358562BCbD5cc59FE5');
    
    testerTicketsFacet = await (await ethers.getContractAt('TicketsFacet', diamondAddress)).connect(tester);
    ticketsFacet = await (await ethers.getContractAt('TicketsFacet', diamondAddress)).connect(signer);
    ownerStakingFacet = await stakingFacet.connect(signer);
    holderStakingFacet = await stakingFacet.connect(ticketHolder);
    marketplaceInstance = new web3.eth.Contract(marketplaceABI, aavegotchiAddress);

  });

  it('cant claim tickets if user balance is not enough', async function() {
    await expect(holderStakingFacet.claimTickets([dropTicketId], [1])).to.be.revertedWith('Not enough frens points');
  });

  it.only('test listing update', async function() {
    const testerStakingFacet = await stakingFacet.connect(tester);
    await testerTicketsFacet.migrateTickets([{
      owner: tester.address,
      ids: [0, 1, 2],
      values: [100, 40, 20]
    }]);
    await testerTicketsFacet.setApprovalForAll(aavegotchiAddress, true);
    // Set Listing for ticket id 0
    await marketplaceInstance.methods.setERC1155Listing(diamondAddress, 0, 100, '10000000000000000000').send({
      from: tester.address
    });
    let tx = await marketplaceInstance.methods.getOwnerERC1155Listings(
      tester.address, 
      3, 
      'listed', 10
    ).call();
    console.log(tx);
    const listingsBefore = tx[0][0]['quantity'];
    // expect(parseInt(listingsBefore)).to.equal(100);
    
    console.log('migrating', tester.address, signer.address);
    // await ownerStakingFacet.migrateFrens([tester.address], [eightBillion]);
    console.log('migrated');

    await testerStakingFacet.claimTickets([0, 1, 2], [100, 40, 20])
    tx = await marketplaceInstance.methods.getOwnerERC1155Listings(
      tester.address, 
      3,
      'listed', 1000
    ).call();
    const listingsAfter = tx[0][0]['quantity'];
    console.log(tx);
    // expect(parseInt(listingsAfter)).to.equal(0);
  }).timeout(1000000);

  it('should claim tickets', async function() {
    await ownerStakingFacet.migrateFrens([ticketHolder.address], [eightBillion]);
    const totalSupplyBefore = await ticketsFacet.totalSupply(dropTicketId)
    
    const listingsBefore = await marketplaceInstance.methods.getOwnerERC1155Listings(
      ticketHolder.address, 
      3, 
      'listed', 1000
    ).call();
    console.log(listingsBefore);
    
    await holderStakingFacet.claimTickets([0, 1, 2, 3, 4, 5, 6], [100, 100, 100, 100, 1, 1, 1])
    expect(await ticketsFacet.totalSupply(dropTicketId)).to.equal(parseInt(totalSupplyBefore) + 1)

    const listingsAfter = await marketplaceInstance.methods.getOwnerERC1155Listings(
      ticketHolder.address, 
      3,
      'listed', 1000
    ).call();
    console.log(listingsAfter);
  }).timeout(100000);

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
  }).timeout(100000);
});
