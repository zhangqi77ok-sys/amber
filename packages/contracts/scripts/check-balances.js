const { ethers } = require("hardhat");

async function main() {
  const userAddr = "0xE106C84646B851af709C5672b5Fb5D7E0FD5fC39";
  const [deployer] = await ethers.getSigners();
  const deployerAddr = deployer ? deployer.address : "None";

  console.log("-----------------------------------------");
  console.log("Current network:", hre.network.name);
  console.log("Deployer Address (from PRIVATE_KEY):", deployerAddr);

  if (deployer) {
    const balDeployer = await ethers.provider.getBalance(deployerAddr);
    console.log("Deployer Balance:", ethers.formatEther(balDeployer), "ETH");
  }

  const balUser = await ethers.provider.getBalance(userAddr);
  console.log("User Wallet Balance (" + userAddr + "):", ethers.formatEther(balUser), "ETH");
  console.log("-----------------------------------------");
}

main().catch(console.error);
