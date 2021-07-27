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

    stakingFacet = await ethers.getContractAt('StakingFacet', diamondAddress)
    owner = await (await ethers.getContractAt('OwnershipFacet', diamondAddress)).owner();
    // marketplaceOwner = await (await ethers.getContractAt('ERC1155MarketplaceFacet', aavegotchiAddress)).owner();
    signer = await ethers.provider.getSigner(owner);
    [ticketHolder] = await ethers.getSigners();

    const user = await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: ["0xC3c2e1Cf099Bc6e1fA94ce358562BCbD5cc59FE5"],
    });

    tester = await ethers.getSigner('0xC3c2e1Cf099Bc6e1fA94ce358562BCbD5cc59FE5');

    console.log('USER', user);
    
    
    testerTicketsFacet = await (await ethers.getContractAt('TicketsFacet', diamondAddress)).connect(tester);
    ticketsFacet = await (await ethers.getContractAt('TicketsFacet', diamondAddress)).connect(signer);
    ownerStakingFacet = await stakingFacet.connect(signer);
    holderStakingFacet = await stakingFacet.connect(ticketHolder);
    marketplaceInstance = new web3.eth.Contract(marketplaceABI, aavegotchiAddress);
  });

  it('cant claim tickets if user balance is not enough', async function() {
    await expect(holderStakingFacet.claimTickets([dropTicketId], [1])).to.be.revertedWith('Not enough frens points');
  });

  it.only('test', async function() {
    await testerTicketsFacet.migrateTickets([{
      owner: tester.address,
      ids: [0, 1, 2],
      values: [100, 100, 100]
    }]);
    await testerTicketsFacet.setApprovalForAll(aavegotchiAddress, true);
    // await marketplaceInstance.methods.setListingFee(0).send({
    //   from: marketplaceOwner.address
    // });
    // const fee = await marketplaceInstance.methods.getListingFeeInWei().call();
    // console.log(fee);
    const tx = await marketplaceInstance.methods.setERC1155Listing(diamondAddress, 0, 100, '10000000000000000000').send({
      from: tester.address
    });
    await marketplaceInstance.methods.updateERC1155Listing(diamondAddress, 0, tester.address).send({
      from: tester.address
    });
    const listingsBefore = await marketplaceInstance.methods.getOwnerERC1155Listings(
      tester.address, 
      0, 
      'listed', 1000
    ).call();
    console.log(listingsBefore);
    ///////
    // await ownerStakingFacet.migrateFrens([ticketHolder.address], [eightBillion]);
    // const totalSupplyBefore = await ticketsFacet.totalSupply(dropTicketId)
    
    // const listingsBefore = await marketplaceInstance.methods.getOwnerERC1155Listings(
    //   ticketHolder.address, 
    //   3, 
    //   'listed', 1000
    // ).call();
    // console.log(listingsBefore);
    
    // await holderStakingFacet.claimTickets([0, 1, 2, 3, 4, 5, 6], [100, 100, 100, 100, 1, 1, 1])
    // const listingsAfter = await marketplaceInstance.methods.getOwnerERC1155Listings(
    //   ticketHolder.address, 
    //   3,
    //   'listed', 1000
    // ).call();
    // console.log(listingsAfter);
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
    const listingsBefore = await marketplaceInstance.methods.getOwnerERC1155Listings(
      ticketHolder.address, 
      3, 
      'purchased', 1000
    ).call();
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

    const listingsAfter = await marketplaceInstance.methods.getOwnerERC1155Listings(
      ticketHolder.address, 
      3, 
      'purchased', 1000
    ).call();
    expect(listingsAfter.length).to.equal(listingsBefore.length - 3);
  }).timeout(100000);
});
