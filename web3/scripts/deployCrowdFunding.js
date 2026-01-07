const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Starting deployment of CrowdFunding contract to Sepolia...\n");

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying contract with account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "ETH\n");

  // Check if we have enough balance
  if (balance === 0n) {
    console.error("❌ Error: Account has no ETH for gas fees!");
    console.log("Get Sepolia ETH from: https://sepoliafaucet.com/");
    process.exit(1);
  }

  // Deploy CrowdFunding
  console.log("📦 Deploying CrowdFunding contract...");
  const CrowdFunding = await hre.ethers.getContractFactory("CrowdFunding");
  const crowdFunding = await CrowdFunding.deploy();

  console.log("⏳ Waiting for deployment...");
  await crowdFunding.waitForDeployment();

  const crowdFundingAddress = await crowdFunding.getAddress();
  console.log("✅ CrowdFunding deployed to:", crowdFundingAddress);

  // Wait for confirmations
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\n⏳ Waiting for 5 block confirmations...");
    const deploymentTx = crowdFunding.deploymentTransaction();
    if (deploymentTx) {
      await deploymentTx.wait(5);
      console.log("✅ Confirmations complete");
    }
  }

  // Prepare deployment data
  const deploymentData = {
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    contract: {
      name: "CrowdFunding",
      address: crowdFundingAddress,
      blockNumber: crowdFunding.deploymentTransaction()?.blockNumber || "N/A",
      transactionHash: crowdFunding.deploymentTransaction()?.hash || "N/A"
    }
  };

  // Save deployment data to JSON file
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentFile = path.join(
    deploymentsDir,
    `crowdfunding-${hre.network.name}-${Date.now()}.json`
  );
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentData, null, 2));

  // Also save as latest
  const latestFile = path.join(deploymentsDir, `crowdfunding-${hre.network.name}-latest.json`);
  fs.writeFileSync(latestFile, JSON.stringify(deploymentData, null, 2));

  console.log("\n" + "=".repeat(80));
  console.log("🎉 DEPLOYMENT SUMMARY");
  console.log("=".repeat(80));
  console.log(`Network:            ${deploymentData.network}`);
  console.log(`Chain ID:           ${deploymentData.chainId}`);
  console.log(`Deployer:           ${deploymentData.deployer}`);
  console.log(`Contract Address:   ${crowdFundingAddress}`);
  console.log(`Transaction Hash:   ${deploymentData.contract.transactionHash}`);
  console.log(`Block Number:       ${deploymentData.contract.blockNumber}`);
  console.log(`\n📄 Deployment data saved to:`);
  console.log(`  ${deploymentFile}`);
  console.log(`  ${latestFile}`);
  console.log("=".repeat(80));

  // Verification instructions
  if (hre.network.name === "sepolia") {
    console.log("\n📋 To verify contract on Etherscan, run:");
    console.log(`npx hardhat verify --network sepolia ${crowdFundingAddress}`);
    console.log("\nOr use the npm script:");
    console.log(`npm run verify:sepolia ${crowdFundingAddress}`);

    console.log("\n🔗 View on Etherscan:");
    console.log(`https://sepolia.etherscan.io/address/${crowdFundingAddress}`);
  }

  console.log("\n✨ Deployment complete!\n");

  // Test contract by reading initial state
  console.log("🧪 Testing deployed contract...");
  const numberOfCampaigns = await crowdFunding.numberOfCampaigns();
  console.log("✅ Initial number of campaigns:", numberOfCampaigns.toString());
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
