# Amber CLI (`@amber/cli`)

**Amber** 官方开发者终端命令行工具，在终端一键管理主权记忆与安全隔离沙盒。

---

## 常用命令一览

### 1. 查看当前运行时与分支状态
```bash
amber status
```
展示当前所有主题分支（如 `coding`, `finance`）的活跃条目数和累积 Merkle Root。

### 2. 沉淀一段新经验
```bash
amber remember "在分布式系统中，UDS 进程间通信比本地 HTTP 延迟降低 60%" -b coding -t ipc uds perf -i 5
```

### 3. 语义与关键词召回
```bash
amber recall "UDS 性能优化" -b coding
```

### 4. 触发记忆睡眠压实
```bash
amber compact -b coding
```

### 5. 准备铸造增量上链包
```bash
amber mint -b coding
```
输出本次增量变更的父哈希（Parent Hash）、新根哈希（New Merkle Root）和本地 E2EE 密文。

### 6. 在隔离沙盒中安全运行代码
```bash
amber run script.py --timeout 3000
```
隔离执行并在终端捕获标准输出与标准错误，遇到死循环自动熔断终止。
