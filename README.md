<div align="center">

# 💎 Amber（灵珀）

**Next-Gen Autonomous AI Agent Platform with Isolated Sandboxes & Sovereign Git-DAG Memory**

*“代码在沙盒狂奔，灵魂在琥珀沉淀。”*  
*(Run safely in the sandbox. Rest eternally in amber.)*

[![CI Build & Test](https://github.com/amber-agent/amber/actions/workflows/ci.yml/badge.svg)](https://github.com/amber-agent/amber/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-amber.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/Node.js-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)
[![OP Sepolia Verified](https://img.shields.io/badge/Contract-OP%20Sepolia%20Verified-blue.svg)](https://sepolia-optimism.etherscan.io/address/0xdE6Ab63C951a34C65f591eD3B9A47d142a7604Ca)
[![MCP Compatible](https://img.shields.io/badge/Protocol-Anthropic%20MCP-purple.svg)](https://modelcontextprotocol.io/)

[English](#-english) | [中文说明](#-中文指南) | [快速上手](#-quickstart) | [链上存证](#-live-on-chain-contracts) | [MCP 配置](#-mcp-integration)

</div>

---

## 🌟 Highlights (核心特性)

Amber 是专为自主 AI 智能体设计的**去中心化主权记忆与隔离沙盒系统**。它将 Agent 的认知演进从中心化厂商绑架中解放出来，同时为代码执行提供物理级安全围栏。

```
+-------------------------------------------------------------------------+
|                          AGENT BRAIN (LLM)                              |
|                   Antigravity / Claude / Cursor                         |
+------------------------------------+------------------------------------+
                                     | (MCP Protocol / CLI)
                                     v
+------------------------------------+------------------------------------+
|                         AMBER SOVEREIGN LAYER                           |
|                                                                         |
|  +------------------------------+     +------------------------------+  |
|  |     Memory Runtime (DAG)     |     |   Sandbox Execution Guard    |  |
|  | - Hot/Warm Memory Shards     |     | - Subprocess Process Tree    |  |
|  | - Local AES-256-GCM E2EE     |     | - Host Credential Scrubbing  |  |
|  | - Sleep Compaction Engine    |     | - 5000ms Auto Timeout Breaker|  |
|  | - Multi-vector Semantic Recall|    | - Memory & Stdout Redirection|  |
|  +--------------+---------------+     +------------------------------+  |
|                 | Merkle Lineage (parentHash)                           |
+-----------------|-------------------------------------------------------+
                  v (32-byte Root Hash Commit < $0.005 Gas)
+-----------------+-------------------------------------------------------+
|                       DECENTRALIZED SETTLEMENT                          |
|             Optimism / Base Layer-2 (AmberRegistry.sol)                 |
+-------------------------------------------------------------------------+
```

1. **🌿 Git-DAG 主权记忆 (Sovereign Memory)**:
   - 告别对中心化向量数据库的依赖。记忆通过父哈希（`parentHash`）严格按链式演进，杜绝幻觉漂移与历史篡改。
   - 每一条沉淀均在本地通过 `AES-256-GCM` 端到端加密，用户私钥是唯一的解密钥匙。
2. **🛡️ 物理隔离安全沙盒 (Safe Sandbox Runner)**:
   - 隔离子进程执行 Python、JavaScript 与 Bash 脚本。
   - 5 秒超时自动强行熔断，宿主环境变量中包含 `KEY`、`SECRET`、`TOKEN` 的敏感凭据 100% 自动物理剥离。
3. **⛓️ 极低成本链上存证 (L2 On-Chain Anchoring)**:
   - 链上仅存 32 字节 Merkle Root，单次增量确权在 Optimism/Base 成本低至 **< $0.005**。
   - 现已在 **Optimism Sepolia 公链上线验证**，由用户私钥拥有最高主权控制权限。
4. **🔌 原生 Anthropic MCP 协议支持**:
   - 一行配置即可无缝接入 **Antigravity**、**Claude Desktop**、**Cursor** 与 **Zed**。
5. **🌐 现代暗黑 Web 控制台 (Amber Web Dashboard)**:
   - 内置晶体暗黑风格可视化仪表盘，提供实时记忆图谱、语义召回试验场、在浏览器中直跑沙盒及链上铸造预览。

---

## ⚡ Quickstart

### 1. 安装与一键启动

```bash
# 全局安装或直接克隆
git clone https://github.com/amber-agent/amber.git
cd amber

# 一键安装依赖并构建
npm install
npm run build

# 启动 Amber 可视化控制台 (默认端口 3777)
npm run ui
```

打开浏览器访问 **[http://localhost:3777](http://localhost:3777)** 即可体验完整控制台！

### 2. 终端 CLI 使用指南

```bash
# 1. 沉淀一条高价值认知（指定主题分支、标签与重要度）
npx tsx packages/cli/src/index.ts remember "分布式一致性：Paxos 与 Raft 核心差异在于领导者强选主" -b coding -t distributed raft -i 5

# 2. 语义关联召回相关知识
npx tsx packages/cli/src/index.ts recall "分布式 选主" -b coding

# 3. 查看本地主题分片与累积 Merkle Root 指纹
npx tsx packages/cli/src/index.ts status

# 4. 在隔离沙盒中安全运行脚本（防秘钥窥探与死循环）
npx tsx packages/cli/src/index.ts run ./scripts/demo.js --timeout 5000

# 5. 生成 Git-DAG 增量上链铸造包
npx tsx packages/cli/src/index.ts mint -b coding
```

---

## 🔌 MCP Integration (即插即用)

Amber 官方提供符合 Anthropic Model Context Protocol 标准的 Stdio MCP 服务器。

### 接入 Antigravity / Claude Desktop / Cursor

在您的 MCP 配置文件（如 `claude_desktop_config.json` 或 `~/.gemini/config/mcp_config.json`）中添加：

```json
{
  "mcpServers": {
    "amber": {
      "command": "node",
      "args": [
        "c:/path/to/amber/packages/mcp-server/dist/index.js"
      ]
    }
  }
}
```

### 暴露的 5 大核心工具：
* `amber_save_thought`: 将核心架构决策、排错经验沉淀为不可逆认知结晶。
* `amber_recall`: 根据多维意图相关性召回历史沉淀记忆。
* `amber_compact`: 在 Agent 空闲/睡眠阶段触发零碎日志压实。
* `amber_sandbox_run`: 在隔离沙盒中安全执行代码，免除系统受损与秘钥泄露风险。
* `amber_create_mint_commit`: 生成已端到端加密的 Git-DAG 增量链上锚定包。

---

## ⛓️ Live On-Chain Contracts (公网已部署)

Amber 核心确权合约已正式部署至 **Optimism Sepolia 测试公网**，支持完全主权控制与平滑升级：

| 合约 / 事务 | 公网地址与浏览器链接 |
| :--- | :--- |
| **📝 AmberRegistry Proxy (用户主交互入口)** | [`0xdE6Ab63C951a34C65f591eD3B9A47d142a7604Ca`](https://sepolia-optimism.etherscan.io/address/0xdE6Ab63C951a34C65f591eD3B9A47d142a7604Ca) |
| **⚙️ Logic Implementation 合约** | [`0x7328386D8a232B684fad2B8859bfc02D6d1ADa17`](https://sepolia-optimism.etherscan.io/address/0x7328386D8a232B684fad2B8859bfc02D6d1ADa17) |
| **🎉 创世 Git-DAG 记忆提交 Tx** | [`0xc6c55b4d288f47d56864100e89716baf3b3a78ad9199902fd578e33ef92e0536`](https://sepolia-optimism.etherscan.io/tx/0xc6c55b4d288f47d56864100e89716baf3b3a78ad9199902fd578e33ef92e0536) |
| **👑 治理机制** | **UUPS (ERC-1967) 可升级** + **Pausable 熔断** + **AccessControl** |

---

## 🏗️ Monorepo 模块架构

```text
amber/
├── packages/
│   ├── contracts/        # [Solidity/Hardhat] OP/Base 智能合约、UUPS 代理、10/10 测试
│   ├── runtime/          # [TypeScript] 核心运行时 (Git-DAG 增量计算, 沙盒环境, E2EE 加密)
│   ├── mcp-server/       # [TypeScript] 官方 Anthropic MCP 标准服务器
│   └── cli/              # [TypeScript] 终端命令行与 Web 控制台 UI (Single Page App)
├── scripts/
│   ├── run-all-tests.js  # 30/30 项全量自动化测试套件执行器
│   └── e2e-demo.js       # 端到端全链路仿真运行脚本
├── .github/workflows/    # GitHub Actions 自动化 CI 流水线
├── CONTRIBUTING.md       # 开发者贡献指南
└── LICENSE               # MIT 开源协议
```

### 自动化质量测试验证 (30/30 全部通过)

```bash
npm test
```

```text
==================================================
💎 Amber Monorepo: 自动化全量质量保证测试套件
==================================================
✔ [通过] 1. 智能合约测试 (@amber/contracts)      - 10 passing
✔ [通过] 2. 核心运行时测试 (@amber/runtime)        - 5 passing
✔ [通过] 3. 官方 MCP 服务测试 (@amber/mcp-server)  - 5 passing
✔ [通过] 4. 终端 CLI 与 Web UI (@amber/cli)       - 10 passing
==================================================
🎉 全部 4 大模块所有单元测试与集成测试 100% 通过！
==================================================
```

---

## 🔒 Security & Privacy (安全与隐私设计)

* **零秘钥泄露保证**：所有沙盒子进程启动时，执行环境字典均经过深度过滤，任何包含 `API_KEY`、`SECRET`、`TOKEN`、`PASSWORD` 的变量自动剥离。
* **本地加密优先 (Local-First)**：敏感数据落盘与传输前均经过本地客户端基于用户私钥派生的 `AES-256-GCM` 算法加密。
* **状态防篡改验证**：每次提交必须显式指定 `parentHash`，智能合约在 EVM 内部自动校验前序状态连续性，防止并发分叉与历史伪造。

---

## 📄 License

本项目采用 [MIT License](LICENSE) 开源协议。欢迎全球开发者 Fork、构建生态插件与提交 Pull Request！
