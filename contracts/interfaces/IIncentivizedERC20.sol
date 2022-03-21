// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.10;

import {IAaveIncentivesController} from "@aave/core-v3/contracts/interfaces/IAaveIncentivesController.sol";

interface IIncentivizedERC20 {
  function getIncentivesController() external returns (IAaveIncentivesController);
}