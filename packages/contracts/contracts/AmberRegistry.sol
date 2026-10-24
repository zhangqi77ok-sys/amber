// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";

/**
 * @title AmberRegistry
 * @dev 灵珀（AmberMind）主权记忆确权与 Git-DAG 增量版本管理合约
 * 
 * 核心特性：
 * 1. Git-DAG 树状增量提交：支持 parentHash 连续性检查，防并发冲突与伪造历史
 * 2. 多主题分支（Topic Shards）：用户可按 coding/finance/diary 等独立分支管理记忆
 * 3. UUPS 可升级与 Pausable 紧急熔断控制
 * 4. 链上只存 32 字节哈希根与 Arweave 指针，Gas 消耗极低且恒定
 */
contract AmberRegistry is
    Initializable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    UUPSUpgradeable
{
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    struct MemoryRecord {
        bytes32 rootHash;        // 当前提交的 Merkle Root / State Hash
        bytes32 parentHash;      // 上一个版本的父哈希（用于版本连续性审计）
        string arweaveTxId;      // 存储在 Arweave/Irys 上的加密增量包指针
        uint256 blockTimestamp;  // 上链区块时间戳
        uint256 versionIndex;    // 递增版本号（从 1 开始）
    }

    // 用户地址 => 主题分支 (keccak256(branchName)) => 最新状态记录
    mapping(address => mapping(bytes32 => MemoryRecord)) private _branchLatest;

    // 用户地址 => 主题分支 => 完整提交历史链
    mapping(address => mapping(bytes32 => MemoryRecord[])) private _branchHistory;

    // 事件定义
    event MemoryCommitted(
        address indexed user,
        bytes32 indexed branch,
        bytes32 indexed rootHash,
        bytes32 parentHash,
        string arweaveTxId,
        uint256 versionIndex,
        uint256 timestamp
    );

    event BranchReset(
        address indexed user,
        bytes32 indexed branch,
        uint256 timestamp
    );

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice 初始化合约
     * @param admin 管理员地址（拥有 DEFAULT_ADMIN_ROLE 与 UPGRADER_ROLE）
     */
    function initialize(address admin) public initializer {
        require(admin != address(0), "Invalid admin address");
        __AccessControl_init();
        __Pausable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
        _grantRole(OPERATOR_ROLE, admin);
    }

    /**
     * @notice 用户主动提交增量记忆（Git-DAG 增量模式）
     * @param branch 主题分支标识（如 keccak256("coding")）
     * @param parentHash 客户端记录的上一版本根哈希（首版本传 bytes32(0)）
     * @param newRootHash 本次增量合并后的最新 Merkle Root
     * @param arweaveTxId 新增加密数据在 Arweave 上的永久事务 ID
     */
    function commitDelta(
        bytes32 branch,
        bytes32 parentHash,
        bytes32 newRootHash,
        string calldata arweaveTxId
    ) external whenNotPaused {
        require(newRootHash != bytes32(0), "Empty root hash");
        require(bytes(arweaveTxId).length > 0, "Empty storage tx id");

        MemoryRecord memory current = _branchLatest[msg.sender][branch];

        // 校验父哈希一致性，防止状态漂移或并发覆盖
        if (current.versionIndex > 0) {
            require(current.rootHash == parentHash, "Parent hash mismatch: branch has evolved");
        } else {
            require(parentHash == bytes32(0), "Initial commit must have empty parent");
        }

        uint256 nextVersion = current.versionIndex + 1;
        MemoryRecord memory newRecord = MemoryRecord({
            rootHash: newRootHash,
            parentHash: parentHash,
            arweaveTxId: arweaveTxId,
            blockTimestamp: block.timestamp,
            versionIndex: nextVersion
        });

        _branchLatest[msg.sender][branch] = newRecord;
        _branchHistory[msg.sender][branch].push(newRecord);

        emit MemoryCommitted(
            msg.sender,
            branch,
            newRootHash,
            parentHash,
            arweaveTxId,
            nextVersion,
            block.timestamp
        );
    }

    /**
     * @notice 获取指定用户某分支的最新状态
     */
    function getBranchState(address user, bytes32 branch)
        external
        view
        returns (MemoryRecord memory)
    {
        return _branchLatest[user][branch];
    }

    /**
     * @notice 获取指定用户某分支的当前版本号
     */
    function getBranchVersion(address user, bytes32 branch)
        external
        view
        returns (uint256)
    {
        return _branchLatest[user][branch].versionIndex;
    }

    /**
     * @notice 获取指定用户某分支的完整提交历史
     */
    function getBranchHistory(address user, bytes32 branch)
        external
        view
        returns (MemoryRecord[] memory)
    {
        return _branchHistory[user][branch];
    }

    /**
     * @notice 获取指定用户某分支历史提交总数
     */
    function getBranchHistoryLength(address user, bytes32 branch)
        external
        view
        returns (uint256)
    {
        return _branchHistory[user][branch].length;
    }

    /**
     * @notice 紧急熔断：暂停所有写入操作
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @notice 解除紧急熔断
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @dev 授权升级校验
     */
    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(UPGRADER_ROLE)
    {}
}
