// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import {ILendingPool} from "../dep/protocol-v2/contracts/interfaces/ILendingPool.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Detailed} from "../dep/protocol-v2/contracts/dependencies/openzeppelin/contracts/IERC20Detailed.sol";
import {IAToken} from "../dep/protocol-v2/contracts/interfaces/IAToken.sol";
import {IStaticATokenLM} from "../dep/protocol-v2/contracts/interfaces/IStaticATokenLM.sol";
import {IAaveIncentivesController} from "../dep/protocol-v2/contracts/interfaces/IAaveIncentivesController.sol";
import {IRewardsController} from "./interfaces/IRewardsController.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {StaticATokenErrors} from "../dep/protocol-v2/contracts/StaticATokenErrors.sol";

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import {WadRayMath} from "../dep/protocol-v2/contracts/WadRayMath.sol";
import {RayMathNoRounding} from "../dep/protocol-v2/contracts/RayMathNoRounding.sol";
import {SafeMath} from "@openzeppelin/contracts/math/SafeMath.sol";

/**
 * @title StaticATokenLM
 * @notice Wrapper token that allows to deposit tokens on the Aave protocol and receive
 * a token which balance doesn't increase automatically, but uses an ever-increasing exchange rate.
 * The token support claiming liquidity mining rewards from the Aave system.
 * @author Aave
 **/
contract StaticATokenLM is Ownable, ERC20("Wrapped amGHST", "wamGHST") {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;
    using WadRayMath for uint256;
    using RayMathNoRounding for uint256;

    ILendingPool public LENDING_POOL;
    IRewardsController public REWARDS_CONTROLLER;
    IERC20 immutable ATOKEN;
    IERC20 public ASSET;

    mapping(address => uint256) public _nonces;

    bytes32 public constant PERMIT_TYPEHASH = keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");
    bytes public constant EIP712_REVISION = bytes("1");
    bytes32 public immutable DOMAIN_SEPARATOR;

    address public maticTreasury = 0xb208f8BB431f580CC4b216826AFfB128cd1431aB;
    event Initialized(address indexed pool, address aToken, string staticATokenName, string staticATokenSymbol);


    constructor(
        ILendingPool pool,
        address aToken,
        address _owner
    ) public {
        transferOwnership(_owner);
        LENDING_POOL = pool;
        ATOKEN = IERC20(aToken);
        _setupDecimals(IERC20Detailed(aToken).decimals());
        ASSET = IERC20(IAToken(aToken).UNDERLYING_ASSET_ADDRESS());
        ASSET.safeApprove(address(pool), type(uint256).max);

        try IAToken(aToken).getIncentivesController() returns (IAaveIncentivesController incentivesController) {
            REWARDS_CONTROLLER = IRewardsController(address(incentivesController));
        } catch {}
        DOMAIN_SEPARATOR = getDomainSeparator();
        emit Initialized(address(pool), aToken, "Wrapped amGHST", "wamGHST");
    }

    function changeMaticTreasury(address _newTreasuryAddress) external onlyOwner {
        maticTreasury = _newTreasuryAddress;
    }

    function getDomainSeparator() internal view returns (bytes32) {
        uint256 chainId;
        assembly {
            chainId := chainid()
        }
        keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes(name())),
                keccak256(bytes(EIP712_REVISION)),
                chainId,
                address(this)
            )
        );
    }

    function deposit(
        address recipient,
        uint256 amount,
        uint16 referralCode,
        bool fromUnderlying
    ) external {
        return _deposit(msg.sender, recipient, amount, referralCode, fromUnderlying);
    }

    function _deposit(
        address depositor,
        address recipient,
        uint256 amount,
        uint16 referralCode,
        bool fromUnderlying
    ) internal {
        require(recipient != address(0), StaticATokenErrors.INVALID_RECIPIENT);

        if (fromUnderlying) {
            ASSET.safeTransferFrom(depositor, address(this), amount);
            LENDING_POOL.deposit(address(ASSET), amount, address(this), referralCode);
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
        require(recipient != address(0), StaticATokenErrors.INVALID_RECIPIENT);
        require(staticAmount == 0 || dynamicAmount == 0, StaticATokenErrors.ONLY_ONE_AMOUNT_FORMAT_ALLOWED);

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

    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        require(owner != address(0), StaticATokenErrors.INVALID_OWNER);
        //solium-disable-next-line
        require(block.timestamp <= deadline, StaticATokenErrors.INVALID_EXPIRATION);
        uint256 currentValidNonce = _nonces[owner];
        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, keccak256(abi.encode(PERMIT_TYPEHASH, owner, spender, value, currentValidNonce, deadline)))
        );
        require(owner == ecrecover(digest, v, r, s), StaticATokenErrors.INVALID_SIGNATURE);
        _nonces[owner] = currentValidNonce.add(1);
        _approve(owner, spender, value);
    }

    /** @notice Claims all reward tokens accrued by the aTokens in this contract to the treasury. */
    function claimRewardTokensToTreasury() external {
        address[] memory asset;
        asset[0] = address(ASSET);
        REWARDS_CONTROLLER.claimAllRewards(asset, maticTreasury);
    }

    /** @notice Transfers any tokens besides the underlying 
      * owned by this contract to the treasury. */ 
    function rescueTokens(
        address token,
        uint256 amount
    ) external {
        require(token != address(ASSET), "Cannot rescue underlying");
        IERC20(token).safeTransfer(maticTreasury, amount);
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

}
