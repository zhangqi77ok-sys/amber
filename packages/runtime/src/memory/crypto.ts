import crypto from "node:crypto";
import { ethers } from "ethers";
import type { EncryptedPayload, MemoryItem } from "./types.js";

/**
 * 字符串转 Keccak-256 哈希（对应 Solidity keccak256）
 */
export function keccak256Utf8(input: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(input));
}

/**
 * 计算内存条目的确定性哈希
 */
export function hashMemoryItem(item: MemoryItem): string {
  const normalized = JSON.stringify({
    id: item.id,
    branch: item.branch,
    content: item.content,
    tags: item.tags.sort(),
  });
  return ethers.keccak256(ethers.toUtf8Bytes(normalized));
}

/**
 * 计算所有活跃记忆切片的累积 Merkle Root（根哈希）
 * 采用类似 Git 的二叉哈希树聚合
 */
export function computeMerkleRoot(items: MemoryItem[]): string {
  if (items.length === 0) {
    return ethers.ZeroHash;
  }

  // 1. 获取所有叶子节点哈希并排序
  let currentLayer = items.map(hashMemoryItem).sort();

  // 2. 向上归约合并
  while (currentLayer.length > 1) {
    const nextLayer: string[] = [];
    for (let i = 0; i < currentLayer.length; i += 2) {
      if (i + 1 < currentLayer.length) {
        // 合并相邻两个节点
        const combined = ethers.concat([currentLayer[i], currentLayer[i + 1]]);
        nextLayer.push(ethers.keccak256(combined));
      } else {
        // 奇数个节点，自身自复制合并
        const combined = ethers.concat([currentLayer[i], currentLayer[i]]);
        nextLayer.push(ethers.keccak256(combined));
      }
    }
    currentLayer = nextLayer;
  }

  return currentLayer[0];
}

/**
 * 端到端对称加密（AES-256-GCM）
 * 确保存储在 Arweave 上的数据任何第三方（包括平台）都无法解密
 */
export function encryptAESGCM(data: string, secretKey: Buffer): EncryptedPayload {
  const iv = crypto.randomBytes(12);
  const salt = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", secretKey, iv);

  let encrypted = cipher.update(data, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return {
    ciphertext: encrypted,
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
    salt: salt.toString("hex"),
  };
}

/**
 * 端到端对称解密（AES-256-GCM）
 */
export function decryptAESGCM(payload: EncryptedPayload, secretKey: Buffer): string {
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    secretKey,
    Buffer.from(payload.iv, "hex")
  );
  decipher.setAuthTag(Buffer.from(payload.authTag, "hex"));

  let decrypted = decipher.update(payload.ciphertext, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * 生成 256 位随机密钥
 */
export function generateRandomKey(): Buffer {
  return crypto.randomBytes(32);
}
