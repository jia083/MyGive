import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navigation from './Navigation';
import { useCrowdFunding } from '../hooks/useCrowdFunding';
import { FaShieldAlt, FaHandHoldingHeart, FaUsers, FaChartLine, FaArrowRight, FaCheckCircle, FaGlobe } from 'react-icons/fa';
import { MdVerified, MdTrendingUp } from 'react-icons/md';
import { HiSparkles } from 'react-icons/hi';
import { BsLightningChargeFill } from 'react-icons/bs';

const HomePage = () => {
  const { getCampaigns, isContractReady } = useCrowdFunding();
  const [featuredCampaigns, setFeaturedCampaigns] = useState([]);
  const [stats, setStats] = useState({
    totalRaised: 0,
    activeCampaigns: 0,
    verifiedUsers: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isContractReady) {
      fetchFeaturedCampaigns();
    }
  }, [isContractReady]);

  const fetchFeaturedCampaigns = async () => {
    try {
      setLoading(true);
      const campaigns = await getCampaigns();

      // Get categories from localStorage
      const categoryMap = JSON.parse(localStorage.getItem('campaignCategories') || '{}');

      // Format campaigns with categories and take newest 3 for featured section
      const formattedCampaigns = campaigns
        .filter(campaign => campaign.isActive) // Only show active campaigns
        .reverse() // Reverse to get newest first
        .slice(0, 3) // Take newest 3 campaigns
        .map(campaign => ({
          ...campaign,
          category: categoryMap[campaign.id] || 'General'
        }));

      setFeaturedCampaigns(formattedCampaigns);

      // Calculate stats from real campaign data
      const totalRaised = campaigns.reduce((sum, c) => sum + (Number(c.amountCollected) || 0), 0);
      const activeCampaigns = campaigns.filter(c => c.isActive).length;

      // Get verified users count from registered wallets
      const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '{}');
      const verifiedUsersCount = Object.keys(registeredUsers).length;

      setStats({
        totalRaised: totalRaised || 0,
        activeCampaigns: activeCampaigns || 0,
        verifiedUsers: verifiedUsersCount
      });
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: <FaShieldAlt />,
      title: 'Wallet Connection & KYC',
      description: 'Connect your wallet and complete profile registration to participate in verified crowdfunding and resource sharing.'
    },
    {
      icon: '⛓️',
      title: 'Blockchain Transparency',
      description: 'Every transaction is recorded on the blockchain, providing immutable and transparent records.'
    },
    {
      icon: <FaHandHoldingHeart />,
      title: 'Crowdfunding Campaigns',
      description: 'Create and support campaigns for social causes, education, healthcare, and community development.'
    },
    {
      icon: '🤝',
      title: 'Resource Sharing',
      description: 'List and request resources like food, clothing, and educational materials to reduce waste.'
    },
    {
      icon: <FaChartLine />,
      title: 'Impact Tracking',
      description: 'Real-time tracking of donation impact and transparent reporting of fund utilization.'
    }
  ];

  const steps = [
    {
      number: 1,
      title: 'Connect Wallet',
      description: 'Connect your MetaMask wallet and complete profile registration to join our trusted community.'
    },
    {
      number: 2,
      title: 'Create or Support',
      description: 'Start a campaign or donate resources to help those in need.'
    },
    {
      number: 3,
      title: 'Track Impact',
      description: 'Monitor your contributions with blockchain-verified transparency.'
    },
    {
      number: 4,
      title: 'Make a Difference',
      description: 'See real impact in communities and help reduce inequality in Malaysia.'
    }
  ];

  return (
    <>
      <Navigation />
      <div className="home-page">
        {/* Hero Section */}
        <section className="hero-section">
        <div className="hero-grain"></div>
        <div className="hero-glow"></div>

        <div className="hero-content-wrapper">
          <div className="hero-badge" style={{ animationDelay: '0.1s' }}>
            <FaShieldAlt />
            <span>Blockchain-Secured Platform</span>
          </div>

          <h1 className="hero-title" style={{ animationDelay: '0.2s' }}>
            Transparent<br />
            <span className="hero-title-accent">Crowdfunding</span><br />
            for Malaysia
          </h1>

          <p className="hero-subtitle" style={{ animationDelay: '0.3s' }}>
            Empowering communities through blockchain-verified donations and resource sharing.
            Supporting <strong>SDG 10: Reduced Inequalities</strong>.
          </p>

          <div className="hero-cta" style={{ animationDelay: '0.4s' }}>
            <Link to="/campaigns/create" className="btn-primary">
              Start Your Campaign
              <FaArrowRight />
            </Link>
            <Link to="/campaigns" className="btn-secondary">
              Browse Campaigns
            </Link>
          </div>

          <div className="hero-stats-mini" style={{ animationDelay: '0.5s' }}>
            <div className="mini-stat">
              <HiSparkles />
              <span><strong>{stats.activeCampaigns}</strong> Active</span>
            </div>
            <div className="mini-stat-divider"></div>
            <div className="mini-stat">
              <FaCheckCircle />
              <span><strong>{stats.verifiedUsers.toLocaleString()}</strong> Verified Users</span>
            </div>
          </div>
        </div>

        <div className="hero-visual">
          <div className="floating-card" style={{ animationDelay: '0.6s' }}>
            <div className="mini-campaign-preview">
              <span className="mini-tag">Healthcare</span>
              <div className="mini-progress">
                <div className="mini-progress-bar" style={{ width: '65%' }}></div>
              </div>
              <div className="mini-amount">RM 12,000 raised</div>
            </div>
          </div>

          <div className="floating-card" style={{ animationDelay: '0.8s' }}>
            <div className="mini-campaign-preview">
              <span className="mini-tag">Education</span>
              <div className="mini-progress">
                <div className="mini-progress-bar" style={{ width: '80%' }}></div>
              </div>
              <div className="mini-amount">RM 4,000 raised</div>
            </div>
          </div>
        </div>
      </section>

      {/* Impact Stats */}
      <section className="impact-stats">
        <div className="container-wide">
          <div className="stats-grid-hero">
            <div className="stat-card" style={{ animationDelay: '0.1s' }}>
              <div className="stat-number">{stats.totalRaised.toFixed(4)} ETH</div>
              <div className="stat-label">Total Funds Raised</div>
            </div>
            <div className="stat-card" style={{ animationDelay: '0.2s' }}>
              <div className="stat-number">{stats.activeCampaigns}</div>
              <div className="stat-label">Active Campaigns</div>
            </div>
            <div className="stat-card" style={{ animationDelay: '0.3s' }}>
              <div className="stat-number">{featuredCampaigns.reduce((sum, c) => sum + ((c.donators && c.donators.length) || 0), 0)}</div>
              <div className="stat-label">Total Backers</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Diagonal Layout */}
      <section className="features-section">
        <div className="container-wide">
          <div className="section-header">
            <span className="section-label">Platform Features</span>
            <h2 className="section-title-large">Built for Trust,<br />Transparency & Impact</h2>
          </div>

          <div className="features-grid-modern">
            {features.map((feature, index) => (
              <div
                key={index}
                className="feature-card-modern"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="feature-icon-modern">{feature.icon}</div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
                <div className="feature-accent-line"></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works - Stepped Flow */}
      <section className="how-section">
        <div className="container-wide">
          <div className="section-header-centered">
            <span className="section-label">Getting Started</span>
            <h2 className="section-title-large">How MyGive Works</h2>
            <p className="section-description">
              Four simple steps to start making a difference in your community
            </p>
          </div>

          <div className="steps-flow">
            {steps.map((step, index) => (
              <div
                key={step.number}
                className="step-card"
                style={{ animationDelay: `${index * 0.15}s` }}
              >
                <div className="step-number-badge">{step.number}</div>
                <h3 className="step-title">{step.title}</h3>
                <p className="step-description">{step.description}</p>
                {index < steps.length - 1 && <div className="step-connector"></div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Campaigns - Asymmetric Grid */}
      <section className="campaigns-section">
        <div className="container-wide">
          <div className="section-header-split">
            <div>
              <span className="section-label">Featured Campaigns</span>
              <h2 className="section-title-large">Making Impact<br />Right Now</h2>
            </div>
            <Link to="/campaigns" className="btn-text-link">
              View All Campaigns <FaArrowRight />
            </Link>
          </div>

          <div className="campaigns-grid-featured">
            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem', gridColumn: '1 / -1' }}>
                <p style={{ fontSize: '1.2rem', color: '#666' }}>Loading campaigns...</p>
              </div>
            ) : featuredCampaigns.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', gridColumn: '1 / -1' }}>
                <p style={{ fontSize: '1.2rem', color: '#666' }}>No campaigns available yet.</p>
                <Link to="/campaigns/create" style={{ color: '#E8705B', textDecoration: 'underline', marginTop: '1rem', display: 'inline-block' }}>
                  Create the first campaign
                </Link>
              </div>
            ) : (
              featuredCampaigns.map((campaign, index) => (
                <Link
                  to={`/campaigns/${campaign.id}`}
                  key={campaign.id}
                  className="campaign-card-featured"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="campaign-emoji-icon">
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
                  <div className="campaign-category-badge">
                    {campaign.isVerified && <MdVerified />}
                    {campaign.category}
                  </div>
                  <h3 className="campaign-title">{campaign.title}</h3>
                  <p className="campaign-description">{campaign.description}</p>

                  <div className="campaign-progress-wrapper">
                    <div className="campaign-progress-bar">
                      <div
                        className="campaign-progress-fill"
                        style={{ width: `${(Number(campaign.amountCollected) / Number(campaign.target)) * 100}%` }}
                      ></div>
                    </div>
                    <div className="campaign-stats-row">
                      <div className="campaign-stat">
                        <strong>{Number(campaign.amountCollected)?.toFixed(4) || '0.0000'} ETH</strong>
                        <span>of {Number(campaign.target)?.toFixed(4) || '0.0000'} ETH</span>
                      </div>
                      <div className="campaign-stat campaign-days">
                        <strong>{campaign.daysLeft || 0}</strong> days left
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-grain"></div>
        <div className="container-narrow">
          <h2 className="cta-title">Ready to Make<br />a Difference?</h2>
          <p className="cta-description">
            Join our transparent community platform and help reduce inequality in Malaysia.
            Every contribution is tracked on the blockchain.
          </p>
          <div className="cta-buttons">
            <Link to="/campaigns" className="btn-primary-large">
              Get Started
              <FaArrowRight />
            </Link>
            <Link to="/dashboard" className="btn-secondary-large">
              View Dashboard
            </Link>
          </div>
        </div>
      </section>
      </div>
    </>
  );
};

export default HomePage;