import { execSync } from "node:child_process";

console.log("==================================================");
console.log("💎 Amber 真实端到端全链路闭环演示 (E2E Demo)");
console.log("   • 隔离沙盒安全执行");
console.log("   • 记忆沉淀与睡眠压实");
console.log("   • Git-DAG 增量打包与 E2EE 加密");
console.log("   • 智能合约链上状态固化");
console.log("==================================================");

try {
  execSync("npx hardhat run scripts/demo-full-blockchain.js --network hardhat", {
    cwd: "packages/contracts",
    stdio: "inherit",
  });
} catch (err) {
  console.error("执行失败:", err);
  process.exit(1);
}
