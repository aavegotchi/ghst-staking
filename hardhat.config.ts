/* global task ethers */

import "@typechain/hardhat";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-truffle5";
import "@nomiclabs/hardhat-etherscan";
require("hardhat-contract-sizer");
require("dotenv").config();
require("solidity-coverage");
// require('./tasks/generateDiamondABI.js')
require("./tasks/verifyFacet");
require("./tasks/deployReceiptToken");
require("./tasks/updateRates");

// You have to export an object to set up your config
// This object can have the following optional entries:
// defaultNetwork, networks, solc, and paths.
// Go to https://buidler.dev/config/ to learn more
module.exports = {
  mocha: {
    timeout: 100000000,
  },
  etherscan: {
    apiKey: process.env.POLYGON_API_KEY,
  },
  networks: {
    hardhat: {
      forking: {
        url: process.env.MATIC_URL,
        timeout: 8000000,
      },
      blockGasLimit: 20000000,
      timeout: 120000,
      gas: "auto",
    },
    localhost: {
      timeout: 8000000,
    },
    matic: {
      url: process.env.MATIC_URL,
      accounts: [process.env.SECRET],
      blockGasLimit: 200000000000,
      gasPrice: 10000000000,
      timeout: 90000,
    },
  },
  gasReporter: {
    currency: "USD",
    gasPrice: 100,
    enabled: false,
  },
  contractSizer: {
    alphaSort: false,
    runOnCompile: false,
    disambiguatePaths: true,
  },
  // This is a sample solc configuration that specifies which version of solc to use
  solidity: {
    compilers: [
      {
        version: "0.7.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
};
