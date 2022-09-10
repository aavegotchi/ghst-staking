import { run, ethers } from "hardhat";
import { StakingFacet, StakingFacet__factory } from "../../typechain";
import {
  maticStakingAddress,
  stakingDiamondUpgrader,
} from "../helperFunctions";
import {
  convertFacetAndSelectorsToString,
  DeployUpgradeTaskArgs,
  FacetsAndAddSelectors,
} from "../../tasks/deployUpgrade";
import { StakingFacetInterface } from "../../typechain/StakingFacet";

export async function upgrade() {
  const poolInfoTuple =
    "tuple(address _poolAddress, address _poolReceiptToken, uint256 _rate, string _poolName, string _poolUrl)";

  const facets: FacetsAndAddSelectors[] = [
    {
      facetName: "StakingFacet",
      addSelectors: [
        `function sunsetFrens(${poolInfoTuple}[] calldata _newPools) external`,
      ],
      removeSelectors: [],
    },
  ];

  const joined = convertFacetAndSelectorsToString(facets);

  const poolData: any[] = [
    {
      _poolAddress: "0x385Eeac5cB85A38A9a07A70c73e0a3271CfB54A7",
      _poolReceiptToken: ethers.constants.AddressZero,
      _rate: "0",
      _poolName: "GHST",
      _poolUrl: "",
    },
    {
      _poolAddress: "0x8b1fd78ad67c7da09b682c5392b65ca7caa101b9",
      _poolReceiptToken: "0xA02d547512Bb90002807499F05495Fe9C4C3943f",
      _rate: "0",
      _poolName: "GHST-QUICK",
      _poolUrl:
        "https://quickswap.exchange/#/add/0x385Eeac5cB85A38A9a07A70c73e0a3271CfB54A7/0x831753DD7087CaC61aB5644b308642cc1c33Dc13",
    },
    {
      _poolAddress: "0x096c5ccb33cfc5732bcd1f3195c13dbefc4c82f4",
      _poolReceiptToken: "0x04439eC4ba8b09acfae0E9b5D75A82cC63b19f09",
      _rate: "0",
      _poolName: "GHST-USDC",
      _poolUrl:
        "https://quickswap.exchange/#/add/0x385Eeac5cB85A38A9a07A70c73e0a3271CfB54A7/0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    },
    {
      _poolAddress: "0xccb9d2100037f1253e6c1682adf7dc9944498aff",
      _poolReceiptToken: "0x388E2a3d389F27504212030c2D42Abf0a8188cd1",
      _rate: "0",
      _poolName: "GHST-WETH",
      _poolUrl:
        "https://quickswap.exchange/#/add/0x385Eeac5cB85A38A9a07A70c73e0a3271CfB54A7/0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
    },
    {
      _poolAddress: "0xf69e93771f11aecd8e554aa165c3fe7fd811530c",
      _poolReceiptToken: "0x6fcac9eee338e29205a24692bbf87e0eb9431997",
      _rate: "0",
      _poolName: "GHST-MATIC",
      _poolUrl: "",
    },
    {
      _poolAddress: "0x73958d46B7aA2bc94926d8a215Fa560A5CdCA3eA",
      _poolReceiptToken: "0x102cb2F13D9fb33Fdc007EE7D273AD1dfaA73aE8",
      _rate: "0",
      _poolName: "wapGHST",
      _poolUrl:
        "https://app.aave.com/reserve-overview/?underlyingAsset=0x385eeac5cb85a38a9a07a70c73e0a3271cfb54a7&marketName=proto_polygon_v3",
    },
  ];

  let iface: StakingFacetInterface = new ethers.utils.Interface(
    StakingFacet__factory.abi
  ) as StakingFacetInterface;

  const calldata = iface.encodeFunctionData("sunsetFrens", [poolData]);

  const args: DeployUpgradeTaskArgs = {
    diamondUpgrader: stakingDiamondUpgrader,
    diamondAddress: maticStakingAddress,
    facetsAndAddSelectors: joined,
    useLedger: true,
    useMultisig: true,
    initAddress: maticStakingAddress,
    initCalldata: calldata,
  };

  await run("deployUpgrade", args);
}

if (require.main === module) {
  upgrade()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

exports.upgrade = upgrade;
