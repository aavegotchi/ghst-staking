// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.10;

import {IRewardsController} from "@aave/periphery-v3/contracts/rewards/interfaces/IRewardsController.sol";

import {IERC20Upgradeable as IERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {SafeERC20Upgradeable as SafeERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ERC20Upgradeable as ERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {ERC20PermitUpgradeable as ERC20Permit} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/draft-ERC20PermitUpgradeable.sol";
import {OwnableUpgradeable as Ownable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

/**
 * @title WrappedAToken
 * @notice Wrapper token that allows to deposit tokens on the Aave protocol and receive
 * a token which balance doesn't increase automatically, but uses an ever-increasing exchange rate.
 * @dev Complies with EIP-4626, but reverts on mint and withdraw. Only deposit and redeem are available.
 * @author Aavegotchi
 **/
contract WrappedAToken is 
    Initializable, 
    Ownable, 
    ERC20, 
    ERC20Permit 
{
    using SafeERC20 for IERC20;

    IRewardsController public REWARDS_CONTROLLER;
    IERC20 public ATOKEN;

    address public treasury;

    event Initialized(
        address aToken, 
        address rewardsController, 
        address treasury, 
        address owner, 
        string name, 
        string symbol
    );
    event Deposit(
        address indexed caller, 
        address indexed owner, 
        uint256 assets, 
        uint256 shares
    );
    event Withdraw(
        address indexed caller, 
        address indexed receiver, 
        address indexed owner, 
        uint256 assets, 
        uint256 shares
    );

    error InvalidOwner(address owner);
    error InvalidReceiver(address receiver);
    error InvalidRescue(address token);
    error WithdrawDisabled();
    error MintDisabled();

    /// @dev The aToken is assumed to be trusted and not need SafeERC20
    function initialize(
        address _aToken,
        address _rewardsController,
        address _treasury,
        address _owner,
        string calldata _name,
        string calldata _symbol
    ) public initializer {
        __ERC20_init_unchained(_name, _symbol);
        __ERC20Permit_init(_name);
        _transferOwnership(_owner);

        ATOKEN = IERC20(_aToken);
        REWARDS_CONTROLLER = IRewardsController(_rewardsController);
        treasury = _treasury;

        emit Initialized(_aToken, _rewardsController, _treasury, _owner, _name, _symbol);
    }

    /** @param assets Number of tokens to enter the pool with in ATokens */
    function enter(uint256 assets) external {
        deposit(assets, _msgSender());
    }

    /** @param shares Number of tokens to redeem for in wrapped tokens */
    function leave(uint256 shares) external {
        // Gas savings
        address sender = _msgSender();
        redeem(shares, sender, sender);
    }

    /** @notice Claims all reward tokens accrued by the aTokens in this contract to the treasury. */
    function claimRewardTokensToTreasury(address[] calldata assets) external {
        REWARDS_CONTROLLER.claimAllRewards(assets, treasury);
    }

    /** @notice Transfers any tokens besides the atokens
     * owned by this contract to the treasury. */
    function rescueTokens(address token, uint256 amount) external {
        if(token == address(ATOKEN)) revert InvalidRescue(token);
        IERC20(token).safeTransfer(treasury, amount);
    }

    function changeTreasury(address _treasury) external onlyOwner {
        treasury = _treasury;
    }

    function getRewardsController() external view returns (address) {
        return address(REWARDS_CONTROLLER);
    }

    /***** EIP-4626 *****/

    function deposit(uint256 assets, address receiver) public virtual returns (uint256 shares){
        if(receiver == address(0)) revert InvalidReceiver(receiver);

        address sender = _msgSender();
        shares = previewDeposit(assets);

        // Lock tokens
        ATOKEN.transferFrom(sender, address(this), assets);

        _mint(receiver, shares);
        emit Deposit(sender, receiver, assets, shares);
    }


    function redeem(uint256 shares, address receiver, address owner) public virtual returns (uint256 assets) {
        if(receiver == address(0)) revert InvalidReceiver(receiver);

        // For this simple contract, we will only allow the owner to redeem
        // so that we don't have to manage allowances
        address sender = _msgSender();
        if(owner != sender) revert InvalidOwner(owner);

        assets = previewRedeem(shares);

        _burn(owner, shares); // This suffices as a balance check for the owner

        // We still allow tokens to be sent to different receiver
        ATOKEN.transfer(receiver, assets);
        emit Withdraw(sender, receiver, owner, assets, shares);
    }

    function asset() external virtual view returns (address assetTokenAddress) {
        assetTokenAddress = address(ATOKEN);
    }

    function totalAssets() public virtual view returns (uint256 totalManagedAssets) {
        totalManagedAssets =  ATOKEN.balanceOf(address(this));
    }

    function maxDeposit(address receiver) external virtual view returns (uint256 maxAssets) {
        maxAssets = ATOKEN.balanceOf(receiver);
    }

    function previewDeposit(uint256 assets) public virtual view returns (uint256 shares) {
        shares = convertToShares(assets);
    }

    function maxRedeem(address owner) external virtual view returns (uint256 maxShares) {
        maxShares = balanceOf(owner);
    }

    function previewRedeem(uint256 shares) public virtual view returns (uint256 assets) {
        assets = convertToAssets(shares);
    }

    function convertToShares(uint256 assets) public virtual view returns (uint256 shares) {
        uint256 totalSupply_ = totalSupply();
        uint256 totalAssets_ = totalAssets();
        // If no tokens, shares are 1:1
        if(totalSupply_ == 0 || totalAssets_ == 0) shares = assets;
        else shares = assets * totalSupply_ / totalAssets_;
    }

    function convertToAssets(uint256 shares) public virtual view returns (uint256 assets) {
        uint256 totalSupply_ = totalSupply();
        uint256 totalAssets_ = totalAssets();
        // The case where nobody has a balance
        if(totalSupply_ == 0) assets = shares < totalAssets_ ? shares : totalAssets_;
        // Otherwise they get their share
        else assets = shares * totalAssets_ / totalSupply_;
    }

    /***** UNUSED EIP-4626 FUNCTIONS *****/
    /// @dev Commented out variable names to silence compiler warnings

    function mint(uint256 /*shares*/, address /*receiver*/) external virtual returns (uint256 /*assets*/) {
        revert MintDisabled();
    }

    function withdraw(uint256 /*assets*/, address /*receiver*/, address /*owner*/) external virtual returns (uint256 /*shares*/) {
        revert WithdrawDisabled();
    }

    function maxMint(address /*receiver*/) external virtual view returns (uint256 maxShares) {
        maxShares = 0;
    }

    function previewMint(uint256 /*shares*/) external virtual view returns (uint256 assets) {
        assets = 0;
    }

    function maxWithdraw(address /*owner*/) external virtual view returns (uint256 maxAssets) {
        maxAssets = 0;
    }

    function previewWithdraw(uint256 /*assets*/) external virtual view returns (uint256 shares) {
        shares = 0;
    }

}
