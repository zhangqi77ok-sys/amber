#!/usr/bin/env node
import { Command } from "commander";
import fs from "node:fs/promises";
import path from "node:path";
import { MemoryRuntime, SandboxRuntime, } from "@amber/runtime";
import { LocalStorage } from "./storage.js";
import { createAmberUiServer } from "./ui-server.js";
const program = new Command();
const storage = new LocalStorage();
program
    .name("amber")
    .description("💎 Amber CLI: 拥有隔离沙盒与去中心化主权记忆的开发者终端工具")
    .version("0.1.0");
/**
 * 辅助函数：初始化并同步本地持久化状态
 */
async function getHydratedMemoryRuntime() {
    const memory = new MemoryRuntime();
    const data = await storage.load();
    // 恢复各分支记忆
    for (const [branch, items] of Object.entries(data.branches)) {
        for (const item of items) {
            memory.addThought(branch, item.content, item.tags, item.importance);
        }
    }
    // 恢复各分支 Commit 历史
    for (const [branch, commits] of Object.entries(data.commits)) {
        for (const receipt of commits) {
            memory.applyCommitReceipt(receipt);
        }
    }
    const saveState = async () => {
        const branches = {};
        const commits = {};
        // 提取所有活跃分支数据
        for (const branch of Object.keys(data.branches)) {
            branches[branch] = memory.getActiveMemories(branch);
        }
        await storage.save({ branches, commits });
    };
    return { memory, saveState };
}
// ----------------------------------------------------
// 1. amber status
// ----------------------------------------------------
program
    .command("status")
    .description("查看当前 Amber 运行时状态、本地记忆分支与最新 Merkle Root")
    .action(async () => {
    const data = await storage.load();
    const branchNames = Object.keys(data.branches);
    console.log("==================================================");
    console.log("💎 Amber Sovereign Runtime Status");
    console.log("==================================================");
    console.log(`📂 本地存储位置: ${path.join(process.cwd(), ".amber", "storage.json")}`);
    console.log(`🌿 活跃主题分支数: ${branchNames.length}`);
    if (branchNames.length === 0) {
        console.log("   (暂无记忆分支，可通过 `amber remember <内容>` 沉淀第一条认知)");
    }
    else {
        for (const branch of branchNames) {
            const memory = new MemoryRuntime();
            for (const item of data.branches[branch] || []) {
                memory.addThought(branch, item.content, item.tags, item.importance);
            }
            const count = data.branches[branch]?.length || 0;
            const root = memory.getCurrentRootHash(branch);
            console.log(`\n• 分支: [${branch}]`);
            console.log(`  - 活跃认知数: ${count} 条`);
            console.log(`  - 累积 Merkle Root: ${root}`);
        }
    }
    console.log("==================================================");
});
// ----------------------------------------------------
// 2. amber remember <thought>
// ----------------------------------------------------
program
    .command("remember <thought>")
    .description("向 Amber 记忆库沉淀一条新的思考、排错经验或决策")
    .option("-b, --branch <name>", "主题分支名称", "coding")
    .option("-t, --tags <tags...>", "关联标签（空格分隔）", [])
    .option("-i, --importance <number>", "重要度 1~5", "3")
    .action(async (thought, options) => {
    const { memory, saveState } = await getHydratedMemoryRuntime();
    const branch = options.branch;
    const tags = Array.isArray(options.tags) ? options.tags : [options.tags];
    const importance = parseInt(options.importance, 10) || 3;
    const item = memory.addThought(branch, thought, tags, importance);
    const root = memory.getCurrentRootHash(branch);
    // 持久化到本地文件
    const data = await storage.load();
    if (!data.branches[branch])
        data.branches[branch] = [];
    data.branches[branch].push(item);
    await storage.save(data);
    console.log(`✨ 成功沉淀至 Amber [${branch}] 分支！`);
    console.log(`🆔 ID: ${item.id}`);
    console.log(`🌲 当前累积 Merkle Root: ${root}`);
});
// ----------------------------------------------------
// 3. amber recall <query>
// ----------------------------------------------------
program
    .command("recall <query>")
    .description("基于语义与关键词召回相关的历史经验与决策")
    .option("-b, --branch <name>", "主题分支名称", "coding")
    .option("-k, --top-k <number>", "最多召回几条结果", "3")
    .action(async (query, options) => {
    const { memory } = await getHydratedMemoryRuntime();
    const branch = options.branch;
    const topK = parseInt(options.topK, 10) || 3;
    const results = memory.recall(branch, query, topK);
    console.log("==================================================");
    console.log(`🔍 检索分支: [${branch}] | 意图: "${query}"`);
    console.log("==================================================");
    if (results.length === 0) {
        console.log("未找到高度匹配的记忆经验。");
    }
    else {
        results.forEach((item, index) => {
            console.log(`\n#${index + 1} [重要度: ${item.importance}/5] [${item.tags.join(", ")}]`);
            console.log(`   ${item.content}`);
        });
    }
    console.log("==================================================");
});
// ----------------------------------------------------
// 4. amber compact
// ----------------------------------------------------
program
    .command("compact")
    .description("触发后台睡眠压实：将零散琐碎的日常调试日志压缩合并为高密度认知结晶")
    .option("-b, --branch <name>", "主题分支名称", "coding")
    .action(async (options) => {
    const { memory } = await getHydratedMemoryRuntime();
    const branch = options.branch;
    const res = await memory.compact(branch);
    if (res.consolidated.length === 0) {
        console.log(`ℹ️  分支 [${branch}] 当前记忆条目较少或无需合并，暂未触发压实。`);
        return;
    }
    // 保存更新
    const data = await storage.load();
    data.branches[branch] = memory.getActiveMemories(branch);
    await storage.save(data);
    console.log(`⚡ 记忆压实成功！`);
    console.log(`   淘汰旧日志数: ${res.deprecatedIds.length} 条`);
    console.log(`   新提炼认知结晶: "${res.consolidated[0].content}"`);
});
// ----------------------------------------------------
// 5. amber mint
// ----------------------------------------------------
program
    .command("mint")
    .description("生成 Git-DAG 增量上链包与 Merkle Root（准备存证至 Base 链）")
    .option("-b, --branch <name>", "主题分支名称", "coding")
    .action(async (options) => {
    const { memory } = await getHydratedMemoryRuntime();
    const branch = options.branch;
    const commit = memory.createDeltaCommit(branch);
    console.log("==================================================");
    console.log("💎 Amber Git-DAG 增量铸造就绪 (Ready to Mint)");
    console.log("==================================================");
    console.log(`🌿 主题分支: ${branch}`);
    console.log(`🔗 Parent Hash (上个版本): ${commit.parentHash}`);
    console.log(`🌲 New Merkle Root (新版本): ${commit.newRootHash}`);
    console.log(`📦 本次新增条目数: ${commit.deltaPackage.mutations.added.length}`);
    console.log(`🔒 加密密文摘要 (E2EE): ${commit.encryptedPayload.ciphertext.substring(0, 32)}...`);
    console.log("\n💡 提示：可通过前端或 `amber-client` 唤起钱包签名写入 Base 智能合约。");
    console.log("==================================================");
});
// ----------------------------------------------------
// 6. amber run <file>
// ----------------------------------------------------
program
    .command("run <scriptFile>")
    .description("在严格隔离的 Amber 沙盒中安全执行代码（超时自动熔断、清洗宿主秘钥）")
    .option("-t, --timeout <ms>", "超时毫秒数", "5000")
    .option("-l, --lang <language>", "运行语言: javascript | python | bash", "javascript")
    .action(async (scriptFile, options) => {
    const sandbox = new SandboxRuntime({
        defaultTimeoutMs: parseInt(options.timeout, 10) || 5000,
    });
    const code = await fs.readFile(scriptFile, "utf8");
    const ext = path.extname(scriptFile);
    let lang = options.lang;
    if (ext === ".py")
        lang = "python";
    if (ext === ".js" || ext === ".mjs")
        lang = "javascript";
    if (ext === ".sh")
        lang = "bash";
    console.log(`🚀 在 Amber 沙盒中启动任务 [${lang}] (超时熔断: ${options.timeout}ms)...`);
    const result = await sandbox.execute({
        code,
        language: lang,
        timeoutMs: parseInt(options.timeout, 10),
    });
    console.log("==================================================");
    console.log(`⏱️  执行耗时: ${result.durationMs}ms | 退出状态: ${result.exitCode}`);
    if (result.timedOut) {
        console.log("⚠️  警告: 脚本因超时被沙盒安全强行终止 (Timed Out)！");
    }
    if (result.stdout) {
        console.log("\n[标准输出 STDOUT]:\n" + result.stdout);
    }
    if (result.stderr) {
        console.log("\n[标准错误 STDERR]:\n" + result.stderr);
    }
    console.log("==================================================");
});
// ----------------------------------------------------
// 7. amber ui
// ----------------------------------------------------
program
    .command("ui")
    .description("启动 Amber 现代可视化琥珀控制台 (Web UI Dashboard)")
    .option("-p, --port <port>", "服务监听端口", "3777")
    .action(async (options) => {
    const port = parseInt(options.port, 10) || 3777;
    const { listen } = createAmberUiServer(port);
    await listen();
    console.log("💡 按 Ctrl+C 即可停止服务。");
});
program.parse(process.argv);
//# sourceMappingURL=index.js.map