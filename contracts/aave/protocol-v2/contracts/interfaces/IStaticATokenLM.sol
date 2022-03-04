// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ILendingPool} from "./ILendingPool.sol";
import {IAaveIncentivesController} from "./IAaveIncentivesController.sol";

interface IStaticATokenLM is IERC20 {
    /**
     * @dev Emitted when a StaticATokenLM is initialized
     * @param pool The address of the lending pool where the underlying aToken is used
     * @param aToken The address of the underlying aToken (aWETH)
     * @param staticATokenName The name of the Static aToken
     * @param staticATokenSymbol The symbol of the Static aToken
     **/
    event Initialized(address indexed pool, address aToken, string staticATokenName, string staticATokenSymbol);

    /**
     * @notice Deposits `ASSET` in the Aave protocol and mints static aTokens to msg.sender
     * @param recipient The address that will receive the static aTokens
     * @param amount The amount of underlying `ASSET` to deposit (e.g. deposit of 100 USDC)
     * @param referralCode Code used to register the integrator originating the operation, for potential rewards.
     *   0 if the action is executed directly by the user, without any middle-man
     * @param fromUnderlying bool
     * - `true` if the msg.sender comes with underlying tokens (e.g. USDC)
     * - `false` if the msg.sender comes already with aTokens (e.g. aUSDC)
     * @return uint256 The amount of StaticAToken minted, static balance
     **/
    function deposit(
        address recipient,
        uint256 amount,
        uint16 referralCode,
        bool fromUnderlying
    ) external returns (uint256);

    /**
     * @notice Burns `amount` of static aToken, with recipient receiving the corresponding amount of `ASSET`
     * @param recipient The address that will receive the amount of `ASSET` withdrawn from the Aave protocol
     * @param amount The amount to withdraw, in static balance of StaticAToken
     * @param toUnderlying bool
     * - `true` for the recipient to get underlying tokens (e.g. USDC)
     * - `false` for the recipient to get aTokens (e.g. aUSDC)
     * @return amountToBurn: StaticATokens burnt, static balance
     * @return amountToWithdraw: underlying/aToken send to `recipient`, dynamic balance
     **/
    function withdraw(
        address from,
        address recipient,
        uint256 amount,
        bool toUnderlying
    ) external returns (uint256, uint256);

    /**
     * @notice Burns `amount` of static aToken, with recipient receiving the corresponding amount of `ASSET`
     * @param recipient The address that will receive the amount of `ASSET` withdrawn from the Aave protocol
     * @param amount The amount to withdraw, in dynamic balance of aToken/underlying asset
     * @param toUnderlying bool
     * - `true` for the recipient to get underlying tokens (e.g. USDC)
     * - `false` for the recipient to get aTokens (e.g. aUSDC)
     * @return amountToBurn: StaticATokens burnt, static balance
     * @return amountToWithdraw: underlying/aToken send to `recipient`, dynamic balance
     **/
    function withdrawDynamicAmount(
        address recipient,
        uint256 amount,
        bool toUnderlying
    ) external returns (uint256, uint256);

    /**
     * @notice Utility method to get the current aToken balance of an user, from his staticAToken balance
     * @param account The address of the user
     * @return uint256 The aToken balance
     **/
    function dynamicBalanceOf(address account) external view returns (uint256);

    /**
     * @notice Converts a static amount (scaled balance on aToken) to the aToken/underlying value,
     * using the current liquidity index on Aave
     * @param amount The amount to convert from
     * @return uint256 The dynamic amount
     **/
    function staticToDynamicAmount(uint256 amount) external view returns (uint256);

    /**
     * @notice Converts an aToken or underlying amount to the what it is denominated on the aToken as
     * scaled balance, function of the principal and the liquidity index
     * @param amount The amount to convert from
     * @return uint256 The static (scaled) amount
     **/
    function dynamicToStaticAmount(uint256 amount) external view returns (uint256);

    /**
     * @notice Returns the Aave liquidity index of the underlying aToken, denominated rate here
     * as it can be considered as an ever-increasing exchange rate
     * @return The liquidity index
     **/
    function rate() external view returns (uint256);

    /**
     * @notice Claims rewards from `INCENTIVES_CONTROLLER` and updates internal accounting of rewards.
     */
    function collectAndUpdateRewards() external;

    /**
     * @notice Claim rewards on behalf of a user and send them to a receiver
     * @dev Only callable by if sender is onBehalfOf or sender is approved claimer
     * @param onBehalfOf The address to claim on behalf of
     * @param receiver The address to receive the rewards
     * @param forceUpdate Flag to retrieve latest rewards from `INCENTIVES_CONTROLLER`
     */
    function claimRewardsOnBehalf(
        address onBehalfOf,
        address receiver,
        bool forceUpdate
    ) external;

    /**
     * @notice Claim rewards and send them to a receiver
     * @param receiver The address to receive the rewards
     * @param forceUpdate Flag to retrieve latest rewards from `INCENTIVES_CONTROLLER`
     */
    function claimRewards(address receiver, bool forceUpdate) external;

    /**
     * @notice Claim rewards
     * @param forceUpdate Flag to retrieve latest rewards from `INCENTIVES_CONTROLLER`
     */
    function claimRewardsToSelf(bool forceUpdate) external;

    /**
     * @notice Get the total claimable rewards of the contract.
     * @return The current balance + pending rewards from the `_incentivesController`
     */
    function getTotalClaimableRewards() external view returns (uint256);

    /**
     * @notice Get the total claimable rewards for a user in WAD
     * @param user The address of the user
     * @return The claimable amount of rewards in WAD
     */
    function getClaimableRewards(address user) external view returns (uint256);

    /**
     * @notice The unclaimed rewards for a user in WAD
     * @param user The address of the user
     * @return The unclaimed amount of rewards in WAD
     */
    function getUnclaimedRewards(address user) external view returns (uint256);

    function getAccRewardsPerToken() external view returns (uint256);

    function getLifetimeRewardsClaimed() external view returns (uint256);

    function getLifetimeRewards() external view returns (uint256);

    function getLastRewardBlock() external view returns (uint256);

    function LENDING_POOL() external view returns (ILendingPool);

    function INCENTIVES_CONTROLLER() external view returns (IAaveIncentivesController);

    function ATOKEN() external view returns (IERC20);

    function ASSET() external view returns (IERC20);

    function REWARD_TOKEN() external view returns (IERC20);

    function UNDERLYING_ASSET_ADDRESS() external view returns (address);

    function getIncentivesController() external view returns (IAaveIncentivesController);
}
