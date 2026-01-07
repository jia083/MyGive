const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CampaignFactory", function () {
  let campaignFactory;
  let owner, creator, donor1, donor2;

  beforeEach(async function () {
    [owner, creator, donor1, donor2] = await ethers.getSigners();

    const CampaignFactory = await ethers.getContractFactory("CampaignFactory");
    campaignFactory = await CampaignFactory.deploy();
    await campaignFactory.waitForDeployment();
  });

  describe("Campaign Creation", function () {
    it("Should create a new campaign", async function () {
      const targetAmount = ethers.parseEther("10");
      const durationInDays = 30;

      const tx = await campaignFactory.connect(creator).createCampaign(
        "Help Rural School",
        "Support education for underprivileged students",
        0, // Education category
        targetAmount,
        durationInDays,
        "200 students",
        "Petaling Jaya, Selangor"
      );

      await expect(tx)
        .to.emit(campaignFactory, "CampaignCreated")
        .withArgs(1, creator.address, "Help Rural School", targetAmount, await ethers.provider.getBlock('latest').then(b => b.timestamp + (durationInDays * 86400)));

      const campaign = await campaignFactory.getCampaign(1);
      expect(campaign.title).to.equal("Help Rural School");
      expect(campaign.creator).to.equal(creator.address);
      expect(campaign.targetAmount).to.equal(targetAmount);
    });

    it("Should reject campaign with zero target amount", async function () {
      await expect(
        campaignFactory.connect(creator).createCampaign(
          "Invalid Campaign",
          "Description",
          0,
          0, // Zero target
          30,
          "Beneficiaries",
          "Location"
        )
      ).to.be.revertedWith("Target amount must be greater than 0");
    });
  });

  describe("Donations", function () {
    let campaignId;

    beforeEach(async function () {
      const targetAmount = ethers.parseEther("10");
      const tx = await campaignFactory.connect(creator).createCampaign(
        "Test Campaign",
        "Description",
        0,
        targetAmount,
        30,
        "Beneficiaries",
        "Location"
      );
      await tx.wait();
      campaignId = 1;
    });

    it("Should accept donations", async function () {
      const donationAmount = ethers.parseEther("1");

      const tx = await campaignFactory.connect(donor1).donate(
        campaignId,
        "Supporting education!",
        { value: donationAmount }
      );

      await expect(tx)
        .to.emit(campaignFactory, "DonationReceived");

      const campaign = await campaignFactory.getCampaign(campaignId);
      expect(campaign.currentAmount).to.equal(donationAmount);
    });

    it("Should track multiple donations", async function () {
      const donation1 = ethers.parseEther("2");
      const donation2 = ethers.parseEther("3");

      await campaignFactory.connect(donor1).donate(campaignId, "Donation 1", { value: donation1 });
      await campaignFactory.connect(donor2).donate(campaignId, "Donation 2", { value: donation2 });

      const campaign = await campaignFactory.getCampaign(campaignId);
      expect(campaign.currentAmount).to.equal(donation1 + donation2);
    });

    it("Should complete campaign when target reached", async function () {
      const targetAmount = ethers.parseEther("10");

      await campaignFactory.connect(donor1).donate(
        campaignId,
        "Full donation",
        { value: targetAmount }
      );

      const campaign = await campaignFactory.getCampaign(campaignId);
      expect(campaign.status).to.equal(1); // Completed
    });
  });

  describe("Fund Withdrawal", function () {
    let campaignId;
    const targetAmount = ethers.parseEther("10");

    beforeEach(async function () {
      const tx = await campaignFactory.connect(creator).createCampaign(
        "Test Campaign",
        "Description",
        0,
        targetAmount,
        30,
        "Beneficiaries",
        "Location"
      );
      await tx.wait();
      campaignId = 1;

      // Donate to reach target
      await campaignFactory.connect(donor1).donate(
        campaignId,
        "Donation",
        { value: targetAmount }
      );
    });

    it("Should allow creator to withdraw funds", async function () {
      const initialBalance = await ethers.provider.getBalance(creator.address);

      const tx = await campaignFactory.connect(creator).withdrawFunds(campaignId);
      const receipt = await tx.wait();

      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      const finalBalance = await ethers.provider.getBalance(creator.address);

      // Account for platform fee (2.5%)
      const platformFee = (targetAmount * 250n) / 10000n;
      const expectedAmount = targetAmount - platformFee;

      expect(finalBalance).to.be.closeTo(
        initialBalance + expectedAmount - gasUsed,
        ethers.parseEther("0.001")
      );
    });

    it("Should reject withdrawal by non-creator", async function () {
      await expect(
        campaignFactory.connect(donor1).withdrawFunds(campaignId)
      ).to.be.revertedWith("Only creator can withdraw");
    });

    it("Should reject duplicate withdrawal", async function () {
      await campaignFactory.connect(creator).withdrawFunds(campaignId);

      await expect(
        campaignFactory.connect(creator).withdrawFunds(campaignId)
      ).to.be.revertedWith("Funds already withdrawn");
    });
  });

  describe("Campaign Management", function () {
    it("Should allow creator to cancel campaign without donations", async function () {
      const tx = await campaignFactory.connect(creator).createCampaign(
        "Test Campaign",
        "Description",
        0,
        ethers.parseEther("10"),
        30,
        "Beneficiaries",
        "Location"
      );
      await tx.wait();

      await expect(
        campaignFactory.connect(creator).cancelCampaign(1)
      ).to.emit(campaignFactory, "CampaignStatusChanged");

      const campaign = await campaignFactory.getCampaign(1);
      expect(campaign.status).to.equal(2); // Cancelled
    });

    it("Should reject cancellation with existing donations", async function () {
      const tx = await campaignFactory.connect(creator).createCampaign(
        "Test Campaign",
        "Description",
        0,
        ethers.parseEther("10"),
        30,
        "Beneficiaries",
        "Location"
      );
      await tx.wait();

      await campaignFactory.connect(donor1).donate(
        1,
        "Donation",
        { value: ethers.parseEther("1") }
      );

      await expect(
        campaignFactory.connect(creator).cancelCampaign(1)
      ).to.be.revertedWith("Cannot cancel campaign with donations");
    });
  });
});
