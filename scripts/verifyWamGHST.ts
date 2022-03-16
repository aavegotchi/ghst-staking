import { run } from "hardhat";

async function verify() {
  //wamGHST
  const address = "0x3172cE4f647a4afA70EaE383401AB8aE2FE2E9f7"; // deployed address

  const args = [
    "0x8dff5e27ea6b7ac08ebfdf9eb090f32ee9a30fcf", // pool
    "0x080b5bf8f360f624628e0fb961f4e67c9e3c7cf1", // atoken
    "0x94cb5C277FCC64C274Bd30847f0821077B231022", // owner
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
