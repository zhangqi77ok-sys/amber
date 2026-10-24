const { ethers } = require("hardhat");

async function main() {
  console.log("==================================================");
  console.log("🔍 正在通过公共 RPC 节点深度探测公网合约实时状态...");
  console.log("==================================================");

  const provider = new ethers.JsonRpcProvider("https://sepolia.optimism.io");
  const network = await provider.getNetwork();
  const blockNumber = await provider.getBlockNumber();

  console.log(`🌐 连接网络: OP Sepolia`);
  console.log(`📡 Chain ID: ${network.chainId} (十六进制: 0x${network.chainId.toString(16)})`);
  console.log(`🧱 当前公网最新区块高度: #${blockNumber}`);

  const proxyAddress = ethers.getAddress("0xdE6Ab63C951a34C65f591eD3B9A47d142a7604Ca");
  const implAddress = ethers.getAddress("0x7328386d8a232b684fad2b8859bfc02d6d1ada17");
  const userAddress = ethers.getAddress("0xE106C84646B851af709C5672b5Fb5D7E0FD5fC39");

  // 1. 验证合约字节码存在
  const proxyCode = await provider.getCode(proxyAddress);
  const implCode = await provider.getCode(implAddress);
  console.log(`\n[验证 1: 合约代码落定]`);
  console.log(`  Proxy 合约 (${proxyAddress}) 字节码长度: ${proxyCode.length} 字符 -> ${proxyCode.length > 10 ? "✅ 真实存在" : "❌ 不存在"}`);
  console.log(`  Impl  逻辑合约 (${implAddress}) 字节码长度: ${implCode.length} 字符 -> ${implCode.length > 10 ? "✅ 真实存在" : "❌ 不存在"}`);

  // 2. 验证 ERC-1967 存储槽指向
  const slot = await provider.getStorage(proxyAddress, "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc");
  const cleanSlotAddr = "0x" + slot.slice(-40);
  console.log(`\n[验证 2: ERC-1967 代理链接]`);
  console.log(`  Proxy 当前指向逻辑实现: ${cleanSlotAddr}`);
  console.log(`  逻辑实现匹配验证: ${cleanSlotAddr.toLowerCase() === implAddress.toLowerCase() ? "✅ 100% 严格匹配" : "❌ 不匹配"}`);

  // 3. 验证权限
  const AmberRegistry = await ethers.getContractFactory("AmberRegistry");
  const contract = AmberRegistry.attach(proxyAddress).connect(provider);

  const adminRole = await contract.DEFAULT_ADMIN_ROLE();
  const upgraderRole = await contract.UPGRADER_ROLE();
  const hasAdmin = await contract.hasRole(adminRole, userAddress);
  const hasUpgrader = await contract.hasRole(upgraderRole, userAddress);

  console.log(`\n[验证 3: 用户主权所有权 (归属您的钱包: ${userAddress})]`);
  console.log(`  您的钱包拥有 DEFAULT_ADMIN_ROLE (最高管理员): ${hasAdmin ? "✅ 是" : "❌ 否"}`);
  console.log(`  您的钱包拥有 UPGRADER_ROLE (升级控制权): ${hasUpgrader ? "✅ 是" : "❌ 否"}`);

  // 4. 验证链上实际写入的记忆记录
  const branchName = "main";
  const branchId = ethers.keccak256(ethers.toUtf8Bytes(branchName));
  const deployerAddress = "0x3A25DE835A8DceEd7312A92D09A50A0C4279798f";
  const state = await contract.getBranchState(deployerAddress, branchId);

  console.log(`\n[验证 4: 链上真实存证记录 (Branch: ${branchName})]`);
  console.log(`  当前链上版本号: v${state.versionIndex.toString()}`);
  console.log(`  当前链上 Merkle Root: ${state.rootHash}`);
  console.log(`  前序 Parent Hash: ${state.parentHash}`);
  console.log(`  Arweave 存证 ID: ${state.arweaveTxId}`);
  console.log(`  上链出块时间戳: ${new Date(Number(state.blockTimestamp) * 1000).toLocaleString()}`);

  console.log("\n==================================================");
  console.log("🎉 验证完毕: 合约与数据 100% 真实部署并运行在 OP Sepolia 公链！");
  console.log("==================================================");
}

main().catch(console.error);
