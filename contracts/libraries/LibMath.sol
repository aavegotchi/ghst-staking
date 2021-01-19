// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

// Author: Nick Mudge

library LibMath {
    uint256 internal constant P27 = 1e27;
    uint256 internal constant HALF_P27 = P27 / 2;

    // 27 decimal percision multiplication
    /**
     * @dev Multiplies two 27 decimal percision values, rounding half up to the nearest decimal
     * @param a 27 decimal percision value
     * @param b 27 decimal percision value
     * @return The result of a*b, in 27 decimal percision value
     **/
    function p27Mul(uint256 a, uint256 b) internal pure returns (uint256) {
        uint256 c = a * b;
        if (c == 0) {
            return 0;
        }
        require(b == c / a, "p27 multiplication overflow");
        c += HALF_P27;
        require(c >= HALF_P27, "p27 multiplication addition overflow");
        return c / P27;
    }
}
