import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import type {
  SandboxExecutionOptions,
  SandboxExecutionResult,
} from "../memory/types.js";

/**
 * Amber 沙盒运行时
 * 负责在隔离子进程中安全执行代码（Python/Node/Bash），提供超时熔断与环境变量清洗
 */
export class SandboxRuntime {
  private defaultTimeoutMs: number;
  private maxOutputBytes: number;

  constructor(options?: { defaultTimeoutMs?: number; maxOutputBytes?: number }) {
    this.defaultTimeoutMs = options?.defaultTimeoutMs ?? 5000; // 默认 5 秒熔断
    this.maxOutputBytes = options?.maxOutputBytes ?? 100 * 1024; // 默认最多输出 100KB
  }

  /**
   * 环境变量安全清洗：屏蔽所有敏感秘钥，防止代码被注入后盗取宿主资产
   */
  private sanitizeEnv(customEnv?: Record<string, string>): Record<string, string> {
    const safeEnv: Record<string, string> = {
      PATH: process.env.PATH || "",
      LANG: "en_US.UTF-8",
      NODE_ENV: "production",
      PYTHONUNBUFFERED: "1",
    };

    // 严禁传递任何包含 KEY、SECRET、MNEMONIC、TOKEN 的宿主敏感环境变量
    if (customEnv) {
      for (const [key, value] of Object.entries(customEnv)) {
        const upper = key.toUpperCase();
        if (
          !upper.includes("KEY") &&
          !upper.includes("SECRET") &&
          !upper.includes("MNEMONIC") &&
          !upper.includes("TOKEN")
        ) {
          safeEnv[key] = value;
        }
      }
    }

    return safeEnv;
  }

  /**
   * 在沙盒中安全运行代码
   */
  public async execute(options: SandboxExecutionOptions): Promise<SandboxExecutionResult> {
    const startTime = Date.now();
    const timeout = options.timeoutMs ?? this.defaultTimeoutMs;
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "amber-sandbox-"));

    let command: string;
    let args: string[] = [];
    let scriptFilePath: string | null = null;

    try {
      if (options.language === "python") {
        command = process.platform === "win32" ? "python" : "python3";
        scriptFilePath = path.join(tempDir, "script.py");
        await fs.writeFile(scriptFilePath, options.code, "utf8");
        args = [scriptFilePath];
      } else if (options.language === "javascript") {
        command = "node";
        scriptFilePath = path.join(tempDir, "script.js");
        await fs.writeFile(scriptFilePath, options.code, "utf8");
        args = [scriptFilePath];
      } else {
        // bash / powershell
        if (process.platform === "win32") {
          command = "powershell.exe";
          args = ["-NoProfile", "-NonInteractive", "-Command", options.code];
        } else {
          command = "bash";
          args = ["-c", options.code];
        }
      }

      return await new Promise<SandboxExecutionResult>((resolve) => {
        let stdout = "";
        let stderr = "";
        let timedOut = false;

        const child = spawn(command, args, {
          cwd: options.cwd || tempDir,
          env: this.sanitizeEnv(options.env),
          stdio: ["ignore", "pipe", "pipe"],
        });

        // 超时熔断计时器
        const timer = setTimeout(() => {
          timedOut = true;
          try {
            child.kill("SIGKILL");
          } catch {
            // ignore
          }
        }, timeout);

        child.stdout.on("data", (chunk: Buffer) => {
          if (stdout.length < this.maxOutputBytes) {
            stdout += chunk.toString("utf8");
          }
        });

        child.stderr.on("data", (chunk: Buffer) => {
          if (stderr.length < this.maxOutputBytes) {
            stderr += chunk.toString("utf8");
          }
        });

        child.on("close", (exitCode) => {
          clearTimeout(timer);
          const durationMs = Date.now() - startTime;

          resolve({
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            exitCode,
            durationMs,
            timedOut,
            success: exitCode === 0 && !timedOut,
          });
        });

        child.on("error", (err) => {
          clearTimeout(timer);
          const durationMs = Date.now() - startTime;

          resolve({
            stdout: stdout.trim(),
            stderr: `${stderr}\nProcess error: ${err.message}`.trim(),
            exitCode: -1,
            durationMs,
            timedOut: false,
            success: false,
          });
        });
      });
    } finally {
      // 清理临时沙盒工作区
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch {
        // ignore cleanup errors
      }
    }
  }
}
