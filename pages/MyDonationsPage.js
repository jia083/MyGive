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
  FaCheck,
  FaTimes
} from 'react-icons/fa';
// CSS imported in _app.js

const MyDonationsPage = () => {
  const navigate = useNavigate();
  const { connected, account } = useWeb3();
  const { getResources, getResourceClaims, completeClaim, cancelClaim, isContractReady } = useResourceSharing();

  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState({});
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
    const loadDonations = async () => {
      if (!isContractReady || !connected || !account) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Get all resources
        const allResources = await getResources();

        // Filter resources owned by current user
        const myResources = allResources.filter(
          resource => resource.owner.toLowerCase() === account.toLowerCase()
        );

        // Get claims for each resource
        const donationsWithClaims = await Promise.all(
          myResources.map(async (resource) => {
            const claims = await getResourceClaims(resource.id);

            // Get claimer names
            const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '{}');
            const claimsWithNames = claims.map(claim => ({
              ...claim,
              claimerName: registeredUsers[claim.claimer]?.name ||
                          (claim.claimer.slice(0, 6) + '...' + claim.claimer.slice(-4))
            }));

            return {
              ...resource,
              claims: claimsWithNames,
              totalClaims: claims.length,
              pendingClaims: claims.filter(c => !c.isCompleted && !c.isCancelled).length,
              completedClaims: claims.filter(c => c.isCompleted).length
            };
          })
        );

        setDonations(donationsWithClaims);
      } catch (error) {
        console.error('Error loading donations:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDonations();
  }, [isContractReady, connected, account, getResources, getResourceClaims]);

  const handleCompleteClaim = async (resourceId, claimIndex) => {
    const key = `${resourceId}-${claimIndex}`;
    setCompleting(prev => ({ ...prev, [key]: true }));

    try {
      const result = await completeClaim(resourceId, claimIndex);

      if (result.success) {
        alert('Claim marked as completed! 🎉\n\nThe claimer will be notified.');

        // Reload donations to reflect changes
        const allResources = await getResources();
        const myResources = allResources.filter(
          resource => resource.owner.toLowerCase() === account.toLowerCase()
        );

        const donationsWithClaims = await Promise.all(
          myResources.map(async (resource) => {
            const claims = await getResourceClaims(resource.id);
            const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '{}');
            const claimsWithNames = claims.map(claim => ({
              ...claim,
              claimerName: registeredUsers[claim.claimer]?.name ||
                          (claim.claimer.slice(0, 6) + '...' + claim.claimer.slice(-4))
            }));

            return {
              ...resource,
              claims: claimsWithNames,
              totalClaims: claims.length,
              pendingClaims: claims.filter(c => !c.isCompleted && !c.isCancelled).length,
              completedClaims: claims.filter(c => c.isCompleted).length
            };
          })
        );

        setDonations(donationsWithClaims);
      } else {
        alert(`Failed to complete claim: ${result.error}`);
      }
    } catch (error) {
      console.error('Error completing claim:', error);
      alert('An error occurred while completing the claim.');
    } finally {
      setCompleting(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleCancelClaim = async (resourceId, claimIndex) => {
    if (!window.confirm('Are you sure you want to cancel this claim? This action cannot be undone and the resource quantity will be restored.')) {
      return;
    }

    const key = `${resourceId}-${claimIndex}`;
    setCancelling(prev => ({ ...prev, [key]: true }));

    try {
      const result = await cancelClaim(resourceId, claimIndex);

      if (result.success) {
        alert('Claim cancelled successfully.\n\nThe resource quantity has been restored.');

        // Reload donations to reflect changes
        const allResources = await getResources();
        const myResources = allResources.filter(
          resource => resource.owner.toLowerCase() === account.toLowerCase()
        );

        const donationsWithClaims = await Promise.all(
          myResources.map(async (resource) => {
            const claims = await getResourceClaims(resource.id);
            const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '{}');
            const claimsWithNames = claims.map(claim => ({
              ...claim,
              claimerName: registeredUsers[claim.claimer]?.name ||
                          (claim.claimer.slice(0, 6) + '...' + claim.claimer.slice(-4))
            }));

            return {
              ...resource,
              claims: claimsWithNames,
              totalClaims: claims.length,
              pendingClaims: claims.filter(c => !c.isCompleted && !c.isCancelled).length,
              completedClaims: claims.filter(c => c.isCompleted).length
            };
          })
        );

        setDonations(donationsWithClaims);
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
            <p>Please connect your wallet to view your donations.</p>
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
            <h1 className="page-title">My Donations</h1>
            <p className="page-subtitle">
              Manage your donated resources and coordinate with claimers
            </p>
          </div>

          <div className="claims-stats">
            <div className="stat-card">
              <div className="stat-value">{donations.length}</div>
              <div className="stat-label">Total Donations</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">
                {donations.reduce((sum, d) => sum + d.pendingClaims, 0)}
              </div>
              <div className="stat-label">Pending Claims</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">
                {donations.reduce((sum, d) => sum + d.completedClaims, 0)}
              </div>
              <div className="stat-label">Completed</div>
            </div>
          </div>
        </div>

        {/* Donations List */}
        <div className="claims-content">
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner">⏳</div>
              <h3>Loading your donations...</h3>
            </div>
          ) : donations.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📦</div>
              <h3>No Donations Yet</h3>
              <p>You haven't donated any resources yet. Share what you have to help others!</p>
              <button onClick={() => navigate('/resources/add')} className="btn-browse">
                Donate a Resource
              </button>
            </div>
          ) : (
            <div className="donations-list">
              {donations.map((donation) => (
                <div key={donation.id} className="donation-card">
                  {/* Resource Info */}
                  <div className="donation-header">
                    <div className="donation-image-container">
                      {isIPFSHash(donation.image) ? (
                        <img
                          src={getIPFSGatewayUrl(donation.image)}
                          alt={donation.title}
                          className="donation-image"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div
                        className="donation-emoji-container"
                        style={{ display: isIPFSHash(donation.image) ? 'none' : 'flex' }}
                      >
                        <span className="donation-emoji">{donation.image}</span>
                      </div>
                    </div>

                    <div className="donation-info">
                      <span className="claim-category">{donation.category}</span>
                      <h3 className="donation-title">{donation.title}</h3>
                      <div className="donation-meta">
                        <span>
                          <FaMapMarkerAlt /> {donation.location}
                        </span>
                        <span>
                          <FaBox /> {donation.quantityAvailable} / {donation.quantityOriginal} {donation.unit} available
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => navigate(`/resources/${donation.id}`)}
                      className="btn-view-resource-small"
                      style={{ alignSelf: 'flex-start' }}
                    >
                      View Details
                    </button>
                  </div>

                  {/* Claims List */}
                  {donation.claims.length > 0 ? (
                    <div className="claims-section">
                      <h4 className="claims-heading">
                        Claims ({donation.claims.length})
                      </h4>
                      <div className="claims-list">
                        {donation.claims.map((claim, claimIndex) => (
                          <div key={claimIndex} className="claim-item">
                            <div className="claim-item-info">
                              <div className="claim-item-avatar">
                                <FaUser />
                              </div>
                              <div className="claim-item-details">
                                <div className="claim-item-name">{claim.claimerName}</div>
                                <div className="claim-item-meta">
                                  <span>{claim.amount} {donation.unit}</span>
                                  <span>•</span>
                                  <span>
                                    {new Date(Number(claim.timestamp) * 1000).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="claim-item-status">
                              {claim.isCompleted ? (
                                <span className="status-badge completed">
                                  <FaCheckCircle /> Completed
                                </span>
                              ) : claim.isCancelled ? (
                                <span className="status-badge cancelled">
                                  Cancelled
                                </span>
                              ) : (
                                <span className="status-badge pending">
                                  <FaHourglassHalf /> Pending
                                </span>
                              )}

                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                {!claim.isCompleted && !claim.isCancelled && (
                                  <>
                                    <button
                                      onClick={() => handleCompleteClaim(donation.id, claim.index)}
                                      className="btn-complete-claim"
                                      disabled={completing[`${donation.id}-${claim.index}`] || cancelling[`${donation.id}-${claim.index}`]}
                                      title="Mark this claim as completed"
                                    >
                                      {completing[`${donation.id}-${claim.index}`] ? (
                                        'Completing...'
                                      ) : (
                                        <>
                                          <FaCheck /> Complete
                                        </>
                                      )}
                                    </button>
                                    <button
                                      onClick={() => handleCancelClaim(donation.id, claim.index)}
                                      className="btn-cancel-claim"
                                      disabled={completing[`${donation.id}-${claim.index}`] || cancelling[`${donation.id}-${claim.index}`]}
                                      title="Cancel this claim"
                                    >
                                      {cancelling[`${donation.id}-${claim.index}`] ? (
                                        'Cancelling...'
                                      ) : (
                                        <>
                                          <FaTimes /> Cancel
                                        </>
                                      )}
                                    </button>
                                  </>
                                )}
                                {!claim.isCancelled && (
                                  <button
                                    onClick={() => navigate(`/chat/${donation.id}/${claim.timestamp}`)}
                                    className="btn-chat-small"
                                  >
                                    <FaComments /> Chat
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="no-claims">
                      <p>No claims yet for this resource</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyDonationsPage;
