const { run } = require("hardhat");

async function verify() {
  const address = "0xCc78e996FBa84e4f257611D92421360E76e32472"; // deployed address
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
