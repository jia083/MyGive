import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONTRACTS } from '../config/wagmi';

const CROWDFUNDING_ABI = [
  "event DonationReceived(uint256 indexed campaignId, address indexed donor, uint256 amount, uint256 newTotal)",
  "event CampaignCreated(uint256 indexed campaignId, address indexed owner, string title, string category, uint256 target, uint256 deadline)",
  "function getCampaigns() public view returns (tuple(address owner, string title, string description, uint256 target, uint256 deadline, uint256 amountCollected, string image, string category, address[] donators, uint256[] donations, bool isVerified)[])",
];

/**
 * Custom hook to fetch real blockchain transactions from the CrowdFunding contract
 */
export function useBlockchainTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchBlockchainTransactions();
  }, []);

  const fetchBlockchainTransactions = async () => {
    setLoading(true);
    setError(null);

    try {
      // Connect to Sepolia network
      const provider = new ethers.JsonRpcProvider('https://sepolia.infura.io/v3/YOUR_INFURA_KEY');

      // If no Infura key, use public RPC (may be rate limited)
      const publicProvider = new ethers.JsonRpcProvider('https://rpc.sepolia.org');

      const contractAddress = CONTRACTS.crowdfunding.sepolia;
      const contract = new ethers.Contract(contractAddress, CROWDFUNDING_ABI, publicProvider);

      // Fetch campaigns to get titles
      let campaignsMap = {};
      try {
        const campaigns = await contract.getCampaigns();
        campaigns.forEach((campaign, index) => {
          campaignsMap[index] = campaign.title;
        });
      } catch (err) {
        console.log('Could not fetch campaigns:', err);
      }

      // Get donation events from the last 10000 blocks (approximately last few days on Sepolia)
      const currentBlock = await publicProvider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 10000);

      const donationFilter = contract.filters.DonationReceived();
      const donationEvents = await contract.queryFilter(donationFilter, fromBlock, currentBlock);

      // Format events into transactions
      const formattedTransactions = await Promise.all(
        donationEvents.map(async (event, index) => {
          const block = await event.getBlock();
          const campaignId = Number(event.args.campaignId);
          const donor = event.args.donor;
          const amount = event.args.amount;
          const newTotal = event.args.newTotal;

          return {
            id: index + 1,
            txHash: event.transactionHash,
            from: donor,
            to: campaignsMap[campaignId] || `Campaign #${campaignId}`,
            campaignId: campaignId,
            amount: parseFloat(ethers.formatEther(amount)),
            amountCollected: parseFloat(ethers.formatEther(newTotal)),
            timestamp: new Date(block.timestamp * 1000).toLocaleString(),
            status: 'confirmed',
            blockNumber: event.blockNumber,
            gasUsed: '21000', // Approximate
          };
        })
      );

      // Sort by block number (most recent first)
      formattedTransactions.sort((a, b) => b.blockNumber - a.blockNumber);

      setTransactions(formattedTransactions);

    } catch (err) {
      console.error('Error fetching blockchain transactions:', err);
      setError(err.message);

      // Fallback to mock data if blockchain fetch fails
      setTransactions(getMockTransactions());
    } finally {
      setLoading(false);
    }
  };

  return { transactions, loading, error, refetch: fetchBlockchainTransactions };
}

/**
 * Fallback mock transactions if blockchain fetch fails
 */
function getMockTransactions() {
  return [
    {
      id: 1,
      txHash: '0x1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t',
      from: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      to: 'Campaign #0',
      amount: 0.05,
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toLocaleString(),
      status: 'confirmed',
      blockNumber: 15234567,
      gasUsed: '21000',
      campaignId: 0
    },
    {
      id: 2,
      txHash: '0x9t8s7r6q5p4o3n2m1l0k9j8i7h6g5f4e3d2c1b0a',
      from: '0x9876543210fedcba9876543210fedcba98765432',
      to: 'Campaign #1',
      amount: 0.1,
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toLocaleString(),
      status: 'confirmed',
      blockNumber: 15234521,
      gasUsed: '21000',
      campaignId: 1
    },
    {
      id: 3,
      txHash: '0xabcdef1234567890abcdef1234567890abcdef12',
      from: '0xabcdef1234567890abcdef1234567890abcdef12',
      to: 'Campaign #2',
      amount: 0.2,
      timestamp: new Date(Date.now() - 10 * 60 * 60 * 1000).toLocaleString(),
      status: 'confirmed',
      blockNumber: 15234489,
      gasUsed: '21000',
      campaignId: 2
    }
  ];
}
