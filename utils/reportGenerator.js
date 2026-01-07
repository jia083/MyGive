/**
 * PDF Report Generator Utility
 *
 * Generates various PDF reports for the MyGive platform:
 * - Donation receipts
 * - Campaign summary reports
 * - Platform transparency reports
 */

import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { ethers } from 'ethers';

/**
 * Generate a donation receipt PDF
 * @param {Object} donationData - Donation information
 * @returns {Blob} PDF blob
 */
export function generateDonationReceipt(donationData) {
  const doc = new jsPDF();

  // Header
  doc.setFillColor(16, 185, 129); // Green color
  doc.rect(0, 0, 210, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont(undefined, 'bold');
  doc.text('MyGive', 20, 20);

  doc.setFontSize(14);
  doc.setFont(undefined, 'normal');
  doc.text('Blockchain-Powered Donation Receipt', 20, 30);

  // Reset text color
  doc.setTextColor(0, 0, 0);

  // Receipt Title
  doc.setFontSize(20);
  doc.setFont(undefined, 'bold');
  doc.text('Donation Receipt', 20, 55);

  // Transaction Details Box
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(20, 65, 170, 70, 3, 3, 'F');

  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.text('Transaction Details', 25, 75);

  doc.setFont(undefined, 'normal');
  doc.setFontSize(10);

  // Details
  const details = [
    ['Receipt Number:', donationData.receiptId || `RCP-${Date.now()}`],
    ['Transaction Hash:', donationData.txHash || 'N/A'],
    ['Date & Time:', donationData.timestamp || new Date().toLocaleString()],
    ['Campaign:', donationData.campaignTitle || 'N/A'],
    ['Category:', donationData.category || 'N/A'],
  ];

  let yPos = 85;
  details.forEach(([label, value]) => {
    doc.setFont(undefined, 'bold');
    doc.text(label, 25, yPos);
    doc.setFont(undefined, 'normal');

    // Truncate long values like transaction hash
    const displayValue = value.length > 45 ? value.substring(0, 42) + '...' : value;
    doc.text(displayValue, 80, yPos);
    yPos += 8;
  });

  // Amount Section
  doc.setFillColor(16, 185, 129);
  doc.roundedRect(20, 145, 170, 30, 3, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('Donation Amount', 25, 155);

  doc.setFontSize(20);
  const ethAmount = donationData.amount || '0';
  const usdAmount = donationData.amountUSD || '0.00';
  doc.text(`${ethAmount} ETH`, 25, 167);

  doc.setFontSize(11);
  doc.text(`≈ $${usdAmount} USD`, 25, 173);

  // Reset color
  doc.setTextColor(0, 0, 0);

  // Donor Information
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('Donor Information', 20, 190);

  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text(`Wallet Address: ${donationData.donorAddress || 'N/A'}`, 20, 200);
  doc.text(`Name: ${donationData.donorName || 'Anonymous Donor'}`, 20, 208);

  // Beneficiary Information
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('Beneficiary Information', 20, 225);

  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text(`Campaign Owner: ${donationData.campaignOwner || 'N/A'}`, 20, 235);
  doc.text(`Organization: ${donationData.organizationName || 'N/A'}`, 20, 243);

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('This receipt is generated from blockchain data and serves as proof of donation.', 20, 285);
  doc.text('Network: Sepolia Testnet | Powered by MyGive Platform', 20, 290);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, 295);

  return doc.output('blob');
}

/**
 * Generate a campaign summary report PDF
 * @param {Object} campaignData - Campaign information
 * @returns {Blob} PDF blob
 */
export function generateCampaignReport(campaignData) {
  const doc = new jsPDF();

  // Header
  doc.setFillColor(16, 185, 129);
  doc.rect(0, 0, 210, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont(undefined, 'bold');
  doc.text('MyGive', 20, 20);

  doc.setFontSize(14);
  doc.setFont(undefined, 'normal');
  doc.text('Campaign Transparency Report', 20, 30);

  doc.setTextColor(0, 0, 0);

  // Campaign Title
  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  const title = doc.splitTextToSize(campaignData.title || 'Campaign Report', 170);
  doc.text(title, 20, 55);

  // Campaign Info
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(20, 70, 170, 50, 3, 3, 'F');

  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');

  const campaignInfo = [
    ['Campaign ID:', campaignData.id || 'N/A'],
    ['Category:', campaignData.category || 'N/A'],
    ['Created:', campaignData.createdDate || 'N/A'],
    ['Deadline:', campaignData.deadline || 'N/A'],
    ['Status:', campaignData.status || 'Active'],
  ];

  let yPos = 80;
  campaignInfo.forEach(([label, value]) => {
    doc.setFont(undefined, 'bold');
    doc.text(label, 25, yPos);
    doc.setFont(undefined, 'normal');
    doc.text(value, 80, yPos);
    yPos += 8;
  });

  // Financial Summary
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('Financial Summary', 20, 135);

  const targetAmount = parseFloat(campaignData.target || 0);
  const raisedAmount = parseFloat(campaignData.amountCollected || 0);
  const progress = targetAmount > 0 ? ((raisedAmount / targetAmount) * 100).toFixed(1) : 0;

  doc.setFillColor(239, 246, 255);
  doc.roundedRect(20, 142, 170, 45, 3, 3, 'F');

  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text(`Target Amount: ${ethers.formatEther(targetAmount)} ETH`, 25, 152);
  doc.text(`Amount Raised: ${ethers.formatEther(raisedAmount)} ETH`, 25, 162);
  doc.text(`Progress: ${progress}%`, 25, 172);
  doc.text(`Number of Donors: ${campaignData.donorCount || 0}`, 25, 182);

  // Donations Table
  if (campaignData.donations && campaignData.donations.length > 0) {
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Donation History', 20, 200);

    const tableData = campaignData.donations.slice(0, 15).map((donation, index) => [
      index + 1,
      donation.date || 'N/A',
      donation.donorAddress ? `${donation.donorAddress.substring(0, 10)}...` : 'Anonymous',
      `${ethers.formatEther(donation.amount)} ETH`,
      donation.txHash ? `${donation.txHash.substring(0, 12)}...` : 'N/A'
    ]);

    doc.autoTable({
      startY: 205,
      head: [['#', 'Date', 'Donor', 'Amount', 'TX Hash']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [16, 185, 129] },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 35 },
        2: { cellWidth: 45 },
        3: { cellWidth: 35 },
        4: { cellWidth: 40 }
      }
    });
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(`Report generated on: ${new Date().toLocaleString()}`, 20, 285);
  doc.text('MyGive Platform - Transparent Blockchain Crowdfunding', 20, 290);

  return doc.output('blob');
}

/**
 * Generate platform transparency report PDF
 * @param {Object} platformData - Platform statistics
 * @returns {Blob} PDF blob
 */
export function generatePlatformReport(platformData) {
  const doc = new jsPDF();

  // Header
  doc.setFillColor(16, 185, 129);
  doc.rect(0, 0, 210, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont(undefined, 'bold');
  doc.text('MyGive', 20, 20);

  doc.setFontSize(14);
  doc.setFont(undefined, 'normal');
  doc.text('Platform Transparency Report', 20, 30);

  doc.setTextColor(0, 0, 0);

  // Report Period
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text(`Reporting Period: ${platformData.period || 'All Time'}`, 20, 55);

  // Key Metrics
  doc.setFontSize(14);
  doc.text('Platform Statistics', 20, 70);

  const metrics = [
    {
      label: 'Total Campaigns',
      value: platformData.totalCampaigns || 0,
      color: [59, 130, 246]
    },
    {
      label: 'Active Campaigns',
      value: platformData.activeCampaigns || 0,
      color: [16, 185, 129]
    },
    {
      label: 'Total Donations',
      value: platformData.totalDonations || 0,
      color: [139, 92, 246]
    },
    {
      label: 'Unique Donors',
      value: platformData.uniqueDonors || 0,
      color: [236, 72, 153]
    }
  ];

  let xPos = 20;
  let yPos = 80;

  metrics.forEach((metric, index) => {
    if (index === 2) {
      xPos = 20;
      yPos = 120;
    }

    doc.setFillColor(...metric.color);
    doc.roundedRect(xPos, yPos, 80, 30, 3, 3, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.text(metric.label, xPos + 5, yPos + 10);

    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text(metric.value.toString(), xPos + 5, yPos + 23);

    xPos += 90;
  });

  doc.setTextColor(0, 0, 0);

  // Financial Overview
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('Financial Overview', 20, 165);

  doc.setFillColor(249, 250, 251);
  doc.roundedRect(20, 172, 170, 35, 3, 3, 'F');

  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');

  const totalRaised = platformData.totalAmountRaised || '0';
  doc.text(`Total Amount Raised: ${ethers.formatEther(totalRaised)} ETH`, 25, 182);
  doc.text(`Average Donation: ${platformData.averageDonation || '0'} ETH`, 25, 192);
  doc.text(`Largest Donation: ${platformData.largestDonation || '0'} ETH`, 25, 202);

  // Top Categories
  if (platformData.topCategories && platformData.topCategories.length > 0) {
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Top Campaign Categories', 20, 220);

    const categoryData = platformData.topCategories.map((cat, index) => [
      index + 1,
      cat.name,
      cat.campaignCount,
      `${ethers.formatEther(cat.totalRaised)} ETH`
    ]);

    doc.autoTable({
      startY: 225,
      head: [['Rank', 'Category', 'Campaigns', 'Total Raised']],
      body: categoryData,
      theme: 'striped',
      headStyles: { fillColor: [16, 185, 129] },
      styles: { fontSize: 9 }
    });
  }

  // Blockchain Verification
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(20, 270, 170, 15, 3, 3, 'F');

  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  doc.text('✓ All Data Verified on Blockchain', 25, 277);
  doc.setFont(undefined, 'normal');
  doc.text('Ethereum Sepolia Testnet | 100% Transparent & Immutable', 25, 282);

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, 290);
  doc.text('MyGive Platform - Building Trust Through Blockchain Transparency', 20, 295);

  return doc.output('blob');
}

/**
 * Download PDF blob as file
 * @param {Blob} blob - PDF blob
 * @param {string} filename - Filename
 */
export function downloadPDF(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Get PDF as base64 string for IPFS upload
 * @param {Blob} blob - PDF blob
 * @returns {Promise<string>} Base64 string
 */
export async function pdfToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
