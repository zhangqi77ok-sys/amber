const { ethers } = require("hardhat");

async function main() {
  const addr = "0xdE6Ab63C951a34C65f591eD3B9A47d142a7604Ca";
  const code = await ethers.provider.getCode(addr);
  console.log("Code length:", code.length);
  const slot = await ethers.provider.getStorage(addr, "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc");
  console.log("Implementation storage slot:", slot);

  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance remaining:", ethers.formatEther(balance), "ETH");
}

main().catch(console.error);
