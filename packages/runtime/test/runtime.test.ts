import assert from "node:assert";
import { ethers } from "ethers";
import {
  MemoryRuntime,
  SandboxRuntime,
  encryptAESGCM,
  decryptAESGCM,
  generateRandomKey,
  computeMerkleRoot,
} from "../src/index.js";

async function runTests() {
  console.log("==================================================");
  console.log("🧪 开始测试 Amber Runtime (纯 TypeScript 核心运行时)");
  console.log("==================================================");

  // ----------------------------------------------------
  // 测试 1: SandboxRuntime 隔离执行与超时熔断
  // ----------------------------------------------------
  console.log("\n[Test 1] 验证沙盒隔离执行与超时防护...");
  const sandbox = new SandboxRuntime({ defaultTimeoutMs: 2000 });

  // 正常执行 JavaScript
  const jsResult = await sandbox.execute({
    language: "javascript",
    code: `console.log(JSON.stringify({ calculated: 42 * 2 }));`,
  });
  assert.strictEqual(jsResult.success, true);
  assert.strictEqual(JSON.parse(jsResult.stdout).calculated, 84);
  console.log("  ✔ JavaScript 脚本在沙盒中正常执行成功");

  // 超时熔断测试（死循环代码）
  const timeoutResult = await sandbox.execute({
    language: "javascript",
    code: `while (true) {}`, // 故意死循环
    timeoutMs: 800,
  });
  assert.strictEqual(timeoutResult.timedOut, true);
  assert.strictEqual(timeoutResult.success, false);
  console.log(`  ✔ 死循环任务被成功熔断超时 (耗时: ${timeoutResult.durationMs}ms)`);

  // ----------------------------------------------------
  // 测试 2: 本地端到端对称加密 (AES-256-GCM)
  // ----------------------------------------------------
  console.log("\n[Test 2] 验证端到端加密 (E2EE)...");
  const secretKey = generateRandomKey();
  const rawText = "这是属于用户的私密核心架构方案，未经授权天王老子也看不见";

  const encrypted = encryptAESGCM(rawText, secretKey);
  assert.notStrictEqual(encrypted.ciphertext, rawText);
  assert.ok(encrypted.iv.length > 0);
  assert.ok(encrypted.authTag.length > 0);

  const decrypted = decryptAESGCM(encrypted, secretKey);
  assert.strictEqual(decrypted, rawText);
  console.log("  ✔ 本地 AES-256-GCM 加密与解密完全一致");

  // ----------------------------------------------------
  // 测试 3: MemoryRuntime 思考添加与记忆压实 (Compaction)
  // ----------------------------------------------------
  console.log("\n[Test 3] 验证记忆分片与后台睡眠压实...");
  const memory = new MemoryRuntime();

  // 添加琐碎调试日志
  memory.addThought("coding", "发现沙盒在 Windows 环境下路径分隔符为反斜杠", ["win32", "path"], 2);
  memory.addThought("coding", "需要统一使用 node:path.normalize 处理路径", ["path", "normalize"], 2);
  memory.addThought("coding", "修改后测试通过，耗时减少 15ms", ["perf"], 1);

  const activeBefore = memory.getActiveMemories("coding");
  assert.strictEqual(activeBefore.length, 3);

  // 执行模拟睡眠压实
  const { consolidated, deprecatedIds } = await memory.compact("coding");
  assert.strictEqual(consolidated.length, 1);
  assert.strictEqual(deprecatedIds.length, 3);

  const activeAfter = memory.getActiveMemories("coding");
  assert.strictEqual(activeAfter.length, 1);
  assert.strictEqual(activeAfter[0].importance, 5);
  console.log("  ✔ 3 条零散调试日志被成功压缩为 1 条高密度认知结晶");

  // ----------------------------------------------------
  // 测试 4: Git-DAG 增量打包与 Merkle Root 链式推导
  // ----------------------------------------------------
  console.log("\n[Test 4] 验证 Git-DAG 增量打包与 Parent Hash 链接...");

  // 创世提交 (V1)
  const commitV1 = memory.createDeltaCommit("coding", secretKey);
  assert.strictEqual(commitV1.parentHash, ethers.ZeroHash);
  assert.notStrictEqual(commitV1.newRootHash, ethers.ZeroHash);
  console.log(`  ✔ 创世 Commit 生成成功 (Root: ${commitV1.newRootHash.substring(0, 10)}...)`);

  // 模拟链上上链成功，记录收据
  memory.applyCommitReceipt({
    user: "0x1234567890123456789012345678901234567890",
    branch: "coding",
    branchBytes32: memory.getBranchBytes32("coding"),
    rootHash: commitV1.newRootHash,
    parentHash: commitV1.parentHash,
    arweaveTxId: "ar://tx_hash_v1",
    versionIndex: 1,
    timestamp: Date.now(),
  });

  // 再次产生新思考并增量提交 (V2)
  memory.addThought("coding", "通过 UDS 进程间通信进一步优化了响应延迟", ["ipc", "uds"], 4);
  const commitV2 = memory.createDeltaCommit("coding", secretKey);

  // 关键校验：V2 的 parentHash 必须严格等于 V1 的 newRootHash！
  assert.strictEqual(commitV2.parentHash, commitV1.newRootHash);
  assert.notStrictEqual(commitV2.newRootHash, commitV1.newRootHash);
  console.log(`  ✔ V2 增量 Commit 生成成功，父哈希严格等于 V1 (Parent: ${commitV2.parentHash.substring(0, 10)}...)`);

  // ----------------------------------------------------
  // 测试 5: 本地记忆语义召回 (Recall)
  // ----------------------------------------------------
  console.log("\n[Test 5] 验证多维度相关性召回...");
  const recalled = memory.recall("coding", "UDS 延迟通信", 2);
  assert.ok(recalled.length > 0);
  assert.ok(recalled[0].content.includes("UDS"));
  console.log(`  ✔ 成功召回最匹配记忆: "${recalled[0].content}"`);

  console.log("\n==================================================");
  console.log("🎉 全部 5 项核心运行时测试用例 100% 通过！");
  console.log("==================================================");
}

runTests().catch((err) => {
  console.error("❌ 测试失败:", err);
  process.exit(1);
});
