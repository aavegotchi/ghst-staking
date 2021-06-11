const { expect } = require('chai');
const { dropTicketScript } = require('../scripts/upgrades/upgrade-FrensDropTicket.js');


describe('Frens Drop Ticket', async function(){
  this.timeout(300000);

  let ghstStkAddress,
      onwer,
      ghstWhale;

  before(async function(){
    ghstStkAddress = 0xA02d547512Bb90002807499F05495Fe9C4C3943f;

    await dropTicketScript();
  });

  it.only('Should be able to convert any ticket to drop ticket', async function(){
    // TODO: Tests should cover all converting logic of existing 6 tickets
    console.log("works");
  });

  it.only('Should allow users to claim drop ticket', async function(){
    // TODO: Tests should call claimToken function in StakingFacet
    console.log("works also");
  });


});
