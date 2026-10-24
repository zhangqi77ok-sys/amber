# 💎 Amber（灵珀）

> **“代码在沙盒狂奔，灵魂在琥珀沉淀”**  
> *Run in the sandbox. Rest in amber.*

Amber 是新一代拥有 **强隔离沙盒执行能力** 与 **去中心化可验证主权记忆** 的自主 AI 智能体系统。

---

## 模块架构全览 (Monorepo)

```text
beautiful-maxwell/
├── packages/
│   ├── contracts/        # [Solidity/Hardhat] Base 链主权确权与 Git-DAG 增量合约
│   ├── runtime/          # [Pure TypeScript] 核心双运行时 (Memory DAG + Sandbox Isolation)
│   ├── mcp-server/       # [TypeScript] 官方 MCP 服务 (Claude/Cursor/Antigravity 即插即用)
│   └── cli/              # [TypeScript] 用户面对的 amber 终端命令行工具
```

### 1. `packages/contracts`
* **底层网络**：Base (以太坊 Layer-2) + Arweave 永久存储
* **核心合约**：[`AmberRegistry.sol`](file:///packages/contracts/contracts/AmberRegistry.sol)
* **核心特性**：UUPS 可升级代理、Pausable 紧急熔断、Git-DAG 增量根哈希链式审计、主题分片（Topic Shards）。
* **自动化测试**：10/10 单元测试全部通过。

### 2. `packages/runtime`
* **记忆运行时**：冷热分层、增量版本推导、后台睡眠压实（Compaction）、本地 `AES-256-GCM` 端到端加密（E2EE）。
* **沙盒运行时**：隔离子进程执行、超时自动熔断（防死循环）、宿主敏感环境变量清洗。
* **自动化测试**：5/5 单元测试全部通过。

### 3. `packages/mcp-server`
* 遵循 Anthropic Model Context Protocol 开放标准。
* 暴露 5 大工具：`amber_recall`、`amber_save_thought`、`amber_compact`、`amber_sandbox_run`、`amber_create_mint_commit`。
* 已成功接入当前 **Antigravity** 环境，并支持直接接入 **Cursor** 与 **Claude Desktop**。

### 4. `packages/cli`
* 提供终端友好的一键命令行：
  * `amber status`：查看本地记忆分支与累积 Merkle Root
  * `amber remember <thought>`：沉淀新经验
  * `amber recall <query>`：语义相关性召回
  * `amber compact`：触发记忆压实
  * `amber mint`：生成 Base 链增量铸造数据包
  * `amber run <script>`：在隔离沙盒中安全运行代码

---

## 快速上手

```bash
# 进入 CLI 目录
cd packages/cli

# 查看运行状态
npm run dev -- status

# 沉淀第一条认知
npm run dev -- remember "测试沉淀一条关于分布式系统的核心设计" -b coding -t architecture -i 5

# 检索召回
npm run dev -- recall "分布式系统" -b coding

# 在沙盒中安全运行脚本
npm run dev -- run test_script.js
```
