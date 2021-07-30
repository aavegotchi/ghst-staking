/* global ethers */

async function main() {
  const diamondAddress = "0xA02d547512Bb90002807499F05495Fe9C4C3943f";

  const ticketsContract = await ethers.getContractAt(
    "TicketsFacet",
    diamondAddress
  );

  let balance = await ticketsContract.balanceOfAll(
    "0x027Ffd3c119567e85998f4E6B9c3d83D5702660c"
  );

  console.log("balance:", balance);

  await ticketsContract.migrateTickets([
    ["0x027Ffd3c119567e85998f4E6B9c3d83D5702660c", ["0"], ["10"]],
  ]);

  balance = await ticketsContract.balanceOfAll(
    "0x027Ffd3c119567e85998f4E6B9c3d83D5702660c"
  );

  console.log("balance:", balance);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
