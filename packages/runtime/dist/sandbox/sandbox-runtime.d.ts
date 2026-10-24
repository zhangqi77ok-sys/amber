import type { SandboxExecutionOptions, SandboxExecutionResult } from "../memory/types.js";
/**
 * Amber 沙盒运行时
 * 负责在隔离子进程中安全执行代码（Python/Node/Bash），提供超时熔断与环境变量清洗
 */
export declare class SandboxRuntime {
    private defaultTimeoutMs;
    private maxOutputBytes;
    constructor(options?: {
        defaultTimeoutMs?: number;
        maxOutputBytes?: number;
    });
    /**
     * 环境变量安全清洗：屏蔽所有敏感秘钥，防止代码被注入后盗取宿主资产
     */
    private sanitizeEnv;
    /**
     * 在沙盒中安全运行代码
     */
    execute(options: SandboxExecutionOptions): Promise<SandboxExecutionResult>;
}
//# sourceMappingURL=sandbox-runtime.d.ts.map