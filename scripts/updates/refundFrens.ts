import { PopulatedTransaction } from "@ethersproject/contracts";
import { ethers, network } from "hardhat";

import {
  gasPrice,
  impersonate,
  maticStakingAddress,
  stakingDiamondUpgrader,
} from "../helperFunctions";
import { sendToMultisig } from "../libraries/multisig/multisig";

const addresses = [
  "0x323AcB6f6A930980Ad214900665805F678b8f813",
  "0x677975399cbd8aa7BD17A4B87C04Ed07A85978d4",
  "0x9A8ab692a6D73242C74a727Ac7587aEda778B131",
  "0xA7f1C77998bAe58614Be010AD2A806639E280056",
  "0x8628D73d3F950ABDE99739EF34B6CfA10394f579",
  "0x3C517c5d2040B995e697c7b916d120a4f7Fa095d",
  "0x7bB7E752Ce21a46C85586f48e18175027c0fF889",
  "0x0c535F59104A9d296fe6bb24274ab5567AbAeFD4",
  "0x0683DC78DAED7C1A0fD593e6eA00D6362E525e9e",
  "0x3e0Bc5987bA73D2e2412363a83AFCABA4c77C203",
  "0x6B3bE6C88C8875168c694e57E62d1dE554Ee6902",
  "0xef8E83c0383351EF644ffd6ab827C1162818adEE",
  "0x18932848b2F9B14B70972a1400133D1ED6342114",
  "0xD1288262eD6E22d415f72AB85c450b277BE130c3",
  "0xa906E61d45aE38a067fC87a94f7593b174D798bF",
  "0xab69aa255c368797dECF41006a283B3eac85B31A",
  "0x027cedb5d69aFdD68Ce27Cf58DD6d05A72eDc4F6",
  "0x929019320c8Ee06806dDFC79e690501538347B6e",
  "0x2994d42Ff4547f5C88F97FE3c11e4c97f85A0283",
  "0x9F334D1bFBaafC4190F7c14Ecf8E243e0d138cEd",
  "0x50cE537ddd25763d7c914262C1794F6bD900c902",
  "0xA9E0Bc5A40490eD3438dF5B4eC29D6dcD5c048b5",
  "0x05B10cceD2E8C406E036dc6D2D96ab4679414511",
  "0xa532F169ceE0e551D4Da641031Ac78fd85461035",
  "0xC2A8bAf9A16a94b2a923faeb1e8EbFc2B47fb0FB",
  "0xb12e31D8F7DdA2Dd3733c25cB3B01F6924cd3497",
  "0x928f83d0389282EEd361C261d058279Ce9d8Ba9a",
  "0xae5b56ca47E84b6c749E0454680C4161B9DA9790",
  "0xdE9290790Dd95b1A8F75A8976b6D0F71604f4f23",
  "0x8e894bF5aC281075A1cD1d08129d6691c2e27eDA",
  "0xc3c2e1cf099bc6e1fa94ce358562bcbd5cc59fe5",
  "0x76e059c6ff6bf9fffd5f33afdf4ab2fd511c9df4",
  "0xB2FF18975AF49C522a410a75565bD475F4bAC00f",
  "0x73e9c88D26343eca36bB1297CfD0f8D6F02Ff8ea",
  "0x1670B5cdd17D4cAA012A75B830265B69F63E0100",
  "0x32606A1b77A7914371087e9bCB5F102Cf4c54233",
  "0xa4e0e27cA70537fd9DA91676A2385cc00b87Cc40",
  "0x8B77d38a521896b2447136D451Bf4E3C05EeF0a5",
  "0xaf061E0906a4f6F696134a9EBE19b54d4aE04C02",
  "0x9c3bAcade6BBE81a6238110a28628512ABf4eC4a",
  "0xc3f855fB87742885566F1C12f332ec54df35F6fd",
  "0xECE32FC3907c43B8594DE0239645Ccc020ae2961",
];

const amounts = [
  "18000",
  "45000",
  "7200",
  "72500",
  "15000",
  "68",
  "60600",
  "17500",
  "3406",
  "6000",
  "6000",
  "49",
  "38800",
  "6000",
  "3300",
  "17350",
  "77000",
  "620",
  "25000",
  "800",
  "500",
  "230000",
  "9800",
  "100000",
  "9000",
  "15000",
  "20780",
  "362800",
  "25000",
  "33539",
  "415000",
  "30000",
  "14779",
  "2746",
  "86985",
  "15739",
  "205000",
  "4200",
  "189100",
  "7500",
  "4720",
  "650",
];

async function refundFrens() {
  let stakingFacet = await ethers.getContractAt(
    "StakingFacet",
    maticStakingAddress
  );

  if (network.name === "matic") {
    const {
      LedgerSigner,
    } = require("../../../aavegotchi-contracts/node_modules/@ethersproject/hardware-wallets");

    const signer = new LedgerSigner(ethers.provider);

    const tx: PopulatedTransaction =
      await stakingFacet.populateTransaction.adjustFrens(
        addresses,
        amounts.map((amt) => ethers.utils.parseEther(amt)),
        { gasLimit: 800000 }
      );
    await sendToMultisig(stakingDiamondUpgrader, signer, tx, ethers);
  } else {
    stakingFacet = await impersonate(
      stakingDiamondUpgrader,
      stakingFacet,
      ethers,
      network
    );

    let frens = await stakingFacet.frens(addresses[0]);
    console.log(
      `epoch frens before adjusting by ${amounts[0]}:`,
      ethers.utils.formatEther(frens)
    );

    await stakingFacet.adjustFrens(
      addresses,
      amounts.map((amt) => ethers.utils.parseEther(amt)),
      { gasPrice: gasPrice }
    );

    frens = await stakingFacet.frens(addresses[0]);
    console.log(
      "new epoch frens after adjusting:",
      ethers.utils.formatEther(frens)
    );
  }
}

if (require.main === module) {
  refundFrens()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
