const { run } = require("hardhat");

async function verify() {
  const address = "0x2cE9AD2Cd4709B7640C1024BD75b23ffa82215b8"; // deployed address
  const facet = "StakingFacet"; // name of facet
  await run("verifyFacet", {
    apikey: process.env.POLYGON_API_KEY,
    contract: address,
    facet,
  });
}

verify()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

exports.VerifyFacet = verify;
