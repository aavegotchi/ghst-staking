/* global task usePlugin ethers */

const local = require('./.local.config.js')

usePlugin('@nomiclabs/buidler-waffle')
usePlugin('buidler-gas-reporter')
usePlugin('@nomiclabs/buidler-etherscan')

// This is a sample Buidler task. To learn how to create your own go to
// https://buidler.dev/guides/create-task.html
task('accounts', 'Prints the list of accounts', async () => {
  const accounts = await ethers.getSigners()

  for (const account of accounts) {
    console.log(await account.getAddress())
  }
})

const account = local.secret

// You have to export an object to set up your config
// This object can have the following optional entries:
// defaultNetwork, networks, solc, and paths.
// Go to https://buidler.dev/config/ to learn more
module.exports = {
  gasReporter: {
    enabled: false
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: local.etherscanApiKey
  },
  networks: {
    kovan: {
      url: local.kovanUrl,
      accounts: [account],
      gasPrice: 20000000000
    },
    mainnet: {
      url: local.mainnetUrl,
      accounts: [account],
      gasPrice: 60000000000
    }
  },
  // This is a sample solc configuration that specifies which version of solc to use
  solc: {
    version: '0.7.3',
    optimizer: {
      enabled: true,
      runs: 20000
    }
  }
}
