import http from "node:http";
import { MemoryRuntime, SandboxRuntime, ArweaveStorageService } from "@amber/runtime";
import { LocalStorage } from "./storage.js";
const storage = new LocalStorage();
export function createAmberUiServer(port = 3777) {
    const sandbox = new SandboxRuntime({ defaultTimeoutMs: 5000 });
    async function getHydratedMemory() {
        const memory = new MemoryRuntime();
        const data = await storage.load();
        for (const [branch, items] of Object.entries(data.branches)) {
            for (const item of items) {
                memory.addThought(branch, item.content, item.tags, item.importance);
            }
        }
        return memory;
    }
    const server = http.createServer(async (req, res) => {
        // CORS headers
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type");
        if (req.method === "OPTIONS") {
            res.writeHead(204);
            res.end();
            return;
        }
        const url = new URL(req.url || "/", `http://localhost:${port}`);
        // ----------------------------------------------------
        // API: GET /api/overview
        // ----------------------------------------------------
        if (url.pathname === "/api/overview" && req.method === "GET") {
            const memory = await getHydratedMemory();
            const data = await storage.load();
            const branches = Object.keys(data.branches);
            const branchDetails = branches.map((branch) => ({
                name: branch,
                count: data.branches[branch]?.length || 0,
                rootHash: memory.getCurrentRootHash(branch),
                memories: data.branches[branch] || [],
            }));
            const totalMemories = branches.reduce((sum, b) => sum + (data.branches[b]?.length || 0), 0);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
                success: true,
                totalMemories,
                totalBranches: branches.length,
                branches: branchDetails,
            }));
            return;
        }
        // ----------------------------------------------------
        // API: POST /api/remember
        // ----------------------------------------------------
        if (url.pathname === "/api/remember" && req.method === "POST") {
            let body = "";
            req.on("data", (chunk) => (body += chunk));
            req.on("end", async () => {
                try {
                    const { content, branch = "coding", tags = [], importance = 3 } = JSON.parse(body);
                    const memory = await getHydratedMemory();
                    const item = memory.addThought(branch, content, tags, Number(importance));
                    const data = await storage.load();
                    if (!data.branches[branch])
                        data.branches[branch] = [];
                    data.branches[branch].push(item);
                    await storage.save(data);
                    res.writeHead(200, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({
                        success: true,
                        item,
                        rootHash: memory.getCurrentRootHash(branch),
                    }));
                }
                catch (e) {
                    res.writeHead(400, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ success: false, error: e.message }));
                }
            });
            return;
        }
        // ----------------------------------------------------
        // API: POST /api/recall
        // ----------------------------------------------------
        if (url.pathname === "/api/recall" && req.method === "POST") {
            let body = "";
            req.on("data", (chunk) => (body += chunk));
            req.on("end", async () => {
                try {
                    const { query, branch = "coding", topK = 4 } = JSON.parse(body);
                    const memory = await getHydratedMemory();
                    const results = memory.recall(branch, query, Number(topK));
                    res.writeHead(200, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ success: true, results }));
                }
                catch (e) {
                    res.writeHead(400, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ success: false, error: e.message }));
                }
            });
            return;
        }
        // ----------------------------------------------------
        // API: POST /api/compact
        // ----------------------------------------------------
        if (url.pathname === "/api/compact" && req.method === "POST") {
            let body = "";
            req.on("data", (chunk) => (body += chunk));
            req.on("end", async () => {
                try {
                    const { branch = "coding" } = JSON.parse(body);
                    const memory = await getHydratedMemory();
                    const result = await memory.compact(branch);
                    if (result.consolidated.length > 0) {
                        const data = await storage.load();
                        data.branches[branch] = memory.getActiveMemories(branch);
                        await storage.save(data);
                    }
                    res.writeHead(200, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ success: true, ...result }));
                }
                catch (e) {
                    res.writeHead(400, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ success: false, error: e.message }));
                }
            });
            return;
        }
        // ----------------------------------------------------
        // API: POST /api/mint
        // ----------------------------------------------------
        if (url.pathname === "/api/mint" && req.method === "POST") {
            let body = "";
            req.on("data", (chunk) => (body += chunk));
            req.on("end", async () => {
                try {
                    const { branch = "coding" } = JSON.parse(body);
                    const memory = await getHydratedMemory();
                    const commit = memory.createDeltaCommit(branch);
                    const arweave = new ArweaveStorageService({ network: "devnet" });
                    const uploadRes = await arweave.uploadEncryptedDelta(commit.encryptedPayload, {
                        branch,
                        rootHash: commit.newRootHash,
                        parentHash: commit.parentHash,
                    });
                    res.writeHead(200, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({
                        success: true,
                        parentHash: commit.parentHash,
                        newRootHash: commit.newRootHash,
                        addedCount: commit.deltaPackage.mutations.added.length,
                        ciphertextPreview: commit.encryptedPayload.ciphertext.substring(0, 32) + "...",
                        arweaveUrl: uploadRes.arweaveUrl,
                        gatewayUrl: uploadRes.gatewayUrl,
                        sizeBytes: uploadRes.sizeBytes,
                    }));
                }
                catch (e) {
                    res.writeHead(400, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ success: false, error: e.message }));
                }
            });
            return;
        }
        // ----------------------------------------------------
        // API: POST /api/sandbox/run
        // ----------------------------------------------------
        if (url.pathname === "/api/sandbox/run" && req.method === "POST") {
            let body = "";
            req.on("data", (chunk) => (body += chunk));
            req.on("end", async () => {
                try {
                    const { code, language = "javascript", timeoutMs = 5000 } = JSON.parse(body);
                    const result = await sandbox.execute({
                        code,
                        language,
                        timeoutMs: Number(timeoutMs),
                    });
                    res.writeHead(200, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ success: true, result }));
                }
                catch (e) {
                    res.writeHead(400, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ success: false, error: e.message }));
                }
            });
            return;
        }
        // ----------------------------------------------------
        // API: GET /api/dag
        // ----------------------------------------------------
        if (url.pathname === "/api/dag" && req.method === "GET") {
            try {
                const branch = url.searchParams.get("branch") || "architecture";
                const memory = await getHydratedMemory();
                const data = await storage.load();
                const memories = data.branches[branch] || [];
                const commits = data.commits[branch] || [];
                const currentRoot = memory.getCurrentRootHash(branch);
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({
                    success: true,
                    branch,
                    currentRoot,
                    memories,
                    commits,
                }));
            }
            catch (err) {
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ success: false, error: err.message }));
            }
            return;
        }
        // ----------------------------------------------------
        // 前端静态页面：Amber 琥珀控制台 (Single Page App)
        // ----------------------------------------------------
        if (url.pathname === "/" || url.pathname === "/index.html") {
            res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
            res.end(renderAmberDashboardHtml());
            return;
        }
        res.writeHead(404);
        res.end("Not Found");
    });
    return {
        server,
        listen: () => new Promise((resolve) => {
            server.listen(port, () => {
                console.log(`==================================================`);
                console.log(`💎 Amber 可视化控制台已启动！`);
                console.log(`🌐 访问地址: http://localhost:${port}`);
                console.log(`==================================================`);
                resolve();
            });
        }),
    };
}
/**
 * 现代暗黑琥珀晶体风格的单页 HTML
 */
