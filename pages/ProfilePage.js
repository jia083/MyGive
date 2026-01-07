import React, { useState, useEffect, useRef } from 'react';
import SideNavigation from '../components/SideNavigation';
import { useWeb3 } from '../components/Web3Context';
import { useCrowdFunding } from '../hooks/useCrowdFunding';
import { uploadImageToIPFS, getIPFSGatewayUrl, isPinataConfigured } from '../utils/ipfs';
import { getUserProfile, saveUserProfile } from '../utils/database';
import {
  FaUser,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaEdit,
  FaSave,
  FaTimes,
  FaHeart,
  FaHandHoldingHeart,
  FaClock,
  FaTrophy,
  FaCheckCircle,
  FaCamera,
  FaCog,
  FaSpinner
} from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi';
import { MdVerified } from 'react-icons/md';

const ProfilePage = () => {
  const { account } = useWeb3();
  const { getCampaignsByOwner, getUserDonations, getCampaigns, isContractReady } = useCrowdFunding();
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    phone: '',
    location: '',
    bio: '',
    joinDate: '',
    profileImage: ''
  });
  const [editedData, setEditedData] = useState({ ...profileData });
  const [myCampaigns, setMyCampaigns] = useState([]);
  const [myDonations, setMyDonations] = useState([]);
  const [stats, setStats] = useState({
    campaignsCreated: 0,
    totalRaised: 0,
    donationsMade: 0
  });
  const [loading, setLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  // Load profile data from Supabase based on connected wallet
  useEffect(() => {
    const loadProfile = async () => {
      if (!account) return;

      try {
        const result = await getUserProfile(account);

        if (result.success && result.data) {
          // Existing user
          setIsFirstTimeUser(false);
          const joinDate = new Date(result.data.created_at || result.data.registeredAt || Date.now()).toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric'
          });

          setProfileData({
            name: result.data.name || `User ${account.slice(0, 6)}`,
            phone: result.data.phone || '',
            location: result.data.location || 'Not specified',
            bio: result.data.bio || 'No bio added yet.',
            joinDate: joinDate,
            profileImage: result.data.profile_image || result.data.profileImage || ''
          });
        } else {
          // First-time user - show registration prompt
          setIsFirstTimeUser(true);
          setIsEditing(true);
          setProfileData({
            name: '',
            phone: '',
            location: '',
            bio: '',
            joinDate: new Date().toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric'
            }),
            profileImage: ''
          });
          setEditedData({
            name: '',
            phone: '',
            location: '',
            bio: '',
            joinDate: new Date().toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric'
            }),
            profileImage: ''
          });
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      }
    };

    loadProfile();
  }, [account]);

  useEffect(() => {
    document.body.classList.add('with-side-nav');
    return () => {
      document.body.classList.remove('with-side-nav');
    };
  }, []);

  // Load blockchain data when contract is ready
  useEffect(() => {
    const loadBlockchainData = async () => {
      if (!isContractReady || !account) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Get user's campaigns
        const userCampaigns = await getCampaignsByOwner(account);

        // Get all campaigns to find campaign titles for donations
        const allCampaigns = await getCampaigns();

        // Get user's donations
        const userDonationData = await getUserDonations(account);

        // Format campaigns for display
        const formattedCampaigns = userCampaigns.map(campaign => ({
          id: campaign.id,
          title: campaign.title,
          raised: Number(campaign.amountCollected),
          goal: Number(campaign.target),
          status: campaign.isActive ? 'active' : (campaign.isFullyFunded ? 'completed' : 'expired')
        }));

        // Format donations with campaign titles
        const formattedDonations = userDonationData.map(donation => {
          const campaign = allCampaigns.find(c => c.id === donation.campaignId);
          return {
            id: donation.campaignId,
            campaign: campaign ? campaign.title : `Campaign #${donation.campaignId}`,
            amount: Number(donation.amount),
            date: new Date().toISOString().split('T')[0] // Blockchain doesn't store donation dates
          };
        });

        // Calculate stats
        const totalRaised = formattedCampaigns.reduce((sum, c) => sum + c.raised, 0);
        const totalDonated = formattedDonations.reduce((sum, d) => sum + d.amount, 0);

        setMyCampaigns(formattedCampaigns);
        setMyDonations(formattedDonations);
        setStats({
          campaignsCreated: formattedCampaigns.length,
          totalRaised: totalRaised,
          donationsMade: formattedDonations.length
        });

        setLoading(false);
      } catch (error) {
        console.error('Error loading blockchain data:', error);
        setLoading(false);
      }
    };

    loadBlockchainData();
  }, [isContractReady, account, getCampaignsByOwner, getUserDonations, getCampaigns]);

  const handleEdit = () => {
    setIsEditing(true);
    setEditedData({ ...profileData });
  };

  const handleSave = async () => {
    if (account) {
      // Validate required fields for first-time users
      if (isFirstTimeUser && !editedData.name.trim()) {
        alert('Please enter your name to complete registration');
        return;
      }

      try {
        // Save to Supabase (with localStorage fallback)
        const result = await saveUserProfile(account, {
          name: editedData.name,
          phone: editedData.phone,
          location: editedData.location,
          bio: editedData.bio,
          profileImage: profileData.profileImage
        });

        if (result.success) {
          setProfileData({ ...editedData, profileImage: profileData.profileImage });
          setIsEditing(false);
          setIsFirstTimeUser(false);

          if (isFirstTimeUser) {
            alert('Welcome to MyGive! Your profile has been created successfully! 🎉');
          } else {
            alert('Profile updated successfully! ✅');
          }
        } else {
          alert(`Failed to save profile: ${result.error}`);
        }
      } catch (error) {
        console.error('Error saving profile:', error);
        alert('Failed to save profile. Please try again.');
      }
    }
  };

  const handleCancel = () => {
    if (isFirstTimeUser) {
      // First-time users cannot cancel - they must complete registration
      alert('Please complete your profile to continue using MyGive');
      return;
    }
    setEditedData({ ...profileData });
    setIsEditing(false);
  };

  const handleChange = (e) => {
    setEditedData({
      ...editedData,
      [e.target.name]: e.target.value
    });
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB');
      return;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload JPG, PNG, GIF, or WebP images');
      return;
    }

    setUploadingImage(true);

    try {
      let imageUrl = '';

      if (isPinataConfigured()) {
        // Upload to IPFS
        const result = await uploadImageToIPFS(file);
        if (result.success) {
          imageUrl = getIPFSGatewayUrl(result.ipfsHash);
        } else {
          alert(`Failed to upload image: ${result.error}`);
          setUploadingImage(false);
          return;
        }
      } else {
        // Fallback: Convert to base64
        imageUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(file);
        });
      }

      // Update local state
      setProfileData(prev => ({ ...prev, profileImage: imageUrl }));

      // Save to Supabase immediately
      if (account) {
        const result = await saveUserProfile(account, {
          name: profileData.name,
          phone: profileData.phone,
          location: profileData.location,
          bio: profileData.bio,
          profileImage: imageUrl
        });

        if (result.success) {
          alert('Profile picture updated successfully!');
        } else {
          console.error('Failed to save profile image:', result.error);
          alert('Image uploaded but failed to save to database. Please try saving your profile again.');
        }
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <div className="profile-layout-with-side-nav">
      <SideNavigation />
      <div className="profile-page-container">
        {/* First-time User Welcome Banner */}
        {isFirstTimeUser && (
          <div style={{
            background: 'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)',
            color: 'white',
            padding: '1.5rem',
            borderRadius: '12px',
            marginBottom: '1.5rem',
            boxShadow: '0 4px 16px rgba(124, 58, 237, 0.2)'
          }}>
            <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem', fontWeight: '700' }}>
              Welcome to MyGive! 🎉
            </h2>
            <p style={{ margin: 0, fontSize: '1rem', opacity: 0.95 }}>
              Please complete your profile to get started. Your name is required to use the platform.
            </p>
          </div>
        )}

        {/* Profile Header */}
        <section className="profile-header">
          <div className="profile-cover"></div>
          <div className="profile-header-content">
            <div className="profile-avatar-section">
              <div className="profile-avatar" onClick={handleAvatarClick} style={{ cursor: 'pointer' }}>
                {profileData.profileImage ? (
                  <img
                    src={profileData.profileImage}
                    alt="Profile"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      borderRadius: '50%'
                    }}
                  />
                ) : (
                  <FaUser />
                )}
                <button className="avatar-upload-btn" disabled={uploadingImage}>
                  {uploadingImage ? <FaSpinner className="spin" /> : <FaCamera />}
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  style={{ display: 'none' }}
                />
              </div>
              <div className="profile-header-info">
                <h1 className="profile-name">
                  {isFirstTimeUser ? 'New User' : profileData.name || 'User'}
                  {!isFirstTimeUser && <MdVerified className="verified-badge-profile" />}
                </h1>
                <div className="profile-meta">
                  <span className="profile-meta-item">
                    <FaMapMarkerAlt />
                    {profileData.location || 'Not specified'}
                  </span>
                  <span className="profile-meta-item">
                    <FaClock />
                    Joined {profileData.joinDate}
                  </span>
                </div>
              </div>
            </div>
            <div className="profile-actions">
              {!isEditing ? (
                <button className="btn-edit-profile" onClick={handleEdit}>
                  <FaEdit />
                  Edit Profile
                </button>
              ) : (
                <>
                  <button className="btn-save-profile" onClick={handleSave}>
                    <FaSave />
                    {isFirstTimeUser ? 'Complete Registration' : 'Save'}
                  </button>
                  {!isFirstTimeUser && (
                    <button className="btn-cancel-profile" onClick={handleCancel}>
                      <FaTimes />
                      Cancel
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </section>

        {/* Stats Cards */}
        <section className="profile-stats-grid">
          <div className="profile-stat-card">
            <div className="stat-icon campaigns">
              <FaHeart />
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.campaignsCreated}</span>
              <span className="stat-label">Campaigns Created</span>
            </div>
          </div>
          <div className="profile-stat-card">
            <div className="stat-icon raised">
              <FaTrophy />
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.totalRaised.toFixed(4)} ETH</span>
              <span className="stat-label">Total Raised</span>
            </div>
          </div>
          <div className="profile-stat-card">
            <div className="stat-icon donations">
              <FaHandHoldingHeart />
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.donationsMade}</span>
              <span className="stat-label">Donations Made</span>
            </div>
          </div>
        </section>

        {/* Tabs */}
        <section className="profile-tabs-section">
          <div className="profile-tabs">
            <button
              className={`profile-tab ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button
              className={`profile-tab ${activeTab === 'campaigns' ? 'active' : ''}`}
              onClick={() => setActiveTab('campaigns')}
            >
              My Campaigns
            </button>
            <button
              className={`profile-tab ${activeTab === 'donations' ? 'active' : ''}`}
              onClick={() => setActiveTab('donations')}
            >
              Donations
            </button>
            <button
              className={`profile-tab ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              Settings
            </button>
          </div>

          {/* Tab Content */}
          <div className="profile-tab-content">
            {activeTab === 'overview' && (
              <div className="tab-panel">
                <div className="profile-about-section">
                  <h2 className="section-title-profile">About</h2>
                  {isEditing ? (
                    <textarea
                      name="bio"
                      className="profile-bio-edit"
                      value={editedData.bio}
                      onChange={handleChange}
                      rows="4"
                    />
                  ) : (
                    <p className="profile-bio">{profileData.bio}</p>
                  )}
                </div>

                <div className="profile-recent-activity">
                  <h2 className="section-title-profile">Recent Activity</h2>
                  {loading ? (
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                      <p>Loading activity...</p>
                    </div>
                  ) : (
                    <div className="activity-timeline">
                      {/* Show recent campaigns */}
                      {myCampaigns.slice(0, 2).map((campaign) => (
                        <div key={`campaign-${campaign.id}`} className="activity-item">
                          <div className={`activity-icon ${campaign.status === 'completed' ? 'success' : 'campaign'}`}>
                            {campaign.status === 'completed' ? <FaCheckCircle /> : <FaTrophy />}
                          </div>
                          <div className="activity-content">
                            <p className="activity-text">
                              {campaign.status === 'completed'
                                ? `Campaign "${campaign.title}" completed successfully`
                                : `Campaign "${campaign.title}" is ${campaign.status}`
                              }
                            </p>
                            <span className="activity-date">
                              {campaign.raised.toFixed(4)} ETH raised
                            </span>
                          </div>
                        </div>
                      ))}

                      {/* Show recent donations */}
                      {myDonations.slice(0, 2).map((donation) => (
                        <div key={`donation-${donation.id}`} className="activity-item">
                          <div className="activity-icon donation">
                            <FaHeart />
                          </div>
                          <div className="activity-content">
                            <p className="activity-text">
                              Donated {donation.amount.toFixed(4)} ETH to {donation.campaign}
                            </p>
                            <span className="activity-date">{donation.date}</span>
                          </div>
                        </div>
                      ))}

                      {myCampaigns.length === 0 && myDonations.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                          <p>No recent activity yet. Start by creating a campaign or making a donation!</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'campaigns' && (
              <div className="tab-panel">
                {loading ? (
                  <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <p>Loading campaigns...</p>
                  </div>
                ) : myCampaigns.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <p>You haven't created any campaigns yet.</p>
                  </div>
                ) : (
                  <div className="campaigns-list-profile">
                    {myCampaigns.map((campaign) => (
                      <div key={campaign.id} className="campaign-item-profile">
                        <div className="campaign-info-profile">
                          <h3 className="campaign-title-profile">{campaign.title}</h3>
                          <div className="campaign-progress-profile">
                            <div className="progress-bar-profile">
                              <div
                                className="progress-fill-profile"
                                style={{ width: `${Math.min((campaign.raised / campaign.goal) * 100, 100)}%` }}
                              ></div>
                            </div>
                            <span className="progress-text-profile">
                              {campaign.raised.toFixed(4)} ETH / {campaign.goal.toFixed(4)} ETH
                            </span>
                          </div>
                        </div>
                        <span className={`campaign-status-badge-profile ${campaign.status}`}>
                          {campaign.status === 'completed' ? <FaCheckCircle /> : <FaClock />}
                          {campaign.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'donations' && (
              <div className="tab-panel">
                {loading ? (
                  <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <p>Loading donations...</p>
                  </div>
                ) : myDonations.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <p>You haven't made any donations yet.</p>
                  </div>
                ) : (
                  <div className="donations-list-profile">
                    {myDonations.map((donation) => (
                      <div key={donation.id} className="donation-item-profile">
                        <div className="donation-icon-profile">
                          <FaHeart />
                        </div>
                        <div className="donation-info-profile">
                          <h3 className="donation-campaign-profile">{donation.campaign}</h3>
                          <span className="donation-date-profile">{donation.date}</span>
                        </div>
                        <span className="donation-amount-profile">{donation.amount.toFixed(4)} ETH</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="tab-panel">
                <div className="settings-section">
                  <h2 className="section-title-profile">Account Settings</h2>

                  <div className="settings-form">
                    <div className="form-group-profile">
                      <label className="form-label-profile">
                        <FaUser />
                        Full Name
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          name="name"
                          className="form-input-profile"
                          value={editedData.name}
                          onChange={handleChange}
                        />
                      ) : (
                        <p className="form-value-profile">{profileData.name}</p>
                      )}
                    </div>

                    <div className="form-group-profile">
                      <label className="form-label-profile">
                        <FaEnvelope />
                        Email Address
                      </label>
                      {isEditing ? (
                        <input
                          type="email"
                          name="email"
                          className="form-input-profile"
                          value={editedData.email}
                          onChange={handleChange}
                        />
                      ) : (
                        <p className="form-value-profile">{profileData.email}</p>
                      )}
                    </div>

                    <div className="form-group-profile">
                      <label className="form-label-profile">
                        <FaPhone />
                        Phone Number
                      </label>
                      {isEditing ? (
                        <input
                          type="tel"
                          name="phone"
                          className="form-input-profile"
                          value={editedData.phone}
                          onChange={handleChange}
                        />
                      ) : (
                        <p className="form-value-profile">{profileData.phone}</p>
                      )}
                    </div>

                    <div className="form-group-profile">
                      <label className="form-label-profile">
                        <FaMapMarkerAlt />
                        Location
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          name="location"
                          className="form-input-profile"
                          value={editedData.location}
                          onChange={handleChange}
                        />
                      ) : (
                        <p className="form-value-profile">{profileData.location}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default ProfilePage;
