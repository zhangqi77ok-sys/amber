export interface MemoryItem {
    id: string;
    branch: string;
    content: string;
    tags: string[];
    importance: number;
    timestamp: number;
}
export interface DeltaMutation {
    added: MemoryItem[];
    deprecatedIds: string[];
}
export interface DeltaPackage {
    version: string;
    branch: string;
    parentHash: string;
    commitHash: string;
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
//# sourceMappingURL=types.d.ts.map