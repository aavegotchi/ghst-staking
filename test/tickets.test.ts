import LZEndpointMockCompiled from "@layerzerolabs/solidity-examples/artifacts/contracts/mocks/LZEndpointMock.sol/LZEndpointMock.json";
import { expect } from "chai";
import { ethers } from "hardhat";
import {
  ProxyONFT1155,
  TicketsBridgeGotchichainSide,
  TicketsFacetMock,
} from "../typechain";
import { deployTestGotchichain, deployTestPolygon } from "./deploy";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

let minter: string;

let ghstStakingPolygonDiamond: any;
let ticketsGotchichain: any;

let ticketsFacetPolygon: TicketsFacetMock;

let LZEndpointMock: any;
let lzEndpointMockA: any, lzEndpointMockB: any;
const chainId_A = 1;
const chainId_B = 2;
let bridgePolygonSide: ProxyONFT1155,
  bridgeGotchichainSide: TicketsBridgeGotchichainSide;

const defaultAdapterParams = ethers.utils.solidityPack(
  ["uint16", "uint256"],
  [1, "350000"]
);

describe("Deploy Tickets and Test", async function () {
  beforeEach(async function () {
    await loadFixture(deployFixture);
  });

  async function deployFixture() {
    ghstStakingPolygonDiamond = await deployTestPolygon();
    ticketsGotchichain = await deployTestGotchichain();

    const signers = await ethers.getSigners();
    minter = signers[0].address;

    ticketsFacetPolygon = await ethers.getContractAt(
      "TicketsFacetMock",
      ghstStakingPolygonDiamond.address
    );

    LZEndpointMock = await ethers.getContractFactory(
      LZEndpointMockCompiled.abi,
      LZEndpointMockCompiled.bytecode
    );

    const BridgePolygonSide = await ethers.getContractFactory("ProxyONFT1155");
    const BridgeGotchichainSide = await ethers.getContractFactory(
      "TicketsBridgeGotchichainSide"
    );

    //Deploying LZEndpointMock contracts
    lzEndpointMockA = await LZEndpointMock.deploy(chainId_A);
    lzEndpointMockB = await LZEndpointMock.deploy(chainId_B);

    //Deploying bridge contracts
    bridgePolygonSide = await BridgePolygonSide.deploy(
      lzEndpointMockA.address,
      ghstStakingPolygonDiamond.address
    );
    bridgeGotchichainSide = await BridgeGotchichainSide.deploy(
      lzEndpointMockB.address,
      ticketsGotchichain.address
    );

    lzEndpointMockA.setDestLzEndpoint(
      bridgeGotchichainSide.address,
      lzEndpointMockB.address
    );
    lzEndpointMockB.setDestLzEndpoint(
      bridgePolygonSide.address,
      lzEndpointMockA.address
    );

    //Set custom adapter params for both bridges
    await bridgePolygonSide.setUseCustomAdapterParams(true);
    await bridgeGotchichainSide.setUseCustomAdapterParams(true);

    //Set each contracts source address so it can send to each other
    await bridgePolygonSide.setTrustedRemote(
      chainId_B,
      ethers.utils.solidityPack(
        ["address", "address"],
        [bridgeGotchichainSide.address, bridgePolygonSide.address]
      )
    );
    await bridgeGotchichainSide.setTrustedRemote(
      chainId_A,
      ethers.utils.solidityPack(
        ["address", "address"],
        [bridgePolygonSide.address, bridgeGotchichainSide.address]
      )
    );

    //Set min dst gas for swap
    await bridgePolygonSide.setMinDstGas(chainId_B, 1, 150000);
    await bridgeGotchichainSide.setMinDstGas(chainId_A, 1, 150000);
    await bridgePolygonSide.setMinDstGas(chainId_B, 2, 150000);
    await bridgeGotchichainSide.setMinDstGas(chainId_A, 2, 150000);

    //Set layer zero bridge on facet
    await ticketsGotchichain.setLayerZeroBridge(bridgeGotchichainSide.address);
  }

  it("Mint token and bridge and bridge it back", async function () {
    const tokenId = 1;
    const tokenAmount = 1;
    await ticketsFacetPolygon.mint(tokenId, tokenAmount);
    expect(await ticketsFacetPolygon.balanceOf(minter, tokenId)).to.equal(
      tokenAmount
    );

    await ticketsFacetPolygon.setApprovalForAll(
      bridgePolygonSide.address,
      true
    );
    await bridgePolygonSide.sendFrom(
      minter,
      chainId_B,
      minter,
      tokenId,
      1,
      minter,
      ethers.constants.AddressZero,
      defaultAdapterParams,
      {
        value: (
          await bridgePolygonSide.estimateSendFee(
            chainId_B,
            minter,
            tokenId,
            1,
            false,
            defaultAdapterParams
          )
        ).nativeFee,
      }
    );
    expect(await ticketsFacetPolygon.balanceOf(minter, tokenId)).to.equal(0);
    expect(await ticketsGotchichain.balanceOf(minter, tokenId)).to.equal(1);

    //back to polygon
    await ticketsGotchichain.setApprovalForAll(
      bridgeGotchichainSide.address,
      true
    );
    await bridgeGotchichainSide.sendFrom(
      minter,
      chainId_A,
      minter,
      tokenId,
      1,
      minter,
      ethers.constants.AddressZero,
      defaultAdapterParams,
      {
        value: (
          await bridgeGotchichainSide.estimateSendFee(
            chainId_A,
            minter,
            tokenId,
            1,
            false,
            defaultAdapterParams
          )
        ).nativeFee,
      }
    );
    expect(await ticketsGotchichain.balanceOf(minter, tokenId)).to.equal(0);
    expect(await ticketsFacetPolygon.balanceOf(minter, tokenId)).to.equal(1);
  });

  it("Should mint a ticket and bridge it Gotchichain, lock it back, and bridge Poly -> Gotchi to enforce a mint and transfer on Gotchi", async () => {
    const tokenId = 1;
    const tokenAmount = 5;
    const amountToBridgeToGotchi = 2;

    await ticketsFacetPolygon.mint(tokenId, tokenAmount);

    expect(await ticketsFacetPolygon.balanceOf(minter, tokenId)).to.equal(
      tokenAmount
    );

    await ticketsFacetPolygon.setApprovalForAll(
      bridgePolygonSide.address,
      true
    );
    await bridgePolygonSide.sendFrom(
      minter,
      chainId_B,
      minter,
      tokenId,
      amountToBridgeToGotchi,
      minter,
      ethers.constants.AddressZero,
      defaultAdapterParams,
      {
        value: (
          await bridgePolygonSide.estimateSendFee(
            chainId_B,
            minter,
            tokenId,
            amountToBridgeToGotchi,
            false,
            defaultAdapterParams
          )
        ).nativeFee,
      }
    );
    expect(await ticketsFacetPolygon.balanceOf(minter, tokenId)).to.equal(
      tokenAmount - amountToBridgeToGotchi
    );
    expect(await ticketsGotchichain.balanceOf(minter, tokenId)).to.equal(
      amountToBridgeToGotchi
    );

    //back to polygon, but just one
    const amountToBridgeToPolygon = 1;
    await ticketsGotchichain.setApprovalForAll(
      bridgeGotchichainSide.address,
      true
    );
    await bridgeGotchichainSide.sendFrom(
      minter,
      chainId_A,
      minter,
      tokenId,
      amountToBridgeToPolygon,
      minter,
      ethers.constants.AddressZero,
      defaultAdapterParams,
      {
        value: (
          await bridgeGotchichainSide.estimateSendFee(
            chainId_A,
            minter,
            tokenId,
            amountToBridgeToPolygon,
            false,
            defaultAdapterParams
          )
        ).nativeFee,
      }
    );
    expect(await ticketsGotchichain.balanceOf(minter, tokenId)).to.equal(
      amountToBridgeToPolygon
    );
    expect(await ticketsFacetPolygon.balanceOf(minter, tokenId)).to.equal(4);

    // bridge from Polygon, to make Gotchi mint and transfer
    const amountToBridgeToGotchiFinal = 3;
    await bridgePolygonSide.sendFrom(
      minter,
      chainId_B,
      minter,
      tokenId,
      amountToBridgeToGotchiFinal,
      minter,
      ethers.constants.AddressZero,
      defaultAdapterParams,
      {
        value: (
          await bridgePolygonSide.estimateSendFee(
            chainId_B,
            minter,
            tokenId,
            amountToBridgeToGotchiFinal,
            false,
            defaultAdapterParams
          )
        ).nativeFee,
      }
    );
    expect(await ticketsGotchichain.balanceOf(minter, tokenId)).to.equal(4);
    expect(
      await ticketsGotchichain.balanceOf(bridgeGotchichainSide.address, tokenId)
    ).to.equal(0);
  });

  it("Only owner can set layerzero bridge", async () => {
    const accounts = await ethers.getSigners();
    const bob = accounts[1];
    await expect(
      ticketsGotchichain.connect(bob).setLayerZeroBridge(bob.address)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });
});
