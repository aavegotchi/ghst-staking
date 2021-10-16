import { impersonate, maticStakingAddress } from "../scripts/helperFunctions";
import { StakingFacet } from "../typechain";
import { expect } from "chai";
import { network } from "hardhat";
import { ethers } from "hardhat";
import { initPools } from "../scripts/upgrades/upgrade-epoch";

const { upgrade } = require("../scripts/upgrades/upgrade-epoch.ts");

const testAddress = "0x3Da7D21f1A06C7Ce19EE593f76148FAe6e952ca3";
const rateManager = "0xa370f2ADd2A9Fba8759147995d6A0641F8d7C119";
// top 20 addresses for pools: GHST-QUICK GHST-USDC GHST-WETH
const stakersList = [
  "0xa132fad61ede08f1f288a35ff4c10dcd1cb9e107",
  "0x7af23cc86f3d96f079d5a56d0a89ebcb281060d5",
  "0x174b079bb5aeb7a7ffa2a6407b906a844738428d",
  "0x20ec02894d748c59c01b6bf08fe283d7bb75a5d2",
  "0xa532f169cee0e551d4da641031ac78fd85461035",
  "0x5c5a4ae893c4232a050b01a84e193e107dd80ca2",
  "0x26d39fc7341567c8b0bb96382fc54f367f4298ea",
  "0x7269cad927f2d98abfd06b0eb1da318525c6c304",
  "0xed0a7ca838ab118a4c3133b98c52570342b40424",
  "0xd72367731ee6350af6ed23c89d23d110b2ba11f2",
  "0x01c3dd0607e189d8ec94c740cf5926db4f38bf3f",
  "0xdc6becc975b73e5f777c17a3f1f337d0fe2c1aac",
  "0xd544885634e782e1436bd0352044cb2fbf84122a",
  "0xc0893fa01108f50fa2a04e2ccee815376ec56233",
  "0xcc84cc9462e4f1f45597c584123ee31cd7e5864b",
  "0x56446712b219fcc34a5604f5e7af5d50d65b6647",
  "0xae5b56ca47e84b6c749e0454680c4161b9da9790",
  "0xf48b4c067b4816dbc0a65333e9e81ca6d8a17002",
  "0x137c0f7d6b2558edf5b8f69eec0635dd43fad6af",
  "0x34ec9c1d89ce8afa701d079fd908fca95f49667a",
  "0x7404becad09351583443720f8f520f689e93359e",
  "0x3759d7904a5a0fcdb5aa2d55d5ff1132ae4f2575",
  "0xfdc02dc768a587514b992b03fb713f74061764a2",
  "0x6d1b731ce6e88bd41b22bab615860c2b67b6c877",
  "0x38e481367e0c50f4166ad2a1c9fde0e3c662cfba",
  "0x03b16ab6e23bdbeeab719d8e4c49d63674876253",
  "0xed3bbbe2e3eace311a94b059508bbdda9149ab23",
  "0x0e05fc644943aae89dd3fec282c3f86431a7d090",
  "0xdf6a8625466987bfc31a112def0d83dfd5618636",
  "0x20ec02894d748c59c01b6bf08fe283d7bb75a5d2",
  "0x53a9d15e093dcc049a22e13621962be4d5f302f9",
  "0x3f7c10cbbb1ea1046a80b738b9eaf3217410c7f6",
  "0xe2cde57a083b46b0df49658b3ad7507e4e1381fa",
  "0xbfe09443556773958bae1699b786d8e9680b5571",
  "0xf815a566e42b0d8ddd5d77f91409a7d9ceb10b92",
  "0xcbcdca647cfda9283992193604f8718a910b42fc",
  "0x1c097a37e652051bbf3d7a05ad11760242050712",
  "0xeda29227543b2bc0d8e4a5220ef0a34868033a2d",
  "0x1948abc5400aa1d72223882958da3bec643fb4e5",
  "0x60ed33735c9c29ec2c26b8ec734e36d5b6fa1eab",
  "0x417aff82d2cd9fd39fe790af5798ae865fbe8c48",
  "0x50664ede715e131f584d3e7eaabd7818bb20a068",
  "0xecb6a3e0e99700b32bb03ba14727d99fe8e538cf",
  "0xb792074f575e1e52cb8dc9af2b345ff10a144120",
  "0x5acabc3222a7b74884bec8efe28a7a69a7920818",
  "0xf9ab2ef128d856339ad2c258cdaa14a22c662a14",
  "0xf09d1acbf092ec47970a2aa9e16bc658b2ecf15e",
  "0xb93e7734d868b7f06078f500b6c1ee4c427950c7",
  "0x28820065296837492f422595d21446aa3d3be1f2",
  "0x29746c9d6b317c6df26ac1751d6cb03a55c1b8d5",
  "0x3d9c859b26735d43bbb644a025c209ea7a85e9a7",
  "0x6a56dbe567b70c5ff0625616e3bf11cc3beee09e",
  "0x2afb58a22e7d3c241ab7b9a1f68b9e8e74ec9d68",
  "0x6d98d039a4b3437c8fb19ef2fadecb3626b207ad",
  "0x17849f5232aeb12d6f279281385f8031bfba2856",
  "0x94bbaf0999db51f5d957fa638520d562bbe114ed",
];

