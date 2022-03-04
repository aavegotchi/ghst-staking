pragma solidity 0.6.12;

import {IStaticATokenLM} from "./aave/protocol-v2/contracts/interfaces/IStaticATokenLM.sol";
import {ILendingPool} from "./aave/protocol-v2/contracts/interfaces/ILendingPool.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IStakingFacet} from "./interfaces/IStakingFacet.sol";

contract StaticAmGHSTRouter {
    ILendingPool public aaveLendingPool = ILendingPool(0x8dFf5E27EA6b7AC08EbFdf9eB090F32ee9a30fcf);
    address constant stakingDiamond = 0xA02d547512Bb90002807499F05495Fe9C4C3943f;
    IERC20 GHST = IERC20(0x385Eeac5cB85A38A9a07A70c73e0a3271CfB54A7);
    address constant amGHST = 0x080b5BF8f360F624628E0fb961F4e67c9e3c7CF1;
    address public wamGHSTPool;
    uint256 constant MAX_UINT = type(uint256).max;

    constructor(address _wamGhstPoolAddress) public {
        wamGHSTPool = _wamGhstPoolAddress;

        //approve lendingpool to spend GHST
        GHST.approve(address(aaveLendingPool), MAX_UINT);

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
            require(GHST.transferFrom(msg.sender, address(this), _amount));
            //convert to amGHST
            aaveLendingPool.deposit(address(GHST), _amount, address(this), 0);
        } else {
            //transfer user amGHST
            require(IERC20(amGHST).transferFrom(msg.sender, address(this), _amount));
        }

        //convert to wamGHST
        uint256 deposited = IStaticATokenLM(wamGHSTPool).deposit(_to, _amount, 0, false);

        //convert to stkWAmGhst on behalf of _to
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

        //Convert back to GHST
        if (_toUnderlying) {
            //convert wamGHST back to amGHST
            (, toWithdraw) = IStaticATokenLM(wamGHSTPool).withdraw(msg.sender, address(this), _amount, false);
            //convert amGHST to GHST and send directly
            aaveLendingPool.withdraw(address(GHST), toWithdraw, _to);
        } else {
            //withdraw amGHST and send back
            IStaticATokenLM(wamGHSTPool).withdraw(_to, _to, _amount, false);
        }
    }
}
