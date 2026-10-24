import { ethers } from "ethers";
import type {
  MemoryItem,
  DeltaPackage,
  CommitReceipt,
  EncryptedPayload,
} from "./types.js";
import {
  keccak256Utf8,
  computeMerkleRoot,
  encryptAESGCM,
  decryptAESGCM,
  generateRandomKey,
} from "./crypto.js";

/**
 * Amber 记忆运行时核心
 * 管理本地冷热分层、Git-DAG 增量打包、睡眠压实与语义召回
 */
export class MemoryRuntime {
  // 当前活跃分支的记忆条目：branchName -> MemoryItem[]
  private warmStorage: Map<string, MemoryItem[]> = new Map();

  // 待提交的增量池：branchName -> { added: MemoryItem[], deprecated: string[] }
  private pendingDeltas: Map<string, { added: MemoryItem[]; deprecated: string[] }> = new Map();

  // 历史提交收据：branchName -> CommitReceipt[]
  private commitHistory: Map<string, CommitReceipt[]> = new Map();

  constructor() {}

  /**
   * 将主题名称转为 bytes32（对应 Solidity 合约中的 branch 标识）
   */
  public getBranchBytes32(branch: string): string {
    return keccak256Utf8(branch);
  }

  /**
   * 记录一条新的思考/观察（写入热工作区与待提交增量）
   */
  public addThought(
    branch: string,
    content: string,
    tags: string[] = [],
    importance: number = 3
  ): MemoryItem {
    const item: MemoryItem = {
      id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      branch,
      content,
      tags,
      importance,
      timestamp: Date.now(),
    };

    // 加入当前活跃状态
    if (!this.warmStorage.has(branch)) {
      this.warmStorage.set(branch, []);
    }
    this.warmStorage.get(branch)!.push(item);

    // 加入待提交增量缓冲
    if (!this.pendingDeltas.has(branch)) {
      this.pendingDeltas.set(branch, { added: [], deprecated: [] });
    }
    this.pendingDeltas.get(branch)!.added.push(item);

    return item;
  }

  /**
   * 获取指定分支的所有当前活跃记忆
   */
  public getActiveMemories(branch: string): MemoryItem[] {
    return this.warmStorage.get(branch) || [];
  }

  /**
   * 计算指定分支当前的累积 Merkle Root
   */
  public getCurrentRootHash(branch: string): string {
    const items = this.getActiveMemories(branch);
    return computeMerkleRoot(items);
  }

  /**
   * 获取指定分支上一次上链的最新 CommitReceipt
   */
  public getLatestCommit(branch: string): CommitReceipt | null {
    const history = this.commitHistory.get(branch) || [];
    return history.length > 0 ? history[history.length - 1] : null;
  }

  /**
   * 记忆压实与认知提取（模拟 AI 睡眠巩固机制）
   * 将多条零散或冗余的日志压缩聚合为高密度认知，并淘汰旧日志
   */
  public async compact(branch: string): Promise<{
    consolidated: MemoryItem[];
    deprecatedIds: string[];
  }> {
    const active = this.getActiveMemories(branch);
    if (active.length < 3) {
      return { consolidated: [], deprecatedIds: [] }; // 数据量过少不触发压缩
    }

    // 筛选出重要性较低且属于同类标签的琐碎记忆进行合并
    const toConsolidate = active.filter((item) => item.importance <= 3);
    if (toConsolidate.length < 2) {
      return { consolidated: [], deprecatedIds: [] };
    }

    const deprecatedIds = toConsolidate.map((i) => i.id);
    const combinedContent = toConsolidate.map((i) => i.content).join("; ");
    const combinedTags = Array.from(new Set(toConsolidate.flatMap((i) => i.tags)));

    // 生成一条高阶认知条目
    const consolidatedItem: MemoryItem = {
      id: `insight_${Date.now()}`,
      branch,
      content: `[认知结晶] 归纳自 ${toConsolidate.length} 条经验: ${combinedContent}`,
      tags: combinedTags,
      importance: 5, // 压实后的认知具备最高重要度
      timestamp: Date.now(),
    };

    // 移除被淘汰的条目，加入浓缩条目
    const updated = active.filter((item) => !deprecatedIds.includes(item.id));
    updated.push(consolidatedItem);
    this.warmStorage.set(branch, updated);

    // 记录到待提交增量中
    if (!this.pendingDeltas.has(branch)) {
      this.pendingDeltas.set(branch, { added: [], deprecated: [] });
    }
    const delta = this.pendingDeltas.get(branch)!;
    delta.deprecated.push(...deprecatedIds);
    delta.added.push(consolidatedItem);

    return { consolidated: [consolidatedItem], deprecatedIds };
  }

  /**
   * 构建可上链的 Git-DAG 增量数据包，并自动进行本地 E2EE 加密
   */
  public createDeltaCommit(
    branch: string,
    encryptionKey?: Buffer
  ): {
    deltaPackage: DeltaPackage;
    encryptedPayload: EncryptedPayload;
    rawJson: string;
    parentHash: string;
    newRootHash: string;
  } {
    const pending = this.pendingDeltas.get(branch) || { added: [], deprecated: [] };
    const latestCommit = this.getLatestCommit(branch);

    // 1. 确定 Parent Hash（首个版本为 ZeroHash）
    const parentHash = latestCommit ? latestCommit.rootHash : ethers.ZeroHash;

    // 2. 计算本次合并后的新 Merkle Root
    const newRootHash = this.getCurrentRootHash(branch);

    // 3. 构建 Delta 数据包
    const deltaPackage: DeltaPackage = {
      version: "amber-v1",
      branch,
      parentHash,
      commitHash: newRootHash,
      mutations: {
        added: [...pending.added],
        deprecatedIds: [...pending.deprecated],
      },
      timestamp: Date.now(),
    };

    const rawJson = JSON.stringify(deltaPackage, null, 2);

    // 4. 执行本地端到端加密 (AES-256-GCM)
    const key = encryptionKey || generateRandomKey();
    const encryptedPayload = encryptAESGCM(rawJson, key);

    return {
      deltaPackage,
      encryptedPayload,
      rawJson,
      parentHash,
      newRootHash,
    };
  }

  /**
   * 确认链上已上链成功，清空待提交增量，记录 CommitReceipt
   */
  public applyCommitReceipt(receipt: CommitReceipt): void {
    if (!this.commitHistory.has(receipt.branch)) {
      this.commitHistory.set(receipt.branch, []);
    }
    this.commitHistory.get(receipt.branch)!.push(receipt);

    // 清空该分支已提交的增量池
    this.pendingDeltas.set(receipt.branch, { added: [], deprecated: [] });
  }

  /**
   * 本地相关性召回（支持关键字与标签打分）
   */
  public recall(branch: string, query: string, topK: number = 3): MemoryItem[] {
    const items = this.getActiveMemories(branch);
    const keywords = query.toLowerCase().split(/\s+/);

    const scored = items.map((item) => {
      let score = 0;
      const contentLower = item.content.toLowerCase();

      for (const kw of keywords) {
        if (contentLower.includes(kw)) score += 3;
        if (item.tags.some((t) => t.toLowerCase().includes(kw))) score += 5;
      }
      score += item.importance; // 重要性权重

      return { item, score };
    });

    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map((s) => s.item);
  }
}
