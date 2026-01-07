import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SideNavigation from '../components/SideNavigation';
import { useCrowdFunding } from '../hooks/useCrowdFunding';
import { useWeb3 } from '../components/Web3Context';
import { FaSearch, FaFilter, FaHeart, FaShareAlt, FaClock, FaCheckCircle } from 'react-icons/fa';
import { MdVerified, MdTrendingUp } from 'react-icons/md';
import { HiSparkles } from 'react-icons/hi';

const CampaignsPage = () => {
  const { getCampaigns, isContractReady } = useCrowdFunding();
  const { connected } = useWeb3();
  const navigate = useNavigate();

  // Add body class for side nav styling
  useEffect(() => {
    document.body.classList.add('with-side-nav');
    return () => {
      document.body.classList.remove('with-side-nav');
    };
  }, []);

  const [campaigns, setCampaigns] = useState([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');
  const [sortBy, setSortBy] = useState('trending');
  const [loading, setLoading] = useState(true);

  const categories = [
    'All',
    'Education',
    'Healthcare',
    'Food Security',
    'Environment',
    'Community Development',
    'Emergency Relief'
  ];

  useEffect(() => {
    const loadCampaigns = async () => {
      if (!isContractReady) return;

      setLoading(true);
      try {
        const blockchainCampaigns = await getCampaigns();

        // Get registered users for organizer names
        const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '{}');

        // Format campaigns to match UI expectations
        const formattedCampaigns = blockchainCampaigns.map((campaign) => {
          // Get organizer name from registered users, fallback to shortened address
          const organizerName = registeredUsers[campaign.owner]?.name ||
                                (campaign.owner.slice(0, 6) + '...' + campaign.owner.slice(-4));

          return {
            id: campaign.id,
            title: campaign.title,
            description: campaign.description,
            category: campaign.category || 'Community Development', // Now from blockchain
            raised: parseFloat(campaign.amountCollected),
            goal: parseFloat(campaign.target),
            daysLeft: campaign.daysLeft,
            image: campaign.image || '📋',
            isVerified: campaign.isVerified || false, // From blockchain verification system
            isTrending: campaign.donators.length > 10, // Campaigns with 10+ donators are trending
            backers: campaign.donators.length,
            organizer: organizerName,
            isFullyFunded: campaign.isFullyFunded || false,
          };
        });

        setCampaigns(formattedCampaigns);
        setFilteredCampaigns(formattedCampaigns);
      } catch (error) {
        console.error('Error loading campaigns:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCampaigns();
  }, [isContractReady, getCampaigns]);

  useEffect(() => {
    let filtered = campaigns;

    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(c => c.category === selectedCategory);
    }

    // Filter by availability
    if (availabilityFilter === 'available') {
      filtered = filtered.filter(c => !c.isFullyFunded);
    } else if (availabilityFilter === 'funded') {
      filtered = filtered.filter(c => c.isFullyFunded);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(c =>
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.organizer.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort campaigns
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'trending':
          return (b.isTrending ? 1 : 0) - (a.isTrending ? 1 : 0) || b.backers - a.backers;
        case 'newest':
          return b.id - a.id;
        case 'ending':
          return a.daysLeft - b.daysLeft;
        case 'funded':
          return (b.raised / b.goal) - (a.raised / a.goal);
        default:
          return 0;
      }
    });

    setFilteredCampaigns(filtered);
  }, [campaigns, selectedCategory, availabilityFilter, searchQuery, sortBy]);

  const calculateProgress = (raised, goal) => {
    return Math.min((raised / goal) * 100, 100);
  };

  const handleCreateCampaign = (e) => {
    e.preventDefault();
    if (!connected) {
      alert('Please connect your wallet to create a campaign');
      return;
    }
    navigate('/campaigns/create');
  };

  return (
    <div className="campaigns-layout-with-side-nav">
      <SideNavigation />
      <div className="campaigns-page-container">
        {/* Hero Header */}
        <section className="campaigns-hero">
        <div className="campaigns-hero-content">
          <div className="campaigns-header-top">
            <div className="campaigns-badge">
              <HiSparkles />
              <span>Discover Campaigns</span>
            </div>
          </div>
          <h1 className="campaigns-hero-title">
            Make a Real<br />
            <span className="campaigns-hero-accent">Difference</span> Today
          </h1>
          <p className="campaigns-hero-subtitle">
            Browse verified campaigns making impact across Malaysia. Every contribution is tracked on the blockchain.
          </p>
        </div>

        {/* Search & Filter Bar */}
        <div className="campaigns-search-bar">
          <div className="search-input-wrapper">
            <FaSearch />
            <input
              type="text"
              placeholder="Search campaigns, organizers, causes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="filter-controls">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-select"
            >
              <option value="trending">Trending</option>
              <option value="newest">Newest</option>
              <option value="ending">Ending Soon</option>
              <option value="funded">Most Funded</option>
            </select>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="campaigns-main">
        <div className="campaigns-container">
          {/* Category Filter Sidebar */}
          <aside className="campaigns-sidebar">
            {/* Availability Filter */}
            <div className="sidebar-section">
              <div className="sidebar-header">
                <FaCheckCircle />
                <h3>Availability</h3>
              </div>
              <ul className="availability-list">
                <li
                  className={`availability-item ${availabilityFilter === 'available' ? 'active' : ''}`}
                  onClick={() => setAvailabilityFilter('available')}
                >
                  <FaHeart />
                  <span>Available for Funding</span>
                  <span className="availability-count">
                    {campaigns.filter(c => !c.isFullyFunded).length}
                  </span>
                </li>
                <li
                  className={`availability-item ${availabilityFilter === 'funded' ? 'active' : ''}`}
                  onClick={() => setAvailabilityFilter('funded')}
                >
                  <FaCheckCircle />
                  <span>Fully Funded</span>
                  <span className="availability-count">
                    {campaigns.filter(c => c.isFullyFunded).length}
                  </span>
                </li>
                <li
                  className={`availability-item ${availabilityFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setAvailabilityFilter('all')}
                >
                  <FaFilter />
                  <span>Show All</span>
                  <span className="availability-count">
                    {campaigns.length}
                  </span>
                </li>
              </ul>
            </div>

            {/* Categories */}
            <div className="sidebar-section">
              <div className="sidebar-header">
                <FaFilter />
                <h3>Categories</h3>
              </div>
              <ul className="category-list">
              {categories.map(category => {
                let count = 0;
                const baseCampaigns = availabilityFilter === 'available'
                  ? campaigns.filter(c => !c.isFullyFunded)
                  : availabilityFilter === 'funded'
                  ? campaigns.filter(c => c.isFullyFunded)
                  : campaigns;

                if (category === 'All') {
                  count = baseCampaigns.length;
                } else {
                  count = baseCampaigns.filter(c => c.category === category).length;
                }

                return (
                  <li
                    key={category}
                    className={`category-item ${selectedCategory === category ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(category)}
                  >
                    <span>{category}</span>
                    <span className="category-count">{count}</span>
                  </li>
                );
              })}
            </ul>
            </div>

            {/* Quick Stats */}
            <div className="sidebar-stats">
              <h4>Platform Impact</h4>
              <div className="stat-item-small">
                <span className="stat-label-small">Active Campaigns</span>
                <span className="stat-value-small">{campaigns.length}</span>
              </div>
              <div className="stat-item-small">
                <span className="stat-label-small">Total Raised</span>
                <span className="stat-value-small">
                  {campaigns.reduce((sum, c) => sum + c.raised, 0).toFixed(4)} ETH
                </span>
              </div>
              <div className="stat-item-small">
                <span className="stat-label-small">Total Backers</span>
                <span className="stat-value-small">
                  {campaigns.reduce((sum, c) => sum + c.backers, 0).toLocaleString()}
                </span>
              </div>
            </div>
          </aside>

          {/* Campaigns Grid */}
          <div className="campaigns-content">
            <div className="campaigns-header-bar">
              <h2 className="campaigns-results-title">
                {selectedCategory === 'All' ? 'All Campaigns' : selectedCategory}
                <span className="campaigns-count">({filteredCampaigns.length})</span>
              </h2>
              <button onClick={handleCreateCampaign} className="btn-create-campaign-small">
                <FaCheckCircle />
                Create Campaign
              </button>
            </div>

            {loading ? (
              <div className="no-results">
                <div className="no-results-icon">⏳</div>
                <h3>Loading campaigns from blockchain...</h3>
                <p>Please wait while we fetch the latest data</p>
              </div>
            ) : filteredCampaigns.length === 0 ? (
              <div className="no-results">
                <div className="no-results-icon">🔍</div>
                <h3>No campaigns found</h3>
                <p>Try adjusting your search or filters</p>
              </div>
            ) : (
              <div className="campaigns-grid">
                {filteredCampaigns.map((campaign, index) => (
                  <Link
                    to={`/campaigns/${campaign.id}`}
                    key={campaign.id}
                    className="campaign-card-enhanced"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    {/* Fully Funded Badge */}
                    {campaign.isFullyFunded && (
                      <div className="fully-funded-badge">
                        <FaCheckCircle />
                        <span>Fully Funded</span>
                      </div>
                    )}

                    {/* Trending Badge */}
                    {campaign.isTrending && !campaign.isFullyFunded && (
                      <div className="trending-badge">
                        <MdTrendingUp />
                        <span>Trending</span>
                      </div>
                    )}

                    {/* Campaign Image/Icon */}
                    <div className="campaign-icon-large">
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

                    {/* Campaign Category */}
                    <div className="campaign-meta-badges">
                      <span className="campaign-category-tag">
                        {campaign.isVerified && <MdVerified />}
                        {campaign.category}
                      </span>
                      <span className="campaign-days-tag">
                        <FaClock />
                        {campaign.daysLeft}d left
                      </span>
                    </div>

                    {/* Campaign Info */}
                    <h3 className="campaign-card-title">{campaign.title}</h3>
                    <p className="campaign-card-description">{campaign.description}</p>

                    {/* Organizer */}
                    <div className="campaign-organizer">
                      <span className="organizer-label">By</span>
                      <span className="organizer-name">{campaign.organizer}</span>
                    </div>

                    {/* Progress */}
                    <div className="campaign-progress-section">
                      <div className="campaign-progress-track">
                        <div
                          className="campaign-progress-bar-fill"
                          style={{ width: `${calculateProgress(campaign.raised, campaign.goal)}%` }}
                        ></div>
                      </div>

                      <div className="campaign-progress-stats">
                        <div className="progress-stat">
                          <strong className="progress-amount">
                            {campaign.raised.toFixed(4)} ETH
                          </strong>
                          <span className="progress-label">
                            raised of {campaign.goal.toFixed(4)} ETH
                          </span>
                        </div>
                        <div className="progress-stat progress-stat-right">
                          <strong className="progress-amount">
                            {Math.round(calculateProgress(campaign.raised, campaign.goal))}%
                          </strong>
                          <span className="progress-label">funded</span>
                        </div>
                      </div>

                      {/* Backers */}
                      <div className="campaign-backers">
                        <FaHeart />
                        <span>{campaign.backers} backers</span>
                      </div>
                    </div>

                    {/* CTA */}
                    <div className="campaign-card-footer">
                      <button className="btn-support">Support Now</button>
                      <button className="btn-icon-action">
                        <FaShareAlt />
                      </button>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="campaigns-cta-banner">
        <div className="cta-banner-content">
          <h2 className="cta-banner-title">Have a Cause?</h2>
          <p className="cta-banner-text">
            Start your own campaign and make a difference in your community
          </p>
          <button onClick={handleCreateCampaign} className="btn-create-campaign">
            Create Campaign
            <FaCheckCircle />
          </button>
        </div>
      </section>
      </div>
    </div>
  );
};

export default CampaignsPage;
