# Amber MCP Server (`@amber/mcp-server`)

这是 **Amber（灵珀）** 的官方 **Model Context Protocol (MCP)** 服务，遵循 Anthropic 开放协议标准。

它能够让你的 **Cursor**、**Claude Desktop**、**Windsurf** 或 **Zed** 编辑器一键挂载 Amber 的**主权记忆库**与**安全隔离沙盒**！

---

## 暴露的 5 大 MCP 核心工具

1. **`amber_recall`**: 检索特定主题分支（如 `coding`）下的历史排错经验、架构决策与习惯。
2. **`amber_save_thought`**: 将一段新的核心认知或解决方案沉淀进 Amber。
3. **`amber_compact`**: 触发后台记忆压实，将零散琐碎日志浓缩为高阶知识结晶。
4. **`amber_sandbox_run`**: 在隔离环境中安全执行代码（超时自动熔断防死循环，清洗敏感环境变量）。
5. **`amber_create_mint_commit`**: 生成准备铸造上链到 Base 链的 Git-DAG 增量包与 Merkle Root。

---

## 快速配置接入

### 1. 配置到 Claude Desktop
打开 Claude Desktop 配置文件（Windows: `%APPDATA%\Claude\claude_desktop_config.json`，macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`），添加如下配置：

```json
{
  "mcpServers": {
    "amber": {
      "command": "node",
      "args": [
        "c:/Users/13605/Documents/antigravity/beautiful-maxwell/packages/mcp-server/dist/index.js"
      ]
    }
  }
}
```

### 2. 配置到 Cursor IDE
在 Cursor 的 `Settings -> Features -> MCP` 中，点击 **"Add New MCP Server"**：
* **Name**: `amber`
* **Type**: `command`
* **Command**: `node c:/Users/13605/Documents/antigravity/beautiful-maxwell/packages/mcp-server/dist/index.js`

---

## 本地测试与构建
```bash
# 运行单元测试
npm test

# 重新编译构建
npm run build
```
