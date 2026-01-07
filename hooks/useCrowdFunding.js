import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useAccount } from 'wagmi';
import { CONTRACTS } from '../config/wagmi';

// Import the contract ABI
import CrowdFundingABI from '../abi/CrowdFunding.json';

export const useCrowdFunding = () => {
  const { address, isConnected } = useAccount();
  const [contract, setContract] = useState(null);
  const [provider, setProvider] = useState(null);
  const [isContractReady, setIsContractReady] = useState(false);

  useEffect(() => {
    const initContract = async () => {
      try {
        if (typeof window.ethereum !== 'undefined') {
          // Create provider
          const web3Provider = new ethers.BrowserProvider(window.ethereum);
          setProvider(web3Provider);

          // Get network
          const network = await web3Provider.getNetwork();
          const chainId = network.chainId;

          // Get contract address based on network
          let contractAddress;
          if (chainId === 11155111n) {
            // Sepolia testnet
            contractAddress = CONTRACTS.crowdfunding.sepolia;
          } else {
            console.warn('Unsupported network. Please switch to Sepolia testnet.');
            setIsContractReady(false);
            return;
          }

          // Create contract instance (read-only with provider)
          const contractInstance = new ethers.Contract(
            contractAddress,
            CrowdFundingABI.abi,
            web3Provider
          );

          setContract(contractInstance);
          setIsContractReady(true);
        }
      } catch (error) {
        console.error('Error initializing contract:', error);
        setIsContractReady(false);
      }
    };

    initContract();
  }, [isConnected]);

  /**
   * Get all campaigns from the blockchain
   */
  const getCampaigns = useCallback(async () => {
    try {
      if (!contract) throw new Error('Contract not initialized');

      const campaigns = await contract.getCampaigns();
      const numberOfCampaigns = await contract.numberOfCampaigns();

      // Format campaigns data
      const formattedCampaigns = campaigns.map((campaign, index) => {
        const targetReached = campaign.amountCollected >= campaign.target;
        const deadlinePassed = Number(campaign.deadline) <= Date.now() / 1000;

        return {
          id: index,
          owner: campaign.owner,
          title: campaign.title,
          description: campaign.description,
          target: ethers.formatEther(campaign.target),
          deadline: Number(campaign.deadline),
          amountCollected: ethers.formatEther(campaign.amountCollected),
          image: campaign.image,
          category: campaign.category || 'Community Development', // Get from blockchain
          isVerified: campaign.isVerified || false,
          donators: campaign.donators,
          donations: campaign.donations,
          // Calculate derived fields
          daysLeft: calculateDaysLeft(Number(campaign.deadline)),
          progress: calculateProgress(campaign.amountCollected, campaign.target),
          isActive: !deadlinePassed && !targetReached,
          isFullyFunded: targetReached,
          isExpired: deadlinePassed,
        };
      });

      return formattedCampaigns;
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      return [];
    }
  }, [contract]);

  /**
   * Get a single campaign by ID
   */
  const getCampaign = useCallback(async (campaignId) => {
    try {
      if (!contract) throw new Error('Contract not initialized');

      const campaign = await contract.campaigns(campaignId);
      const [donators, donations] = await contract.getDonators(campaignId);

      const targetReached = campaign.amountCollected >= campaign.target;
      const deadlinePassed = Number(campaign.deadline) <= Date.now() / 1000;

      return {
        id: campaignId,
        owner: campaign.owner,
        title: campaign.title,
        description: campaign.description,
        target: ethers.formatEther(campaign.target),
        deadline: Number(campaign.deadline),
        amountCollected: ethers.formatEther(campaign.amountCollected),
        image: campaign.image,
        category: campaign.category || 'Community Development',
        isVerified: campaign.isVerified || false,
        donators: donators,
        donations: donations.map(d => ethers.formatEther(d)),
        daysLeft: calculateDaysLeft(Number(campaign.deadline)),
        progress: calculateProgress(campaign.amountCollected, campaign.target),
        isActive: !deadlinePassed && !targetReached,
        isFullyFunded: targetReached,
        isExpired: deadlinePassed,
      };
    } catch (error) {
      console.error('Error fetching campaign:', error);
      return null;
    }
  }, [contract]);

  /**
   * Get donators for a specific campaign
   */
  const getDonators = useCallback(async (campaignId) => {
    try {
      if (!contract) throw new Error('Contract not initialized');

      const [donators, donations] = await contract.getDonators(campaignId);

      return donators.map((donator, index) => ({
        address: donator,
        amount: ethers.formatEther(donations[index]),
        amountWei: donations[index].toString(),
      }));
    } catch (error) {
      console.error('Error fetching donators:', error);
      return [];
    }
  }, [contract]);

  /**
   * Create a new campaign
   */
  const createCampaign = useCallback(async (campaignData) => {
    try {
      if (!contract || !provider) throw new Error('Contract not initialized');
      if (!isConnected || !address) throw new Error('Wallet not connected');

      // Get signer
      const signer = await provider.getSigner();
      const contractWithSigner = contract.connect(signer);

      // Convert target to Wei
      const targetInWei = ethers.parseEther(campaignData.target.toString());

      // Convert deadline to Unix timestamp
      const deadlineTimestamp = Math.floor(new Date(campaignData.deadline).getTime() / 1000);

      // Call createCampaign function with category
      const tx = await contractWithSigner.createCampaign(
        address, // owner
        campaignData.title,
        campaignData.description,
        targetInWei,
        deadlineTimestamp,
        campaignData.image || '', // image URL
        campaignData.category || 'Community Development' // category
      );

      // Wait for transaction to be mined
      const receipt = await tx.wait();

      // Get the campaign ID from the return value
      const numberOfCampaigns = await contract.numberOfCampaigns();
      const campaignId = Number(numberOfCampaigns) - 1;

      return {
        success: true,
        campaignId,
        transactionHash: receipt.hash,
      };
    } catch (error) {
      console.error('Error creating campaign:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }, [contract, provider, isConnected, address]);

  /**
   * Donate to a campaign
   */
  const donateToCampaign = useCallback(async (campaignId, amount) => {
    try {
      if (!contract || !provider) throw new Error('Contract not initialized');
      if (!isConnected || !address) throw new Error('Wallet not connected');

      // Get signer
      const signer = await provider.getSigner();
      const contractWithSigner = contract.connect(signer);

      // Convert amount to Wei
      const amountInWei = ethers.parseEther(amount.toString());

      // Call donateToCampaign function
      const tx = await contractWithSigner.donateToCampaign(campaignId, {
        value: amountInWei,
      });

      // Wait for transaction to be mined
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: tx.hash, // Transaction hash is on the tx object, not receipt
      };
    } catch (error) {
      console.error('Error donating to campaign:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }, [contract, provider, isConnected, address]);

  // Helper functions
  const calculateDaysLeft = (deadlineTimestamp) => {
    const now = Math.floor(Date.now() / 1000);
    const secondsLeft = deadlineTimestamp - now;
    const daysLeft = Math.ceil(secondsLeft / (60 * 60 * 24));
    return Math.max(0, daysLeft);
  };

  const calculateProgress = (collected, target) => {
    if (target === 0n) return 0;
    const progress = (Number(collected) * 100) / Number(target);
    return Math.min(progress, 100);
  };

  /**
   * Post campaign update
   */
  const postCampaignUpdate = useCallback(async (campaignId, updateTitle, updateContent) => {
    try {
      if (!contract || !provider) throw new Error('Contract not initialized');
      if (!isConnected || !address) throw new Error('Wallet not connected');

      const signer = await provider.getSigner();
      const contractWithSigner = contract.connect(signer);

      const tx = await contractWithSigner.postCampaignUpdate(
        campaignId,
        updateTitle,
        updateContent
      );

      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: receipt.hash,
      };
    } catch (error) {
      console.error('Error posting update:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }, [contract, provider, isConnected, address]);

  /**
   * Get campaign updates
   */
  const getCampaignUpdates = useCallback(async (campaignId) => {
    try {
      if (!contract) throw new Error('Contract not initialized');

      const updates = await contract.getCampaignUpdates(campaignId);

      return updates.map(update => ({
        title: update.title,
        content: update.content,
        timestamp: Number(update.timestamp),
        date: new Date(Number(update.timestamp) * 1000).toLocaleString(),
      }));
    } catch (error) {
      console.error('Error fetching updates:', error);
      return [];
    }
  }, [contract]);

  /**
   * Check if organizer is verified
   */
  const isOrganizerVerified = useCallback(async (organizerAddress) => {
    try {
      if (!contract) throw new Error('Contract not initialized');

      return await contract.isOrganizerVerified(organizerAddress);
    } catch (error) {
      console.error('Error checking verification:', error);
      return false;
    }
  }, [contract]);

  /**
   * Get campaigns by owner address
   */
  const getCampaignsByOwner = useCallback(async (ownerAddress) => {
    try {
      if (!contract) throw new Error('Contract not initialized');

      const campaignIds = await contract.getCampaignsByOwner(ownerAddress);

      // Fetch full campaign details for each ID
      const campaigns = await Promise.all(
        campaignIds.map(async (id) => {
          const campaign = await contract.campaigns(Number(id));
          const targetReached = campaign.amountCollected >= campaign.target;
          const deadlinePassed = Number(campaign.deadline) <= Date.now() / 1000;

          return {
            id: Number(id),
            owner: campaign.owner,
            title: campaign.title,
            description: campaign.description,
            target: ethers.formatEther(campaign.target),
            deadline: Number(campaign.deadline),
            amountCollected: ethers.formatEther(campaign.amountCollected),
            image: campaign.image,
            category: campaign.category || 'Community Development',
            isVerified: campaign.isVerified || false,
            donators: campaign.donators,
            donations: campaign.donations,
            daysLeft: calculateDaysLeft(Number(campaign.deadline)),
            progress: calculateProgress(campaign.amountCollected, campaign.target),
            isActive: !deadlinePassed && !targetReached,
            isFullyFunded: targetReached,
            isExpired: deadlinePassed,
          };
        })
      );

      return campaigns;
    } catch (error) {
      console.error('Error fetching campaigns by owner:', error);
      return [];
    }
  }, [contract]);

  /**
   * Get user donation history
   */
  const getUserDonations = useCallback(async (userAddress) => {
    try {
      if (!contract) throw new Error('Contract not initialized');

      const [campaignIds, amounts] = await contract.getUserDonations(userAddress);

      return campaignIds.map((id, index) => ({
        campaignId: Number(id),
        amount: ethers.formatEther(amounts[index]),
        amountWei: amounts[index].toString(),
      }));
    } catch (error) {
      console.error('Error fetching user donations:', error);
      return [];
    }
  }, [contract]);

  /**
   * Get platform statistics
   */
  const getPlatformStats = useCallback(async () => {
    try {
      if (!contract) throw new Error('Contract not initialized');

      const stats = await contract.getPlatformStats();

      return {
        totalCampaigns: Number(stats.totalCampaigns),
        totalDonationsCount: Number(stats.totalDonationsCount),
        totalAmountRaised: ethers.formatEther(stats.totalAmountRaised),
        activeCampaignsCount: Number(stats.activeCampaignsCount),
      };
    } catch (error) {
      console.error('Error fetching platform stats:', error);
      return {
        totalCampaigns: 0,
        totalDonationsCount: 0,
        totalAmountRaised: '0',
        activeCampaignsCount: 0,
      };
    }
  }, [contract]);

  /**
   * Get only active campaigns
   */
  const getActiveCampaigns = useCallback(async () => {
    try {
      if (!contract) throw new Error('Contract not initialized');

      const campaigns = await contract.getActiveCampaigns();

      const formattedCampaigns = campaigns.map((campaign, index) => {
        const targetReached = campaign.amountCollected >= campaign.target;
        const deadlinePassed = Number(campaign.deadline) <= Date.now() / 1000;

        return {
          id: index,
          owner: campaign.owner,
          title: campaign.title,
          description: campaign.description,
          target: ethers.formatEther(campaign.target),
          deadline: Number(campaign.deadline),
          amountCollected: ethers.formatEther(campaign.amountCollected),
          image: campaign.image,
          category: campaign.category || 'Community Development',
          isVerified: campaign.isVerified || false,
          donators: campaign.donators,
          donations: campaign.donations,
          daysLeft: calculateDaysLeft(Number(campaign.deadline)),
          progress: calculateProgress(campaign.amountCollected, campaign.target),
          isActive: !deadlinePassed && !targetReached,
          isFullyFunded: targetReached,
          isExpired: deadlinePassed,
        };
      });

      return formattedCampaigns;
    } catch (error) {
      console.error('Error fetching active campaigns:', error);
      return [];
    }
  }, [contract]);

  return {
    // State
    isContractReady,
    isConnected,
    address,

    // Functions
    getCampaigns,
    getCampaign,
    getDonators,
    createCampaign,
    donateToCampaign,
    postCampaignUpdate,
    getCampaignUpdates,
    isOrganizerVerified,
    getCampaignsByOwner,
    getUserDonations,
    getPlatformStats,
    getActiveCampaigns,
  };
};
