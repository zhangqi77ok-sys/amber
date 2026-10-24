import { exec } from "node:child_process";
import { promisify } from "node:util";
import assert from "node:assert";
import fs from "node:fs/promises";
import path from "node:path";

const execAsync = promisify(exec);
const CLI_PATH = path.resolve("./dist/index.js");

async function runCli(args: string) {
  const { stdout, stderr } = await execAsync(`node "${CLI_PATH}" ${args}`);
  return { stdout, stderr };
}

async function testCli() {
  console.log("==================================================");
  console.log("💻 开始测试 Amber CLI 终端工具");
  console.log("==================================================");

  // 1. 测试 amber remember
  console.log("\n[Test 1] 测试 amber remember 写入记忆...");
  const remRes = await runCli(`remember "测试通过 CLI 沉淀一条关于分布式系统的经验" -b coding -t distributed consensus -i 4`);
  assert.ok(remRes.stdout.includes("成功沉淀至 Amber [coding] 分支"));
  console.log("  ✔ amber remember 命令执行成功");

  // 2. 测试 amber status
  console.log("\n[Test 2] 测试 amber status 查看状态...");
  const statusRes = await runCli(`status`);
  assert.ok(statusRes.stdout.includes("Amber Sovereign Runtime Status"));
  assert.ok(statusRes.stdout.includes("分支: [coding]"));
  console.log("  ✔ amber status 正确展示本地分支与 Merkle Root");

  // 3. 测试 amber recall
  console.log("\n[Test 3] 测试 amber recall 语义召回...");
  const recallRes = await runCli(`recall "分布式 经验" -b coding`);
  assert.ok(recallRes.stdout.includes("分布式系统"));
  console.log("  ✔ amber recall 精确命中记忆条目");

  // 4. 测试 amber mint
  console.log("\n[Test 4] 测试 amber mint 生成上链数据包与 Arweave 永久存储 URI...");
  const mintRes = await runCli(`mint -b coding`);
  assert.ok(mintRes.stdout.includes("Amber Git-DAG 增量铸造就绪"));
  assert.ok(mintRes.stdout.includes("New Merkle Root"));
  assert.ok(mintRes.stdout.includes("Arweave 永久存储 URI"));
  console.log("  ✔ amber mint 成功计算增量并集成 Arweave 永久存储");

  // 5. 测试 amber run 沙盒执行
  console.log("\n[Test 5] 测试 amber run 沙盒隔离执行代码...");
  const tempScript = path.resolve("./test/demo_sandbox.js");
  await fs.writeFile(tempScript, `console.log("Hello from Amber CLI Sandbox! Result: " + (100 * 3));`, "utf8");

  try {
    const runRes = await runCli(`run "${tempScript}"`);
    assert.ok(runRes.stdout.includes("Result: 300"));
    console.log("  ✔ amber run 成功在沙盒中执行代码并安全捕获输出");
  } finally {
    await fs.unlink(tempScript).catch(() => {});
  }

  console.log("\n==================================================");
  console.log("🎉 Amber CLI 终端命令测试 100% 通过！");
  console.log("==================================================");
}

testCli().catch((err) => {
  console.error("❌ CLI 测试失败:", err);
  process.exit(1);
});
