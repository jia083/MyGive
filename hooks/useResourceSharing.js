import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import { CONTRACTS } from '../config/wagmi';
import ResourceSharingArtifact from '../abi/ResourceSharing.json';

// Import the ABI
const RESOURCE_SHARING_ABI = ResourceSharingArtifact.abi;

export function useResourceSharing() {
  const { address, isConnected } = useAccount();
  const [contract, setContract] = useState(null);
  const [provider, setProvider] = useState(null);
  const [isContractReady, setIsContractReady] = useState(false);

  // Initialize contract
  useEffect(() => {
    const initContract = async () => {
      if (typeof window.ethereum !== 'undefined') {
        try {
          const web3Provider = new ethers.BrowserProvider(window.ethereum);
          setProvider(web3Provider);

          const resourceContract = new ethers.Contract(
            CONTRACTS.resourceSharing.sepolia,
            RESOURCE_SHARING_ABI,
            web3Provider
          );

          setContract(resourceContract);
          setIsContractReady(true);
        } catch (error) {
          console.error('Error initializing contract:', error);
          setIsContractReady(false);
        }
      }
    };

    initContract();
  }, []);

  // Helper function to calculate time ago
  const getTimeAgo = (timestamp) => {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;

    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
    return `${Math.floor(diff / 604800)} weeks ago`;
  };

  /**
   * Get all resources
   */
  const getResources = useCallback(async () => {
    try {
      if (!contract) throw new Error('Contract not initialized');

      const resources = await contract.getResources();

      const formattedResources = resources.map((resource, index) => ({
        id: index,
        owner: resource.owner,
        title: resource.title,
        description: resource.description,
        category: resource.category,
        quantityAvailable: Number(resource.quantityAvailable),
        quantityOriginal: Number(resource.quantityOriginal),
        unit: resource.unit,
        location: resource.location,
        postedTimestamp: Number(resource.postedTimestamp),
        postedDate: getTimeAgo(Number(resource.postedTimestamp)),
        isActive: resource.isActive,
        claimers: resource.claimers,
        claimedAmounts: resource.claimedAmounts.map(amt => Number(amt)),
        isVerified: resource.isVerified,
        image: resource.image || '📦',
        totalClaimed: Number(resource.quantityOriginal) - Number(resource.quantityAvailable),
      }));

      return formattedResources;
    } catch (error) {
      console.error('Error fetching resources:', error);
      return [];
    }
  }, [contract]);

  /**
   * Get active resources only
   */
  const getActiveResources = useCallback(async () => {
    try {
      if (!contract) throw new Error('Contract not initialized');

      const resources = await contract.getActiveResources();

      const formattedResources = resources.map((resource, index) => ({
        id: index,
        owner: resource.owner,
        title: resource.title,
        description: resource.description,
        category: resource.category,
        quantityAvailable: Number(resource.quantityAvailable),
        quantityOriginal: Number(resource.quantityOriginal),
        unit: resource.unit,
        location: resource.location,
        postedTimestamp: Number(resource.postedTimestamp),
        postedDate: getTimeAgo(Number(resource.postedTimestamp)),
        isActive: resource.isActive,
        claimers: resource.claimers,
        claimedAmounts: resource.claimedAmounts.map(amt => Number(amt)),
        isVerified: resource.isVerified,
        image: resource.image || '📦',
        totalClaimed: Number(resource.quantityOriginal) - Number(resource.quantityAvailable),
      }));

      return formattedResources;
    } catch (error) {
      console.error('Error fetching active resources:', error);
      return [];
    }
  }, [contract]);

  /**
   * Get resources by owner
   */
  const getResourcesByOwner = useCallback(async (ownerAddress) => {
    try {
      if (!contract) throw new Error('Contract not initialized');

      const resourceIds = await contract.getResourcesByOwner(ownerAddress);

      const resources = await Promise.all(
        resourceIds.map(async (id) => {
          const resource = await contract.resources(Number(id));
          return {
            id: Number(id),
            owner: resource.owner,
            title: resource.title,
            description: resource.description,
            category: resource.category,
            quantityAvailable: Number(resource.quantityAvailable),
            quantityOriginal: Number(resource.quantityOriginal),
            unit: resource.unit,
            location: resource.location,
            postedTimestamp: Number(resource.postedTimestamp),
            postedDate: getTimeAgo(Number(resource.postedTimestamp)),
            isActive: resource.isActive,
            isVerified: resource.isVerified,
            image: resource.image || '📦',
          };
        })
      );

      return resources;
    } catch (error) {
      console.error('Error fetching resources by owner:', error);
      return [];
    }
  }, [contract]);

  /**
   * Get resources by category
   */
  const getResourcesByCategory = useCallback(async (category) => {
    try {
      if (!contract) throw new Error('Contract not initialized');

      const resources = await contract.getResourcesByCategory(category);

      const formattedResources = resources.map((resource, index) => ({
        id: index,
        owner: resource.owner,
        title: resource.title,
        description: resource.description,
        category: resource.category,
        quantityAvailable: Number(resource.quantityAvailable),
        quantityOriginal: Number(resource.quantityOriginal),
        unit: resource.unit,
        location: resource.location,
        postedTimestamp: Number(resource.postedTimestamp),
        postedDate: getTimeAgo(Number(resource.postedTimestamp)),
        isActive: resource.isActive,
        claimers: resource.claimers,
        claimedAmounts: resource.claimedAmounts.map(amt => Number(amt)),
        isVerified: resource.isVerified,
        image: resource.image || '📦',
        totalClaimed: Number(resource.quantityOriginal) - Number(resource.quantityAvailable),
      }));

      return formattedResources;
    } catch (error) {
      console.error('Error fetching resources by category:', error);
      return [];
    }
  }, [contract]);

  /**
   * Post a new resource
   */
  const postResource = useCallback(async (resourceData) => {
    try {
      if (!contract || !provider) throw new Error('Contract not initialized');
      if (!isConnected || !address) throw new Error('Wallet not connected');

      const signer = await provider.getSigner();
      const contractWithSigner = contract.connect(signer);

      const tx = await contractWithSigner.postResource(
        resourceData.title,
        resourceData.description,
        resourceData.category,
        resourceData.quantity,
        resourceData.unit,
        resourceData.location,
        resourceData.image || '📦'
      );

      const receipt = await tx.wait();

      // Extract resource ID from event logs
      const event = receipt.logs.find(log => {
        try {
          const parsed = contractWithSigner.interface.parseLog(log);
          return parsed.name === 'ResourcePosted';
        } catch {
          return false;
        }
      });

      let resourceId = null;
      if (event) {
        const parsed = contractWithSigner.interface.parseLog(event);
        resourceId = Number(parsed.args.resourceId);
      }

      return {
        success: true,
        transactionHash: receipt.hash,
        resourceId,
      };
    } catch (error) {
      console.error('Error posting resource:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }, [contract, provider, isConnected, address]);

  /**
   * Claim a resource
   */
  const claimResource = useCallback(async (resourceId, amount) => {
    try {
      if (!contract || !provider) throw new Error('Contract not initialized');
      if (!isConnected || !address) throw new Error('Wallet not connected');

      const signer = await provider.getSigner();
      const contractWithSigner = contract.connect(signer);

      const tx = await contractWithSigner.claimResource(resourceId, amount);
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: receipt.hash,
      };
    } catch (error) {
      console.error('Error claiming resource:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }, [contract, provider, isConnected, address]);

  /**
   * Get resource claims
   */
  const getResourceClaims = useCallback(async (resourceId) => {
    try {
      if (!contract) throw new Error('Contract not initialized');

      const claims = await contract.getResourceClaims(resourceId);

      return claims.map((claim, index) => ({
        index,
        resourceId: Number(claim.resourceId),
        claimer: claim.claimer,
        amount: Number(claim.amount),
        timestamp: Number(claim.timestamp),
        timeAgo: getTimeAgo(Number(claim.timestamp)),
        isCompleted: claim.isCompleted,
        isCancelled: claim.isCancelled,
      }));
    } catch (error) {
      console.error('Error fetching resource claims:', error);
      return [];
    }
  }, [contract]);

  /**
   * Get user claims
   */
  const getUserClaims = useCallback(async (userAddress) => {
    try {
      if (!contract) throw new Error('Contract not initialized');

      const [resourceIds, amounts, timestamps, completionStatus] = await contract.getUserClaims(userAddress);

      return resourceIds.map((id, index) => ({
        resourceId: Number(id),
        amount: Number(amounts[index]),
        timestamp: Number(timestamps[index]),
        timeAgo: getTimeAgo(Number(timestamps[index])),
        isCompleted: completionStatus[index],
      }));
    } catch (error) {
      console.error('Error fetching user claims:', error);
      return [];
    }
  }, [contract]);

  /**
   * Complete a claim
   */
  const completeClaim = useCallback(async (resourceId, claimIndex) => {
    try {
      if (!contract || !provider) throw new Error('Contract not initialized');
      if (!isConnected || !address) throw new Error('Wallet not connected');

      const signer = await provider.getSigner();
      const contractWithSigner = contract.connect(signer);

      const tx = await contractWithSigner.completeClaim(resourceId, claimIndex);
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: receipt.hash,
      };
    } catch (error) {
      console.error('Error completing claim:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }, [contract, provider, isConnected, address]);

  /**
   * Cancel a claim
   */
  const cancelClaim = useCallback(async (resourceId, claimIndex) => {
    try {
      if (!contract || !provider) throw new Error('Contract not initialized');
      if (!isConnected || !address) throw new Error('Wallet not connected');

      const signer = await provider.getSigner();
      const contractWithSigner = contract.connect(signer);

      const tx = await contractWithSigner.cancelClaim(resourceId, claimIndex);
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: receipt.hash,
      };
    } catch (error) {
      console.error('Error cancelling claim:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }, [contract, provider, isConnected, address]);

  /**
   * Deactivate a resource
   */
  const deactivateResource = useCallback(async (resourceId) => {
    try {
      if (!contract || !provider) throw new Error('Contract not initialized');
      if (!isConnected || !address) throw new Error('Wallet not connected');

      const signer = await provider.getSigner();
      const contractWithSigner = contract.connect(signer);

      const tx = await contractWithSigner.deactivateResource(resourceId);
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: receipt.hash,
      };
    } catch (error) {
      console.error('Error deactivating resource:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }, [contract, provider, isConnected, address]);

  /**
   * Reactivate a resource
   */
  const reactivateResource = useCallback(async (resourceId) => {
    try {
      if (!contract || !provider) throw new Error('Contract not initialized');
      if (!isConnected || !address) throw new Error('Wallet not connected');

      const signer = await provider.getSigner();
      const contractWithSigner = contract.connect(signer);

      const tx = await contractWithSigner.reactivateResource(resourceId);
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: receipt.hash,
      };
    } catch (error) {
      console.error('Error reactivating resource:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }, [contract, provider, isConnected, address]);

  /**
   * Get resource statistics
   */
  const getResourceStats = useCallback(async () => {
    try {
      if (!contract) throw new Error('Contract not initialized');

      const stats = await contract.getResourceStats();

      return {
        totalResources: Number(stats.totalResources),
        activeResources: Number(stats.activeResources),
        totalClaims: Number(stats.totalClaims),
        completedClaims: Number(stats.completedClaims),
      };
    } catch (error) {
      console.error('Error fetching resource stats:', error);
      return {
        totalResources: 0,
        activeResources: 0,
        totalClaims: 0,
        completedClaims: 0,
      };
    }
  }, [contract]);

  /**
   * Get a single resource by ID
   */
  const getResource = useCallback(async (resourceId) => {
    try {
      if (!contract) throw new Error('Contract not initialized');

      const resource = await contract.resources(resourceId);

      // Check if resource exists (owner is not zero address)
      if (resource.owner === '0x0000000000000000000000000000000000000000') {
        return null;
      }

      return {
        id: resourceId,
        owner: resource.owner,
        title: resource.title,
        description: resource.description,
        category: resource.category,
        quantityAvailable: Number(resource.quantityAvailable),
        quantityOriginal: Number(resource.quantityOriginal),
        unit: resource.unit,
        location: resource.location,
        postedTimestamp: Number(resource.postedTimestamp),
        postedDate: getTimeAgo(Number(resource.postedTimestamp)),
        isActive: resource.isActive,
        isVerified: resource.isVerified,
        image: resource.image || '📦',
        totalClaimed: Number(resource.quantityOriginal) - Number(resource.quantityAvailable),
      };
    } catch (error) {
      console.error('Error fetching resource:', error);
      return null;
    }
  }, [contract]);

  /**
   * Check if donor is verified
   */
  const isDonorVerified = useCallback(async (donorAddress) => {
    try {
      if (!contract) throw new Error('Contract not initialized');

      return await contract.isDonorVerified(donorAddress);
    } catch (error) {
      console.error('Error checking verification:', error);
      return false;
    }
  }, [contract]);

  return {
    // State
    isContractReady,
    isConnected,
    address,

    // Functions
    getResources,
    getResource,
    getActiveResources,
    getResourcesByOwner,
    getResourcesByCategory,
    postResource,
    claimResource,
    getResourceClaims,
    getUserClaims,
    completeClaim,
    cancelClaim,
    deactivateResource,
    reactivateResource,
    getResourceStats,
    isDonorVerified,
  };
}
