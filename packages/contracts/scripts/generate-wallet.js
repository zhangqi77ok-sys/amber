require("dotenv").config();
const { ethers } = require("ethers");
const fs = require("node:fs");
const path = require("node:path");

async function main() {
  const envPath = path.resolve(__dirname, "../.env");
  const rpcUrl = process.env.BASE_SEPOLIA_RPC || "https://sepolia.base.org";
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  let privateKey = process.env.PRIVATE_KEY;
  let wallet;

  if (privateKey && privateKey !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
    wallet = new ethers.Wallet(privateKey, provider);
    console.log("==================================================");
    console.log("🔑 检测到现有部署钱包配置 (.env)");
  } else {
    // 自动生成一个全新的测试钱包
    wallet = ethers.Wallet.createRandom(provider);
    privateKey = wallet.privateKey;

    const envContent = [
      `BASE_SEPOLIA_RPC=https://sepolia.base.org`,
      `BASE_MAINNET_RPC=https://mainnet.base.org`,
      `PRIVATE_KEY=${privateKey}`,
      `BASESCAN_API_KEY=`,
    ].join("\n");

    fs.writeFileSync(envPath, envContent, "utf8");
    console.log("==================================================");
    console.log("🎉 已自动生成全新的 Base Sepolia 部署测试钱包，并写入 .env！");
  }

  console.log("==================================================");
  console.log(`📡 目标网络: Base Sepolia (ChainID: 84532)`);
  console.log(`👤 钱包公钥地址 (Address): ${wallet.address}`);

  const balance = await provider.getBalance(wallet.address);
  const formattedBalance = ethers.formatEther(balance);
  console.log(`💰 当前测试网余额: ${formattedBalance} ETH`);
  console.log("==================================================");

  if (balance > 0n) {
    console.log("✅ 余额充足，可以立即执行部署！");
    console.log("👉 执行部署命令: npm run deploy:base-sepolia");
  } else {
    console.log("⚠️ 当前余额为 0 ETH，需要少许测试币（约 0.002 ETH 即可）以支付 Base Sepolia Gas 费。");
    console.log("\n🚰 免费水龙头领取测试币渠道：");
    console.log(`1. Coinbase 官方水龙头 (最推荐): https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet`);
    console.log(`   (登录后输入地址 ${wallet.address} 即可免费领取 0.05 ETH)`);
    console.log(`2. QuickNode 水龙头: https://faucet.quicknode.com/base/sepolia`);
    console.log(`3. 或者直接从你现有的任何钱包向 ${wallet.address} 转少许测试 ETH。`);
    console.log("\n领水完成后，直接运行: npm run deploy:base-sepolia 即可将 AmberRegistry 合约推上 Base Sepolia！");
  }
  console.log("==================================================");
}

main().catch((err) => {
  console.error("❌ 发生错误:", err);
  process.exit(1);
});
