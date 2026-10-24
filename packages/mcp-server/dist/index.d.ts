#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { MemoryRuntime, SandboxRuntime } from "@amber/runtime";
/**
 * Amber 官方 MCP 服务器
 * 为 Claude Desktop、Cursor、Windsurf 与 Zed 提供开箱即用的主权记忆与沙盒执行能力
 */
export declare function createAmberMcpServer(): {
    server: Server<{
        method: string;
        params?: {
            [x: string]: unknown;
            _meta?: {
                [x: string]: unknown;
                progressToken?: string | number | undefined;
                "io.modelcontextprotocol/related-task"?: {
                    taskId: string;
                } | undefined;
            } | undefined;
        } | undefined;
    }, {
        method: string;
        params?: {
            [x: string]: unknown;
            _meta?: {
                [x: string]: unknown;
                progressToken?: string | number | undefined;
                "io.modelcontextprotocol/related-task"?: {
                    taskId: string;
                } | undefined;
            } | undefined;
        } | undefined;
    }, {
        [x: string]: unknown;
        _meta?: {
            [x: string]: unknown;
            progressToken?: string | number | undefined;
            "io.modelcontextprotocol/related-task"?: {
                taskId: string;
            } | undefined;
        } | undefined;
    }>;
    memoryRuntime: MemoryRuntime;
    sandboxRuntime: SandboxRuntime;
};
//# sourceMappingURL=index.d.ts.map