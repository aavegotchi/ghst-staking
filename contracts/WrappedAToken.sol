// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.13;

import {ERC20Upgradeable as ERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {OwnableUpgradeable as Ownable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {SafeERC20Upgradeable as SafeTransferLib} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {ERC4626Upgradeable as ERC4626} from "./dependencies/ERC4626Upgradeable.sol";
import {IRewardsController} from "./interfaces/IRewardsController.sol";
import {ILendingPool} from "./interfaces/ILendingPool.sol";

/**
 * @title WrappedAToken
 * @notice Wrapper token that allows to deposit tokens on the Aave protocol and receive
 * a token which balance doesn't increase automatically, but uses an ever-increasing exchange rate.
 * @dev Complies with EIP-4626, but reverts on mint and withdraw. Only deposit and redeem are available.
 * @author Aavegotchi
 **/
contract WrappedAToken is Ownable, ERC4626 {
    using SafeTransferLib for ERC20;

    IRewardsController public rewardsController;
    ILendingPool public lendingPool;
    ERC20 public underlying;

    address public treasury;

    event Initialized(address aToken, address rewardsController, address treasury, address owner, string name, string symbol);

    error InvalidOwner(address owner);
    error InvalidReceiver(address receiver);
    error InvalidRescue(address token);

    function initialize(
        address _asset,
        address _underlying,
        address _lendingPool,
        address _rewardsController,
        address _treasury,
        address _owner,
        uint256 _initialSeed,
        string calldata _name,
        string calldata _symbol
    ) public initializer {
        __ERC20_init_unchained(_name, _symbol);
        __ERC20Permit_init(_name);
        __ERC4626_init_unchained(ERC20(_asset)); // Initialize the vault with the underlying asset
        _transferOwnership(_owner);

        underlying = ERC20(_underlying);
        lendingPool = ILendingPool(_lendingPool);
        rewardsController = IRewardsController(_rewardsController);
        treasury = _treasury;

        // Should not approve if underlying is the asset
        if (_underlying != address(0) && _underlying != _asset) {
            underlying.safeApprove(address(lendingPool), type(uint256).max);
        }

        // Sacrifice an initial seed of shares to ensure a healthy amount of precision in minting shares.
        // Set to 0 at your own risk.
        // Caller must have approved the asset to this contract's address.
        // See: https://github.com/Rari-Capital/solmate/issues/178
        if (_initialSeed > 0) {
            deposit(_initialSeed, 0x000000000000000000000000000000000000dEaD);
        }

        emit Initialized(_asset, _rewardsController, _treasury, _owner, _name, _symbol);
    }

    /*//////////////////////////////////////////////////////////////
                            ERC4626 OVERRIDES
    //////////////////////////////////////////////////////////////*/

    function totalAssets() public view virtual override returns (uint256) {
        return asset.balanceOf(address(this));
    }

    /*//////////////////////////////////////////////////////////////
                        CONTRACT SPECIFIC LOGIC
    //////////////////////////////////////////////////////////////*/

    /** @param assets Number of tokens to enter the pool with in ATokens */
    function enter(uint256 assets) external {
        deposit(assets, _msgSender());
    }

    /** @param shares Number of tokens to redeem for in wrapped tokens */
    function leave(uint256 shares) external {
        address sender = _msgSender(); // Gas savings
        redeem(shares, sender, sender);
    }

    /** @notice Deposits from underlying */
    function enterWithUnderlying(uint256 assets) public virtual returns (uint256 shares) {
        // Check for rounding error since we round down in previewDeposit.
        require((shares = previewDeposit(assets)) != 0, "ZERO_SHARES");

        address sender = _msgSender(); // Gas savings

        // Need to transfer before minting or ERC777s could reenter.
        underlying.safeTransferFrom(sender, address(this), assets);
        lendingPool.deposit(address(underlying), assets, address(this), 0); // asset, amount, onBehalfOf, referralCode

        _mint(sender, shares);

        emit Deposit(sender, sender, assets, shares); // caller, owner, assets, shares

        // Removing hook in this custom function just to be safe
        // afterDeposit(assets, shares);
    }

    /** @notice Withdraws to underlying */
    function leaveToUnderlying(uint256 shares) external returns (uint256 assets) {
        address sender = _msgSender(); // Gas savings

        // Check for rounding error since we round down in previewRedeem.
        require((assets = previewRedeem(shares)) != 0, "ZERO_ASSETS");

        // Removing hook in this custom function just to be safe
        // beforeWithdraw(assets, shares);

        _burn(sender, shares);

        emit Withdraw(sender, sender, sender, assets, shares); // caller, receiver, owner, amount, shares

        lendingPool.withdraw(address(underlying), assets, sender); // Withdraw to sender
    }

    /** @notice Claims all reward tokens accrued by the aTokens in this contract to the treasury. */
    function claimRewardTokensToTreasury(address[] calldata assets) external {
        rewardsController.claimAllRewards(assets, treasury);
    }

    /** @notice Transfers any tokens besides the asset to the treasury. */
    function rescueTokens(address token, uint256 amount) external {
        if (token == address(asset)) revert InvalidRescue(token);
        ERC20(token).safeTransfer(treasury, amount);
    }

    function changeTreasury(address _treasury) external onlyOwner {
        treasury = _treasury;
    }

    function getRewardsController() external view returns (address) {
        return address(rewardsController);
    }
}
