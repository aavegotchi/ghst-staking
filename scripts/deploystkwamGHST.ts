import { BigNumber, Signer } from "ethers";
import { network, ethers } from "hardhat";
import { PoolObject } from "../types";

import {
  ERC20,
  ReceiptToken,
  ReceiptToken__factory,
  StakingFacet,
  WrappedAToken,
  WrappedATokenRouter,
} from "../typechain";

import {
  amGHSTV2,
  amGHSTV3,
  ghstAddress,
  lendingPoolV2,
  lendingPoolV3,
  stakingDiamond,
  rewardsControllerV3,
  daoTreasury,
} from "../helpers/constants";
import { gasPrice, getDiamondSigner } from "./helperFunctions";

export const ghstOwner = "0x08F4d97DD326094B66CC5eb597F288c5b5567fcf";
export const randAddress = "0x837704Ec8DFEC198789baF061D6e93B0e1555dA6";
export let poolAddress: string;

let stakingFacet: StakingFacet;

export const sufficientAmnt = "1000000000000000000000"; //1000ghst

export interface contractAddresses {
  wamGHST: WrappedAToken;
  stkwamGHST: ReceiptToken;
  router: WrappedATokenRouter;
}

export async function deploy() {
  let testing = ["hardhat", "localhost"].includes(network.name);
  let signer: Signer = await getDiamondSigner(ethers, network, ghstOwner, true);

  console.log("signer:", ghstOwner);

  // Implementation Deployment
  const staticAToken = await ethers.getContractFactory("WrappedAToken", signer);
  const aToken = await ethers.getContractAt(
    "contracts/interfaces/IERC20.sol:IERC20",
    amGHSTV3,
    signer
  );
  let wamGHST = await staticAToken.deploy({ gasPrice: gasPrice });
  await wamGHST.deployed();

  // Proxy Admin Deployment
  const ProxyAdmin = await ethers.getContractFactory("ProxyAdmin");
  const proxyAdmin = await ProxyAdmin.connect(signer).deploy();

  // Proxy Deployment
  const TransparentUpgradeableProxy = await ethers.getContractFactory(
    "TransparentUpgradeableProxy"
  );
  const proxy = await TransparentUpgradeableProxy.deploy(
    wamGHST.address,
    proxyAdmin.address,
    "0x"
  ); // logic, admin, data;

  // Attach implementation ABI to proxy
  const wamGHSTToken = (await ethers.getContractAt(
    "WrappedAToken",
    proxy.address,
    signer
  )) as WrappedAToken;
  console.log("Successfully attached");

  // Initialize Wrapped AToken with minimum shares
  await aToken.approve(wamGHSTToken.address, BigNumber.from(1e10));
  await wamGHSTToken.initialize(
    amGHSTV3,
    rewardsControllerV3,
    daoTreasury,
    ghstOwner,
    BigNumber.from(1e10),
    "Wrapped Aave Polygon GHST",
    "WaPolyGHST"
  );
  console.log("wrapped amGHST static token deployed to", wamGHSTToken.address);

  const tokenOwner = await wamGHSTToken.owner();
  console.log("token owner:", tokenOwner);

  //deploy stkwamGHST receipt token
  const receiptTokenFactory = (await ethers.getContractFactory(
    "ReceiptToken"
  )) as ReceiptToken__factory;
  const receiptToken = (await receiptTokenFactory.deploy(
    stakingDiamond,
    "Staked Wrapped amGHST",
    "stkwamGHST",
    { gasPrice: gasPrice }
  )) as ReceiptToken;
  await receiptToken.deployed();
  console.log("stkwaPolyGHST token deployed to", receiptToken.address);

  const WrappedATokenRouter = await ethers.getContractFactory(
    "WrappedATokenRouter"
  );
  const wrappedATokenRouter = await WrappedATokenRouter.deploy(
    wamGHSTToken.address,
    lendingPoolV3,
    stakingDiamond,
    ghstAddress,
    amGHSTV3
  );
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
      _poolAddress: wamGHSTToken.address,
      _poolReceiptToken: receiptToken.address,
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

    const nonce = await ethers.provider.getTransactionCount(ghstOwner);

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
    stkwamGHST: receiptToken,
    router: wrappedATokenRouter,
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
