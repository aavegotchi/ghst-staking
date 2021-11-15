import { task } from "hardhat/config";
import { maticStakingAddress } from "../scripts/helperFunctions";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ReceiptToken__factory } from "../typechain/factories/ReceiptToken__factory";
import { ReceiptToken } from "../typechain/ReceiptToken";

export interface DeployReceiptTokenTaskArgs {
  name: string;
  symbol: string;
}

task(
  "deployReceiptToken",
  "Deploys a new receipt token to be used for GHST Staking Pool"
)
  .addParam("name", "Token name")
  .addParam("symbol", "Token symbol")
  .setAction(
    async (
      taskArgs: DeployReceiptTokenTaskArgs,
      hre: HardhatRuntimeEnvironment
    ) => {
      const receiptTokenFactory = (await hre.ethers.getContractFactory(
        "ReceiptToken"
      )) as ReceiptToken__factory;
      const token = (await receiptTokenFactory.deploy(
        maticStakingAddress,
        taskArgs.name,
        taskArgs.symbol
      )) as ReceiptToken;
      await token.deployed();

      if (taskArgs.symbol.slice(0, 3) !== "stk") {
        console.log("sym:", taskArgs.symbol.slice(0, 3));
        throw new Error("Receipt token symbol must be prefixed with 'stk'");
      }

      const address = token.address;

      const minter = await token.minter();
      if (minter !== maticStakingAddress) {
        throw new Error("Minter is not staking address!");
      } else {
        console.log(
          `Receipt token with name ${taskArgs.name} and symbol ${taskArgs.symbol} has been deployed to ${address}`
        );
      }
      return address;
    }
  );
