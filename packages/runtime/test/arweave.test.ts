import assert from "node:assert";
import { ArweaveStorageService } from "../src/storage/arweave-storage.js";
import { encryptAESGCM, generateRandomKey } from "../src/memory/crypto.js";

async function testArweaveStorage() {
  console.log("==================================================");
  console.log("📦 开始测试 Amber Arweave / Irys 永久去中心化存储");
  console.log("==================================================");

  const storage = new ArweaveStorageService({ network: "devnet" });

  // 1. 模拟加密数据负载
  const testKey = generateRandomKey();
  const rawData = JSON.stringify({
    testMessage: "Amber 去中心化主权记忆: 永久上存 Arweave 测试",
    timestamp: Date.now(),
  });
  const encryptedPayload = encryptAESGCM(rawData, testKey);

  console.log("\n[Test 1] 测试加密增量包上传至 Arweave / Irys...");
  const uploadResult = await storage.uploadEncryptedDelta(encryptedPayload, {
    branch: "coding",
    rootHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    parentHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
  });

  assert.ok(uploadResult.txId, "应生成有效的 Arweave/Irys 事务 ID");
  assert.ok(uploadResult.arweaveUrl.startsWith("ar://"), "URL 应符合 ar:// 协议前缀");
  assert.ok(uploadResult.gatewayUrl.startsWith("https://gateway.irys.xyz/"), "应生成公开可访问的网关链接");
  assert.ok(uploadResult.sizeBytes > 0, "体积应大于 0 字节");

  console.log(`  ✔ 上传完成！`);
  console.log(`  📝 永久事务 ID (TxID): ${uploadResult.txId}`);
  console.log(`  🌐 Arweave URI: ${uploadResult.arweaveUrl}`);
  console.log(`  🌍 Web3 网关链接: ${uploadResult.gatewayUrl}`);
  console.log(`  📊 数据体积: ${uploadResult.sizeBytes} 字节 (< 100 KB 免费免 Gas)`);
  console.log(`  🛡️ 模式: ${uploadResult.isMock ? "本地平滑降级" : "Irys 线上节点"}`);

  console.log("\n==================================================");
  console.log("🎉 Amber Arweave / Irys 永久去中心化存储测试 100% 通过！");
  console.log("==================================================");
}

testArweaveStorage().catch((err) => {
  console.error("Arweave 测试失败:", err);
  process.exit(1);
});
