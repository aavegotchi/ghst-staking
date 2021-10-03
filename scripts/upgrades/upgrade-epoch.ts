import { run, ethers } from "hardhat";
import {
  convertFacetAndSelectorsToString,
  DeployUpgradeTaskArgs,
  FacetsAndAddSelectors,
} from "../../tasks/deployUpgrade";
import {
  getSelector,
  maticDiamondAddress,
  maticStakingAddress,
} from "../helperFunctions";

async function upgrade() {
  const diamondUpgrader = "0x35fe3df776474a7b24b3b1ec6e745a830fdad351";

  const poolInfoTuple =
    "tuple(address _poolAddress, address _poolReceiptToken, uint256 _rate, string _poolName)";

  const poolRateTuple = "tuple(address poolAddress, uint256 rate)";

  const stakedOutputTuple =
    "tuple(address poolAddress, string poolName, uint256 amount)";

  const facets: FacetsAndAddSelectors[] = [
    {
      facetName: "StakingFacet",
      addSelectors: [
        `function initiateEpoch(${poolInfoTuple}[] calldata _pools) external`,
        `function updateRates(${poolInfoTuple}[] calldata _pools) external`,
        "function epochFrens(address _account) public view returns (uint256 frens_)",
        "function stakeIntoPool(address _poolContractAddress, uint256 _amount) public",
        "function withdrawFromPool(address _poolContractAddress, uint256 _amount) public returns (bool)",
        "function migrateToV2(address[] _accounts) external",
        `function poolRatesInEpoch(uint256 _epoch) external view returns (${poolRateTuple}[] memory _rates)`,
        `function stakedInEpoch(address _account, uint256 _epoch) external view returns (${stakedOutputTuple}[] memory _staked)`,
        `function stakedInCurrentEpoch(address _account) public view returns (${stakedOutputTuple}[] memory _staked)`,
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

  const args: DeployUpgradeTaskArgs = {
    diamondUpgrader: diamondUpgrader,
    diamondAddress: maticStakingAddress,
    facetsAndAddSelectors: joined,
    useLedger: false,
    useMultisig: false,
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
