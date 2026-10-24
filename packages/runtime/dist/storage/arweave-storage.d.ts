import type { EncryptedPayload } from "../memory/types.js";
export interface ArweaveUploadResult {
    txId: string;
    arweaveUrl: string;
    gatewayUrl: string;
    isMock: boolean;
    sizeBytes: number;
}
export interface ArweaveStorageConfig {
    privateKey?: string;
    network?: "mainnet" | "devnet";
    rpcUrl?: string;
}
/**
 * Amber Arweave / Irys 永久去中心化存储服务
 * 支持 < 100 KB 免费免 Gas 永久存证，并具备离线/无私钥平滑降级能力
 */
export declare class ArweaveStorageService {
    private privateKey?;
    private network;
    private rpcUrl?;
    private uploaderInstance;
    constructor(config?: ArweaveStorageConfig);
    /**
     * 初始化 Irys Uploader 实例
     */
    private getUploader;
    /**
     * 将经过 AES-256-GCM 本地加密的增量认知包上传至 Arweave / Irys
     */
    uploadEncryptedDelta(payload: EncryptedPayload, metadata: {
        branch: string;
        rootHash: string;
        parentHash: string;
    }): Promise<ArweaveUploadResult>;
    /**
     * 从 Arweave / Irys 网关按 ID 下载密文
     */
    fetchEncryptedDelta(txId: string): Promise<EncryptedPayload | null>;
}
//# sourceMappingURL=arweave-storage.d.ts.map