#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, ListResourcesRequestSchema, ReadResourceRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { MemoryRuntime, SandboxRuntime } from "@amber/runtime";
/**
 * Amber 官方 MCP 服务器
 * 为 Claude Desktop、Cursor、Windsurf 与 Zed 提供开箱即用的主权记忆与沙盒执行能力
 */
export function createAmberMcpServer() {
    const memoryRuntime = new MemoryRuntime();
    const sandboxRuntime = new SandboxRuntime({ defaultTimeoutMs: 5000 });
    const server = new Server({
        name: "amber-mcp-server",
        version: "0.1.0",
    }, {
        capabilities: {
            tools: {},
            resources: {},
        },
    });
    // 1. 注册可用工具列表
    server.setRequestHandler(ListToolsRequestSchema, async () => {
        return {
            tools: [
                {
                    name: "amber_recall",
                    description: "从 Amber 主权记忆库中检索历史经验、排错记录、编程习惯或决策逻辑。",
                    inputSchema: {
                        type: "object",
                        properties: {
                            query: {
                                type: "string",
                                description: "检索意图或关键词（例如：'Windows 沙盒路径处理'）",
                            },
                            branch: {
                                type: "string",
                                description: "记忆主题分支（默认: 'coding'）",
                                default: "coding",
                            },
                            topK: {
                                type: "number",
                                description: "最多召回几条记忆（默认: 3）",
                                default: 3,
                            },
                        },
                        required: ["query"],
                    },
                },
                {
                    name: "amber_save_thought",
                    description: "将一段新的思考、解决方案、系统架构决策或经验教训存入 Amber 记忆仓。",
                    inputSchema: {
                        type: "object",
                        properties: {
                            content: {
                                type: "string",
                                description: "需要沉淀的核心经验或事实描述",
                            },
                            branch: {
                                type: "string",
                                description: "记忆主题分支（例如: 'coding', 'architecture', 'finance'）",
                                default: "coding",
                            },
                            tags: {
                                type: "array",
                                items: { type: "string" },
                                description: "关联标签（如 ['node', 'path', 'windows']）",
                            },
                            importance: {
                                type: "number",
                                description: "重要度评级 1~5（默认: 3）",
                                default: 3,
                            },
                        },
                        required: ["content"],
                    },
                },
                {
                    name: "amber_compact",
                    description: "触发后台记忆睡眠压实：将零散琐碎的日常调试日志压缩合并为高密度认知结晶。",
                    inputSchema: {
                        type: "object",
                        properties: {
                            branch: {
                                type: "string",
                                description: "需要压实的主题分支（默认: 'coding'）",
                                default: "coding",
                            },
                        },
                    },
                },
                {
                    name: "amber_sandbox_run",
                    description: "在隔离沙盒中安全运行 JavaScript、Python 或 Shell 代码（内置超时防死循环与敏感环境变量过滤）。",
                    inputSchema: {
                        type: "object",
                        properties: {
                            code: {
                                type: "string",
                                description: "待执行的代码字符串",
                            },
                            language: {
                                type: "string",
                                enum: ["javascript", "python", "bash"],
                                description: "运行环境语言类型",
                                default: "javascript",
                            },
                            timeoutMs: {
                                type: "number",
                                description: "超时熔断毫秒数（默认 5000ms）",
                                default: 5000,
                            },
                        },
                        required: ["code"],
                    },
                },
                {
                    name: "amber_create_mint_commit",
                    description: "生成可上链的 Git-DAG 增量数据包与最新累积 Merkle Root（准备铸造存证至 Base 链）。",
                    inputSchema: {
                        type: "object",
                        properties: {
                            branch: {
                                type: "string",
                                description: "主题分支（默认: 'coding'）",
                                default: "coding",
                            },
                        },
                    },
                },
            ],
        };
    });
    // 2. 处理工具调用
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;
        switch (name) {
            case "amber_recall": {
                const query = String(args?.query || "");
                const branch = String(args?.branch || "coding");
                const topK = Number(args?.topK || 3);
                const results = memoryRuntime.recall(branch, query, topK);
                return {
                    content: [
                        {
                            type: "text",
                            text: results.length > 0
                                ? JSON.stringify(results, null, 2)
                                : `在分支 [${branch}] 下未找到与 "${query}" 高度相关的历史记忆。`,
                        },
                    ],
                };
            }
            case "amber_save_thought": {
                const content = String(args?.content || "");
                const branch = String(args?.branch || "coding");
                const tags = Array.isArray(args?.tags) ? args.tags.map(String) : [];
                const importance = Number(args?.importance || 3);
                const item = memoryRuntime.addThought(branch, content, tags, importance);
                const currentRoot = memoryRuntime.getCurrentRootHash(branch);
                return {
                    content: [
                        {
                            type: "text",
                            text: `✅ 经验已记录至 Amber [${branch}] 分支！\nID: ${item.id}\n当前累积 Merkle Root: ${currentRoot}`,
                        },
                    ],
                };
            }
            case "amber_compact": {
                const branch = String(args?.branch || "coding");
                const result = await memoryRuntime.compact(branch);
                if (result.consolidated.length === 0) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `分支 [${branch}] 当前记忆条目较少或无需合并，暂未触发压实。`,
                            },
                        ],
                    };
                }
                return {
                    content: [
                        {
                            type: "text",
                            text: `⚡ 记忆压实完成！已将 ${result.deprecatedIds.length} 条琐碎日志浓缩为 ${result.consolidated.length} 条高阶认知结晶。\n新生成认知: "${result.consolidated[0].content}"`,
                        },
                    ],
                };
            }
            case "amber_sandbox_run": {
                const code = String(args?.code || "");
                const language = args?.language || "javascript";
                const timeoutMs = Number(args?.timeoutMs || 5000);
                const result = await sandboxRuntime.execute({
                    code,
                    language,
                    timeoutMs,
                });
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(result, null, 2),
                        },
                    ],
                };
            }
            case "amber_create_mint_commit": {
                const branch = String(args?.branch || "coding");
                const commit = memoryRuntime.createDeltaCommit(branch);
                return {
                    content: [
                        {
                            type: "text",
                            text: `📦 Git-DAG 增量打包已就绪！\nBranch: ${branch}\nParent Hash: ${commit.parentHash}\nNew Merkle Root: ${commit.newRootHash}\n包含新增条目数: ${commit.deltaPackage.mutations.added.length}\n加密数据指纹: ${commit.encryptedPayload.ciphertext.substring(0, 32)}...`,
                        },
                    ],
                };
            }
            default:
                throw new Error(`Unknown Amber tool: ${name}`);
        }
    });
    // 3. 注册资源读取能力
    server.setRequestHandler(ListResourcesRequestSchema, async () => {
        return {
            resources: [
                {
                    uri: "amber://memory/coding",
                    name: "Amber 编程与架构分支记忆",
                    mimeType: "application/json",
                },
                {
                    uri: "amber://memory/finance",
                    name: "Amber 投资与财务分支记忆",
                    mimeType: "application/json",
                },
            ],
        };
    });
    server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
        const uri = request.params.uri;
        const branch = uri.replace("amber://memory/", "");
        const memories = memoryRuntime.getActiveMemories(branch);
        return {
            contents: [
                {
                    uri,
                    mimeType: "application/json",
                    text: JSON.stringify(memories, null, 2),
                },
            ],
        };
    });
    return { server, memoryRuntime, sandboxRuntime };
}
// 如果作为主入口直接运行（Stdio 模式）
if (process.argv[1] && process.argv[1].endsWith("index.js")) {
    const { server } = createAmberMcpServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("🚀 Amber MCP Server running on Stdio transport");
}
//# sourceMappingURL=index.js.map