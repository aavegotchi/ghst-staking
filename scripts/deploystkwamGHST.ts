import { BigNumber, Signer } from "ethers";
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
import { gasPrice, getDiamondSigner } from "./helperFunctions";

export const ghstOwner = "0x08F4d97DD326094B66CC5eb597F288c5b5567fcf";
export const aaveLendingContract = "0x8dff5e27ea6b7ac08ebfdf9eb090f32ee9a30fcf";
export const amGHSTV1 = "0x080b5bf8f360f624628e0fb961f4e67c9e3c7cf1";
export const amGHSTv2 = "0x8Eb270e296023E9D92081fdF967dDd7878724424";
export const stakingDiamond = "0xA02d547512Bb90002807499F05495Fe9C4C3943f";
export const GHST = "0x385Eeac5cB85A38A9a07A70c73e0a3271CfB54A7";
export const randAddress = "0x837704Ec8DFEC198789baF061D6e93B0e1555dA6";
export let poolAddress: string;

let stakingFacet: StakingFacet;

export const sufficientAmnt = "1000000000000000000000"; //1000ghst

export interface contractAddresses {
  wamGHST: StaticATokenLM;
  stkwamGHST: ReceiptToken;
  // router: StaticAmGHSTRouter;
}

export async function deploy() {
  let testing = ["hardhat", "localhost"].includes(network.name);
  let signer: Signer = await getDiamondSigner(ethers, network, ghstOwner, true);

  const address = await signer.getAddress();

  console.log("signer:", await signer.getAddress());

  console.log("address:", await signer.getAddress());

  const contractOwner = await signer.getAddress();

  //deploy wamGhst static token
  const staticAToken = await ethers.getContractFactory(
    "StaticATokenLM",
    signer
  );
  const wamGHST = await staticAToken.deploy(
    { gasPrice: gasPrice }
  );
  await wamGHST.deployed();
  await wamGHST.initialize(
    aaveLendingContract,
    amGHSTv2,
    contractOwner,
  )
  console.log("wrapped amGHST static token deployed to", wamGHST.address);

  const wamGHSTToken = (await ethers.getContractAt(
    "StaticATokenLM",
    wamGHST.address
  )) as StaticATokenLM;

  const tokenOwner = await wamGHSTToken.owner();
  console.log("token owner:", tokenOwner);

  // const wamGhstAddress = "0x3172cE4f647a4afA70EaE383401AB8aE2FE2E9f7";
  // const stkWamGhstAddress = "0xe5f6166D8e10b205c0E500175E7F6C3bC4B3D252";

  //deploy stkwamGHST receipt token
  const receiptTokenFactory = (await ethers.getContractFactory(
    "ReceiptToken"
  )) as ReceiptToken__factory;
  const token = (await receiptTokenFactory.deploy(
    stakingDiamond,
    "Staked Wrapped amGHST",
    "stkwamGHST",
    { gasPrice: gasPrice }
  )) as ReceiptToken;
  await token.deployed();
  console.log("stkwamGHST token deployed to", token.address);

  //new pools

  const wamGhstAddress = wamGHSTToken.address;
  const stkWamGhstAddress = token.address;

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
      _rate: "29",
      _poolName: "GHST-QUICK",
      _poolUrl:
        "https://quickswap.exchange/#/add/0x385Eeac5cB85A38A9a07A70c73e0a3271CfB54A7/0x831753DD7087CaC61aB5644b308642cc1c33Dc13",
    },
    {
      _poolAddress: "0x096c5ccb33cfc5732bcd1f3195c13dbefc4c82f4",
      _poolReceiptToken: "0x04439eC4ba8b09acfae0E9b5D75A82cC63b19f09",
      _rate: "73270159",
      _poolName: "GHST-USDC",
      _poolUrl:
        "https://quickswap.exchange/#/add/0x385Eeac5cB85A38A9a07A70c73e0a3271CfB54A7/0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    },
    {
      _poolAddress: "0xccb9d2100037f1253e6c1682adf7dc9944498aff",
      _poolReceiptToken: "0x388E2a3d389F27504212030c2D42Abf0a8188cd1",
      _rate: "11560572",
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
      _poolAddress: wamGhstAddress,
      _poolReceiptToken: stkWamGhstAddress,
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

    const addTx = await stakingFacet.updateRates(2, poolData);
    await addTx.wait();

    const pools = await stakingFacet.poolRatesInEpoch("3");
    console.log("pools:", pools);
  } else {
    stakingFacet = await ethers.getContractAt(
      "StakingFacet",
      stakingDiamond,
      signer
    );

    console.log("Updating rates");

    const gas = await ethers.provider.getFeeData();

    console.log(
      "gas:",
      gas.maxFeePerGas?.toString(),
      gas.maxPriorityFeePerGas?.toString()
    );

    const nonce = await ethers.provider.getTransactionCount(address);

    console.log("current nonce:", nonce);

    const tx = await stakingFacet.updateRates(2, poolData, {
      maxFeePerGas: 32339967253,
      maxPriorityFeePerGas: 32339967253,
      // gasPrice: gas.gasPrice ? gas.gasPrice : gasPrice,
    });

    console.log("tx hash:", tx.hash);

    await tx.wait();

    const addTx = await stakingFacet.populateTransaction.updateRates(
      2,
      poolData,
      { gasPrice: gasPrice }
    );
    console.log("tx data:", addTx.data);
  }

  const deployed: contractAddresses = {
    wamGHST: wamGHSTToken,
    stkwamGHST: token,
  };

  return deployed;
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
