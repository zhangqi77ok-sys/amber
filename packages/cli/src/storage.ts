import fs from "node:fs/promises";
import path from "node:path";
import { MemoryItem, CommitReceipt } from "@amber/runtime";

export interface LocalStorageData {
  branches: Record<string, MemoryItem[]>;
  commits: Record<string, CommitReceipt[]>;
}

export class LocalStorage {
  private filePath: string;

  constructor(filePath?: string) {
    this.filePath = filePath || path.join(process.cwd(), ".amber", "storage.json");
  }

  public async load(): Promise<LocalStorageData> {
    try {
      const content = await fs.readFile(this.filePath, "utf8");
      return JSON.parse(content);
    } catch {
      return { branches: {}, commits: {} };
    }
  }

  public async save(data: LocalStorageData): Promise<void> {
    const dir = path.dirname(this.filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(data, null, 2), "utf8");
  }
}
