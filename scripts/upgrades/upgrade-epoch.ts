import { run, ethers } from "hardhat";
import {
  convertFacetAndSelectorsToString,
  DeployUpgradeTaskArgs,
  FacetsAndAddSelectors,
} from "../../tasks/deployUpgrade";
import { StakingFacet__factory } from "../../typechain";
import { StakingFacetInterface } from "../../typechain/StakingFacet";
import { PoolObject } from "../../types";
import { maticStakingAddress } from "../helperFunctions";

export const initPools: PoolObject[] = [
  {
    _poolAddress: "0x385Eeac5cB85A38A9a07A70c73e0a3271CfB54A7",
    _poolReceiptToken: ethers.constants.AddressZero,
    _rate: "1",
    _poolName: "GHST",
    _poolUrl: "",
  },
  {
    _poolAddress: "0x8b1fd78ad67c7da09b682c5392b65ca7caa101b9",
    _poolReceiptToken: "0xA02d547512Bb90002807499F05495Fe9C4C3943f",
    _rate: "83",
    _poolName: "GHST-QUICK",
    _poolUrl:
      "https://quickswap.exchange/#/add/0x385Eeac5cB85A38A9a07A70c73e0a3271CfB54A7/0x831753DD7087CaC61aB5644b308642cc1c33Dc13",
  },
  {
    _poolAddress: "0x096c5ccb33cfc5732bcd1f3195c13dbefc4c82f4",
    _poolReceiptToken: "0x04439eC4ba8b09acfae0E9b5D75A82cC63b19f09",
    _rate: "74062104",
    _poolName: "GHST-USDC",
    _poolUrl:
      "https://quickswap.exchange/#/add/0x385Eeac5cB85A38A9a07A70c73e0a3271CfB54A7/0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
  },
  {
    _poolAddress: "0xccb9d2100037f1253e6c1682adf7dc9944498aff",
    _poolReceiptToken: "0x388E2a3d389F27504212030c2D42Abf0a8188cd1",
    _rate: "12077243",
    _poolName: "GHST-WETH",
    _poolUrl:
      "https://quickswap.exchange/#/add/0x385Eeac5cB85A38A9a07A70c73e0a3271CfB54A7/0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
  },
];

async function upgrade() {
  const diamondUpgrader = "0x35fe3df776474a7b24b3b1ec6e745a830fdad351";

  const poolInfoTuple =
    "tuple(address _poolAddress, address _poolReceiptToken, uint256 _rate, string _poolName, string _poolUrl)";

  const poolRateTuple =
    "tuple(address poolAddress, uint256 rate, string name, string url)";

  const stakedOutputTuple =
    "tuple(address poolAddress, string poolName, uint256 amount)";

  const facets: FacetsAndAddSelectors[] = [
    {
      facetName: "StakingFacet",
      addSelectors: [
        `function initiateEpoch(${poolInfoTuple}[] calldata _pools) external`,
        `function updateRates(uint256 _epoch, ${poolInfoTuple}[] calldata _pools) external`,
        `function userEpoch(address _account) external view returns (uint256)`,
        "function stakeIntoPool(address _poolContractAddress, uint256 _amount) public",
        "function bumpEpoch(address _account, uint256 _epoch) external",
        "function withdrawFromPool(address _poolContractAddress, uint256 _amount) public returns (bool)",
        "function migrateToV2(address[] _accounts) external",
        `function poolRatesInEpoch(uint256 _epoch) external view returns (${poolRateTuple}[] memory _rates)`,
        `function stakedInEpoch(address _account, uint256 _epoch) public view returns (${stakedOutputTuple}[] memory _staked)`,
        `function stakedInCurrentEpoch(address _account) external view returns (${stakedOutputTuple}[] memory _staked)`,
        "function currentEpoch() external view returns (uint256)",
        "function hasMigrated(address _account) public view returns (bool)",
        `function getPoolInfo(address _poolAddress, uint256 _epoch) external view returns (${poolInfoTuple} memory _poolInfo)`,
      ],
      removeSelectors: [
        "function updatePoolTokensRate(uint256 _newRate) external",
        "function poolTokensRate() external view returns (uint256)",
        "function migrateFrens(address[] calldata _stakers, uint256[] calldata _frens) external",
        "function switchFrens(address _old, address _new) external",
        "function getGhstUsdcPoolToken() external view returns (address)",
        "function getStkGhstUsdcToken() external view returns (address)",
        "function setGhstUsdcToken(address _ghstUsdcPoolToken, address _stkGhstUsdcToken, uint256 _ghstUsdcRate) external",
        "function updateGhstUsdcRate(uint256 _newRate) external",
        "function ghstUsdcRate() external view returns (uint256)",
        "function getGhstWethPoolToken() external view returns (address)",
        "function getStkGhstWethToken() external view returns (address)",
        "function setGhstWethToken(address _ghstWethPoolToken,address _stkGhstWethToken,uint256 _ghstWethRate) external",
        "function updateGhstWethRate(uint256 _newRate) external",
        "function ghstWethRate() external view returns (uint256)",
        "function updateAccounts(address[] calldata _accounts) external",
      ],
    },
  ];

  const joined = convertFacetAndSelectorsToString(facets);

  let iface: StakingFacetInterface = new ethers.utils.Interface(
    StakingFacet__factory.abi
  ) as StakingFacetInterface;

  const calldata = iface.encodeFunctionData("initiateEpoch", [initPools]);

  const args: DeployUpgradeTaskArgs = {
    diamondUpgrader: diamondUpgrader,
    diamondAddress: maticStakingAddress,
    facetsAndAddSelectors: joined,
    useLedger: false,
    useMultisig: false,
    initAddress: maticStakingAddress,
    initCalldata: calldata,
  };

  await run("deployUpgrade", args);
}

if (require.main === module) {
  upgrade()
    .then(() => process.exit(0))
    // .then(() => console.log('upgrade completed') /* process.exit(0) */)
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

exports.upgrade = upgrade;
