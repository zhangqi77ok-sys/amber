import { ethers } from "ethers";
import type { CommitReceipt } from "../memory/types.js";
import { keccak256Utf8 } from "../memory/crypto.js";

// AmberRegistry 合约的最小标准接口 ABI
export const AMBER_REGISTRY_ABI = [
  "function commitDelta(bytes32 branch, bytes32 parentHash, bytes32 newRootHash, string calldata arweaveTxId) external",
  "function getBranchState(address user, bytes32 branch) external view returns (tuple(bytes32 rootHash, bytes32 parentHash, string arweaveTxId, uint256 blockTimestamp, uint256 versionIndex))",
  "function getBranchVersion(address user, bytes32 branch) external view returns (uint256)",
  "function getBranchHistory(address user, bytes32 branch) external view returns (tuple(bytes32 rootHash, bytes32 parentHash, string arweaveTxId, uint256 blockTimestamp, uint256 versionIndex)[])",
  "event MemoryCommitted(address indexed user, bytes32 indexed branch, bytes32 indexed rootHash, bytes32 parentHash, string arweaveTxId, uint256 versionIndex, uint256 timestamp)",
];

/**
 * 客户端连接器：与 Base 链 AmberRegistry 交互
 */
export class AmberContractClient {
  private contract: ethers.Contract;
  private signer: ethers.Signer | null;

  constructor(contractAddress: string, providerOrSigner: ethers.Provider | ethers.Signer) {
    this.contract = new ethers.Contract(contractAddress, AMBER_REGISTRY_ABI, providerOrSigner);
    this.signer = "getAddress" in providerOrSigner ? (providerOrSigner as ethers.Signer) : null;
  }

  /**
   * 将增量哈希提交上链
   */
  public async commitDelta(
    branchName: string,
    parentHash: string,
    newRootHash: string,
    arweaveTxId: string
  ): Promise<CommitReceipt> {
    if (!this.signer) {
      throw new Error("Cannot commit delta without an active signer / wallet");
    }

    const branchBytes32 = keccak256Utf8(branchName);
    const tx = await this.contract.commitDelta(
      branchBytes32,
      parentHash,
      newRootHash,
      arweaveTxId
    );

    const receipt = await tx.wait();
    const userAddress = await this.signer.getAddress();
    const currentVersion = await this.contract.getBranchVersion(userAddress, branchBytes32);

    return {
      user: userAddress,
      branch: branchName,
      branchBytes32,
      rootHash: newRootHash,
      parentHash,
      arweaveTxId,
      versionIndex: Number(currentVersion),
      timestamp: Date.now(),
    };
  }

  /**
   * 查询指定用户在某分支的最新状态
   */
  public async getBranchState(userAddress: string, branchName: string) {
    const branchBytes32 = keccak256Utf8(branchName);
    const raw = await this.contract.getBranchState(userAddress, branchBytes32);
    return {
      rootHash: raw.rootHash,
      parentHash: raw.parentHash,
      arweaveTxId: raw.arweaveTxId,
      blockTimestamp: Number(raw.blockTimestamp),
      versionIndex: Number(raw.versionIndex),
    };
  }

  /**
   * 查询指定分支的历史版本总数
   */
  public async getBranchVersion(userAddress: string, branchName: string): Promise<number> {
    const branchBytes32 = keccak256Utf8(branchName);
    const version = await this.contract.getBranchVersion(userAddress, branchBytes32);
    return Number(version);
  }
}
