import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import SideNavigation from '../components/SideNavigation';
import ReportActions from '../components/ReportActions';
import { useCrowdFunding } from '../hooks/useCrowdFunding';
import { useWeb3 } from '../components/Web3Context';
import { useNotificationContext } from '../components/NotificationContext';
import { CONTRACTS } from '../config/wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { uploadImageToIPFS, uploadDocumentToIPFS, isPinataConfigured } from '../utils/ipfs';
import {
  FaHeart,
  FaShare,
  FaFlag,
  FaClock,
  FaMapMarkerAlt,
  FaUser,
  FaCheckCircle,
  FaFire,
  FaChartLine,
  FaUsers,
  FaArrowLeft,
  FaCalendarAlt,
  FaExternalLinkAlt,
  FaDownload,
  FaCopy,
  FaCloudUploadAlt,
  FaTimes,
  FaFileAlt,
  FaImage
} from 'react-icons/fa';
import { MdVerified, MdTrendingUp } from 'react-icons/md';
import { HiSparkles, HiShieldCheck } from 'react-icons/hi';
import { BsLightningChargeFill } from 'react-icons/bs';

const CampaignDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { connected, account } = useWeb3();
  const { getCampaign, getDonators, donateToCampaign, getCampaignUpdates, postCampaignUpdate, isContractReady } = useCrowdFunding();
  const { openConnectModal } = useConnectModal();
  const { addNotification } = useNotificationContext();

  const [campaign, setCampaign] = useState(null);
  const [donators, setDonators] = useState([]);
  const [donationAmount, setDonationAmount] = useState('');
  const [activeTab, setActiveTab] = useState('story');
  const [showDonateModal, setShowDonateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [donating, setDonating] = useState(false);
  const [updates, setUpdates] = useState([]);
  const [newUpdateTitle, setNewUpdateTitle] = useState('');
  const [newUpdateContent, setNewUpdateContent] = useState('');
  const [postingUpdate, setPostingUpdate] = useState(false);
  const [copiedContract, setCopiedContract] = useState(false);
  const [updateFile, setUpdateFile] = useState(null);
  const [updateFilePreview, setUpdateFilePreview] = useState(null);
  const [uploadingUpdateFile, setUploadingUpdateFile] = useState(false);

  const CONTRACT_ADDRESS = CONTRACTS.crowdfunding.sepolia;

  useEffect(() => {
    document.body.classList.add('with-side-nav');
    return () => {
      document.body.classList.remove('with-side-nav');
    };
  }, []);

  useEffect(() => {
    fetchCampaignDetails();
  }, [id, isContractReady]);

  useEffect(() => {
    fetchCampaignUpdates();
  }, [id, isContractReady]);

  const fetchCampaignDetails = async () => {
    if (!isContractReady) return;

    setLoading(true);
    try {
      // Fetch campaign from blockchain
      const campaignData = await getCampaign(parseInt(id));

      if (!campaignData) {
        setLoading(false);
        return;
      }

      // Get registered users for organizer info
      const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '{}');
      const organizerData = registeredUsers[campaignData.owner];

      // Fetch donators
      const campaignDonators = await getDonators(parseInt(id));

      // Format campaign data for UI
      const formattedCampaign = {
        id: campaignData.id,
        title: campaignData.title,
        description: campaignData.description,
        story: campaignData.description, // Use description as story for now
        category: campaignData.category || 'Community Development',
        raised: parseFloat(campaignData.amountCollected),
        goal: parseFloat(campaignData.target),
        backers: campaignData.donators.length,
        daysLeft: campaignData.daysLeft,
        image: campaignData.image || '📋',
        isVerified: campaignData.isVerified || false,
        isTrending: campaignData.donators.length > 10,
        owner: campaignData.owner.toLowerCase(), // Store owner address
        organizer: {
          name: organizerData?.name || campaignData.owner,
          verified: true,
          campaigns: organizerData?.totalCampaigns || 1,
          totalRaised: organizerData?.totalRaised || parseFloat(campaignData.amountCollected),
          avatar: '👤',
          joinedDate: organizerData?.registeredAt
            ? new Date(organizerData.registeredAt).toLocaleDateString()
            : 'Blockchain Verified',
          organization: organizerData?.organization || '',
          bio: organizerData?.bio || ''
        },
        location: 'Malaysia',
        startDate: new Date((campaignData.deadline - 30 * 24 * 60 * 60) * 1000).toLocaleDateString(),
        endDate: new Date(campaignData.deadline * 1000).toLocaleDateString(),
        beneficiaries: 'Community members',
        isFullyFunded: parseFloat(campaignData.amountCollected) >= parseFloat(campaignData.target),
        donations: campaignDonators.map((donator, index) => {
          // Get donation details from localStorage if available
          const donationKey = `donation_${campaignData.id}_${donator.address}`;
          const savedDonation = JSON.parse(localStorage.getItem(donationKey) || '{}');

          return {
            id: index,
            donor: donator.address.slice(0, 6) + '...' + donator.address.slice(-4),
            fullAddress: donator.address,
            amount: parseFloat(donator.amount),
            time: savedDonation.timestamp || new Date().toLocaleString(),
            txHash: savedDonation.txHash || 'N/A',
            message: ''
          };
        }),
        milestones: [
          { amount: parseFloat(campaignData.target) * 0.25, reached: parseFloat(campaignData.amountCollected) >= parseFloat(campaignData.target) * 0.25, description: '25% milestone' },
          { amount: parseFloat(campaignData.target) * 0.50, reached: parseFloat(campaignData.amountCollected) >= parseFloat(campaignData.target) * 0.50, description: '50% milestone' },
          { amount: parseFloat(campaignData.target) * 0.75, reached: parseFloat(campaignData.amountCollected) >= parseFloat(campaignData.target) * 0.75, description: '75% milestone' },
          { amount: parseFloat(campaignData.target), reached: parseFloat(campaignData.amountCollected) >= parseFloat(campaignData.target), description: 'Goal reached!' }
        ],
        blockchainTx: campaignData.owner,
        documents: []
      };

      setCampaign(formattedCampaign);
      setDonators(campaignDonators);
    } catch (error) {
      console.error('Error loading campaign:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCampaignUpdates = async () => {
    if (!isContractReady) return;

    try {
      const campaignUpdates = await getCampaignUpdates(parseInt(id));
      setUpdates(campaignUpdates);
    } catch (error) {
      console.error('Error fetching updates:', error);
    }
  };

  const handleUpdateFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File must be less than 10MB');
      return;
    }

    setUpdateFile(file);

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUpdateFilePreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setUpdateFilePreview(null);
    }
  };

  const handleRemoveUpdateFile = () => {
    setUpdateFile(null);
    setUpdateFilePreview(null);
  };

  const handlePostUpdate = async () => {
    if (!connected || !account) {
      alert('Please connect your wallet first');
      return;
    }

    if (!newUpdateTitle.trim() || !newUpdateContent.trim()) {
      alert('Please enter both title and content for the update');
      return;
    }

    setPostingUpdate(true);
    try {
      let contentToPost = newUpdateContent;

      // Upload file to IPFS if one was selected
      if (updateFile && isPinataConfigured()) {
        setUploadingUpdateFile(true);

        let uploadResult;
        if (updateFile.type.startsWith('image/')) {
          uploadResult = await uploadImageToIPFS(updateFile);
        } else {
          uploadResult = await uploadDocumentToIPFS(updateFile, updateFile.name, {
            updateTitle: newUpdateTitle,
            campaignId: id
          });
        }

        if (uploadResult.success) {
          // Append IPFS link to content
          contentToPost += `\n\n📎 Attachment: https://gateway.pinata.cloud/ipfs/${uploadResult.ipfsHash}`;
          console.log('Update file uploaded to IPFS:', uploadResult.ipfsHash);
        } else {
          console.warn('File upload failed:', uploadResult.error);
          alert(`Warning: File upload failed (${uploadResult.error}). Posting update without attachment.`);
        }

        setUploadingUpdateFile(false);
      }

      const result = await postCampaignUpdate(parseInt(id), newUpdateTitle, contentToPost);

      if (result.success) {
        alert(`Update posted successfully! Transaction hash: ${result.transactionHash}`);
        setNewUpdateTitle('');
        setNewUpdateContent('');
        setUpdateFile(null);
        setUpdateFilePreview(null);
        // Refresh updates
        fetchCampaignUpdates();
      } else {
        alert(`Failed to post update: ${result.error}`);
      }
    } catch (error) {
      console.error('Error posting update:', error);
      alert('Failed to post update');
    } finally {
      setPostingUpdate(false);
      setUploadingUpdateFile(false);
    }
  };

  const handleDonate = async () => {
    if (!connected) {
      alert('Please connect your wallet first');
      return;
    }

    if (!donationAmount || parseFloat(donationAmount) <= 0) {
      alert('Please enter a valid donation amount');
      return;
    }

    // Check if campaign has expired
    if (campaign && campaign.daysLeft <= 0) {
      alert('This campaign has ended. Donations are no longer accepted.');
      return;
    }

    // Check if campaign is fully funded
    if (campaign && campaign.isFullyFunded) {
      alert('This campaign has reached its funding goal. Donations are no longer accepted.');
      return;
    }

    setDonating(true);
    try {
      const result = await donateToCampaign(parseInt(id), donationAmount);

      if (result.success) {
        // Save donation details to localStorage for receipt generation
        const donationKey = `donation_${id}_${account}`;
        const donationDetails = {
          txHash: result.transactionHash,
          timestamp: new Date().toLocaleString(),
          amount: donationAmount,
          campaignId: id,
          donorAddress: account
        };
        localStorage.setItem(donationKey, JSON.stringify(donationDetails));

        // Increment global receipt counter
        const receiptCounter = parseInt(localStorage.getItem('receiptCounter') || '1000');
        localStorage.setItem('receiptCounter', (receiptCounter + 1).toString());

        // Add notification for successful donation
        addNotification({
          type: 'success',
          title: 'Donation Successful!',
          message: `You donated ${donationAmount} ETH to ${campaign?.title}`,
          link: `/campaigns/${id}`
        });

        alert(`Donation successful! Transaction hash: ${result.transactionHash}`);
        setDonationAmount('');
        // Refresh campaign data
        fetchCampaignDetails();
      } else {
        alert(`Donation failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Error donating:', error);
      alert('Failed to process donation');
    } finally {
      setDonating(false);
    }
  };

  const handleDonationSubmit = (e) => {
    e.preventDefault();
    handleDonate();
  };

  const calculateProgress = () => {
    if (!campaign) return 0;
    return Math.min((campaign.raised / campaign.goal) * 100, 100);
  };

  // Check if current user is a donor
  const isUserDonor = () => {
    if (!connected || !account || !donators || donators.length === 0) return false;
    return donators.some(donator => donator.address.toLowerCase() === account.toLowerCase());
  };

  // Copy contract address to clipboard
  const copyContractAddress = () => {
    navigator.clipboard.writeText(CONTRACT_ADDRESS);
    setCopiedContract(true);
    setTimeout(() => setCopiedContract(false), 2000);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: campaign?.title,
        text: campaign?.description,
        url: window.location.href
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Campaign link copied to clipboard!');
    }
  };

  if (loading || !campaign) {
    return (
      <div className="campaign-details-layout">
        <SideNavigation />
        <div className="campaign-details-loading">
          <div className="loading-spinner"></div>
          <p>{loading ? 'Loading campaign from blockchain...' : 'Campaign not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="campaign-details-layout">
      <SideNavigation />
      <div className="campaign-details-container">
        {/* Back Button */}
        <button onClick={() => navigate('/campaigns')} className="back-button">
          <FaArrowLeft />
          <span>Back to Campaigns</span>
        </button>

        {/* Campaign Header */}
        <div className="campaign-details-header">
          <div className="campaign-header-content">
            <div className="campaign-badges-row">
              <span className="campaign-category-badge-detail">{campaign.category}</span>
              {campaign.isVerified && (
                <span className="verified-badge-detail">
                  <MdVerified />
                  Verified Campaign
                </span>
              )}
              {campaign.isTrending && (
                <span className="trending-badge-detail">
                  <FaFire />
                  Trending
                </span>
              )}
            </div>

            <h1 className="campaign-detail-title">{campaign.title}</h1>
            <p className="campaign-detail-description">{campaign.description}</p>

            <div className="campaign-meta-info">
              <div className="meta-item">
                <FaMapMarkerAlt />
                <span>{campaign.location}</span>
              </div>
              <div className="meta-item">
                <FaUsers />
                <span>{campaign.beneficiaries}</span>
              </div>
              <div className="meta-item">
                <FaCalendarAlt />
                <span>{campaign.startDate} - {campaign.endDate}</span>
              </div>
            </div>
          </div>

          <div className="campaign-header-actions">
            <button onClick={handleShare} className="btn-icon-action-detail">
              <FaShare />
            </button>
            <button className="btn-icon-action-detail">
              <FaFlag />
            </button>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="campaign-detail-grid">
          {/* Left Column - Main Content */}
          <div className="campaign-main-content">
            {/* Campaign Image/Icon */}
            <div className="campaign-hero-icon">
              {campaign.image && (campaign.image.startsWith('Qm') || campaign.image.startsWith('baf')) ? (
                <img
                  src={`https://gateway.pinata.cloud/ipfs/${campaign.image}`}
                  alt={campaign.title}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: '12px'
                  }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.textContent = '📋';
                  }}
                />
              ) : campaign.image && (campaign.image.startsWith('http://') || campaign.image.startsWith('https://')) ? (
                <img
                  src={campaign.image}
                  alt={campaign.title}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: '12px'
                  }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.textContent = '📋';
                  }}
                />
              ) : (
                campaign.image || '📋'
              )}
            </div>

            {/* Progress Section */}
            <div className="progress-section-detail">
              <div className="progress-stats-header">
                <div className="progress-stat-large">
                  <span className="stat-amount-large">{campaign.raised.toFixed(4)} ETH</span>
                  <span className="stat-label-large">raised of {campaign.goal.toFixed(4)} ETH</span>
                </div>
                <div className="progress-stat-large">
                  <span className="stat-amount-large">{campaign.backers}</span>
                  <span className="stat-label-large">backers</span>
                </div>
                <div className="progress-stat-large">
                  <span className="stat-amount-large">{campaign.daysLeft}</span>
                  <span className="stat-label-large">days left</span>
                </div>
              </div>

              <div className="progress-bar-detail">
                <div
                  className="progress-fill-detail"
                  style={{ width: `${calculateProgress()}%` }}
                ></div>
              </div>

              <div className="progress-percentage-label">
                {Math.round(calculateProgress())}% funded
              </div>
            </div>

            {/* Milestones */}
            <div className="milestones-section">
              <h3 className="section-title-detail">Campaign Milestones</h3>
              <div className="milestones-list">
                {campaign.milestones.map((milestone, index) => (
                  <div key={index} className={`milestone-item ${milestone.reached ? 'reached' : ''}`}>
                    <div className="milestone-icon">
                      {milestone.reached ? <FaCheckCircle /> : <FaClock />}
                    </div>
                    <div className="milestone-content">
                      <span className="milestone-amount">{milestone.amount.toFixed(4)} ETH</span>
                      <span className="milestone-description">{milestone.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tabs */}
            <div className="campaign-tabs">
              <button
                className={`tab-button ${activeTab === 'story' ? 'active' : ''}`}
                onClick={() => setActiveTab('story')}
              >
                Story
              </button>
              <button
                className={`tab-button ${activeTab === 'updates' ? 'active' : ''}`}
                onClick={() => setActiveTab('updates')}
              >
                Updates ({updates.length})
              </button>
              <button
                className={`tab-button ${activeTab === 'donations' ? 'active' : ''}`}
                onClick={() => setActiveTab('donations')}
              >
                Donations ({campaign.donations.length})
              </button>
              {/* Blockchain tab - only visible to donors */}
              {isUserDonor() && (
                <button
                  className={`tab-button ${activeTab === 'blockchain' ? 'active' : ''}`}
                  onClick={() => setActiveTab('blockchain')}
                >
                  Blockchain
                </button>
              )}
            </div>

            {/* Tab Content */}
            <div className="tab-content">
              {activeTab === 'story' && (
                <div className="story-content">
                  <h3 className="section-title-detail">Campaign Story</h3>
                  <div className="story-text">
                    {campaign.story.split('\n\n').map((paragraph, index) => (
                      <p key={index}>{paragraph}</p>
                    ))}
                  </div>

                  <h3 className="section-title-detail">Documents</h3>
                  <div className="documents-list">
                    {campaign.documents.map((doc, index) => (
                      <div key={index} className="document-item">
                        <div className="document-icon">📄</div>
                        <div className="document-info">
                          <span className="document-name">{doc.name}</span>
                          <span className="document-size">{doc.size}</span>
                        </div>
                        <button className="document-download">
                          <FaDownload />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'updates' && (
                <div className="updates-content">
                  <h3 className="section-title-detail">Campaign Updates</h3>

                  {/* Post Update Form - Only show to campaign owner */}
                  {connected && account && campaign.blockchainTx.toLowerCase() === account.toLowerCase() && (
                    <div className="post-update-form" style={{
                      background: '#F9FAFB',
                      border: '2px dashed #D1D5DB',
                      borderRadius: '12px',
                      padding: '1.5rem',
                      marginBottom: '2rem'
                    }}>
                      <h4 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: '#111827' }}>
                        📢 Post an Update
                      </h4>
                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
                          Update Title
                        </label>
                        <input
                          type="text"
                          value={newUpdateTitle}
                          onChange={(e) => setNewUpdateTitle(e.target.value)}
                          placeholder="e.g., Milestone Reached!"
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            border: '1px solid #D1D5DB',
                            borderRadius: '8px',
                            fontSize: '0.95rem'
                          }}
                          maxLength={100}
                        />
                      </div>
                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
                          Update Content
                        </label>
                        <textarea
                          value={newUpdateContent}
                          onChange={(e) => setNewUpdateContent(e.target.value)}
                          placeholder="Share your progress, achievements, or news with your backers..."
                          rows={4}
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            border: '1px solid #D1D5DB',
                            borderRadius: '8px',
                            fontSize: '0.95rem',
                            resize: 'vertical'
                          }}
                          maxLength={500}
                        />
                      </div>

                      {/* File Upload Section */}
                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
                          📎 Attach File (Optional)
                        </label>
                        {!updateFile ? (
                          <div>
                            <input
                              type="file"
                              id="update-file-upload"
                              accept="image/*,.pdf,.doc,.docx"
                              onChange={handleUpdateFileChange}
                              style={{ display: 'none' }}
                            />
                            <label
                              htmlFor="update-file-upload"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.75rem 1rem',
                                background: 'white',
                                border: '2px dashed #D1D5DB',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                                color: '#6B7280',
                                transition: 'all 0.2s'
                              }}
                            >
                              <FaCloudUploadAlt />
                              Click to upload image or document
                            </label>
                            <p style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: '0.5rem', marginBottom: 0 }}>
                              Images, PDF, or Word documents (Max 10MB)
                            </p>
                          </div>
                        ) : (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            padding: '0.75rem',
                            background: 'white',
                            border: '1px solid #D1D5DB',
                            borderRadius: '8px'
                          }}>
                            {updateFilePreview ? (
                              <img
                                src={updateFilePreview}
                                alt="Preview"
                                style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px' }}
                              />
                            ) : (
                              <div style={{ fontSize: '2rem' }}>
                                <FaFileAlt />
                              </div>
                            )}
                            <div style={{ flex: 1 }}>
                              <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                                {updateFile.name}
                              </p>
                              <p style={{ margin: 0, fontSize: '0.75rem', color: '#6B7280' }}>
                                {(updateFile.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={handleRemoveUpdateFile}
                              style={{
                                padding: '0.5rem',
                                background: '#FEE2E2',
                                color: '#DC2626',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                              }}
                            >
                              <FaTimes />
                            </button>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={handlePostUpdate}
                        disabled={postingUpdate || uploadingUpdateFile || !newUpdateTitle.trim() || !newUpdateContent.trim()}
                        style={{
                          padding: '0.75rem 1.5rem',
                          background: (postingUpdate || uploadingUpdateFile) ? '#9CA3AF' : '#7C3AED',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '0.95rem',
                          fontWeight: '600',
                          cursor: (postingUpdate || uploadingUpdateFile) ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {uploadingUpdateFile ? (
                          <>
                            <FaCloudUploadAlt style={{ marginRight: '0.5rem' }} />
                            Uploading to IPFS...
                          </>
                        ) : postingUpdate ? (
                          'Posting to Blockchain...'
                        ) : (
                          'Post Update'
                        )}
                      </button>
                    </div>
                  )}

                  {/* Updates List */}
                  {updates.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#6B7280' }}>
                      <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>📭 No updates yet</p>
                      <p style={{ fontSize: '0.9rem' }}>The campaign organizer hasn't posted any updates.</p>
                    </div>
                  ) : (
                    <div className="updates-list">
                      {updates.map((update, index) => {
                        // Parse content and extract IPFS attachment
                        const attachmentMatch = update.content.match(/📎 Attachment: (https:\/\/gateway\.pinata\.cloud\/ipfs\/[^\s]+)/);
                        const contentWithoutAttachment = update.content.replace(/\n\n📎 Attachment: https:\/\/gateway\.pinata\.cloud\/ipfs\/[^\s]+/, '');
                        const ipfsUrl = attachmentMatch ? attachmentMatch[1] : null;
                        const ipfsHash = ipfsUrl ? ipfsUrl.split('/ipfs/')[1] : null;

                        // Check if attachment is an image
                        const isImage = ipfsHash && (
                          ipfsHash.toLowerCase().includes('jpg') ||
                          ipfsHash.toLowerCase().includes('jpeg') ||
                          ipfsHash.toLowerCase().includes('png') ||
                          ipfsHash.toLowerCase().includes('gif') ||
                          ipfsHash.toLowerCase().includes('webp') ||
                          ipfsHash.startsWith('Qm') ||
                          ipfsHash.startsWith('baf')
                        );

                        return (
                          <div key={index} className="update-item" style={{
                            background: 'white',
                            border: '1px solid #E5E7EB',
                            borderRadius: '12px',
                            padding: '1.5rem',
                            marginBottom: '1rem'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                              <div style={{ fontSize: '2rem' }}>📢</div>
                              <div style={{ flex: 1 }}>
                                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', color: '#111827', fontWeight: '600' }}>
                                  {update.title}
                                </h4>
                                <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', color: '#4B5563', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                                  {contentWithoutAttachment}
                                </p>

                                {/* Display IPFS Attachment */}
                                {ipfsUrl && (
                                  <div style={{
                                    marginTop: '1rem',
                                    padding: '1rem',
                                    background: '#F9FAFB',
                                    borderRadius: '8px',
                                    border: '1px solid #E5E7EB'
                                  }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#6B7280', fontSize: '0.875rem', fontWeight: '600' }}>
                                      <FaFileAlt />
                                      <span>Attachment</span>
                                    </div>

                                    {isImage ? (
                                      // Display image
                                      <div style={{ marginBottom: '0.75rem' }}>
                                        <img
                                          src={ipfsUrl}
                                          alt="Update attachment"
                                          style={{
                                            maxWidth: '100%',
                                            height: 'auto',
                                            borderRadius: '8px',
                                            display: 'block'
                                          }}
                                          onError={(e) => {
                                            e.target.style.display = 'none';
                                            e.target.nextSibling.style.display = 'block';
                                          }}
                                        />
                                        <div style={{ display: 'none', padding: '2rem', textAlign: 'center', color: '#9CA3AF' }}>
                                          Failed to load image
                                        </div>
                                      </div>
                                    ) : (
                                      // Display document icon
                                      <div style={{
                                        padding: '1rem',
                                        background: 'white',
                                        borderRadius: '6px',
                                        marginBottom: '0.75rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem'
                                      }}>
                                        <div style={{ fontSize: '2rem' }}>📄</div>
                                        <div style={{ flex: 1 }}>
                                          <div style={{ fontSize: '0.875rem', color: '#111827', fontWeight: '500' }}>
                                            Attached Document
                                          </div>
                                          <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                                            Stored on IPFS
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    <a
                                      href={ipfsUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        padding: '0.5rem 1rem',
                                        background: '#10B981',
                                        color: 'white',
                                        borderRadius: '6px',
                                        textDecoration: 'none',
                                        fontSize: '0.875rem',
                                        fontWeight: '600',
                                        transition: 'background 0.2s'
                                      }}
                                      onMouseOver={(e) => e.currentTarget.style.background = '#059669'}
                                      onMouseOut={(e) => e.currentTarget.style.background = '#10B981'}
                                    >
                                      <FaExternalLinkAlt />
                                      View on IPFS
                                    </a>
                                  </div>
                                )}

                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#9CA3AF', marginTop: '0.75rem' }}>
                                  <FaClock />
                                  <span>{update.date}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'donations' && (
                <div className="donations-content">
                  <h3 className="section-title-detail">Recent Donations</h3>
                  {campaign.donations.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                      <p>No donations yet. Be the first to support this campaign!</p>
                    </div>
                  ) : (
                    <>
                      <div className="donations-list">
                        {campaign.donations.map((donation) => (
                          <div key={donation.id} className="donation-item">
                            <div className="donation-avatar">
                              <FaUser />
                            </div>
                            <div className="donation-info">
                              <div className="donation-header">
                                <span className="donation-donor">
                                  {donation.donor}
                                  <a
                                    href={`https://sepolia.etherscan.io/address/${donation.fullAddress}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#3B82F6' }}
                                    title="View wallet on Etherscan"
                                  >
                                    <FaExternalLinkAlt />
                                  </a>
                                </span>
                                <span className="donation-amount">{parseFloat(donation.amount).toFixed(4)} ETH</span>
                              </div>
                              {donation.message && (
                                <p className="donation-message">{donation.message}</p>
                              )}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                                <span className="donation-time">{donation.time}</span>
                                {/* Only show receipt buttons if current user is the donor */}
                                {connected && account && donation.fullAddress.toLowerCase() === account.toLowerCase() && (
                                  <ReportActions
                                    type="donation"
                                    data={{
                                      receiptId: `RCP-${String(1000 + donation.id).padStart(6, '0')}`,
                                      txHash: donation.txHash || 'N/A',
                                      timestamp: donation.time,
                                      campaignTitle: campaign.title,
                                      campaignId: campaign.id,
                                      category: campaign.category,
                                      amount: donation.amount,
                                      amountUSD: (parseFloat(donation.amount) * 2500).toFixed(2), // Estimate
                                      donorAddress: donation.fullAddress,
                                      donorName: 'Anonymous',
                                      campaignOwner: campaign.blockchainTx,
                                      organizationName: campaign.organizer.organization || campaign.organizer.name
                                    }}
                                    className="donation-receipt-actions"
                                  />
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {activeTab === 'blockchain' && (
                <div className="blockchain-content">
                  {!isUserDonor() ? (
                    // Show message for non-donors
                    <div className="donor-only-content">
                      <div className="donor-only-icon">🔒</div>
                      <h3>Blockchain Transparency - For Donors Only</h3>
                      <p>
                        This section contains detailed blockchain verification and transaction history.
                        To access this information, you must first donate to this campaign.
                      </p>
                      <div className="donor-only-benefits">
                        <h4>What you'll get access to:</h4>
                        <ul>
                          <li>✅ Complete blockchain transaction history</li>
                          <li>✅ Smart contract verification details</li>
                          <li>✅ Etherscan transaction links</li>
                          <li>✅ Campaign transparency report (PDF)</li>
                          <li>✅ Real-time fund tracking</li>
                        </ul>
                      </div>
                      <p style={{ marginTop: '1.5rem', fontSize: '0.9rem', color: '#6B7280' }}>
                        💡 Donate any amount to unlock full blockchain transparency and track exactly where your contribution goes.
                      </p>
                    </div>
                  ) : (
                    // Show blockchain details for donors
                    <>
                      <h3 className="section-title-detail">Blockchain Verification & Money Trail</h3>
                      <div className="blockchain-info-box">
                        <div className="blockchain-icon">⛓️</div>
                        <div className="blockchain-text">
                          <p>This campaign is secured and verified on the Ethereum blockchain. All donations are transparent and traceable.</p>
                        </div>
                      </div>

                  <div className="blockchain-details">
                    <div className="blockchain-detail-item">
                      <span className="detail-label">Campaign Owner Wallet</span>
                      <div className="detail-value">
                        <code style={{ fontSize: '0.85rem' }}>{campaign.blockchainTx}</code>
                        <a
                          href={`https://sepolia.etherscan.io/address/${campaign.blockchainTx}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-copy"
                          style={{ textDecoration: 'none' }}
                        >
                          View <FaExternalLinkAlt style={{ fontSize: '0.75rem', marginLeft: '0.25rem' }} />
                        </a>
                      </div>
                    </div>
                    <div className="blockchain-detail-item">
                      <span className="detail-label">Network</span>
                      <span className="detail-value">Sepolia Testnet</span>
                    </div>
                    <div className="blockchain-detail-item">
                      <span className="detail-label">Total Transactions</span>
                      <span className="detail-value">{campaign.backers} donations recorded</span>
                    </div>
                    <div className="blockchain-detail-item">
                      <span className="detail-label">Total Received by Owner</span>
                      <span className="detail-value" style={{ color: '#10B981', fontWeight: '600' }}>
                        {campaign.raised.toFixed(4)} ETH
                      </span>
                    </div>
                  </div>

                  <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#FEF3C7', borderRadius: '8px', border: '1px solid #FCD34D' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', color: '#92400E' }}>
                      💡 Where Does The Money Go?
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#78350F', lineHeight: '1.5' }}>
                      All donations are sent <strong>instantly and directly</strong> to the campaign owner's wallet address shown above.
                      The smart contract does NOT hold any funds. You can verify all transactions on Etherscan by clicking the "View" button above.
                    </p>
                  </div>

                  {/* Campaign Report Generation */}
                  <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#F9FAFB', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
                    <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#111827', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      📊 Campaign Transparency Report
                    </h4>
                    <p style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', color: '#6B7280' }}>
                      Generate a comprehensive PDF report of this campaign including all donations, blockchain verification, and campaign details.
                      Upload to IPFS for permanent, tamper-proof record keeping.
                    </p>
                    <ReportActions
                      type="campaign"
                      data={{
                        id: campaign.id || id,
                        title: campaign.title,
                        description: campaign.description,
                        category: campaign.category,
                        target: campaign.goal,
                        amountCollected: campaign.raised,
                        createdDate: campaign.startDate,
                        deadline: campaign.endDate,
                        status: campaign.isFullyFunded ? 'Fully Funded' : (campaign.daysLeft > 0 ? 'Active' : 'Ended'),
                        donorCount: campaign.backers,
                        donations: campaign.donations.map((d, idx) => ({
                          date: d.time,
                          donorAddress: d.fullAddress,
                          amount: d.amount.toString(),
                          txHash: '' // Add if available
                        }))
                      }}
                    />
                  </div>

                  <a
                    href={`https://sepolia.etherscan.io/address/${campaign.blockchainTx}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-view-blockchain"
                    style={{ textDecoration: 'none', display: 'inline-flex', marginTop: '1rem' }}
                  >
                    <FaExternalLinkAlt />
                    View All Transactions on Etherscan
                  </a>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <aside className="campaign-sidebar-detail">
            {/* Donate Card */}
            <div className="donate-card">
              <h3 className="donate-card-title">Support This Campaign</h3>

              {campaign && account && campaign.owner === account.toLowerCase() ? (
                <div className="campaign-owner-notice">
                  <div className="notice-header">
                    <FaCheckCircle className="notice-icon owner-icon" />
                    <h4>Your Campaign</h4>
                  </div>
                  <p className="notice-message">You are the owner of this campaign and cannot donate to it.</p>

                  <div className="campaign-progress-summary">
                    <div className="progress-stat">
                      <span className="progress-label">Raised</span>
                      <span className="progress-value">{campaign.raised.toFixed(4)} ETH</span>
                    </div>
                    <div className="progress-stat">
                      <span className="progress-label">Goal</span>
                      <span className="progress-value">{campaign.goal.toFixed(4)} ETH</span>
                    </div>
                    <div className="progress-stat">
                      <span className="progress-label">Backers</span>
                      <span className="progress-value">{campaign.backers}</span>
                    </div>
                  </div>
                </div>
              ) : campaign && campaign.isFullyFunded ? (
                <div className="campaign-ended-notice">
                  <FaCheckCircle style={{ fontSize: '2rem', color: '#10B981', marginBottom: '1rem' }} />
                  <h4>Fully Funded! 🎉</h4>
                  <p>This campaign has reached its funding goal. Thank you to all supporters!</p>
                  <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#D1FAE5', borderRadius: '8px', border: '1px solid #10B981' }}>
                    <strong>Goal Achieved:</strong> {campaign.raised.toFixed(4)} ETH / {campaign.goal.toFixed(4)} ETH
                  </div>
                </div>
              ) : campaign && campaign.daysLeft <= 0 ? (
                <div className="campaign-ended-notice">
                  <FaClock style={{ fontSize: '2rem', color: '#666', marginBottom: '1rem' }} />
                  <h4>Campaign Ended</h4>
                  <p>This campaign has reached its deadline and is no longer accepting donations.</p>
                  <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#f3f4f6', borderRadius: '8px' }}>
                    <strong>Final Amount Raised:</strong> {campaign.raised.toFixed(4)} ETH
                  </div>
                </div>
              ) : (
                <>
                  <div className="quick-amounts">
                    {[
                      { percent: 25, label: '25% of target' },
                      { percent: 50, label: '50% of target' },
                      { percent: 75, label: '75% of target' },
                      { percent: 100, label: 'Full target' }
                    ].map(({ percent, label }) => {
                      const amount = (campaign.goal * percent / 100).toFixed(4);
                      return (
                        <button
                          key={percent}
                          className="quick-amount-btn"
                          onClick={() => setDonationAmount(amount)}
                          title={label}
                        >
                          {amount} ETH
                        </button>
                      );
                    })}
                  </div>

                  <div className="custom-amount">
                    <label>Or enter custom amount</label>
                    <div className="amount-input-wrapper">
                      <span className="currency">ETH</span>
                      <input
                        type="number"
                        step="0.001"
                        placeholder="0.0"
                        value={donationAmount}
                        onChange={(e) => setDonationAmount(e.target.value)}
                        className="amount-input"
                      />
                    </div>
                  </div>

                  <button
                    onClick={connected ? handleDonate : openConnectModal}
                    className="btn-donate-primary"
                    disabled={donating}
                  >
                    <FaHeart />
                    {donating ? 'Processing...' : connected ? 'Donate Now' : 'Connect Wallet First'}
                  </button>

                  <p className="donate-note">
                    <FaCheckCircle /> Secure blockchain transaction
                  </p>
                </>
              )}
            </div>

            {/* Organizer Card */}
            <div className="organizer-card">
              <h3 className="organizer-card-title">Campaign Organizer</h3>

              <div className="organizer-profile">
                <div className="organizer-avatar">{campaign.organizer.avatar}</div>
                <div className="organizer-info">
                  <div className="organizer-name">
                    {campaign.organizer.name}
                    {campaign.organizer.verified && <MdVerified />}
                  </div>
                  <span className="organizer-joined">{campaign.organizer.joinedDate}</span>
                </div>
              </div>

              <div className="organizer-stats">
                <div className="organizer-stat">
                  <span className="stat-value">{campaign.organizer.campaigns}</span>
                  <span className="stat-label">Campaigns</span>
                </div>
                <div className="organizer-stat">
                  <span className="stat-value">{campaign.organizer.totalRaised.toFixed(2)} ETH</span>
                  <span className="stat-label">Total Raised</span>
                </div>
              </div>

              <Link to={`/organizer/${campaign.organizer.name}`} className="btn-view-profile">
                View Profile
              </Link>
            </div>

            {/* Share Card */}
            <div className="share-card">
              <h3 className="share-card-title">Share Campaign</h3>
              <p className="share-description">Help us reach more people by sharing this campaign</p>

              <button onClick={handleShare} className="btn-share-full">
                <FaShare />
                Share Campaign
              </button>
            </div>

            {/* Blockchain Transparency - Only visible to donors */}
            {isUserDonor() && (
              <div className={`blockchain-transparency-card ${campaign.isFullyFunded ? 'fully-funded' : 'in-progress'}`}>
                <div className="transparency-header">
                  <HiShieldCheck className="transparency-icon" />
                  <h3>Blockchain Transparency</h3>
                  {campaign.isFullyFunded && (
                    <span className="funding-status-badge success">Fully Funded</span>
                  )}
                  {!campaign.isFullyFunded && (
                    <span className="funding-status-badge in-progress">In Progress</span>
                  )}
                </div>

                {campaign.isFullyFunded ? (
                  <>
                    <p className="transparency-description">
                      🎉 This campaign has been successfully funded! As a donor, you can verify all final transaction details and campaign completion status on the blockchain.
                    </p>

                    <div className="funding-summary">
                      <div className="summary-stat">
                        <span className="summary-label">Total Raised</span>
                        <span className="summary-value success">{campaign.raised.toFixed(4)} ETH</span>
                      </div>
                      <div className="summary-stat">
                        <span className="summary-label">Goal Amount</span>
                        <span className="summary-value">{campaign.goal.toFixed(4)} ETH</span>
                      </div>
                      <div className="summary-stat">
                        <span className="summary-label">Total Backers</span>
                        <span className="summary-value">{campaign.backers}</span>
                      </div>
                    </div>

                    <div className="transparency-details">
                      <div className="transparency-item">
                        <span className="transparency-label">Campaign ID</span>
                        <code className="transparency-value">#{id}</code>
                      </div>

                      <div className="transparency-item">
                        <span className="transparency-label">Campaign Owner</span>
                        <code className="transparency-value campaign-owner-address">
                          {campaign.owner.slice(0, 10)}...{campaign.owner.slice(-8)}
                        </code>
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

                      <div className="transparency-item">
                        <span className="transparency-label">Status</span>
                        <span className="transparency-value status-badge completed">
                          <FaCheckCircle /> Campaign Completed
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="transparency-description">
                      As a donor, you can verify this campaign on the blockchain and track all transactions in real-time.
                    </p>

                    <div className="funding-summary in-progress">
                      <div className="summary-stat">
                        <span className="summary-label">Current Amount</span>
                        <span className="summary-value">{campaign.raised.toFixed(4)} ETH</span>
                      </div>
                      <div className="summary-stat">
                        <span className="summary-label">Remaining</span>
                        <span className="summary-value warning">
                          {(campaign.goal - campaign.raised).toFixed(4)} ETH
                        </span>
                      </div>
                      <div className="summary-stat">
                        <span className="summary-label">Progress</span>
                        <span className="summary-value">{calculateProgress().toFixed(1)}%</span>
                      </div>
                    </div>

                    <div className="transparency-details">
                      <div className="transparency-item">
                        <span className="transparency-label">Campaign ID</span>
                        <code className="transparency-value">#{id}</code>
                      </div>

                      <div className="transparency-item">
                        <span className="transparency-label">Campaign Owner</span>
                        <code className="transparency-value campaign-owner-address">
                          {campaign.owner.slice(0, 10)}...{campaign.owner.slice(-8)}
                        </code>
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

                      <div className="transparency-item">
                        <span className="transparency-label">Status</span>
                        <span className="transparency-value status-badge active">
                          <FaFire /> Campaign Active
                        </span>
                      </div>

                      <div className="transparency-item">
                        <span className="transparency-label">Days Remaining</span>
                        <span className="transparency-value">{campaign.daysLeft} days</span>
                      </div>
                    </div>
                  </>
                )}

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
            )}
          </aside>
        </div>
      </div>
    </div>
  );
};

export default CampaignDetailsPage;
