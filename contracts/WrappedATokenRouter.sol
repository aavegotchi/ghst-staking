// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import {WrappedAToken} from "./WrappedAToken.sol";
import {ILendingPool} from "./interfaces/ILendingPool.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC4626} from "./interfaces/IERC4626.sol";
import {IStakingFacet} from "./interfaces/IStakingFacet.sol";

contract WrappedATokenRouter {
    address public aaveLendingPool;
    address public stakingDiamond;
    address public GHST;
    address public amGHST;
    address public wamGHSTPool;
    uint256 constant MAX_UINT = type(uint256).max;

    constructor(
        address _wamGhstPoolAddress,
        address _lendingPool,
        address _stakingDiamond,
        address _ghst,
        address _amGhst
    ) {
        wamGHSTPool = _wamGhstPoolAddress;
        aaveLendingPool = _lendingPool;
        stakingDiamond = _stakingDiamond;
        GHST = _ghst;
        amGHST = _amGhst;

        //approve lendingpool to spend GHST
        IERC20(GHST).approve(aaveLendingPool, MAX_UINT);

        //approve static wrapper contract to spend amGHST
        IERC20(amGHST).approve(wamGHSTPool, MAX_UINT);

        //approve stk diamond to spend wAmGhst
        IERC20(wamGHSTPool).approve(stakingDiamond, MAX_UINT);
    }

    ///@notice Allow an address to wrap GHST and automatically deposit resulting wamGHST in the pool
    ///@notice user can either provide GHST or amGHST directly
    ///@param _amount Amount of incoming tokens, either GHST or wamGHST
    ///@param _to Address to stake for
    ///@param _underlying true if GHST is provided, false if amGHST is provided
    function wrapAndDeposit(
        uint256 _amount,
        address _to,
        bool _underlying
    ) external {
        if (_underlying) {
            //transfer user GHST
            require(IERC20(GHST).transferFrom(msg.sender, address(this), _amount));
            //convert to amGHST
            ILendingPool(aaveLendingPool).deposit(GHST, _amount, address(this), 0);
        } else {
            //transfer user amGHST
            require(IERC20(amGHST).transferFrom(msg.sender, address(this), _amount));
        }

        //convert to wamGHST and send to _to
        uint256 deposited = IERC4626(wamGHSTPool).deposit(_amount, _to); //assets, receiver of shares, returns shares received

        //convert to stkWAmGhst on behalf of address(this)
        IStakingFacet(stakingDiamond).stakeIntoPoolForUser(wamGHSTPool, deposited, _to);
    }

    ///@notice Allow an address to withdraw stkwamGHST from the staking pool
    ///@notice user can either unwrap to amGHST or GHST directly
    ///@param _amount Amount of tokens to unstake
    ///@param _to Address to unstake for
    ///@param _toUnderlying true if amGHST should be converted to GHST before sending back, false if amGHST should be sent back directly
    function unwrapAndWithdraw(
        uint256 _amount,
        address _to,
        bool _toUnderlying
    ) external {
        uint256 toWithdraw;
        //get user wamGHST by burning stkWamGHST
        IStakingFacet(stakingDiamond).withdrawFromPoolForUser(wamGHSTPool, _amount, _to);
        //transfer shares to contract
        require(IERC20(wamGHSTPool).transferFrom(_to, address(this), _amount));
        //Convert back to GHST
        if (_toUnderlying) {
            //convert wamGHST back to amGHST
            toWithdraw = IERC4626(wamGHSTPool).withdraw(_amount, address(this), address(this)); // assets, receiver of assets, owner of shares
            //convert amGHST to GHST and send directly
            ILendingPool(aaveLendingPool).withdraw(GHST, toWithdraw, _to);
        } else {
            //withdraw amGHST and send back
            IERC4626(wamGHSTPool).withdraw(_amount, _to, address(this));
        }
    }
}
