export interface MemoryItem {
  id: string;
  branch: string;
  content: string;
  tags: string[];
  importance: number; // 1 ~ 5
  timestamp: number;
}

export interface DeltaMutation {
  added: MemoryItem[];
  deprecatedIds: string[];
}

export interface DeltaPackage {
  version: string;
  branch: string;
  parentHash: string; // 32 字节十六进制哈希
  commitHash: string; // 本次增量计算后的根哈希
  mutations: DeltaMutation;
  timestamp: number;
}

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  authTag: string;
  salt: string;
}

export interface CommitReceipt {
  user: string;
  branch: string;
  branchBytes32: string;
  rootHash: string;
  parentHash: string;
  arweaveTxId: string;
  versionIndex: number;
  timestamp: number;
}

export interface SandboxExecutionOptions {
  code: string;
  language: "python" | "javascript" | "bash";
  timeoutMs?: number;
  cwd?: string;
  env?: Record<string, string>;
}

export interface SandboxExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  durationMs: number;
  timedOut: boolean;
  success: boolean;
}
