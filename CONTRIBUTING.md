# Contributing to Amber（灵珀）

Thank you for your interest in contributing to **Amber**! 💎

Amber is an open-source autonomous AI agent platform featuring **Git-DAG sovereign memory** and **secure subprocess sandboxing**, verifiable on Ethereum Layer-2 networks (Optimism & Base).

---

## 🛠️ Monorepo Structure

```text
amber-monorepo/
├── packages/
│   ├── contracts/    # Solidity smart contracts & Hardhat tests
│   ├── runtime/      # Pure TypeScript core runtime (Memory DAG + Sandbox)
│   ├── mcp-server/   # Official Anthropic Model Context Protocol server
│   └── cli/          # Developer CLI tool & Amber Web Dashboard
├── scripts/          # E2E test runners & local blockchain demonstrations
```

---

## 🚀 Development Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/amber-agent/amber.git
   cd amber
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Build all packages**:
   ```bash
   npm run build
   ```

4. **Run all tests (30/30 test cases)**:
   ```bash
   npm test
   ```

5. **Start local Web UI Dashboard**:
   ```bash
   npm run ui
   ```
   Open [http://localhost:3777](http://localhost:3777) in your browser.

---

## 📜 Pull Request Guidelines

1. **Keep it Pure TypeScript**: Core runtimes must maintain zero native binary dependencies to allow zero-friction `npx` distribution.
2. **Preserve E2EE & Sandboxing**: Never disable subprocess environment scrubbing or downgrade cryptography standards (AES-256-GCM + Keccak256 Merkle trees).
3. **Verify All Tests Pass**: Run `npm test` before submitting your PR.
4. **Smart Contracts**: Any contract modification must include corresponding Hardhat test cases in `packages/contracts/test`.

---

## ⚖️ Code of Conduct & License

This project is licensed under the [MIT License](LICENSE). Please be respectful and constructive in issues and discussions.
