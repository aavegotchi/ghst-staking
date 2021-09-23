const { run } = require("hardhat");

async function verify() {
  const address = "0x2D05aEdae439bf643d7c327DE82cB4c77dA6D3D8"; // deployed address
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

// Staking facet:
// 0xa253460d993418dFF9Db9552e984a1890a71737A
// 0xc5fD77f43f9cc3cd58300979BbD9aad1051DB76d
// 0xAf97fb914498A81C2BEeC444e40aE676f48bd4F8
// 0x98C65794535b5bB556D989E1fc37b8798D14d98E
// 0xD18832D705D0EAF7A44c7C5699910c4be21252Bd
// 0xae92aBB889F328e8ADA8434F8a00c45F586a57fE
// 0x2D05aEdae439bf643d7c327DE82cB4c77dA6D3D8
