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

  const userAddress = "0xE106C84646B851af709C5672b5Fb5D7E0FD5fC39";
  if (userAddress && userAddress.toLowerCase() !== deployer.address.toLowerCase()) {
    console.log(`👑 正在将合约最高管理权限授予您的钱包: ${userAddress}...`);
    try {
      const adminRole = await amberRegistry.DEFAULT_ADMIN_ROLE();
      const upgraderRole = await amberRegistry.UPGRADER_ROLE();
      const operatorRole = await amberRegistry.OPERATOR_ROLE();
      await (await amberRegistry.grantRole(adminRole, userAddress)).wait();
      await (await amberRegistry.grantRole(upgraderRole, userAddress)).wait();
      await (await amberRegistry.grantRole(operatorRole, userAddress)).wait();
      console.log(`✔ 权限授予成功！您的钱包已获得该合约的主权所有权。`);
    } catch (e) {
      console.log(`⚠️ 权限授予跳过或后续可手动调用: ${e.message}`);
    }
  }

  console.log("==================================================");
  console.log("💡 下一步建议：");
  let explorerBase = "https://sepolia-optimism.etherscan.io";
  if (Number(network.chainId) === 84532) explorerBase = "https://sepolia.basescan.org";
  if (Number(network.chainId) === 8453) explorerBase = "https://basescan.org";
  console.log(`可在区块链浏览器查看: ${explorerBase}/address/${proxyAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 部署失败:", error);
    process.exit(1);
  });
