import { ethers } from "ethers";
import type { CommitReceipt } from "../memory/types.js";
export declare const AMBER_REGISTRY_ABI: string[];
/**
 * 客户端连接器：与 Base 链 AmberRegistry 交互
 */
export declare class AmberContractClient {
    private contract;
    private signer;
    constructor(contractAddress: string, providerOrSigner: ethers.Provider | ethers.Signer);
    /**
     * 将增量哈希提交上链
     */
    commitDelta(branchName: string, parentHash: string, newRootHash: string, arweaveTxId: string): Promise<CommitReceipt>;
    /**
     * 查询指定用户在某分支的最新状态
     */
    getBranchState(userAddress: string, branchName: string): Promise<{
        rootHash: any;
        parentHash: any;
        arweaveTxId: any;
        blockTimestamp: number;
        versionIndex: number;
    }>;
    /**
     * 查询指定分支的历史版本总数
     */
    getBranchVersion(userAddress: string, branchName: string): Promise<number>;
}
//# sourceMappingURL=amber-client.d.ts.map