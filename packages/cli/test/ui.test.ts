import assert from "node:assert";
import { createAmberUiServer } from "../src/ui-server.js";

async function testUiServer() {
  console.log("==================================================");
  console.log("🌐 开始测试 Amber Web UI 控制台服务");
  console.log("==================================================");

  const testPort = 3999;
  const { server, listen } = createAmberUiServer(testPort);
  await listen();

  try {
    const baseUrl = `http://localhost:${testPort}`;

    // 1. GET /
    console.log("\n[Test 1] 测试根路径 HTML 返回与操作指南 Tab...");
    const htmlRes = await fetch(`${baseUrl}/`);
    assert.strictEqual(htmlRes.status, 200);
    const html = await htmlRes.text();
    assert.ok(html.includes("Amber（灵珀）"));
    assert.ok(html.includes("操作指南与教程"));
    console.log("  ✔ HTML 页面渲染正常, 操作指南 Tab 存在");

    // 2. GET /api/overview
    console.log("\n[Test 2] 测试 GET /api/overview...");
    const overviewRes = await fetch(`${baseUrl}/api/overview`);
    assert.strictEqual(overviewRes.status, 200);
    const overviewData = await overviewRes.json();
    assert.strictEqual(overviewData.success, true);
    console.log(`  ✔ Overview API 响应正常, 记忆总数: ${overviewData.totalMemories}`);

    // 3. POST /api/remember
    console.log("\n[Test 3] 测试 POST /api/remember...");
    const remRes = await fetch(`${baseUrl}/api/remember`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "WebUI 沉淀的重要记忆：Amber 采用 Git-DAG 增量状态更新",
        branch: "coding",
        tags: ["webui", "git-dag"],
        importance: 4,
      }),
    });
    assert.strictEqual(remRes.status, 200);
    const remData = await remRes.json();
    assert.strictEqual(remData.success, true);
    assert.ok(remData.item.id);
    console.log("  ✔ 记忆写入 API 成功");

    // 4. POST /api/recall
    console.log("\n[Test 4] 测试 POST /api/recall...");
    const recallRes = await fetch(`${baseUrl}/api/recall`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: "Git-DAG 增量",
        branch: "coding",
      }),
    });
    assert.strictEqual(recallRes.status, 200);
    const recallData = await recallRes.json();
    assert.strictEqual(recallData.success, true);
    assert.ok(recallData.results.length > 0);
    console.log(`  ✔ 语义召回命中 ${recallData.results.length} 条记忆`);

    // 5. POST /api/sandbox/run
    console.log("\n[Test 5] 测试 POST /api/sandbox/run...");
    const sandRes = await fetch(`${baseUrl}/api/sandbox/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: "const val = 123 * 456; console.log('Sandbox math result: ' + val);",
        language: "javascript",
      }),
    });
    assert.strictEqual(sandRes.status, 200);
    const sandData = await sandRes.json();
    assert.strictEqual(sandData.success, true);
    assert.ok(sandData.result.stdout.includes("Sandbox math result: 56088"));
    console.log("  ✔ 沙盒安全执行 API 正常返回执行结果");

    // 6. GET /api/dag
    console.log("\n[Test 6] 测试 GET /api/dag 状态演化拓扑接口...");
    const dagRes = await fetch(`${baseUrl}/api/dag?branch=coding`);
    assert.strictEqual(dagRes.status, 200);
    const dagData = await dagRes.json();
    assert.strictEqual(dagData.success, true);
    assert.strictEqual(dagData.branch, "coding");
    assert.ok(dagData.currentRoot);
    console.log(`  ✔ DAG 拓扑 API 响应正常, 当前 Merkle Root: ${dagData.currentRoot}`);

    console.log("\n==================================================");
    console.log("🎉 Amber Web UI API 全部测试通过！");
    console.log("==================================================");
  } finally {
    server.close();
  }
}

testUiServer().catch((err) => {
  console.error("UI 测试失败:", err);
  process.exit(1);
});
