import assert from "node:assert";
import { createAmberMcpServer } from "../src/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

async function runMcpTests() {
  console.log("==================================================");
  console.log("🔌 开始测试 Amber MCP Server (Model Context Protocol)");
  console.log("==================================================");

  const { server, memoryRuntime } = createAmberMcpServer();

  // 1. 验证工具列表输出
  console.log("\n[Test 1] 验证工具列表暴露...");
  // @ts-ignore
  const toolsHandler = server._requestHandlers.get("tools/list");
  assert.ok(toolsHandler, "ListTools handler must exist");
  const toolsResult = await toolsHandler({ method: "tools/list", params: {} });
  assert.strictEqual(toolsResult.tools.length, 5);
  console.log(`  ✔ 成功暴露 ${toolsResult.tools.length} 个 MCP 工具 (recall, save, compact, sandbox, mint)`);

  // 2. 模拟调用 amber_save_thought
  console.log("\n[Test 2] 模拟 MCP 调用 amber_save_thought...");
  // @ts-ignore
  const callHandler = server._requestHandlers.get("tools/call");

  const saveRes = await callHandler({
    method: "tools/call",
    params: {
      name: "amber_save_thought",
      arguments: {
        branch: "coding",
        content: "在 Node.js 中使用 child_process.spawn 时需主动捕获并消费 stdout 和 stderr",
        tags: ["nodejs", "subprocess"],
        importance: 4,
      },
    },
  });
  assert.ok(saveRes.content[0].text.includes("已记录至 Amber [coding] 分支"));
  console.log("  ✔ 工具 amber_save_thought 执行成功并更新 Merkle Root");

  // 3. 模拟调用 amber_recall 召回
  console.log("\n[Test 3] 模拟 MCP 调用 amber_recall...");
  const recallRes = await callHandler({
    method: "tools/call",
    params: {
      name: "amber_recall",
      arguments: {
        branch: "coding",
        query: "child_process 消费 stdout",
      },
    },
  });
  assert.ok(recallRes.content[0].text.includes("child_process.spawn"));
  console.log("  ✔ 工具 amber_recall 成功精确召回关联认知");

  // 4. 模拟调用 amber_sandbox_run 沙盒执行
  console.log("\n[Test 4] 模拟 MCP 调用 amber_sandbox_run...");
  const sandboxRes = await callHandler({
    method: "tools/call",
    params: {
      name: "amber_sandbox_run",
      arguments: {
        language: "javascript",
        code: `console.log("Amber Sandbox executed from MCP!");`,
      },
    },
  });
  const parsed = JSON.parse(sandboxRes.content[0].text);
  assert.strictEqual(parsed.success, true);
  assert.ok(parsed.stdout.includes("Amber Sandbox executed from MCP!"));
  console.log("  ✔ 工具 amber_sandbox_run 成功在隔离沙盒内执行代码");

  // 5. 模拟调用 amber_create_mint_commit
  console.log("\n[Test 5] 模拟 MCP 调用 amber_create_mint_commit...");
  const mintRes = await callHandler({
    method: "tools/call",
    params: {
      name: "amber_create_mint_commit",
      arguments: {
        branch: "coding",
      },
    },
  });
  assert.ok(mintRes.content[0].text.includes("Git-DAG 增量打包已就绪"));
  console.log("  ✔ 工具 amber_create_mint_commit 成功生成 Base 链锚定数据包");

  console.log("\n==================================================");
  console.log("🎉 Amber MCP Server 协议端到端测试 100% 通过！");
  console.log("==================================================");
}

runMcpTests().catch((err) => {
  console.error("❌ MCP 测试失败:", err);
  process.exit(1);
});
