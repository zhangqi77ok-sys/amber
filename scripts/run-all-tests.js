import { execSync } from "node:child_process";

console.log("==================================================");
console.log("💎 Amber Monorepo: 自动化全量质量保证测试套件");
console.log("==================================================");

const suites = [
  { name: "1. 智能合约测试 (@amber/contracts)", cwd: "packages/contracts", cmd: "npx hardhat test" },
  { name: "2. 核心运行时测试 (@amber/runtime)", cwd: "packages/runtime", cmd: "npm test" },
  { name: "3. 官方 MCP 服务测试 (@amber/mcp-server)", cwd: "packages/mcp-server", cmd: "npm test" },
  { name: "4. 终端 CLI 工具测试 (@amber/cli)", cwd: "packages/cli", cmd: "npm test" }
];

let allPassed = true;

for (const suite of suites) {
  console.log(`\n▶ 正在执行: ${suite.name}...`);
  try {
    execSync(suite.cmd, { cwd: suite.cwd, stdio: "inherit" });
    console.log(`✔ [通过] ${suite.name}`);
  } catch (error) {
    console.error(`❌ [失败] ${suite.name}`);
    allPassed = false;
    process.exit(1);
  }
}

console.log("\n==================================================");
console.log("🎉 全部 4 大模块所有单元测试与集成测试 100% 通过！");
console.log("==================================================");
