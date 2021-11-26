import { run, ethers, network } from "hardhat";
import {
  convertFacetAndSelectorsToString,
  DeployUpgradeTaskArgs,
  FacetsAndAddSelectors,
} from "../../tasks/deployUpgrade";
import { StakingFacet, StakingFacet__factory } from "../../typechain";
import { StakingFacetInterface } from "../../typechain/StakingFacet";
import {
  impersonate,
  maticStakingAddress,
  stakingDiamondUpgrader,
} from "../helperFunctions";

async function upgrade() {
  const facets: FacetsAndAddSelectors[] = [
    {
      facetName: "StakingFacet",
      addSelectors: [
        `function deprecatedFrens(address _account) external view returns (uint256 frens_)`,
        "function adjustFrens(address[] calldata _stakers, uint256[] calldata _frens) external",
      ],
      removeSelectors: [],
    },
  ];

  const joined = convertFacetAndSelectorsToString(facets);

  let iface: StakingFacetInterface = new ethers.utils.Interface(
    StakingFacet__factory.abi
  ) as StakingFacetInterface;

  //affected by more than one day's worth

  const args: DeployUpgradeTaskArgs = {
    diamondUpgrader: stakingDiamondUpgrader,
    diamondAddress: maticStakingAddress,
    facetsAndAddSelectors: joined,
    useLedger: false,
    useMultisig: false,
  };

  // await run("deployUpgrade", args);

  const beforeEpochBlock = 21703740;
  const afterEpochBlock = 21703744;

  let stakingFacet = (await ethers.getContractAt(
    "StakingFacet",
    maticStakingAddress
  )) as StakingFacet;
  const addy = "0x32606A1b77A7914371087e9bCB5F102Cf4c54233";

  console.log("ADDRESS", addy);
  let frens = await stakingFacet.frens(addy, { blockTag: beforeEpochBlock });
  console.log("frens before epoch update:", ethers.utils.formatEther(frens));

  frens = await stakingFacet.frens(addy, { blockTag: afterEpochBlock });
  console.log("frens AFTER epoch update:", ethers.utils.formatEther(frens));

  frens = await stakingFacet.frens(addy, { blockTag: 21738680 });
  console.log("epoch frens as of yesterday:", ethers.utils.formatEther(frens));

  let dep = await stakingFacet.deprecatedFrens(addy);
  console.log("deprecated frens:", ethers.utils.formatEther(dep));
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