let stakingFacet: StakingFacet;

describe("More tests", async function () {
  const diamondAddress = maticStakingAddress;

  before(async function () {
    this.timeout(2000000000);
    await upgrade();

    stakingFacet = (await ethers.getContractAt(
      "StakingFacet",
      diamondAddress
    )) as StakingFacet;

    stakingFacet = (await impersonate(
      testAddress,
      stakingFacet,
      ethers,
      network
    )) as StakingFacet;
  });
  it("Stake and withdraw loop GHST and GHST-QUICK", async function () {
    await network.provider.send("evm_setAutomine", [false]);
    const pools = await stakingFacet.poolRatesInEpoch("0");
    const frensBefore = await stakingFacet.frens(testAddress);
    for (let i = 0; i < 5; i++) {
      await stakingFacet.stakeIntoPool(
        pools[1].poolAddress,
        ethers.utils.parseUnits("1")
      );
      await stakingFacet.withdrawFromPool(
        pools[1].poolAddress,
        ethers.utils.parseUnits("1")
      );
    }
    const frensAfter = await stakingFacet.frens(testAddress);
    expect(frensBefore).to.equal(frensAfter);
    for (let i = 0; i < 5; i++) {
      await stakingFacet.stakeIntoPool(
        pools[0].poolAddress,
        ethers.utils.parseUnits("1")
      );
      await stakingFacet.withdrawFromPool(
        pools[0].poolAddress,
        ethers.utils.parseUnits("1")
      );
    }
    const frensAfter2 = await stakingFacet.frens(testAddress);
    expect(frensBefore).to.equal(frensAfter2);
    await network.provider.send("evm_setAutomine", [true]);
  });
  it("Migrate big list of users and check frens before and after", async function () {
    stakingFacet = (await impersonate(
      rateManager,
      stakingFacet,
      ethers,
      network
    )) as StakingFacet;
    let frensBeforeArr = [];
    for (let i = 0; i < stakersList.length; i++) {
      const frensBefore = await stakingFacet.frens(stakersList[i]);
      frensBeforeArr.push(frensBefore);
    }
    await stakingFacet.migrateToV2(stakersList);
    for (let i = 0; i < stakersList.length; i++) {
      const frensAfter = await stakingFacet.frens(stakersList[i]);
      const difference = Number(
        ethers.utils.formatEther(frensAfter.sub(frensBeforeArr[i]))
      );
      // check that the frens difference is less than 2%
      const tinyPercent =
        (Number(ethers.utils.formatUnits(frensAfter)) * 0.02 +
          Number(ethers.utils.formatUnits(frensBeforeArr[i])) * 0.02) /
        2;
      // check that the frens difference is less than 0.05%
      const tiniestPercent =
        (Number(ethers.utils.formatUnits(frensAfter)) * 0.0005 +
          Number(ethers.utils.formatUnits(frensBeforeArr[i])) * 0.0005) /
        2;
      const percDiff =
        difference /
        ((Number(ethers.utils.formatUnits(frensAfter)) +
          Number(ethers.utils.formatUnits(frensBeforeArr[i]))) /
          2);
      if (difference > tiniestPercent) {
        console.log("address", stakersList[i]);
        console.log("frensBefore", ethers.utils.formatUnits(frensBeforeArr[i]));
        console.log("frensAfter", ethers.utils.formatUnits(frensAfter));
        console.log("difference", difference);
        console.log("percdiff", percDiff);
      }
      expect(difference).to.lessThanOrEqual(tinyPercent);
    }
  });
});
