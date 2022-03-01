pragma solidity 0.6.12;

import {IStaticATokenLM} from "./aave/protocol-v2/contracts/interfaces/IStaticATokenLM.sol";
import {ILendingPool} from "./aave/protocol-v2/contracts/interfaces/ILendingPool.sol";
import {IERC20} from "./aave/protocol-v2/contracts/dependencies/openzeppelin/contracts/IERC20.sol";
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

    function wrapAndDeposit(uint256 _amount, address _to) external {
        //transfer user ghst
        require(GHST.transferFrom(msg.sender, address(this), _amount));

        //convert to amGHST
        aaveLendingPool.deposit(address(GHST), _amount, address(this), 0);

        //convert to wamGHST
        //fromUnderlying can be true..in this case tx.origin can convert directly from ghst to stkWAmGhst without converting to amGHST first
        uint256 deposited = IStaticATokenLM(wamGHSTPool).deposit(_to, _amount, 0, false);

        //convert to stkWAmGhst on behalf of tx.origin
        //trusting LibMeta.msgSender() to use tx.origin instead of msg.sender
        IStakingFacet(stakingDiamond).stakeIntoPoolForUser(wamGHSTPool, deposited, _to);
    }

    function unwrapAndWithdraw(uint256 _amount, address _to) external {
        //get user wamGhst by burning stkWamGhst
        IStakingFacet(stakingDiamond).withdrawFromPoolForUser(wamGHSTPool, _amount, _to);

        //convert wamGhst back to amGHST
        //fromUnderlying can be true..in this case tx.origin can convert directly from stkwamGhst to GHST without converting to amGHST first
        (, uint256 toWithdraw) = IStaticATokenLM(wamGHSTPool).withdraw(msg.sender, address(this), _amount, false);

        //convert  back to ghst and send directly
        aaveLendingPool.withdraw(address(GHST), toWithdraw, _to);
    }
}
