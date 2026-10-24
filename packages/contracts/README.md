# AmberMind 智能合约原型 (`packages/contracts`)

本模块为 **AmberMind（灵珀）** 的核心链上主权存证与版本管理基础设施，部署在 **Base (以太坊 L2)** 网络上。

---

## 核心技术特性

1. **Git-DAG 增量版本树（Delta Commits）**：
   - 每次提交强制校验 `parentHash`，防并发冲突与状态分叉。
   - 无论数据积累多大，链上永远只存 32 字节哈希根与 Arweave 指针，**Gas 成本恒定在几厘钱**。
2. **多主题分片隔离（Topic Sharding）**：
   - 支持多分支独立进化（如 `coding`, `finance`, `diary`），分支间版本互不干扰。
3. **企业级权限与安全控制**：
   - **UUPS (ERC-1967)** 可升级代理模式，逻辑平滑升级时历史存证数据完好无损。
   - **Pausable** 紧急熔断机制，遭遇异常时管理员可秒级暂停写入。

---

## 快速上手与命令

### 1. 运行自动化单元测试
```bash
npm test
```
*已覆盖权限初始化、创世提交、父哈希链式校验、分片隔离、Pausable 熔断与 UUPS 升级等 10 项核心安全用例。*

### 2. 本地模拟部署
```bash
npm run deploy:local
```

### 3. 部署到 Base Sepolia 测试网
1. 复制 `.env.example` 为 `.env` 并填写你的测试钱包私钥：
   ```bash
   cp .env.example .env
   ```
2. 确保测试钱包有少量 Base Sepolia 测试 ETH（可从 [Base Faucet](https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet) 免费领取）。
3. 执行一键部署：
   ```bash
   npm run deploy:base-sepolia
   ```
