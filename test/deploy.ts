const diamond = require("diamond-util");
import { ethers } from "hardhat";

export async function deployTestPolygon() {
  const accounts = await ethers.getSigners();
  const account = await accounts[0].getAddress();

  console.log("Deploying facets and diamond:");
  const signer = accounts[0];
  async function deployFacets(...facets: string[]) {
    const instances = [];
    for (let facet of facets) {
      let constructorArgs = [];
      if (Array.isArray(facet)) {
        [facet, constructorArgs] = facet;
      }
      const factory = await ethers.getContractFactory(facet, signer);
      const facetInstance = await factory.deploy(...constructorArgs);
      await facetInstance.deployed();
      instances.push(facetInstance);
    }
    return instances;
  }
  let [
    diamondCutFacet,
    diamondLoupeFacet,
    ownershipFacet,
    stakingFacet,
    ticketsFacet,
    ghstStakingTokenFacet,
  ] = await deployFacets(
    "DiamondCutFacet",
    "DiamondLoupeFacet",
    "OwnershipFacet",
    "StakingFacet",
    "TicketsFacetMock",
    "GHSTStakingTokenFacet",
  );

  const ghstContract = "0x385Eeac5cB85A38A9a07A70c73e0a3271CfB54A7";
  const poolContract = "0x8b1fd78ad67c7da09b682c5392b65ca7caa101b9";

  const ghstStakingDiamondDiamond = await diamond.deploy({
    diamondName: "GHSTStakingDiamond",
    facets: [
      ["DiamondCutFacet", diamondCutFacet],
      ["DiamondLoupeFacet", diamondLoupeFacet],
      ["OwnershipFacet", ownershipFacet],
      ["StakingFacet", stakingFacet],
      ["TicketsFacetMock", ticketsFacet],
      ["GHSTStakingTokenFacet", ghstStakingTokenFacet]
    ],
    args: [account, ghstContract, poolContract],
  });
  console.log(
    "GHSTStaking diamond address:" + ghstStakingDiamondDiamond.address
  );

  return ghstStakingDiamondDiamond;
}

export async function deployTestGotchichain() {
  console.log("Deploying Tickets");

  const accounts = await ethers.getSigners();
  const signer = accounts[0];

  const ticketsFactory = await ethers.getContractFactory('Tickets', signer)
  const tickets = await ticketsFactory.deploy()

  await tickets.deployed()

  console.log('Tickets contract deployed to:', tickets.address)

  return tickets
}
