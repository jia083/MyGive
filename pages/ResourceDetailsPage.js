import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SideNavigation from '../components/SideNavigation';
import { useResourceSharing } from '../hooks/useResourceSharing';
import { useWeb3 } from '../components/Web3Context';
import { getIPFSGatewayUrl } from '../utils/ipfs';
import { CONTRACTS } from '../config/wagmi';
import {
  FaArrowLeft,
  FaBox,
  FaMapMarkerAlt,
  FaUser,
  FaClock,
  FaCheckCircle,
  FaExclamationCircle,
  FaHandHoldingHeart,
  FaCopy,
  FaExternalLinkAlt
} from 'react-icons/fa';
import { MdVerified } from 'react-icons/md';
import { HiShieldCheck } from 'react-icons/hi';
// CSS imported in _app.js

const ResourceDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { connected, account } = useWeb3();
  const { getResource, claimResource, isContractReady } = useResourceSharing();

  const [resource, setResource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [claimAmount, setClaimAmount] = useState('');
  const [error, setError] = useState('');
  const [copiedContract, setCopiedContract] = useState(false);

  const CONTRACT_ADDRESS = CONTRACTS.resourceSharing.sepolia;

  // Helper function to check if image is IPFS hash
  const isIPFSHash = (str) => {
    return str && (str.startsWith('Qm') || str.startsWith('b')) && str.length > 20 && !str.includes(' ');
  };

  // Copy contract address to clipboard
  const copyContractAddress = () => {
    navigator.clipboard.writeText(CONTRACT_ADDRESS);
    setCopiedContract(true);
    setTimeout(() => setCopiedContract(false), 2000);
  };

  useEffect(() => {
    document.body.classList.add('with-side-nav');
    return () => {
      document.body.classList.remove('with-side-nav');
    };
  }, []);

  useEffect(() => {
    const loadResource = async () => {
      if (!isContractReady) return;

      setLoading(true);
      try {
        const resourceData = await getResource(id);

        if (!resourceData) {
          setError('Resource not found');
          setLoading(false);
          return;
        }

        // Get registered users for donor name
        const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '{}');
        const donorName = registeredUsers[resourceData.owner]?.name ||
                          (resourceData.owner.slice(0, 6) + '...' + resourceData.owner.slice(-4));

        setResource({
          ...resourceData,
          donorName: donorName,
          donorAddress: resourceData.owner
        });
      } catch (err) {
        console.error('Error loading resource:', err);
        setError('Failed to load resource details');
      } finally {
        setLoading(false);
      }
    };

    loadResource();
  }, [id, isContractReady, getResource]);

  const handleClaimSubmit = async (e) => {
    e.preventDefault();

    if (!connected) {
      alert('Please connect your wallet first');
      return;
    }

    if (!claimAmount || parseInt(claimAmount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (parseInt(claimAmount) > resource.quantityAvailable) {
      alert(`Amount exceeds available quantity (${resource.quantityAvailable} ${resource.unit})`);
      return;
    }

    setClaiming(true);

    try {
      const result = await claimResource(id, parseInt(claimAmount));

      if (result.success) {
        const claimId = Date.now(); // Use timestamp as unique claim ID
        alert(`Resource claimed successfully! 🎉\n\nTransaction Hash: ${result.transactionHash}\n\nYou can now chat with the donor to arrange pickup/delivery.`);

        // Navigate to chat page
        navigate(`/chat/${id}/${claimId}`);
      } else {
        alert(`Failed to claim resource: ${result.error}`);
      }
    } catch (err) {
      console.error('Error claiming resource:', err);
      alert('An error occurred while claiming the resource');
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <div className="resource-details-layout">
        <SideNavigation />
        <div className="resource-details-container">
          <div className="loading-state">
            <div className="loading-spinner">⏳</div>
            <h3>Loading resource details...</h3>
          </div>
        </div>
      </div>
    );
  }

  if (error || !resource) {
    return (
      <div className="resource-details-layout">
        <SideNavigation />
        <div className="resource-details-container">
          <div className="error-state">
            <FaExclamationCircle className="error-icon" />
            <h3>{error || 'Resource not found'}</h3>
            <button onClick={() => navigate('/resources')} className="btn-back">
              Back to Resources
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isOwner = connected && account && account.toLowerCase() === resource.donorAddress.toLowerCase();

  return (
    <div className="resource-details-layout">
      <SideNavigation />
      <div className="resource-details-container">
        {/* Header */}
        <div className="resource-details-header">
          <button onClick={() => navigate('/resources')} className="back-button">
            <FaArrowLeft />
            <span>Back to Resources</span>
          </button>
        </div>

        {/* Main Content */}
        <div className="resource-details-content">
          {/* Left Column - Image and Info */}
          <div className="resource-details-left">
            {/* Resource Image */}
            <div className="resource-image-container">
              {isIPFSHash(resource.image) ? (
                <img
                  src={getIPFSGatewayUrl(resource.image)}
                  alt={resource.title}
                  className="resource-details-image"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div
                className="resource-details-emoji-container"
                style={{ display: isIPFSHash(resource.image) ? 'none' : 'flex' }}
              >
                <span className="resource-details-emoji">{resource.image}</span>
              </div>

              {/* Status Badge */}
              {!resource.isActive && (
                <div className="resource-status-badge inactive">
                  Inactive
                </div>
              )}
            </div>

            {/* Resource Meta Info */}
            <div className="resource-meta-card">
              <h3>Resource Information</h3>

              <div className="meta-item">
                <FaBox className="meta-icon" />
                <div className="meta-content">
                  <span className="meta-label">Available Quantity</span>
                  <span className="meta-value">{resource.quantityAvailable} {resource.unit}</span>
                </div>
              </div>

              <div className="meta-item">
                <FaMapMarkerAlt className="meta-icon" />
                <div className="meta-content">
                  <span className="meta-label">Location</span>
                  <span className="meta-value">{resource.location}</span>
                </div>
              </div>

              <div className="meta-item">
                <FaClock className="meta-icon" />
                <div className="meta-content">
                  <span className="meta-label">Posted</span>
                  <span className="meta-value">{resource.postedDate}</span>
                </div>
              </div>

              <div className="meta-item">
                <FaUser className="meta-icon" />
                <div className="meta-content">
                  <span className="meta-label">Donated By</span>
                  <div className="donor-info">
                    <span className="meta-value">{resource.donorName}</span>
                    {resource.isVerified && (
                      <div className="verified-badge-small">
                        <MdVerified />
                        <span>Verified</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="donor-address">
                <span className="address-label">Donor Address:</span>
                <code className="address-value">{resource.donorAddress}</code>
              </div>
            </div>

            {/* Blockchain Transparency */}
            <div className="blockchain-transparency-card">
              <div className="transparency-header">
                <HiShieldCheck className="transparency-icon" />
                <h3>Blockchain Transparency</h3>
              </div>
              <p className="transparency-description">
                This resource is stored on the Ethereum Sepolia blockchain. You can verify its authenticity and track its history using the information below.
              </p>

              <div className="transparency-details">
                <div className="transparency-item">
                  <span className="transparency-label">Resource ID</span>
                  <code className="transparency-value">#{id}</code>
                </div>

                <div className="transparency-item">
                  <span className="transparency-label">Smart Contract</span>
                  <div className="contract-address-row">
                    <code className="transparency-value contract-address">
                      {CONTRACT_ADDRESS.slice(0, 10)}...{CONTRACT_ADDRESS.slice(-8)}
                    </code>
                    <button
                      onClick={copyContractAddress}
                      className="copy-btn"
                      title="Copy contract address"
                    >
                      {copiedContract ? <FaCheckCircle /> : <FaCopy />}
                    </button>
                  </div>
                </div>

                <div className="transparency-item">
                  <span className="transparency-label">Network</span>
                  <span className="transparency-value network-badge">Sepolia Testnet</span>
                </div>
              </div>

              <a
                href={`https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`}
                target="_blank"
                rel="noopener noreferrer"
                className="view-on-etherscan"
              >
                <span>View on Etherscan</span>
                <FaExternalLinkAlt />
              </a>
            </div>
          </div>

          {/* Right Column - Details and Claim */}
          <div className="resource-details-right">
            {/* Title and Category */}
            <div className="resource-title-section">
              <span className="resource-category-badge">{resource.category}</span>
              <h1 className="resource-title">{resource.title}</h1>
            </div>

            {/* Description */}
            <div className="resource-description-section">
              <h3>Description</h3>
              <p className="resource-description">{resource.description}</p>
            </div>

            {/* Claim Section */}
            {resource.isActive && resource.quantityAvailable > 0 ? (
              isOwner ? (
                <div className="owner-notice">
                  <FaCheckCircle />
                  <div>
                    <strong>You are the donor</strong>
                    <p>This is your resource. You cannot claim your own donation.</p>
                  </div>
                </div>
              ) : (
                <div className="claim-section">
                  <h3>Request this Resource</h3>
                  <p className="claim-description">
                    Enter the amount you need. The donor will be notified of your claim request.
                  </p>

                  <form onSubmit={handleClaimSubmit} className="claim-form">
                    <div className="claim-input-group">
                      <label htmlFor="claimAmount">Amount Needed</label>
                      <div className="claim-input-wrapper">
                        <input
                          type="number"
                          id="claimAmount"
                          value={claimAmount}
                          onChange={(e) => setClaimAmount(e.target.value)}
                          placeholder="0"
                          min="1"
                          max={resource.quantityAvailable}
                          className="claim-input"
                          disabled={claiming || !connected}
                        />
                        <span className="input-unit">{resource.unit}</span>
                      </div>
                      <span className="input-helper">
                        Maximum: {resource.quantityAvailable} {resource.unit}
                      </span>
                    </div>

                    <button
                      type="submit"
                      className="btn-claim"
                      disabled={claiming || !connected || !resource.isActive}
                    >
                      {claiming ? (
                        'Processing Claim...'
                      ) : !connected ? (
                        'Connect Wallet to Claim'
                      ) : (
                        <>
                          <FaHandHoldingHeart />
                          Request Resource
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )
            ) : (
              <div className="unavailable-notice">
                <FaExclamationCircle />
                <div>
                  <strong>Resource Unavailable</strong>
                  <p>
                    {!resource.isActive
                      ? 'This resource has been deactivated by the donor.'
                      : 'No quantity available at the moment.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResourceDetailsPage;
