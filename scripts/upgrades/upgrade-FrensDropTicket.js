/* global ethers hre */
/* eslint prefer-const: "off" */

const { LedgerSigner } = require('@ethersproject/hardware-wallets')
const { sendToMultisig } = require('../libraries/multisig/multisig.js')

const getSelectors = (contract) => {
  const signatures = Object.keys(contract.interface.functions)
  const selectors = signatures.reduce((acc, val) => {
    if (val !== 'init(bytes)') {
      acc.push(contract.interface.getSighash(val))
    }
    return acc
  }, [])
  return selectors
}

const getSelector = (func) => {
  const abiInterface = new ethers.utils.Interface([func])
  return abiInterface.getSighash(ethers.utils.Fragment.from(func))
}

async function main () {
// TODO: get new functions and function upgrades from ghst staking contract
}

exports.dropTicketScript = main;
