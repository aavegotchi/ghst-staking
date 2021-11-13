import { run } from "hardhat";
import { DeployReceiptTokenTaskArgs } from "../../tasks/deployReceiptToken";

async function updateRates() {
  const taskArgs: DeployReceiptTokenTaskArgs = {
    name: "change this",
    symbol: "NUUU",
  };
  await run("deployReceiptToken", taskArgs);
}

if (require.main === module) {
  updateRates()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
