# Amber Core Runtime (`@amber/runtime`)

这是 **Amber（灵珀）** 的核心本地双运行时模块，使用 **纯 TypeScript (ESM)** 开发。

---

## 包含的核心组件

1. **`SandboxRuntime` (沙盒执行运行时)**:
   - 具备严格的超时熔断（Timeout Guard，默认 5 秒自动杀死死循环进程）；
   - 敏感环境变量安全清洗（屏蔽所有含 KEY、SECRET、TOKEN 的宿主资产秘钥）；
   - 支持安全执行 Python 脚本、Node.js 脚本与系统命令。

2. **`MemoryRuntime` (主权记忆运行时)**:
   - **Git-DAG 增量打包**：维护版本链条，自动链接 `parentHash`，计算累积 Merkle Root；
   - **冷热分层存储**：实时热工作区 + 持久温存储；
   - **睡眠压实机制（Compaction）**：将日常冗余、低重要度的调试日志压缩为高密度认知结晶；
   - **本地端到端加密（E2EE）**：基于 `AES-256-GCM`，确保存储至去中心化网络的数据仅钥匙主人可解密。

3. **`AmberContractClient` (Base 链智能合约连接器)**:
   - 封装与 `AmberRegistry.sol` 的交互，一键完成增量哈希上链确权。

---

## 运行测试
```bash
npm test
```
*自动运行沙盒隔离、死循环熔断、AES 加解密、记忆压实与 Git-DAG 版本链推导演示。*

## 编译打包
```bash
npm run build
```
输出类型定义与代码至 `dist/`。
