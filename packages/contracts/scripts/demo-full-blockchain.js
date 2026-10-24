const { ethers, upgrades } = require("hardhat");

async function main() {
  console.log("==================================================");
  console.log("🚀 开始全自动区块链部署与全流程链上交互演示");
  console.log("==================================================");

  const [deployer, alice, bob] = await ethers.getSigners();
  const provider = ethers.provider;
  const network = await provider.getNetwork();

  console.log(`📡 链网络: ${network.name} (ChainID: ${network.chainId})`);
  console.log(`👤 部署者管理员: ${deployer.address}`);
  console.log(`💰 账户初始可用余额: ${ethers.formatEther(await provider.getBalance(deployer.address))} ETH`);
  console.log("--------------------------------------------------");

  // 1. 部署 UUPS 代理合约
  console.log("\n[步骤 1/4] 正在部署 AmberRegistry 核心 UUPS 智能合约...");
  const AmberRegistry = await ethers.getContractFactory("AmberRegistry");
  const amberRegistry = await upgrades.deployProxy(AmberRegistry, [deployer.address], {
    initializer: "initialize",
    kind: "uups",
  });
  await amberRegistry.waitForDeployment();

  const proxyAddress = await amberRegistry.getAddress();
  const implAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);

  console.log(`  ✔ 合约部署成功！`);
  console.log(`  📝 Proxy 代理地址 (对外公开交互地址): ${proxyAddress}`);
  console.log(`  ⚙️  Implementation 逻辑底层地址: ${implAddress}`);

  // 2. 模拟用户 Alice 在 coding 分支提交第一笔记忆
  console.log("\n[步骤 2/4] 模拟用户 Alice 发起第一笔记忆增量上链 (V1)...");
  const CODING_BRANCH = ethers.keccak256(ethers.toUtf8Bytes("coding"));
  const HASH_ZERO = ethers.ZeroHash;
  const ROOT_V1 = ethers.keccak256(ethers.toUtf8Bytes("Amber_Memory_Insight_Distributed_System_V1"));
  const ARWEAVE_TX_1 = "ar://amber_encrypted_chunk_v1_8888";

  const tx1 = await amberRegistry.connect(alice).commitDelta(
    CODING_BRANCH,
    HASH_ZERO,
    ROOT_V1,
    ARWEAVE_TX_1
  );
  const receipt1 = await tx1.wait();

  console.log(`  ✔ 交易成功打包进区块 #${receipt1.blockNumber}`);
  console.log(`  🔗 交易哈希 (TxHash): ${receipt1.hash}`);
  console.log(`  ⛽ 实际消耗 Gas 费用: ${receipt1.gasUsed.toString()} units`);

  // 3. 链上读取验证
  console.log("\n[步骤 3/4] 从区块链账本中读取并验证 Alice 的记忆状态...");
  const stateAlice = await amberRegistry.getBranchState(alice.address, CODING_BRANCH);
  console.log(`  • 当前版本号: V${stateAlice.versionIndex}`);
  console.log(`  • 链上 Merkle Root: ${stateAlice.rootHash}`);
  console.log(`  • 父哈希校验 (ParentHash): ${stateAlice.parentHash} (创世版本)`);
  console.log(`  • 永久存储指针 (Arweave): ${stateAlice.arweaveTxId}`);
  console.log(`  • 链上固化时间戳: ${new Date(Number(stateAlice.blockTimestamp) * 1000).toLocaleString()}`);

  // 4. 用户 Alice 追加第二笔增量 (V2 - 链式校验)
  console.log("\n[步骤 4/4] Alice 产生新认知，追加第二笔增量记忆 (V2)...");
  const ROOT_V2 = ethers.keccak256(ethers.toUtf8Bytes("Amber_Memory_Insight_Security_Isolation_V2"));
  const ARWEAVE_TX_2 = "ar://amber_encrypted_chunk_v2_9999";

  const tx2 = await amberRegistry.connect(alice).commitDelta(
    CODING_BRANCH,
    ROOT_V1, // 父哈希严格等于 V1 的根哈希
    ROOT_V2,
    ARWEAVE_TX_2
  );
  const receipt2 = await tx2.wait();
  console.log(`  ✔ V2 增量成功上链！TxHash: ${receipt2.hash}`);

  const stateAliceV2 = await amberRegistry.getBranchState(alice.address, CODING_BRANCH);
  console.log(`  • 最新版本号: V${stateAliceV2.versionIndex}`);
  console.log(`  • 最新累积 Merkle Root: ${stateAliceV2.rootHash}`);
  console.log(`  • 历史提交总次数: ${await amberRegistry.getBranchHistoryLength(alice.address, CODING_BRANCH)} 次`);

  console.log("\n==================================================");
  console.log("🎉 恭喜！Amber 智能合约与区块链全流程交互 100% 运行成功！");
  console.log("==================================================");
}

main().catch((err) => {
  console.error("❌ 演示失败:", err);
  process.exit(1);
});
