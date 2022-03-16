import { run } from "hardhat";

async function verify() {
  //stkwamGHST
  const address = "0xe5f6166D8e10b205c0E500175E7F6C3bC4B3D252"; // deployed address

  const args = [
    "0xA02d547512Bb90002807499F05495Fe9C4C3943f", // address _minter,
    "Staked Wrapped amGHST", // string memory _name,
    "stkwamGHST", // string memory _symbol
  ];

  await run("verify:verify", {
    address: address,
    constructorArguments: args,
  });
}

verify()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

exports.VerifyFacet = verify;
