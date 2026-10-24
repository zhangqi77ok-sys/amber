import type { EncryptedPayload, MemoryItem } from "./types.js";
/**
 * 字符串转 Keccak-256 哈希（对应 Solidity keccak256）
 */
export declare function keccak256Utf8(input: string): string;
/**
 * 计算内存条目的确定性哈希
 */
export declare function hashMemoryItem(item: MemoryItem): string;
/**
 * 计算所有活跃记忆切片的累积 Merkle Root（根哈希）
 * 采用类似 Git 的二叉哈希树聚合
 */
export declare function computeMerkleRoot(items: MemoryItem[]): string;
/**
 * 端到端对称加密（AES-256-GCM）
 * 确保存储在 Arweave 上的数据任何第三方（包括平台）都无法解密
 */
export declare function encryptAESGCM(data: string, secretKey: Buffer): EncryptedPayload;
/**
 * 端到端对称解密（AES-256-GCM）
 */
export declare function decryptAESGCM(payload: EncryptedPayload, secretKey: Buffer): string;
/**
 * 生成 256 位随机密钥
 */
export declare function generateRandomKey(): Buffer;
//# sourceMappingURL=crypto.d.ts.map