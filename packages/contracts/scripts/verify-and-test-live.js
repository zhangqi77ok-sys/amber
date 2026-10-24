const { ethers } = require("hardhat");

async function main() {
  const proxyAddress = "0xdE6Ab63C951a34C65f591eD3B9A47d142a7604Ca";
  const [deployer] = await ethers.getSigners();
  const userAddress = "0xE106C84646B851af709C5672b5Fb5D7E0FD5fC39";

  console.log("-----------------------------------------");
  console.log("Testing AmberRegistry at Proxy:", proxyAddress);
  const AmberRegistry = await ethers.getContractFactory("AmberRegistry");
  const registry = AmberRegistry.attach(proxyAddress);

  // 1. Check roles
  const defaultAdmin = await registry.DEFAULT_ADMIN_ROLE();
  const hasAdmin = await registry.hasRole(defaultAdmin, deployer.address);
  console.log("Deployer has DEFAULT_ADMIN_ROLE:", hasAdmin);

  // If not initialized yet, initialize it
  if (!hasAdmin) {
    console.log("Initializing registry with deployer as admin...");
    const tx = await registry.initialize(deployer.address);
    await tx.wait();
    console.log("✔ Initialized successfully!");
  }

  // 2. Grant roles to user
  const userHasAdmin = await registry.hasRole(defaultAdmin, userAddress);
  console.log("User wallet has admin role:", userHasAdmin);
  if (!userHasAdmin) {
    console.log("Granting roles to user wallet:", userAddress);
    const upgraderRole = await registry.UPGRADER_ROLE();
    const operatorRole = await registry.OPERATOR_ROLE();
    await (await registry.grantRole(defaultAdmin, userAddress)).wait();
    await (await registry.grantRole(upgraderRole, userAddress)).wait();
    await (await registry.grantRole(operatorRole, userAddress)).wait();
    console.log("✔ Roles granted to user wallet successfully!");
  }

  // 3. Test writing an actual memory commit to OP Sepolia!
  console.log("\nWriting initial Sovereign Memory Commit to OP Sepolia...");
  const branchName = "main";
  const branchId = ethers.keccak256(ethers.toUtf8Bytes(branchName));
  const rootHash = ethers.keccak256(ethers.toUtf8Bytes("AmberGenesisMemoryCommit_v1"));
  const parentHash = ethers.ZeroHash;
  const arweaveTx = "ar://amber_genesis_state_001";

  const commitTx = await registry.commitDelta(
    branchId,
    parentHash,
    rootHash,
    arweaveTx
  );
  console.log("Commit Tx Hash:", commitTx.hash);
  const receipt = await commitTx.wait();
  console.log("✔ Transaction mined in block:", receipt.blockNumber);

  const latest = await registry.getBranchState(deployer.address, branchId);
  console.log("On-chain Latest RootHash:", latest.rootHash);
  console.log("On-chain Version Index:", latest.versionIndex.toString());
  console.log("-----------------------------------------");
}

main().catch(console.error);
