import http from "node:http";
import path from "node:path";
import { MemoryRuntime, SandboxRuntime } from "@amber/runtime";
import { LocalStorage } from "./storage.js";

const storage = new LocalStorage();

export function createAmberUiServer(port: number = 3777) {
  const sandbox = new SandboxRuntime({ defaultTimeoutMs: 5000 });

  async function getHydratedMemory(): Promise<MemoryRuntime> {
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

      const totalMemories = branches.reduce(
        (sum, b) => sum + (data.branches[b]?.length || 0),
        0
      );

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          success: true,
          totalMemories,
          totalBranches: branches.length,
          branches: branchDetails,
        })
      );
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
          if (!data.branches[branch]) data.branches[branch] = [];
          data.branches[branch].push(item);
          await storage.save(data);

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              success: true,
              item,
              rootHash: memory.getCurrentRootHash(branch),
            })
          );
        } catch (e: any) {
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
        } catch (e: any) {
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
        } catch (e: any) {
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

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              success: true,
              parentHash: commit.parentHash,
              newRootHash: commit.newRootHash,
              addedCount: commit.deltaPackage.mutations.added.length,
              ciphertextPreview: commit.encryptedPayload.ciphertext.substring(0, 32) + "...",
            })
          );
        } catch (e: any) {
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
        } catch (e: any) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: false, error: e.message }));
        }
      });
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
    listen: () =>
      new Promise<void>((resolve) => {
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
function renderAmberDashboardHtml(): string {
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
      <div class="flex items-center space-x-4">
        <div class="flex items-center space-x-2 text-xs text-gray-400 bg-gray-900/80 px-3 py-1.5 rounded-full border border-gray-800">
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Base L2 / Git-DAG 状态同步中</span>
        </div>
      </div>
    </div>
  </header>

  <!-- 主体内容区域 -->
  <main class="max-w-7xl mx-auto px-6 py-8 flex-1 w-full space-y-8">
    
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
        <div class="text-xs text-gray-500 mt-1.5 flex justify-between">
          <span>随时准备唤起指纹锚定存证</span>
          <span class="text-amber-400/80">Base Sepolia #84532</span>
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

  </main>

  <script>
    let currentBranch = 'coding';
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
      alert('📦 Git-DAG 上链数据包已构建！\\nParentHash: ' + data.parentHash.substring(0, 16) + '...\\nNew Root: ' + data.newRootHash + '\\nE2EE 密文: ' + data.ciphertextPreview);
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

    // 初始化加载
    fetchOverview();
  </script>
</body>
</html>`;
}