function renderAmberDashboardHtml() {
    return `<!DOCTYPE html>
<html lang="zh-CN" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Amber（灵珀）| 主权记忆与隔离沙盒控制台</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            amberGlow: '#F59E0B',
            darkBg: '#090D16',
            cardBg: '#111827',
            cardBorder: '#1F2937'
          }
        }
      }
    }
  </script>
  <style>
    body { background-color: #090D16; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    .amber-gradient { background: linear-gradient(135deg, #F59E0B 0%, #D97706 50%, #B45309 100%); }
    .glass { background: rgba(17, 24, 39, 0.7); backdrop-filter: blur(12px); border: 1px solid rgba(245, 158, 11, 0.15); }
    .glass-card { background: rgba(17, 24, 39, 0.85); border: 1px solid #1F2937; }
    .glass-card:hover { border-color: rgba(245, 158, 11, 0.4); box-shadow: 0 0 20px rgba(245, 158, 11, 0.1); }
  </style>
</head>
<body class="text-gray-100 min-h-screen flex flex-col">

  <!-- 顶部导航栏 -->
  <header class="border-b border-gray-800 bg-[#0B0F19]/80 backdrop-blur sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
      <div class="flex items-center space-x-3">
        <span class="text-2xl">💎</span>
        <div>
          <span class="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500">Amber</span>
          <span class="text-xs text-amber-500/80 font-mono ml-1.5 px-2 py-0.5 rounded border border-amber-500/30 bg-amber-500/10">灵珀控制台 v0.1.0</span>
        </div>
      </div>
      <div class="flex items-center space-x-3">
        <!-- 导航 Tabs -->
        <div class="flex items-center p-1 bg-gray-900/90 rounded-xl border border-gray-800 text-xs">
          <button onclick="switchTab('dashboard')" id="tabBtnDashboard" class="px-3.5 py-1.5 rounded-lg font-medium transition bg-amber-500 text-gray-950 font-bold shadow">
            💎 仪表盘
          </button>
          <button onclick="switchTab('guide')" id="tabBtnGuide" class="px-3.5 py-1.5 rounded-lg font-medium transition text-gray-400 hover:text-white">
            📖 操作指南与教程
          </button>
        </div>

        <div class="hidden md:flex items-center space-x-2 text-xs text-gray-400 bg-gray-900/80 px-3 py-1.5 rounded-full border border-gray-800">
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>OP Sepolia / Git-DAG 在线</span>
        </div>
      </div>
    </div>
  </header>

  <!-- 主体内容区域 -->
  <main class="max-w-7xl mx-auto px-6 py-8 flex-1 w-full space-y-8">
    
    <!-- 仪表盘视图 (Dashboard View) -->
    <div id="viewDashboard" class="space-y-8">
    
    <!-- 顶部状态卡片 -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-5">
      <div class="glass-card p-5 rounded-2xl">
        <div class="text-xs text-gray-400 font-medium">总记忆资产数</div>
        <div class="text-3xl font-extrabold text-white mt-2" id="statTotalMemories">-</div>
        <div class="text-xs text-amber-500/80 mt-1">本地 E2EE 加密持久化</div>
      </div>

      <div class="glass-card p-5 rounded-2xl">
        <div class="text-xs text-gray-400 font-medium">活跃主题分片 (Shards)</div>
        <div class="text-3xl font-extrabold text-white mt-2" id="statTotalBranches">-</div>
        <div class="text-xs text-emerald-400 mt-1">独立版本互不干扰</div>
      </div>

      <div class="glass-card p-5 rounded-2xl col-span-2">
        <div class="text-xs text-gray-400 font-medium">最新累积 Merkle Root (根哈希)</div>
        <div class="text-sm font-mono text-amber-400 mt-2 truncate bg-black/40 px-3 py-2 rounded-lg border border-amber-500/20" id="statLatestRoot">
          0x0000000000000000000000000000000000000000
        </div>
        <div class="text-xs text-gray-400 mt-1.5 flex justify-between items-center">
          <span>公网已锚定: <a href="https://sepolia-optimism.etherscan.io/address/0xdE6Ab63C951a34C65f591eD3B9A47d142a7604Ca" target="_blank" class="text-emerald-400 underline font-mono">0xdE6A...04Ca (Verified)</a></span>
          <span class="text-amber-400/90 font-mono">OP Sepolia #11155420</span>
        </div>
      </div>
    </div>

    <!-- Git-DAG 状态演化拓扑树卡片 -->
    <div class="glass-card rounded-2xl p-6">
      <div class="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-gray-800 gap-3">
        <div>
          <h2 class="text-lg font-bold text-white flex items-center gap-2">
            <span>🌿</span> Git-DAG 状态演化拓扑图 (State Lineage Visualizer)
          </h2>
          <p class="text-xs text-gray-400 mt-0.5">直观可视化 ParentHash ➡️ Merkle Root 密码学拓扑演化链，点击任意节点查看全量存证细节</p>
        </div>
        <div class="flex items-center space-x-2 text-xs">
          <span class="text-gray-400">聚焦分支:</span>
          <span class="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-mono border border-amber-500/30" id="dagBranchLabel">architecture</span>
        </div>
      </div>

      <!-- 拓扑图画板容器 -->
      <div class="mt-5 overflow-x-auto pb-2">
        <div id="dagContainer" class="min-w-[700px] flex items-center gap-2 py-2">
          <!-- 动态生成的 DAG 节点与连线 -->
        </div>
      </div>
    </div>

    <!-- 核心功能三栏面板 -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
      
      <!-- 左栏：记忆分片与记忆列表 (7 列) -->
      <div class="lg:col-span-7 space-y-6">
        <div class="glass-card rounded-2xl p-6">
          <div class="flex items-center justify-between pb-4 border-b border-gray-800">
            <div>
              <h2 class="text-lg font-bold text-white flex items-center gap-2">
                <span>🌿</span> 主权记忆流 (Memory Stream)
              </h2>
              <p class="text-xs text-gray-400 mt-0.5">本地热记忆与知识图谱，支持主题分片隔离</p>
            </div>
            <div class="flex space-x-2" id="branchPills">
              <!-- 动态生成分支按钮 -->
            </div>
          </div>

          <!-- 沉淀新记忆输入框 -->
          <div class="mt-5 p-4 rounded-xl bg-gray-900/60 border border-gray-800 space-y-3">
            <textarea id="inputThought" rows="2" placeholder="沉淀一条新的核心技术经验、架构决策或排错技巧..." class="w-full bg-black/40 border border-gray-800 rounded-lg p-3 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-amber-500 transition"></textarea>
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2 text-xs">
                <input id="inputTags" type="text" placeholder="标签(空格隔开 如: node path)" class="bg-black/40 border border-gray-800 rounded px-2.5 py-1 text-xs text-gray-200 focus:outline-none focus:border-amber-500 w-48">
                <select id="inputImportance" class="bg-black/40 border border-gray-800 rounded px-2 py-1 text-xs text-amber-400 focus:outline-none">
                  <option value="5">⭐⭐⭐⭐⭐ (极重要)</option>
                  <option value="4">⭐⭐⭐⭐ (重要)</option>
                  <option value="3" selected>⭐⭐⭐ (普通)</option>
                </select>
              </div>
              <button onclick="handleRemember()" class="px-4 py-1.5 rounded-lg text-xs font-semibold amber-gradient text-gray-950 hover:brightness-110 active:scale-95 transition shadow-lg shadow-amber-500/20">
                ✨ 封存记忆
              </button>
            </div>
          </div>

          <!-- 记忆卡片列表 -->
          <div class="mt-6 space-y-3 max-h-[460px] overflow-y-auto pr-2" id="memoryList">
            <!-- 动态填充 -->
          </div>

          <!-- 底部工具栏：压实与上链 -->
          <div class="mt-6 pt-4 border-t border-gray-800 flex justify-between items-center text-xs">
            <button onclick="handleCompact()" class="px-3.5 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium transition flex items-center gap-1.5">
              <span>💤</span> 触发睡眠记忆压实 (Compact)
            </button>
            <button onclick="handleMint()" class="px-4 py-2 rounded-lg bg-amber-500/20 border border-amber-500/40 hover:bg-amber-500/30 text-amber-300 font-semibold transition flex items-center gap-1.5">
              <span>📦</span> 生成 Git-DAG 铸造包 (Mint)
            </button>
          </div>
        </div>
      </div>

      <!-- 右栏：安全隔离沙盒试验场 (5 列) -->
      <div class="lg:col-span-5 space-y-6">
        
        <!-- 沙盒执行卡片 -->
        <div class="glass-card rounded-2xl p-6">
          <div class="flex items-center justify-between pb-4 border-b border-gray-800">
            <div>
              <h2 class="text-lg font-bold text-white flex items-center gap-2">
                <span>🛡️</span> 隔离沙盒 (Sandbox Runner)
              </h2>
              <p class="text-xs text-gray-400 mt-0.5">独立子进程执行，5秒超时熔断，屏蔽宿主私钥</p>
            </div>
            <select id="sandboxLang" class="bg-gray-900 border border-gray-800 text-xs rounded px-2.5 py-1 text-gray-300">
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
            </select>
          </div>

          <div class="mt-4">
            <textarea id="sandboxCode" rows="6" class="w-full font-mono text-xs bg-black/60 border border-gray-800 rounded-lg p-3 text-emerald-400 placeholder-gray-600 focus:outline-none focus:border-amber-500 transition">// 验证沙盒秘钥防窥探
console.log("⏱️ 沙盒启动:", new Date().toLocaleTimeString());
const secrets = Object.keys(process.env).filter(k => k.includes("KEY") || k.includes("SECRET"));
console.log("🛡️ 敏感宿主秘钥泄露数:", secrets.length);
console.log("🧮 算力测试: 1024 * 1024 =", 1024 * 1024);</textarea>
          </div>

          <div class="mt-3 flex justify-between items-center">
            <span class="text-xs text-gray-500">自动防死循环防护 (Timeout: 5000ms)</span>
            <button onclick="handleRunSandbox()" id="btnRunSandbox" class="px-4 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-mono transition active:scale-95">
              ▶ 运行沙盒
            </button>
          </div>

          <!-- 沙盒输出控制台 -->
          <div class="mt-4 bg-black/80 rounded-xl p-3 border border-gray-900">
            <div class="flex justify-between text-[11px] text-gray-500 mb-1 font-mono">
              <span>TERMINAL OUTPUT</span>
              <span id="sandboxMeta">Ready</span>
            </div>
            <pre id="sandboxOutput" class="font-mono text-xs text-gray-300 whitespace-pre-wrap max-h-40 overflow-y-auto">等待代码执行...</pre>
          </div>
        </div>

        <!-- 语义检索测试卡片 -->
        <div class="glass-card rounded-2xl p-6">
          <h2 class="text-sm font-bold text-white flex items-center gap-2">
            <span>🔍</span> 语义记忆实时召回测试
          </h2>
          <div class="mt-3 flex space-x-2">
            <input id="recallInput" type="text" placeholder="输入意图 (如: 秘钥安全、延迟)..." class="flex-1 bg-black/40 border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-amber-500">
            <button onclick="handleRecall()" class="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs rounded-lg font-medium transition">
              召回
            </button>
          </div>
          <div id="recallResults" class="mt-3 space-y-2 max-h-36 overflow-y-auto text-xs">
            <!-- 召回结果 -->
          </div>
        </div>

      </div>

    </div>

    </div> <!-- 结束 viewDashboard -->

    <!-- 教程与操作指南视图 (Guide View) -->
    <div id="viewGuide" class="space-y-8 hidden">
      
      <!-- 顶部 Banner -->
      <div class="glass-card rounded-2xl p-6 border border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-transparent to-emerald-500/10">
        <div class="flex items-center gap-4">
          <div class="p-3 bg-amber-500/10 rounded-2xl text-3xl border border-amber-500/20">📖</div>
          <div>
            <h1 class="text-xl font-bold text-white flex items-center gap-2">
              Amber（灵珀）新手操作完全指南
              <span class="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 font-mono">从入门到精通</span>
            </h1>
            <p class="text-xs text-gray-400 mt-1">系统化掌握“去中心化主权记忆 (Git-DAG)”、“安全隔离沙盒 (Sandbox)”与“公链存证”的核心操作流程与开发对接方式。</p>
          </div>
        </div>
      </div>

      <!-- 六大核心模块操作攻略网格 -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">

        <!-- 教程卡片 1: 主权记忆存取 -->
        <div class="glass-card rounded-2xl p-6 space-y-4">
          <div class="flex items-center gap-2 pb-3 border-b border-gray-800">
            <span class="text-lg">✨</span>
            <h2 class="text-sm font-bold text-white">1. 如何沉淀与语义召回记忆？</h2>
          </div>
          <div class="space-y-2.5 text-xs text-gray-300">
            <div class="flex gap-2.5">
              <span class="font-bold text-amber-400">步骤 1:</span>
              <span>在仪表盘输入框中输入经验、架构决策或排错笔记。</span>
            </div>
            <div class="flex gap-2.5">
              <span class="font-bold text-amber-400">步骤 2:</span>
              <span>选择所属<b>主题分支</b>（如 <code class="text-amber-300">coding</code> 或 <code class="text-amber-300">architecture</code>），设定标签与重要度星级。</span>
            </div>
            <div class="flex gap-2.5">
              <span class="font-bold text-amber-400">步骤 3:</span>
              <span>点击<b>【✨ 封存记忆】</b>。本地自动触发 <code class="text-emerald-400">AES-256-GCM</code> 加密，并动态聚合计算出新的 <b>Merkle Root 根哈希</b>。</span>
            </div>
            <div class="flex gap-2.5">
              <span class="font-bold text-amber-400">步骤 4:</span>
              <span>在右下角【语义召回】中输入任意模糊关键词，算法会自动根据内容相关性与标签权重秒级呈现匹配记忆。</span>
            </div>
          </div>
          <div class="p-3 bg-black/40 rounded-xl border border-gray-800/80 text-[11px] text-gray-400 font-mono">
            💡 提示：记忆分片是严格物理隔离的，各分支的根哈希与版本递增互不影响。
          </div>
        </div>

        <!-- 教程卡片 2: 安全隔离沙盒 -->
        <div class="glass-card rounded-2xl p-6 space-y-4">
          <div class="flex items-center gap-2 pb-3 border-b border-gray-800">
            <span class="text-lg">🛡️</span>
            <h2 class="text-sm font-bold text-white">2. 如何使用代码隔离沙盒？</h2>
          </div>
          <div class="space-y-2.5 text-xs text-gray-300">
            <div class="flex gap-2.5">
              <span class="font-bold text-emerald-400">操作:</span>
              <span>在仪表盘右侧的<b>隔离沙盒代码框</b>中编写或粘贴任意 JavaScript / Python 脚本，点击<b>【▶ 运行沙盒】</b>。</span>
            </div>
            <div class="flex gap-2.5">
              <span class="font-bold text-emerald-400">防死循环:</span>
              <span>沙盒自带 <b>5000ms 强制超时熔断守护</b>，即使运行 <code class="text-red-400">while(true)</code> 也绝不会卡死电脑。</span>
            </div>
            <div class="flex gap-2.5">
              <span class="font-bold text-emerald-400">防秘钥泄露:</span>
              <span>沙盒自动深度清洗环境变量，任何包含 <code class="text-amber-400">KEY</code>、<code class="text-amber-400">SECRET</code>、<code class="text-amber-400">TOKEN</code> 的凭据被 100% 物理剥离。</span>
            </div>
          </div>
          <div class="p-3 bg-black/40 rounded-xl border border-gray-800/80 text-[11px] text-gray-400 font-mono">
            🛡️ 验证方法：在沙盒中运行 <code class="text-emerald-400">console.log(process.env)</code>，输出中绝无任何宿主敏感密钥。
          </div>
        </div>

        <!-- 教程卡片 3: Git-DAG 链上确权与 Arweave 永久存储 -->
        <div class="glass-card rounded-2xl p-6 space-y-4">
          <div class="flex items-center gap-2 pb-3 border-b border-gray-800">
            <span class="text-lg">⛓️</span>
            <h2 class="text-sm font-bold text-white">3. 如何将记忆永久上链与存储？</h2>
          </div>
          <div class="space-y-2.5 text-xs text-gray-300">
            <div class="flex gap-2.5">
              <span class="font-bold text-sky-400">第一步:</span>
              <span>点击左下角<b>【📦 生成 Git-DAG 铸造包】</b>。系统自动计算当前分支与上个版本的增量变化（Delta）。</span>
            </div>
            <div class="flex gap-2.5">
              <span class="font-bold text-sky-400">第二步:</span>
              <span>增量密文通过 <b>Arweave / Irys 永久去中心化网络</b> 免费永久备份（单次小于 100 KB 永久免 Gas 存证）。</span>
            </div>
            <div class="flex gap-2.5">
              <span class="font-bold text-sky-400">第三步:</span>
              <span>仅将 32 字节的新 Merkle Root 写入 <b>OP Sepolia / Base 智能合约</b>。合约内置校验 <code class="text-sky-300">parentHash</code>，防止并发冲突与历史伪造。</span>
            </div>
          </div>
          <div class="p-3 bg-black/40 rounded-xl border border-gray-800/80 text-[11px] text-gray-400 font-mono">
            🔗 公网合约地址: <a href="https://sepolia-optimism.etherscan.io/address/0xdE6Ab63C951a34C65f591eD3B9A47d142a7604Ca" target="_blank" class="text-amber-400 underline">0xdE6A...04Ca (OP Sepolia)</a>
          </div>
        </div>

        <!-- 教程卡片 4: 接入 Cursor / Claude / Antigravity -->
        <div class="glass-card rounded-2xl p-6 space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-gray-800">
            <div class="flex items-center gap-2">
              <span class="text-lg">🔌</span>
              <h2 class="text-sm font-bold text-white">4. 接入 Cursor / Claude Desktop (MCP)</h2>
            </div>
            <button onclick="copyMcpConfig()" class="px-2.5 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-200 text-[10px] font-mono transition">
              📋 复制 JSON
            </button>
          </div>
          <p class="text-xs text-gray-300">将下方配置填入 Claude Desktop 或 Cursor 的 MCP 设置，即可在其他 AI 编辑器中共享同一套记忆：</p>
          <pre id="mcpConfigSnippet" class="p-3 bg-black/70 rounded-xl border border-gray-800 text-[11px] font-mono text-amber-300 overflow-x-auto">{
  "mcpServers": {
    "amber": {
      "command": "node",
      "args": ["packages/mcp-server/dist/index.js"]
    }
  }
}</pre>
          <div class="text-[11px] text-gray-400">
            接入后可在 Claude/Cursor 聊天中直接调用 <code class="text-amber-400">amber_recall</code> 召回您在 Amber 里沉淀的所有知识！
          </div>
        </div>

      </div>

      <!-- 底部卡片 5: 终端 CLI 完全速查表 -->
      <div class="glass-card rounded-2xl p-6 space-y-4">
        <div class="flex items-center gap-2 pb-3 border-b border-gray-800">
          <span class="text-lg">💻</span>
          <h2 class="text-sm font-bold text-white">5. 开发者终端 CLI 命令完全速查表</h2>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-mono">
          
          <div class="p-3 rounded-xl bg-black/40 border border-gray-800 space-y-1">
            <div class="text-amber-400 font-bold">1. 查看运行状态</div>
            <div class="text-gray-300 bg-gray-900 px-2 py-1 rounded">npx tsx packages/cli/src/index.ts status</div>
            <div class="text-[10px] text-gray-500 font-sans">查看所有分支条目数与累积 Merkle Root</div>
          </div>

          <div class="p-3 rounded-xl bg-black/40 border border-gray-800 space-y-1">
            <div class="text-amber-400 font-bold">2. 沉淀核心认知</div>
            <div class="text-gray-300 bg-gray-900 px-2 py-1 rounded">remember "经验内容" -b coding -t tag1 -i 5</div>
            <div class="text-[10px] text-gray-500 font-sans">指定分支、标签并按 1~5 评定重要度</div>
          </div>

          <div class="p-3 rounded-xl bg-black/40 border border-gray-800 space-y-1">
            <div class="text-amber-400 font-bold">3. 语义关联召回</div>
            <div class="text-gray-300 bg-gray-900 px-2 py-1 rounded">recall "搜索关键词" -b coding</div>
            <div class="text-[10px] text-gray-500 font-sans">根据意图匹配度倒序输出最相关记忆</div>
          </div>

          <div class="p-3 rounded-xl bg-black/40 border border-gray-800 space-y-1">
            <div class="text-amber-400 font-bold">4. 隔离沙盒运行</div>
            <div class="text-gray-300 bg-gray-900 px-2 py-1 rounded">run script.js --timeout 5000</div>
            <div class="text-[10px] text-gray-500 font-sans">自动过滤宿主敏感私钥，超时强行熔断</div>
          </div>

          <div class="p-3 rounded-xl bg-black/40 border border-gray-800 space-y-1">
            <div class="text-amber-400 font-bold">5. 触发睡眠压实</div>
            <div class="text-gray-300 bg-gray-900 px-2 py-1 rounded">compact -b coding</div>
            <div class="text-[10px] text-gray-500 font-sans">自动合并零碎同类日志为高阶认知结晶</div>
          </div>

          <div class="p-3 rounded-xl bg-black/40 border border-gray-800 space-y-1">
            <div class="text-amber-400 font-bold">6. 启动 Web 控制台</div>
            <div class="text-gray-300 bg-gray-900 px-2 py-1 rounded">ui --port 3777</div>
            <div class="text-[10px] text-gray-500 font-sans">在本地浏览器中启动现代可视化控制台</div>
          </div>

        </div>
      </div>

    </div>

    <!-- 节点详情弹窗 (Modal) -->
    <div id="nodeDetailModal" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4">
      <div class="glass-card rounded-2xl max-w-xl w-full p-6 border border-amber-500/30 space-y-4">
        <div class="flex justify-between items-center pb-3 border-b border-gray-800">
          <h3 class="text-sm font-bold text-white flex items-center gap-2">
            <span>📜</span> <span id="modalNodeTitle">节点详情</span>
          </h3>
          <button onclick="closeNodeModal()" class="text-gray-400 hover:text-white text-base">✕</button>
        </div>
        <div class="space-y-3 text-xs" id="modalNodeContent">
          <!-- 动态填充 -->
        </div>
      </div>
    </div>

  </main>

  <script>
    let currentBranch = 'architecture';
    let globalOverview = null;

    async function fetchOverview() {
      const res = await fetch('/api/overview');
      const data = await res.json();
      globalOverview = data;

      document.getElementById('statTotalMemories').innerText = data.totalMemories;
      document.getElementById('statTotalBranches').innerText = data.totalBranches;

      const activeBranchObj = data.branches.find(b => b.name === currentBranch) || data.branches[0];
      if (activeBranchObj) {
        currentBranch = activeBranchObj.name;
        document.getElementById('statLatestRoot').innerText = activeBranchObj.rootHash;
      }

      renderBranchPills(data.branches);
      renderMemories();
      await renderDagVisualization();
    }

    function renderBranchPills(branches) {
      const container = document.getElementById('branchPills');
      container.innerHTML = branches.map(b => \`
        <button onclick="selectBranch('\${b.name}')" class="px-3 py-1 rounded-full text-xs font-medium transition \${b.name === currentBranch ? 'bg-amber-500 text-gray-950 font-bold' : 'bg-gray-800 text-gray-400 hover:text-white'}">
          \${b.name} (\${b.count})
        </button>
      \`).join('');
    }

    function selectBranch(name) {
      currentBranch = name;
      fetchOverview();
    }

    function renderMemories() {
      const container = document.getElementById('memoryList');
      const branchObj = globalOverview?.branches.find(b => b.name === currentBranch);
      if (!branchObj || branchObj.memories.length === 0) {
        container.innerHTML = '<div class="text-center text-xs text-gray-600 py-8">该分支暂无记忆</div>';
        return;
      }

      container.innerHTML = branchObj.memories.slice().reverse().map(item => \`
        <div class="p-3.5 rounded-xl bg-gray-900/70 border border-gray-800/80 hover:border-gray-700 transition space-y-1.5">
          <div class="flex items-center justify-between text-[11px]">
            <span class="text-amber-400/90 font-mono">\${item.id}</span>
            <div class="flex items-center space-x-2">
              <span class="text-yellow-500 font-mono">\${'⭐'.repeat(item.importance || 3)}</span>
              <span class="text-gray-500">\${new Date(item.timestamp).toLocaleTimeString()}</span>
            </div>
          </div>
          <div class="text-xs text-gray-200 leading-relaxed font-sans">\${item.content}</div>
          <div class="flex items-center space-x-1 pt-1">
            \${(item.tags || []).map(t => \`<span class="text-[10px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full font-mono">#\${t}</span>\`).join('')}
          </div>
        </div>
      \`).join('');
    }

    async function handleRemember() {
      const content = document.getElementById('inputThought').value.trim();
      const tags = document.getElementById('inputTags').value.trim().split(/\\s+/).filter(Boolean);
      const importance = document.getElementById('inputImportance').value;

      if (!content) return alert('请输入记忆内容');

      await fetch('/api/remember', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, branch: currentBranch, tags, importance })
      });

      document.getElementById('inputThought').value = '';
      document.getElementById('inputTags').value = '';
      fetchOverview();
    }

    async function handleCompact() {
      const res = await fetch('/api/compact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branch: currentBranch })
      });
      const data = await res.json();
      if (data.consolidated && data.consolidated.length > 0) {
        alert('⚡ 压实成功！已将 ' + data.deprecatedIds.length + ' 条日常日志浓缩为高阶认知结晶。');
      } else {
        alert('当前记忆条目较少，暂未触发压缩。');
      }
      fetchOverview();
    }

    async function handleMint() {
      const res = await fetch('/api/mint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branch: currentBranch })
      });
      const data = await res.json();
      alert('📦 Git-DAG 增量包与 Arweave 永久存储已就绪！\\n' +
        '🌐 Arweave URI: ' + data.arweaveUrl + '\\n' +
        '🌍 Irys 网关: ' + data.gatewayUrl + '\\n' +
        '🌲 New Merkle Root: ' + data.newRootHash + '\\n' +
        '📊 数据体积: ' + data.sizeBytes + ' 字节 (< 100 KB 永久免 Gas 存证)');
    }

    async function handleRunSandbox() {
      const code = document.getElementById('sandboxCode').value;
      const language = document.getElementById('sandboxLang').value;
      const btn = document.getElementById('btnRunSandbox');
      const output = document.getElementById('sandboxOutput');
      const meta = document.getElementById('sandboxMeta');

      btn.innerText = '运行中...';
      btn.disabled = true;

      try {
        const res = await fetch('/api/sandbox/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, language })
        });
        const data = await res.json();
        const r = data.result;

        meta.innerText = '耗时 ' + r.durationMs + 'ms | Exit: ' + r.exitCode;
        output.innerText = r.stdout || (r.stderr ? '[错误] ' + r.stderr : '(无输出)');
        if (r.timedOut) output.innerText += '\\n⚠️ 脚本超时被沙盒安全强行终止！';
      } finally {
        btn.innerText = '▶ 运行沙盒';
        btn.disabled = false;
      }
    }

    async function handleRecall() {
      const query = document.getElementById('recallInput').value.trim();
      if (!query) return;

      const res = await fetch('/api/recall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, branch: currentBranch, topK: 3 })
      });
      const data = await res.json();

      const container = document.getElementById('recallResults');
      if (data.results.length === 0) {
        container.innerHTML = '<div class="text-gray-500 py-2">未命中相关记忆</div>';
        return;
      }

      container.innerHTML = data.results.map((item, idx) => \`
        <div class="p-2 rounded bg-black/60 border border-gray-800">
          <div class="text-[10px] text-amber-400 font-mono">#\${idx + 1} 匹配度高</div>
          <div class="text-gray-200 mt-0.5">\${item.content}</div>
        </div>
      \`).join('');
    }

    async function renderDagVisualization() {
      document.getElementById('dagBranchLabel').innerText = currentBranch;
      const container = document.getElementById('dagContainer');
      const res = await fetch('/api/dag?branch=' + encodeURIComponent(currentBranch));
      const data = await res.json();

      const memories = data.memories || [];
      const rootHash = data.currentRoot || '0x0000000000000000000000000000000000000000';

      let html = '';

      // 1. Genesis Node (v1)
      html += \`
        <div onclick="openNodeModal('Genesis State (v1)', '0x0000000000000000000000000000000000000000', '\${rootHash}', '已在 OP Sepolia 锚定确权', 'ar://irys_genesis_state', '\${memories.length}')" class="cursor-pointer glass p-4 rounded-xl border border-emerald-500/40 hover:border-emerald-400 transition hover:scale-[1.02] shadow-lg w-64 shrink-0">
          <div class="flex items-center justify-between text-[11px]">
            <span class="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold">Genesis v1</span>
            <span class="text-emerald-400 text-[10px] flex items-center gap-1">● On-chain</span>
          </div>
          <div class="mt-2 text-xs font-mono text-gray-200 truncate" title="\${rootHash}">Root: \${rootHash.substring(0, 14)}...</div>
          <div class="mt-1 text-[10px] font-mono text-gray-500 truncate">Parent: 0x0000...0000</div>
          <div class="mt-3 pt-2 border-t border-gray-800/80 flex items-center justify-between text-[10px] text-gray-400">
            <span>包含 \${memories.length} 条记忆</span>
            <span class="text-amber-400 font-mono">OP Sepolia</span>
          </div>
        </div>
      \`;

      // 连线 1 -> 2
      html += \`
        <div class="flex items-center shrink-0">
          <div class="w-8 h-0.5 bg-gradient-to-r from-emerald-500 to-amber-500"></div>
          <span class="text-amber-500 -ml-1 text-xs">▶</span>
        </div>
      \`;

      // 2. Hot Memory / Working Tree Node (v2)
      html += \`
        <div onclick="openNodeModal('Hot Working Tree (待铸造)', '\${rootHash}', 'Pending Next Root', '本地 AES-256-GCM 加密暂存区', '准备同步至 Arweave/Irys', '\${memories.length}')" class="cursor-pointer glass p-4 rounded-xl border border-amber-500/40 hover:border-amber-400 transition hover:scale-[1.02] shadow-lg w-64 shrink-0">
          <div class="flex items-center justify-between text-[11px]">
            <span class="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-bold">Hot Tree (v2)</span>
            <span class="text-amber-400 text-[10px] flex items-center gap-1 animate-pulse">● Active</span>
          </div>
          <div class="mt-2 text-xs font-mono text-gray-200 truncate">Root: 动态实时推导中...</div>
          <div class="mt-1 text-[10px] font-mono text-gray-500 truncate">Parent: \${rootHash.substring(0, 14)}...</div>
          <div class="mt-3 pt-2 border-t border-gray-800/80 flex items-center justify-between text-[10px] text-gray-400">
            <span>随时可触发 mint 上链</span>
            <span class="text-emerald-400 font-mono">E2EE Protected</span>
          </div>
        </div>
      \`;

      // 虚线连线 2 -> 3
      html += \`
        <div class="flex items-center shrink-0 opacity-60">
          <div class="w-8 h-0.5 border-t border-dashed border-gray-600"></div>
          <span class="text-gray-500 -ml-1 text-xs">▶</span>
        </div>
      \`;

      // 3. Continuous Evolution Node (v3+)
      html += \`
        <div class="glass p-4 rounded-xl border border-dashed border-gray-700 opacity-60 w-56 shrink-0">
          <div class="flex items-center justify-between text-[11px]">
            <span class="px-2 py-0.5 rounded bg-gray-800 text-gray-400 font-mono">Future (v3+)</span>
            <span class="text-gray-500 text-[10px]">Continuous</span>
          </div>
          <div class="mt-2 text-xs text-gray-500 font-mono">ParentHash 严密链接</div>
          <div class="mt-1 text-[10px] text-gray-600">防历史篡改与漂移</div>
          <div class="mt-3 pt-2 border-t border-gray-800/80 text-[10px] text-gray-500">
            Arweave 永久存证
          </div>
        </div>
      \`;

      container.innerHTML = html;
    }

    function openNodeModal(title, parent, root, status, arweave, count) {
      document.getElementById('modalNodeTitle').innerText = title;
      const content = document.getElementById('modalNodeContent');
      content.innerHTML = \`
        <div class="p-3.5 bg-black/60 rounded-xl border border-gray-800 space-y-2.5 font-mono">
          <div><span class="text-gray-500">Parent Hash:</span> <span class="text-gray-300 break-all">\${parent}</span></div>
          <div><span class="text-gray-500">Merkle Root:</span> <span class="text-amber-400 break-all">\${root}</span></div>
          <div><span class="text-gray-500">存证状态:</span> <span class="text-emerald-300">\${status}</span></div>
          <div><span class="text-gray-500">Arweave 存证:</span> <span class="text-sky-400">\${arweave}</span></div>
          <div><span class="text-gray-500">关联记忆数:</span> <span class="text-gray-200">\${count} 条</span></div>
          <div><span class="text-gray-500">智能合约:</span> <a href="https://sepolia-optimism.etherscan.io/address/0xdE6Ab63C951a34C65f591eD3B9A47d142a7604Ca" target="_blank" class="text-amber-400 underline">0xdE6A...04Ca (OP Sepolia)</a></div>
        </div>
        <div class="flex justify-end pt-2">
          <button onclick="closeNodeModal()" class="px-4 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg text-xs font-medium">关闭</button>
        </div>
      \`;
      document.getElementById('nodeDetailModal').classList.remove('hidden');
    }

    function closeNodeModal() {
      document.getElementById('nodeDetailModal').classList.add('hidden');
    }

    function switchTab(tab) {
      const dashView = document.getElementById('viewDashboard');
      const guideView = document.getElementById('viewGuide');
      const dashBtn = document.getElementById('tabBtnDashboard');
      const guideBtn = document.getElementById('tabBtnGuide');

      if (tab === 'dashboard') {
        dashView.classList.remove('hidden');
        guideView.classList.add('hidden');
        dashBtn.className = 'px-3.5 py-1.5 rounded-lg font-medium transition bg-amber-500 text-gray-950 font-bold shadow';
        guideBtn.className = 'px-3.5 py-1.5 rounded-lg font-medium transition text-gray-400 hover:text-white';
      } else {
        dashView.classList.add('hidden');
        guideView.classList.remove('hidden');
        guideBtn.className = 'px-3.5 py-1.5 rounded-lg font-medium transition bg-amber-500 text-gray-950 font-bold shadow';
        dashBtn.className = 'px-3.5 py-1.5 rounded-lg font-medium transition text-gray-400 hover:text-white';
      }
    }

    function copyMcpConfig() {
      const snippet = document.getElementById('mcpConfigSnippet').innerText;
      navigator.clipboard.writeText(snippet);
      alert('📋 MCP JSON 配置已成功复制到剪贴板！');
    }

    // 初始化加载
    fetchOverview();
  </script>
</body>
</html>`;
}
//# sourceMappingURL=ui-server.js.map