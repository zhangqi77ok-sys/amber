const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("AmberRegistry (灵珀记忆确权合约测试)", function () {
  let AmberRegistry;
  let amberRegistry;
  let admin, alice, bob;

  // 模拟两个独立的主题分支
  const CODING_BRANCH = ethers.keccak256(ethers.toUtf8Bytes("coding"));
  const FINANCE_BRANCH = ethers.keccak256(ethers.toUtf8Bytes("finance"));

  // 模拟初始哈希与增量哈希
  const HASH_ZERO = ethers.ZeroHash;
  const HASH_V1 = ethers.keccak256(ethers.toUtf8Bytes("content_v1"));
  const HASH_V2 = ethers.keccak256(ethers.toUtf8Bytes("content_v2"));
  const HASH_V3 = ethers.keccak256(ethers.toUtf8Bytes("content_v3"));

  const ARWEAVE_TX_1 = "ar://tx_hash_chunk_001";
  const ARWEAVE_TX_2 = "ar://tx_hash_chunk_002";

  beforeEach(async function () {
    [admin, alice, bob] = await ethers.getSigners();

    AmberRegistry = await ethers.getContractFactory("AmberRegistry");
    // 通过 UUPS 代理部署合约
    amberRegistry = await upgrades.deployProxy(AmberRegistry, [admin.address], {
      initializer: "initialize",
      kind: "uups",
    });
    await amberRegistry.waitForDeployment();
  });

  describe("1. 部署与权限初始化", function () {
    it("管理员应正确拥有 DEFAULT_ADMIN_ROLE 与 UPGRADER_ROLE", async function () {
      const DEFAULT_ADMIN_ROLE = await amberRegistry.DEFAULT_ADMIN_ROLE();
      const UPGRADER_ROLE = await amberRegistry.UPGRADER_ROLE();

      expect(await amberRegistry.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
      expect(await amberRegistry.hasRole(UPGRADER_ROLE, admin.address)).to.be.true;
      expect(await amberRegistry.hasRole(DEFAULT_ADMIN_ROLE, alice.address)).to.be.false;
    });

    it("重复调用 initialize 应被拒绝", async function () {
      await expect(amberRegistry.initialize(alice.address)).to.be.revertedWithCustomError(
        amberRegistry,
        "InvalidInitialization"
      );
    });
  });

  describe("2. Git-DAG 增量记忆提交", function () {
    it("创世提交 (V1) 成功，父哈希必须为 ZeroHash", async function () {
      await expect(
        amberRegistry.connect(alice).commitDelta(CODING_BRANCH, HASH_ZERO, HASH_V1, ARWEAVE_TX_1)
      )
        .to.emit(amberRegistry, "MemoryCommitted")
        .withArgs(alice.address, CODING_BRANCH, HASH_V1, HASH_ZERO, ARWEAVE_TX_1, 1, (t) => t > 0);

      const state = await amberRegistry.getBranchState(alice.address, CODING_BRANCH);
      expect(state.rootHash).to.equal(HASH_V1);
      expect(state.parentHash).to.equal(HASH_ZERO);
      expect(state.arweaveTxId).to.equal(ARWEAVE_TX_1);
      expect(state.versionIndex).to.equal(1n);

      expect(await amberRegistry.getBranchVersion(alice.address, CODING_BRANCH)).to.equal(1n);
    });

    it("连续增量提交 (V2) 成功，父哈希正确链接", async function () {
      // V1
      await amberRegistry.connect(alice).commitDelta(CODING_BRANCH, HASH_ZERO, HASH_V1, ARWEAVE_TX_1);

      // V2 (父哈希为 HASH_V1)
      await expect(
        amberRegistry.connect(alice).commitDelta(CODING_BRANCH, HASH_V1, HASH_V2, ARWEAVE_TX_2)
      )
        .to.emit(amberRegistry, "MemoryCommitted")
        .withArgs(alice.address, CODING_BRANCH, HASH_V2, HASH_V1, ARWEAVE_TX_2, 2, (t) => t > 0);

      const state = await amberRegistry.getBranchState(alice.address, CODING_BRANCH);
      expect(state.rootHash).to.equal(HASH_V2);
      expect(state.parentHash).to.equal(HASH_V1);
      expect(state.versionIndex).to.equal(2n);

      // 验证历史记录链
      const history = await amberRegistry.getBranchHistory(alice.address, CODING_BRANCH);
      expect(history.length).to.equal(2);
      expect(history[0].rootHash).to.equal(HASH_V1);
      expect(history[1].rootHash).to.equal(HASH_V2);
    });

    it("父哈希不匹配时应回滚，防止状态漂移与分叉覆盖", async function () {
      // V1
      await amberRegistry.connect(alice).commitDelta(CODING_BRANCH, HASH_ZERO, HASH_V1, ARWEAVE_TX_1);

      // 恶意或过期的提交（传入错误的父哈希）
      const WRONG_PARENT = ethers.keccak256(ethers.toUtf8Bytes("random_wrong_parent"));
      await expect(
        amberRegistry.connect(alice).commitDelta(CODING_BRANCH, WRONG_PARENT, HASH_V2, ARWEAVE_TX_2)
      ).to.be.revertedWith("Parent hash mismatch: branch has evolved");
    });
  });

  describe("3. 主题分片与多用户隔离 (Topic Sharding & Multi-Tenancy)", function () {
    it("同一用户的不同分支应完全独立，版本互不干扰", async function () {
      // 提交 coding 分支 V1, V2
      await amberRegistry.connect(alice).commitDelta(CODING_BRANCH, HASH_ZERO, HASH_V1, ARWEAVE_TX_1);
      await amberRegistry.connect(alice).commitDelta(CODING_BRANCH, HASH_V1, HASH_V2, ARWEAVE_TX_2);

      // 提交 finance 分支 V1
      await amberRegistry.connect(alice).commitDelta(FINANCE_BRANCH, HASH_ZERO, HASH_V3, ARWEAVE_TX_1);

      expect(await amberRegistry.getBranchVersion(alice.address, CODING_BRANCH)).to.equal(2n);
      expect(await amberRegistry.getBranchVersion(alice.address, FINANCE_BRANCH)).to.equal(1n);
    });

    it("不同用户的分支严格隔离", async function () {
      await amberRegistry.connect(alice).commitDelta(CODING_BRANCH, HASH_ZERO, HASH_V1, ARWEAVE_TX_1);
      expect(await amberRegistry.getBranchVersion(alice.address, CODING_BRANCH)).to.equal(1n);
      expect(await amberRegistry.getBranchVersion(bob.address, CODING_BRANCH)).to.equal(0n);
    });
  });

  describe("4. 紧急熔断与控制 (Pausable)", function () {
    it("非管理员无法调用 pause()", async function () {
      await expect(amberRegistry.connect(alice).pause()).to.be.revertedWithCustomError(
        amberRegistry,
        "AccessControlUnauthorizedAccount"
      );
    });

    it("管理员暂停后，所有记忆写入被阻断，解除暂停后恢复", async function () {
      await amberRegistry.connect(admin).pause();

      await expect(
        amberRegistry.connect(alice).commitDelta(CODING_BRANCH, HASH_ZERO, HASH_V1, ARWEAVE_TX_1)
      ).to.be.revertedWithCustomError(amberRegistry, "EnforcedPause");

      await amberRegistry.connect(admin).unpause();

      await expect(
        amberRegistry.connect(alice).commitDelta(CODING_BRANCH, HASH_ZERO, HASH_V1, ARWEAVE_TX_1)
      ).to.emit(amberRegistry, "MemoryCommitted");
    });
  });

  describe("5. UUPS 平滑升级验证", function () {
    it("只有具备 UPGRADER_ROLE 的管理员能升级合约，且升级后历史数据完整保留", async function () {
      // 先写入一条 V1 数据
      await amberRegistry.connect(alice).commitDelta(CODING_BRANCH, HASH_ZERO, HASH_V1, ARWEAVE_TX_1);

      const AmberRegistryV2Mock = await ethers.getContractFactory("AmberRegistryV2Mock");

      // 非管理员升级应被拒绝
      await expect(
        upgrades.upgradeProxy(await amberRegistry.getAddress(), AmberRegistryV2Mock.connect(alice))
      ).to.be.revertedWithCustomError(amberRegistry, "AccessControlUnauthorizedAccount");

      // 管理员平滑升级
      const upgraded = await upgrades.upgradeProxy(
        await amberRegistry.getAddress(),
        AmberRegistryV2Mock.connect(admin)
      );

      // 验证升级后新功能生效
      expect(await upgraded.isV2()).to.be.true;
      expect(await upgraded.VERSION()).to.equal("v2.0.0");

      // 验证历史状态数据完好无损（未被覆盖破坏）
      const state = await upgraded.getBranchState(alice.address, CODING_BRANCH);
      expect(state.rootHash).to.equal(HASH_V1);
      expect(state.versionIndex).to.equal(1n);
    });
  });
});
