import { MemoryItem, CommitReceipt } from "@amber/runtime";
export interface LocalStorageData {
    branches: Record<string, MemoryItem[]>;
    commits: Record<string, CommitReceipt[]>;
}
export declare class LocalStorage {
    private filePath;
    constructor(filePath?: string);
    load(): Promise<LocalStorageData>;
    save(data: LocalStorageData): Promise<void>;
}
//# sourceMappingURL=storage.d.ts.map