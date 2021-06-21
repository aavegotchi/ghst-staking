const { expect } = require('chai');
const { ethers } = require('hardhat')
const { DropTicket } = require('../scripts/upgrades/upgrade-DropTicket.js');

const eightBillion = '8000000000000000000000000000'

describe('Frens Drop Ticket', async function(){
  const diamondAddress = '0xA02d547512Bb90002807499F05495Fe9C4C3943f';
  const dropTicketId = 6;
  let txData, owner, signer, ticketHolder, stakingFacet, holderStakingFacet, ownerStakingFacet, ticketsFacet;

  before(async function(){
    this.timeout(1000000);
    await DropTicket();

    stakingFacet = await ethers.getContractAt('StakingFacet', diamondAddress)
    owner = await (await ethers.getContractAt('OwnershipFacet', diamondAddress)).owner();
    signer = await ethers.provider.getSigner(owner);
    ticketsFacet = await (await ethers.getContractAt('TicketsFacet', diamondAddress)).connect(signer);
    [ticketHolder] = await ethers.getSigners();
    ownerStakingFacet = await stakingFacet.connect(signer);
    holderStakingFacet = await stakingFacet.connect(ticketHolder);
  });

  it('cant claim tickets if user balance is not enough', async function() {
    await expect(holderStakingFacet.claimTickets([dropTicketId], [1])).to.be.revertedWith('Not enough frens points');
  });

  it('should claim tickets', async function() {
    await ownerStakingFacet.migrateFrens([ticketHolder.address], [eightBillion]);
    const totalSupplyBefore = await ticketsFacet.totalSupply(dropTicketId)
    await holderStakingFacet.claimTickets([0, 1, 2, 3, 4, 5, 6], [100, 100, 100, 100, 1, 1, 1])
    expect(await ticketsFacet.totalSupply(dropTicketId)).to.equal(totalSupplyBefore + 1)
  }).timeout(50000);

  it('should convert tickets to drop ticket', async function(){
    await expect(holderStakingFacet.convertTickets([dropTicketId], [1])).to.be.revertedWith('Cannot convert Drop Ticket');

    const totalSupplyBefore = await ticketsFacet.totalSupply(dropTicketId)
    const secondSupplyBefore = await ticketsFacet.totalSupply(2)

    // Convert 7 drop tickets
    await holderStakingFacet.convertTickets([2, 3, 4, 5], [5, 3, 1, 1])
    expect(await ticketsFacet.totalSupply(dropTicketId)).to.equal((parseInt(totalSupplyBefore) + 7))
    expect(await ticketsFacet.totalSupply('2')).to.equal((parseInt(secondSupplyBefore) - 5))

    // Invalid number of tickets
    await expect(holderStakingFacet.convertTickets([2, 3], [5, 2])).to.be.revertedWith('Staking: Total cost doesnt match to convert drop tickets');
  });
});
