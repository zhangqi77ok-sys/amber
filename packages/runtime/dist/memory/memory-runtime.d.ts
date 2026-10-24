import type { MemoryItem, DeltaPackage, CommitReceipt, EncryptedPayload } from "./types.js";
/**
 * Amber 记忆运行时核心
 * 管理本地冷热分层、Git-DAG 增量打包、睡眠压实与语义召回
 */
export declare class MemoryRuntime {
    private warmStorage;
    private pendingDeltas;
    private commitHistory;
    constructor();
    /**
     * 将主题名称转为 bytes32（对应 Solidity 合约中的 branch 标识）
     */
    getBranchBytes32(branch: string): string;
    /**
     * 记录一条新的思考/观察（写入热工作区与待提交增量）
     */
    addThought(branch: string, content: string, tags?: string[], importance?: number): MemoryItem;
    /**
     * 获取指定分支的所有当前活跃记忆
     */
    getActiveMemories(branch: string): MemoryItem[];
    /**
     * 计算指定分支当前的累积 Merkle Root
     */
    getCurrentRootHash(branch: string): string;
    /**
     * 获取指定分支上一次上链的最新 CommitReceipt
     */
    getLatestCommit(branch: string): CommitReceipt | null;
    /**
     * 记忆压实与认知提取（模拟 AI 睡眠巩固机制）
     * 将多条零散或冗余的日志压缩聚合为高密度认知，并淘汰旧日志
     */
    compact(branch: string): Promise<{
        consolidated: MemoryItem[];
        deprecatedIds: string[];
    }>;
    /**
     * 构建可上链的 Git-DAG 增量数据包，并自动进行本地 E2EE 加密
     */
    createDeltaCommit(branch: string, encryptionKey?: Buffer): {
        deltaPackage: DeltaPackage;
        encryptedPayload: EncryptedPayload;
        rawJson: string;
        parentHash: string;
        newRootHash: string;
    };
    /**
     * 确认链上已上链成功，清空待提交增量，记录 CommitReceipt
     */
    applyCommitReceipt(receipt: CommitReceipt): void;
    /**
     * 本地相关性召回（支持关键字与标签打分）
     */
    recall(branch: string, query: string, topK?: number): MemoryItem[];
}
//# sourceMappingURL=memory-runtime.d.ts.map