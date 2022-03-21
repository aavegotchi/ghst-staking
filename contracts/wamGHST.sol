// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.10;

import {IPool} from "@aave/core-v3/contracts/interfaces/IPool.sol";
import {IAToken} from "@aave/core-v3/contracts/interfaces/IAToken.sol";
import {IAaveIncentivesController} from "@aave/core-v3/contracts/interfaces/IAaveIncentivesController.sol";
import {WadRayMath} from "@aave/core-v3/contracts/protocol/libraries/math/WadRayMath.sol";

import {IRewardsController} from "@aave/periphery-v3/contracts/rewards/interfaces/IRewardsController.sol";

import {IERC20Upgradeable as IERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {IERC20MetadataUpgradeable as IERC20Detailed} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";
import {SafeERC20Upgradeable as SafeERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ERC20Upgradeable as ERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {ERC20PermitUpgradeable as ERC20Permit} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/draft-ERC20PermitUpgradeable.sol";
import {OwnableUpgradeable as Ownable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import {IIncentivizedERC20} from "./interfaces/IIncentivizedERC20.sol";

/**
 * @title StaticATokenLM
 * @notice Wrapper token that allows to deposit tokens on the Aave protocol and receive
 * a token which balance doesn't increase automatically, but uses an ever-increasing exchange rate.
 * The token support claiming liquidity mining rewards from the Aave system.
 * @author Aavegotchi, building on top of Aave's StaticATokenLM
 **/
contract StaticATokenLM is 
    Initializable, 
    Ownable, 
    ERC20, 
    ERC20Permit 
{
    using SafeERC20 for IERC20;
    using WadRayMath for uint256;

    IPool public LENDING_POOL;
    IRewardsController public REWARDS_CONTROLLER;
    IERC20 public ATOKEN;
    IERC20 public ASSET;

    address public daoTreasury = 0xb208f8BB431f580CC4b216826AFfB128cd1431aB;
    event Initialized(address indexed pool, address aToken, string staticATokenName, string staticATokenSymbol);

    error InvalidRecipient(address recipient);
    error InvalidOwner(address owner);
    error InvalidSignature(bytes signature);
    error InvalidExpiration(uint256 expiration);
    error InvalidDecimals(uint8 decimals);
    error OnlyOneAmountFormatAllowed();
    error CannotRescueUnderlying(address token);

    function initialize(
        IPool pool,
        address aToken,
        address _owner
    ) public initializer {
        __ERC20_init_unchained("Wrapped Aave Polygon GHST", "WaPolGHST");
        __ERC20Permit_init("Wrapped Aave Polygon GHST");
        _transferOwnership(_owner);

        // validate aToken decimals
        if(IERC20Detailed(aToken).decimals() != 18) {
            revert InvalidDecimals(IERC20Detailed(aToken).decimals());
        }
        LENDING_POOL = pool;
        ATOKEN = IERC20(aToken);
        ASSET = IERC20(IAToken(aToken).UNDERLYING_ASSET_ADDRESS());
        ASSET.safeApprove(address(pool), type(uint256).max);

        // The aToken interface returns an incentives controller, but this actually leads to the rewards controller
        try IIncentivizedERC20(aToken).getIncentivesController() returns (IAaveIncentivesController incentivesController) {
            REWARDS_CONTROLLER = IRewardsController(address(incentivesController));
        } catch {}

        emit Initialized(address(pool), aToken, "Wrapped Aave Polygon GHST", "WaPolGHST");
    }

    function changeDaoTreasury(address _newTreasuryAddress) external onlyOwner {
        daoTreasury = _newTreasuryAddress;
    }

    function supply(
        address recipient,
        uint256 amount,
        uint16 referralCode,
        bool fromUnderlying
    ) external {
        return _supply(msg.sender, recipient, amount, referralCode, fromUnderlying);
    }

    function _supply(
        address depositor,
        address recipient,
        uint256 amount,
        uint16 referralCode,
        bool fromUnderlying
    ) internal {
        if(recipient == address(0)) revert InvalidRecipient(recipient);

        if (fromUnderlying) {
            ASSET.safeTransferFrom(depositor, address(this), amount);
            LENDING_POOL.supply(address(ASSET), amount, address(this), referralCode);
        } else {
            ATOKEN.safeTransferFrom(depositor, address(this), amount);
        }
        uint256 amountToMint = _dynamicToStaticAmount(amount, rate());
        _mint(recipient, amountToMint);
    }

    function withdraw(
        address recipient,
        uint256 amount,
        bool toUnderlying
    ) external {
        _withdraw(msg.sender, recipient, amount, 0, toUnderlying);
    }

    function _withdraw(
        address owner,
        address recipient,
        uint256 staticAmount,
        uint256 dynamicAmount,
        bool toUnderlying
    ) internal {
        if(recipient == address(0)) revert InvalidRecipient(recipient);
        if(staticAmount != 0 && dynamicAmount != 0) revert OnlyOneAmountFormatAllowed();

        uint256 userBalance = balanceOf(owner);

        uint256 amountToWithdraw;
        uint256 amountToBurn;

        uint256 currentRate = rate();
        if (staticAmount > 0) {
            amountToBurn = (staticAmount > userBalance) ? userBalance : staticAmount;
            amountToWithdraw = _staticToDynamicAmount(amountToBurn, currentRate);
        } else {
            uint256 dynamicUserBalance = _staticToDynamicAmount(userBalance, currentRate);
            amountToWithdraw = (dynamicAmount > dynamicUserBalance) ? dynamicUserBalance : dynamicAmount;
            amountToBurn = _dynamicToStaticAmount(amountToWithdraw, currentRate);
        }

        _burn(owner, amountToBurn);

        if (toUnderlying) {
            LENDING_POOL.withdraw(address(ASSET), amountToWithdraw, recipient);
        } else {
            ATOKEN.safeTransfer(recipient, amountToWithdraw);
        }
    }

    /** @notice Claims all reward tokens accrued by the aTokens in this contract to the treasury. */
    function claimRewardTokensToTreasury() external {
        address[] memory asset;
        asset[0] = address(ASSET);
        REWARDS_CONTROLLER.claimAllRewards(asset, daoTreasury);
    }

    /** @notice Transfers any tokens besides the underlying
     * owned by this contract to the treasury. */
    function rescueTokens(address token, uint256 amount) external {
        if(token == address(ASSET)) revert CannotRescueUnderlying(token);
        IERC20(token).safeTransfer(daoTreasury, amount);
    }

    function dynamicBalanceOf(address account) external view returns (uint256) {
        return _staticToDynamicAmount(balanceOf(account), rate());
    }

    function staticToDynamicAmount(uint256 amount) external view returns (uint256) {
        return _staticToDynamicAmount(amount, rate());
    }

    function dynamicToStaticAmount(uint256 amount) external view returns (uint256) {
        return _dynamicToStaticAmount(amount, rate());
    }

    function rate() public view returns (uint256) {
        return LENDING_POOL.getReserveNormalizedIncome(address(ASSET));
    }

    function _dynamicToStaticAmount(uint256 amount, uint256 _rate) internal pure returns (uint256) {
        return amount.rayDiv(_rate);
    }

    function _staticToDynamicAmount(uint256 amount, uint256 _rate) internal pure returns (uint256) {
        return amount.rayMul(_rate);
    }

    function getRewardsController() external view returns (IRewardsController) {
        return REWARDS_CONTROLLER;
    }

    function UNDERLYING_ASSET_ADDRESS() external view returns (address) {
        return address(ASSET);
    }

    // Renamed function to maintain backwards compatibility for anyone expecting a deposit function
    function deposit(
        address recipient,
        uint256 amount,
        uint16 referralCode,
        bool fromUnderlying
    ) external {
        return _supply(msg.sender, recipient, amount, referralCode, fromUnderlying);
    }
}
