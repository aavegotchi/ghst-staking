import { Signer } from "ethers";
import { network, ethers } from "hardhat";
import { PoolObject } from "../types";

import {
  ERC20,
  ReceiptToken,
  ReceiptToken__factory,
  StakingFacet,
  StaticAmGHSTRouter,
  StaticATokenLM,
} from "../typechain";

export const ghstOwner = "0x08F4d97DD326094B66CC5eb597F288c5b5567fcf";
export const aaveLendingContract = "0x8dff5e27ea6b7ac08ebfdf9eb090f32ee9a30fcf";
export const amGHST = "0x080b5bf8f360f624628e0fb961f4e67c9e3c7cf1";
export const stakingDiamond = "0xA02d547512Bb90002807499F05495Fe9C4C3943f";
export const GHST = "0x385Eeac5cB85A38A9a07A70c73e0a3271CfB54A7";
export const randAddress = "0x837704Ec8DFEC198789baF061D6e93B0e1555dA6";
export let poolAddress: string;
let ghstRouter: StaticAmGHSTRouter;

let wamGHST;
let stakingFacet: StakingFacet;
let addresses: contractAddresses;
export const sufficientAmnt = "1000000000000000000000"; //1000ghst

export interface contractAddresses {
  wamGHST: StaticATokenLM;
  stkwamGHST: ReceiptToken;
  router: StaticAmGHSTRouter;
}

export async function deploy() {
  const accounts = await ethers.getSigners();
  let testing = ["hardhat", "localhost"].includes(network.name);
  let signer: Signer;
  if (testing) {
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [ghstOwner],
    });
    signer = await ethers.provider.getSigner(ghstOwner);
  } else if (network.name === "matic") {
    signer = accounts[0];
  } else {
    throw Error("Incorrect network selected");
  }

  //deploy wamGhst static token
  const staticAToken = await ethers.getContractFactory(
    "StaticATokenLM",
    signer
  );
  wamGHST = await staticAToken.deploy(aaveLendingContract, amGHST);
  await wamGHST.deployed();
  console.log("wrapped amGHST static token deployed to", wamGHST.address);

  //deploy stkwamGHST receipt token
  const receiptTokenFactory = (await ethers.getContractFactory(
    "ReceiptToken"
  )) as ReceiptToken__factory;
  const token = (await receiptTokenFactory.deploy(
    stakingDiamond,
    "Staked Wrapped amGHST",
    "stkwamGHST"
  )) as ReceiptToken;
  await token.deployed();
  console.log("stkwamGHST token deployed to", token.address);

  //new pools

  const poolData: PoolObject[] = [
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
    {
      _poolAddress: "0xf69e93771f11aecd8e554aa165c3fe7fd811530c",
      _poolReceiptToken: "0x6fcac9eee338e29205a24692bbf87e0eb9431997",
      _rate: "3",
      _poolName: "GHST-MATIC",
      _poolUrl: "",
    },

    //amGHST Pool
    {
      _poolAddress: wamGHST.address,
      _poolReceiptToken: token.address,
      _rate: "1",
      _poolName: "wamGHST",
      _poolUrl:
        "https://app.aave.com/#/reserve-overview/0x385eeac5cb85a38a9a07a70c73e0a3271cfb54a7-0x385eeac5cb85a38a9a07a70c73e0a3271cfb54a70xd05e3e715d945b59290df0ae8ef85c1bdb684744",
    },
  ];

  let owner = await (
    await ethers.getContractAt("OwnershipFacet", stakingDiamond)
  ).owner();

  if (testing) {
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [owner],
    });
    stakingFacet = await ethers.getContractAt(
      "StakingFacet",
      stakingDiamond,
      signer
    );
    let tx = await stakingFacet
      .connect(await ethers.getSigner(owner))
      .addRateManagers([ghstOwner]);
    const receipt = await tx.wait();
    if (!receipt.status) {
      throw Error(`Adding rate manager failed: ${tx.hash}`);
    }
    console.log("Adding rate manager succeeded:", tx.hash);
    console.log(await stakingFacet.currentEpoch());

    const oldPools = await stakingFacet.poolRatesInEpoch("2");
    console.log("old pools:", oldPools);

    let addTx = await stakingFacet.updateRates(2, poolData);
    const txData = await addTx.wait();
    //@ts-ignore
    poolAddress = txData.events[0].args;
    console.log(poolAddress);
  }

  //deploy GHST main wrapper router
  const wrapper = await ethers.getContractFactory("StaticAmGHSTRouter", signer);
  //@ts-ignore
  ghstRouter = await wrapper.deploy(wamGHST.address);
  await ghstRouter.deployed();
  console.log("router deployed to", ghstRouter.address);

  return (addresses = {
    wamGHST: wamGHST,
    stkwamGHST: token,
    router: ghstRouter,
  });
}
if (require.main === module) {
  deploy()
    .then(() => process.exit(0))

    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

exports.deploy = deploy;
