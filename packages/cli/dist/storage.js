import fs from "node:fs/promises";
import path from "node:path";
export class LocalStorage {
    filePath;
    constructor(filePath) {
        this.filePath = filePath || path.join(process.cwd(), ".amber", "storage.json");
    }
    async load() {
        try {
            const content = await fs.readFile(this.filePath, "utf8");
            return JSON.parse(content);
        }
        catch {
            return { branches: {}, commits: {} };
        }
    }
    async save(data) {
        const dir = path.dirname(this.filePath);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(this.filePath, JSON.stringify(data, null, 2), "utf8");
    }
}
//# sourceMappingURL=storage.js.map