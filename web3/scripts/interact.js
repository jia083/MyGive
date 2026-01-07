const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Helper script to interact with deployed contracts
 * Usage: npx hardhat run scripts/interact.js --network <network-name>
 */

async function loadDeployment(network) {
  const deploymentFile = path.join(
    __dirname,
    "..",
    "deployments",
    `${network}-latest.json`
  );

  if (!fs.existsSync(deploymentFile)) {
    throw new Error(`Deployment file not found for network: ${network}`);
  }

  return JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
}

async function main() {
  console.log("🔗 Connecting to contracts on", hre.network.name, "\n");

  const [signer] = await hre.ethers.getSigners();
  console.log("Using account:", signer.address);

  // Load deployment data
  const deployment = await loadDeployment(hre.network.name);

  // Connect to contracts
  const campaignFactory = await hre.ethers.getContractAt(
    "CampaignFactory",
    deployment.contracts.CampaignFactory.address
  );

  const resourceSharing = await hre.ethers.getContractAt(
    "ResourceSharing",
    deployment.contracts.ResourceSharing.address
  );

  const volunteerRegistry = await hre.ethers.getContractAt(
    "VolunteerRegistry",
    deployment.contracts.VolunteerRegistry.address
  );

  console.log("✅ Connected to all contracts\n");

  // Example interactions
  console.log("=".repeat(60));
  console.log("📊 CONTRACT STATISTICS");
  console.log("=".repeat(60));

  // CampaignFactory stats
  const totalCampaigns = await campaignFactory.getTotalCampaigns();
  console.log(`\n📋 Campaigns:       ${totalCampaigns.toString()}`);

  // ResourceSharing stats
  const totalResources = await resourceSharing.getTotalResources();
  const totalClaims = await resourceSharing.getTotalClaims();
  console.log(`📦 Resources:       ${totalResources.toString()}`);
  console.log(`🎁 Claims:          ${totalClaims.toString()}`);

  // VolunteerRegistry stats
  const totalOpportunities = await volunteerRegistry.getTotalOpportunities();
  const totalRegistrations = await volunteerRegistry.getTotalRegistrations();
  console.log(`💚 Opportunities:   ${totalOpportunities.toString()}`);
  console.log(`👥 Registrations:   ${totalRegistrations.toString()}`);

  console.log("\n" + "=".repeat(60));

  // Example: Create a test campaign (uncomment to use)
  /*
  console.log("\n🚀 Creating test campaign...");
  const tx = await campaignFactory.createCampaign(
    "Test Campaign",
    "This is a test campaign for MyGive platform",
    0, // Education category
    hre.ethers.parseEther("1.0"), // 1 ETH target
    30, // 30 days duration
    "Test beneficiaries",
    "Test location"
  );
  await tx.wait();
  console.log("✅ Campaign created!");
  */

  console.log("\n✨ Interaction complete!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
