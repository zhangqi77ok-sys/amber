const { ethers, upgrades } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("==================================================");
  console.log("🚀 开始部署 AmberMind 核心确权合约 (AmberRegistry)...");
  console.log(`📡 网络: ${network.name} (ChainID: ${network.chainId})`);
  console.log(`👤 部署者地址: ${deployer.address}`);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 账户余额: ${ethers.formatEther(balance)} ETH`);
  console.log("==================================================");

  // 获取合约工厂
  const AmberRegistry = await ethers.getContractFactory("AmberRegistry");

  console.log("📦 正在通过 UUPS 代理模式部署...");
  const amberRegistry = await upgrades.deployProxy(
    AmberRegistry,
    [deployer.address], // 将部署者设为初始管理员
    {
      initializer: "initialize",
      kind: "uups",
    }
  );

  await amberRegistry.waitForDeployment();
  const proxyAddress = await amberRegistry.getAddress();
  const implAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);

  console.log("🎉 部署成功!");
  console.log(`📝 Proxy 合约地址 (用户交互地址): ${proxyAddress}`);
  console.log(`⚙️  Implementation 逻辑实现地址: ${implAddress}`);
  console.log("==================================================");
  console.log("💡 下一步建议：");
  console.log(`可在 BaseScan 浏览器查看: https://sepolia.basescan.org/address/${proxyAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 部署失败:", error);
    process.exit(1);
  });
