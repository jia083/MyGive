import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SideNavigation from '../components/SideNavigation';
import { useResourceSharing } from '../hooks/useResourceSharing';
import { useWeb3 } from '../components/Web3Context';
import { getIPFSGatewayUrl } from '../utils/ipfs';
import {
  FaBox,
  FaMapMarkerAlt,
  FaClock,
  FaUser,
  FaCheckCircle,
  FaHourglassHalf,
  FaArrowLeft,
  FaComments,
  FaTimes,
  FaBan
} from 'react-icons/fa';
// CSS imported in _app.js

const MyClaimsPage = () => {
  const navigate = useNavigate();
  const { connected, account } = useWeb3();
  const { getUserClaims, getResource, getResourceClaims, cancelClaim, isContractReady } = useResourceSharing();

  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState({});

  // Helper function to check if image is IPFS hash
  const isIPFSHash = (str) => {
    return str && (str.startsWith('Qm') || str.startsWith('b')) && str.length > 20 && !str.includes(' ');
  };

  useEffect(() => {
    document.body.classList.add('with-side-nav');
    return () => {
      document.body.classList.remove('with-side-nav');
    };
  }, []);

  useEffect(() => {
    const loadClaims = async () => {
      if (!isContractReady || !connected || !account) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const userClaimsData = await getUserClaims(account);

        // Get resource details for each claim
        const claimsWithDetails = await Promise.all(
          userClaimsData.map(async (claim) => {
            const resource = await getResource(claim.resourceId);

            if (!resource) {
              return null;
            }

            // Get all claims for this resource to find isCancelled status and claim index
            const resourceClaims = await getResourceClaims(claim.resourceId);
            const matchingClaim = resourceClaims.find(
              rc => rc.claimer.toLowerCase() === account.toLowerCase() &&
                   rc.timestamp === claim.timestamp
            );

            // Get donor name from localStorage
            const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '{}');
            const donorName = registeredUsers[resource.owner]?.name ||
                              (resource.owner.slice(0, 6) + '...' + resource.owner.slice(-4));

            return {
              ...claim,
              isCancelled: matchingClaim?.isCancelled || false,
              claimIndex: matchingClaim?.index ?? -1,
              resource: {
                ...resource,
                donorName: donorName
              }
            };
          })
        );

        // Filter out null claims (resources that no longer exist)
        const validClaims = claimsWithDetails.filter(claim => claim !== null);
        setClaims(validClaims);
      } catch (error) {
        console.error('Error loading claims:', error);
      } finally {
        setLoading(false);
      }
    };

    loadClaims();
  }, [isContractReady, connected, account, getUserClaims, getResource, getResourceClaims]);

  const reloadClaims = async () => {
    const userClaimsData = await getUserClaims(account);
    const claimsWithDetails = await Promise.all(
      userClaimsData.map(async (claim) => {
        const resource = await getResource(claim.resourceId);
        if (!resource) return null;

        const resourceClaims = await getResourceClaims(claim.resourceId);
        const matchingClaim = resourceClaims.find(
          rc => rc.claimer.toLowerCase() === account.toLowerCase() &&
               rc.timestamp === claim.timestamp
        );

        const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '{}');
        const donorName = registeredUsers[resource.owner]?.name ||
                          (resource.owner.slice(0, 6) + '...' + resource.owner.slice(-4));

        return {
          ...claim,
          isCancelled: matchingClaim?.isCancelled || false,
          claimIndex: matchingClaim?.index ?? -1,
          resource: { ...resource, donorName }
        };
      })
    );
    setClaims(claimsWithDetails.filter(claim => claim !== null));
  };

  const handleCancelClaim = async (resourceId, claimIndex) => {
    if (!window.confirm('Are you sure you want to cancel this claim? This action cannot be undone.')) {
      return;
    }

    const key = `${resourceId}-${claimIndex}`;
    setCancelling(prev => ({ ...prev, [key]: true }));

    try {
      const result = await cancelClaim(resourceId, claimIndex);

      if (result.success) {
        alert('Claim cancelled successfully.\n\nThe resource quantity has been restored to the donor.');
        await reloadClaims();
      } else {
        alert(`Failed to cancel claim: ${result.error}`);
      }
    } catch (error) {
      console.error('Error cancelling claim:', error);
      alert('An error occurred while cancelling the claim.');
    } finally {
      setCancelling(prev => ({ ...prev, [key]: false }));
    }
  };

  if (!connected) {
    return (
      <div className="my-claims-layout">
        <SideNavigation />
        <div className="my-claims-container">
          <div className="connect-notice">
            <h2>Connect Your Wallet</h2>
            <p>Please connect your wallet to view your claimed resources.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="my-claims-layout">
      <SideNavigation />
      <div className="my-claims-container">
        {/* Header */}
        <div className="my-claims-header">
          <button onClick={() => navigate('/resources')} className="back-button">
            <FaArrowLeft />
            <span>Back to Resources</span>
          </button>

          <div className="header-content">
            <h1 className="page-title">My Claimed Resources</h1>
            <p className="page-subtitle">
              Track all the resources you've requested from the community
            </p>
          </div>

          <div className="claims-stats">
            <div className="stat-card">
              <div className="stat-value">{claims.length}</div>
              <div className="stat-label">Total Claims</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{claims.filter(c => c.isCompleted).length}</div>
              <div className="stat-label">Completed</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{claims.filter(c => !c.isCompleted && !c.isCancelled).length}</div>
              <div className="stat-label">Pending</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{claims.filter(c => c.isCancelled).length}</div>
              <div className="stat-label">Cancelled</div>
            </div>
          </div>
        </div>

        {/* Claims List */}
        <div className="claims-content">
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner">⏳</div>
              <h3>Loading your claims...</h3>
            </div>
          ) : claims.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📦</div>
              <h3>No Claims Yet</h3>
              <p>You haven't claimed any resources yet. Browse available resources and request what you need!</p>
              <button onClick={() => navigate('/resources')} className="btn-browse">
                Browse Resources
              </button>
            </div>
          ) : (
            <div className="claims-grid">
              {claims.map((claim, index) => (
                <div key={index} className="claim-card">
                  {/* Status Badge */}
                  <div className={`claim-status-badge ${claim.isCompleted ? 'completed' : claim.isCancelled ? 'cancelled' : 'pending'}`}>
                    {claim.isCompleted ? (
                      <>
                        <FaCheckCircle />
                        <span>Completed</span>
                      </>
                    ) : claim.isCancelled ? (
                      <>
                        <FaBan />
                        <span>Cancelled</span>
                      </>
                    ) : (
                      <>
                        <FaHourglassHalf />
                        <span>Pending</span>
                      </>
                    )}
                  </div>

                  {/* Resource Image */}
                  <div className="claim-image-container">
                    {isIPFSHash(claim.resource.image) ? (
                      <img
                        src={getIPFSGatewayUrl(claim.resource.image)}
                        alt={claim.resource.title}
                        className="claim-image"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div
                      className="claim-emoji-container"
                      style={{ display: isIPFSHash(claim.resource.image) ? 'none' : 'flex' }}
                    >
                      <span className="claim-emoji">{claim.resource.image}</span>
                    </div>
                  </div>

                  {/* Claim Details */}
                  <div className="claim-details">
                    <span className="claim-category">{claim.resource.category}</span>
                    <h3 className="claim-title">{claim.resource.title}</h3>

                    <div className="claim-info">
                      <div className="info-item">
                        <FaBox className="info-icon" />
                        <span>{claim.amount} {claim.resource.unit}</span>
                      </div>

                      <div className="info-item">
                        <FaMapMarkerAlt className="info-icon" />
                        <span>{claim.resource.location}</span>
                      </div>

                      <div className="info-item">
                        <FaClock className="info-icon" />
                        <span>Claimed {claim.timeAgo}</span>
                      </div>

                      <div className="info-item">
                        <FaUser className="info-icon" />
                        <span>From {claim.resource.donorName}</span>
                      </div>
                    </div>

                    <div className="claim-actions">
                      {!claim.isCancelled && (
                        <button
                          onClick={() => navigate(`/chat/${claim.resourceId}/${claim.timestamp}`)}
                          className="btn-chat"
                        >
                          <FaComments />
                          Chat with Donor
                        </button>
                      )}
                      {!claim.isCompleted && !claim.isCancelled && claim.claimIndex !== -1 && (
                        <button
                          onClick={() => handleCancelClaim(claim.resourceId, claim.claimIndex)}
                          className="btn-cancel-claim"
                          disabled={cancelling[`${claim.resourceId}-${claim.claimIndex}`]}
                        >
                          {cancelling[`${claim.resourceId}-${claim.claimIndex}`] ? (
                            'Cancelling...'
                          ) : (
                            <>
                              <FaTimes />
                              Cancel Claim
                            </>
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => navigate(`/resources/${claim.resourceId}`)}
                        className="btn-view-resource"
                      >
                        View Resource
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyClaimsPage;
