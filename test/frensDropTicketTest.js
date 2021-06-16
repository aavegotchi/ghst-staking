const { expect } = require('chai');
const { DropTicket } = require('../scripts/upgrades/upgrade-DropTicket.js');


describe('Frens Drop Ticket', async function(){
  this.timeout(300000);

  let ghstStkAddress,
      onwer,
      ghstWhale,
      ticketHolder,
      stakingFacet,
      ticketsFacet;

  before(async function(){
    ghstStkAddress = '0xA02d547512Bb90002807499F05495Fe9C4C3943f';
    ghstWhale = '0xBC67F26c2b87e16e304218459D2BB60Dac5C80bC';
    ticketHolder = '0xA1B9F1AF06134A93FB474E38726D92d171047c07';

    await DropTicket();

    owner = await ethers.getSigner(ticketHolder);

    stakingFacet = await ethers.getContractAt('StakingFacet', ghstStkAddress, owner);
    ticketsFacet = await ethers.getContractAt('TicketsFacet', ghstStkAddress, owner);
  });

  it.only('Should be able to convert any ticket to drop ticket', async function(){
    // TODO: Tests should cover all converting logic of existing 6 tickets
    await hre.network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [ticketHolder]
    });

    let frensBalance = await stakingFacet.frens(ticketHolder);
    let ticketBalance = await ticketsFacet.balanceOfAll(ticketHolder);
    console.log("Frens Balance: ", frensBalance.toString());
    console.log("Ticket Balance: ", ticketBalance.toString());

    await stakingFacet.convertTickets([0], [1]);
    let newTicketBalance = await ticketsFacet.balanceOfAll(ticketHolder);
    console.log("New Ticket Balance: ", ticketBalance.toString());
  });

  it('Should allow users to claim drop ticket', async function(){
    // TODO: Tests should call claimToken function in StakingFacet
  });


});
