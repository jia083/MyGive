const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("Starting ResourceSharing contract deployment...");

  // Get the contract factory
  const ResourceSharing = await hre.ethers.getContractFactory("ResourceSharing");

  console.log("Deploying ResourceSharing contract...");

  // Deploy the contract
  const resourceSharing = await ResourceSharing.deploy();

  await resourceSharing.waitForDeployment();

  const contractAddress = await resourceSharing.getAddress();

  console.log("✅ ResourceSharing contract deployed to:", contractAddress);
  console.log("Deployment transaction hash:", resourceSharing.deploymentTransaction().hash);

  // Get the deployer address (platform owner)
  const [deployer] = await hre.ethers.getSigners();
  console.log("Platform owner address:", deployer.address);

  // Save deployment info to JSON file
  const deploymentInfo = {
    contractAddress: contractAddress,
    deploymentHash: resourceSharing.deploymentTransaction().hash,
    network: hre.network.name,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    timestamp: Date.now()
  };

  // Create deployments directory if it doesn't exist
  const deploymentsDir = path.join(__dirname, '../deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  // Save with timestamp
  const timestampedFile = path.join(deploymentsDir, `resourcesharing-${hre.network.name}-${Date.now()}.json`);
  fs.writeFileSync(timestampedFile, JSON.stringify(deploymentInfo, null, 2));

  // Save as latest
  const latestFile = path.join(deploymentsDir, `resourcesharing-${hre.network.name}-latest.json`);
  fs.writeFileSync(latestFile, JSON.stringify(deploymentInfo, null, 2));

  console.log("\n📄 Deployment info saved to:");
  console.log("  -", timestampedFile);
  console.log("  -", latestFile);

  console.log("\n📋 Next Steps:");
  console.log("1. Update contract address in config/wagmi.js:");
  console.log(`   resourceSharing: { sepolia: '${contractAddress}' }`);
  console.log("\n2. Copy the ABI from artifacts/contracts/ResourceSharing.sol/ResourceSharing.json");
  console.log("   to hooks/useResourceSharing.js (replace RESOURCE_SHARING_ABI)");
  console.log("\n3. Verify contract on Etherscan (optional):");
  console.log(`   npx hardhat verify --network ${hre.network.name} ${contractAddress}`);

  // Wait for a few block confirmations
  console.log("\n⏳ Waiting for block confirmations...");
  await resourceSharing.deploymentTransaction().wait(5);
  console.log("✅ Contract confirmed on blockchain!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
