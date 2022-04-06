// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.13;

import {ERC20Upgradeable as ERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {OwnableUpgradeable as Ownable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {SafeERC20Upgradeable as SafeTransferLib} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {ERC4626Upgradeable as ERC4626} from "./dependencies/ERC4626Upgradeable.sol";
import {IRewardsController} from "./interfaces/IRewardsController.sol";

/**
 * @title WrappedAToken
 * @notice Wrapper token that allows to deposit tokens on the Aave protocol and receive
 * a token which balance doesn't increase automatically, but uses an ever-increasing exchange rate.
 * @dev Complies with EIP-4626, but reverts on mint and withdraw. Only deposit and redeem are available.
 * @author Aavegotchi
 **/
contract WrappedAToken is Ownable, ERC4626 {
    using SafeTransferLib for ERC20;

    IRewardsController public REWARDS_CONTROLLER;

    address public treasury;

    event Initialized(address aToken, address rewardsController, address treasury, address owner, string name, string symbol);

    error InvalidOwner(address owner);
    error InvalidReceiver(address receiver);
    error InvalidRescue(address token);

    function initialize(
        address _asset,
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

        REWARDS_CONTROLLER = IRewardsController(_rewardsController);
        treasury = _treasury;

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

    /** @notice Claims all reward tokens accrued by the aTokens in this contract to the treasury. */
    function claimRewardTokensToTreasury(address[] calldata assets) external {
        REWARDS_CONTROLLER.claimAllRewards(assets, treasury);
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
        return address(REWARDS_CONTROLLER);
    }
}
