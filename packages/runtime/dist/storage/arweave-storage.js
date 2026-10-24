import { createHash } from "node:crypto";
/**
 * Amber Arweave / Irys 永久去中心化存储服务
 * 支持 < 100 KB 免费免 Gas 永久存证，并具备离线/无私钥平滑降级能力
 */
export class ArweaveStorageService {
    privateKey;
    network;
    rpcUrl;
    uploaderInstance = null;
    constructor(config = {}) {
        this.privateKey = config.privateKey || process.env.PRIVATE_KEY;
        this.network = config.network || "mainnet";
        this.rpcUrl = config.rpcUrl || (this.network === "devnet" ? "https://sepolia.optimism.io" : undefined);
    }
    /**
     * 初始化 Irys Uploader 实例
     */
    async getUploader() {
        if (this.uploaderInstance)
            return this.uploaderInstance;
        if (!this.privateKey)
            return null;
        try {
            const { Uploader } = await import("@irys/upload");
            const { Ethereum } = await import("@irys/upload-ethereum");
            let builder = Uploader(Ethereum).withWallet(this.privateKey);
            if (this.network === "devnet") {
                builder = builder.devnet();
            }
            if (this.rpcUrl) {
                builder = builder.withRpc(this.rpcUrl);
            }
            this.uploaderInstance = await builder;
            return this.uploaderInstance;
        }
        catch (err) {
            console.warn("⚠️ [Amber Arweave] Irys Uploader 初始化跳过 (网络或依赖原因):", err);
            return null;
        }
    }
    /**
     * 将经过 AES-256-GCM 本地加密的增量认知包上传至 Arweave / Irys
     */
    async uploadEncryptedDelta(payload, metadata) {
        const rawJson = JSON.stringify(payload);
        const sizeBytes = Buffer.byteLength(rawJson, "utf8");
        const tags = [
            { name: "App-Name", value: "Amber-Sovereign-Memory" },
            { name: "App-Version", value: "0.1.0" },
            { name: "Content-Type", value: "application/json" },
            { name: "Encryption-Algorithm", value: "AES-256-GCM" },
            { name: "Branch", value: metadata.branch },
            { name: "Merkle-Root", value: metadata.rootHash },
            { name: "Parent-Hash", value: metadata.parentHash },
            { name: "Timestamp", value: Date.now().toString() },
        ];
        try {
            const uploader = await this.getUploader();
            if (uploader) {
                const response = await uploader.upload(rawJson, { tags });
                const txId = response.id;
                return {
                    txId,
                    arweaveUrl: `ar://${txId}`,
                    gatewayUrl: `https://gateway.irys.xyz/${txId}`,
                    isMock: false,
                    sizeBytes,
                };
            }
        }
        catch (err) {
            console.warn("⚠️ [Amber Arweave] 上传至 Irys 网关异常，自动无缝切换至本地防丢失模式:", err.message);
        }
        // 平滑降级模式：计算 SHA-256 指纹作为本地确定性 Arweave 模拟指针
        const sha256 = createHash("sha256").update(rawJson).digest("hex");
        const mockTxId = "irys_local_" + sha256.substring(0, 32);
        return {
            txId: mockTxId,
            arweaveUrl: `ar://${mockTxId}`,
            gatewayUrl: `https://gateway.irys.xyz/${mockTxId}`,
            isMock: true,
            sizeBytes,
        };
    }
    /**
     * 从 Arweave / Irys 网关按 ID 下载密文
     */
    async fetchEncryptedDelta(txId) {
        const cleanId = txId.replace(/^ar:\/\//, "");
        if (cleanId.startsWith("irys_local_")) {
            return null;
        }
        try {
            const url = `https://gateway.irys.xyz/${cleanId}`;
            const res = await fetch(url);
            if (!res.ok)
                return null;
            return (await res.json());
        }
        catch {
            return null;
        }
    }
}
//# sourceMappingURL=arweave-storage.js.map