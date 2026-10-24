// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../AmberRegistry.sol";

/**
 * @title AmberRegistryV2Mock
 * @dev 用于测试 UUPS 平滑升级的 Mock 合约，增加新状态和新逻辑
 */
contract AmberRegistryV2Mock is AmberRegistry {
    string public constant VERSION = "v2.0.0";

    // V2 新增测试方法
    function isV2() external pure returns (bool) {
        return true;
    }
}
