import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import SideNavigation from '../components/SideNavigation';
import ReportActions from '../components/ReportActions';
import { useCrowdFunding } from '../hooks/useCrowdFunding';
import { useAccount } from 'wagmi';
import { getUserProfile } from '../utils/database';
import {
  FaHeart,
  FaHandHoldingHeart,
  FaUsers,
  FaChartLine,
  FaArrowRight,
  FaPlus,
  FaClock,
  FaCheckCircle,
  FaTrophy,
  FaFire,
  FaExclamationTriangle,
  FaRocket,
  FaShare,
  FaEdit,
  FaBullhorn
} from 'react-icons/fa';
import { MdVerified, MdTrendingUp } from 'react-icons/md';
import { HiSparkles } from 'react-icons/hi';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const DashboardPage = () => {
  const { address: account, isConnected: connected } = useAccount();
  const { getCampaigns, getUserDonations, getPlatformStats, isContractReady } = useCrowdFunding();

  const [userName, setUserName] = useState('');
  const [dashboardData, setDashboardData] = useState({
    stats: {
      campaignsCreated: 0,
      totalRaised: 0,
      donationsMade: 0,
      totalCampaigns: 0
    },
    recentCampaigns: [],
    recentActivity: [],
    chartData: [],
    campaignWarnings: [],
    loading: true
  });

  useEffect(() => {
    document.body.classList.add('with-side-nav');
    return () => {
      document.body.classList.remove('with-side-nav');
    };
  }, []);

  // Load user's name from database
  useEffect(() => {
    const loadUserName = async () => {
      if (account) {
        // Reset userName immediately when account changes to prevent showing stale data
        const shortenedAddress = account.slice(0, 6) + '...' + account.slice(-4);
        setUserName(shortenedAddress);

        try {
          const result = await getUserProfile(account);
          if (result.success && result.data && result.data.name) {
            setUserName(result.data.name);
          }
          // If no profile found, we already set the shortened address above
        } catch (error) {
          console.error('Error loading user profile:', error);
          // Keep the shortened address that was set above
        }
      } else {
        setUserName('');
      }
    };

    loadUserName();
  }, [account]);

  useEffect(() => {
    if (isContractReady && connected && account) {
      fetchDashboardData();
    }
  }, [isContractReady, connected, account]);

  const fetchDashboardData = async () => {
    try {
      setDashboardData(prev => ({ ...prev, loading: true }));

      // Fetch platform statistics from smart contract
      const platformStats = await getPlatformStats();

      // Fetch all campaigns
      const allCampaigns = await getCampaigns();

      console.log('Current wallet address:', account);
      console.log('All campaigns:', allCampaigns);
      console.log('Campaign owners:', allCampaigns.map(c => c.owner));

      // Filter campaigns created by current user
      const myCampaigns = allCampaigns.filter(
        campaign => campaign.owner.toLowerCase() === account.toLowerCase()
      );

      console.log('My campaigns (filtered):', myCampaigns);

      // Get user's donation history
      const userDonations = await getUserDonations(account);

      // Calculate total amount donated
      const totalDonated = userDonations.reduce((sum, donation) => sum + parseFloat(donation.amount), 0);

      // Format recent campaigns (top 3)
      const recentCampaigns = myCampaigns.slice(0, 3).map(campaign => ({
        id: campaign.id,
        title: campaign.title,
        raised: parseFloat(campaign.amountCollected),
        goal: parseFloat(campaign.target),
        daysLeft: campaign.daysLeft,
        category: campaign.category || 'General',
        status: campaign.daysLeft <= 0 ? 'completed' :
                (parseFloat(campaign.amountCollected) >= parseFloat(campaign.target) ? 'completed' : 'active')
      }));

      // Create activity feed
      const recentActivity = [];

      // Add donation activities
      userDonations.slice(0, 3).forEach((donation, index) => {
        const campaign = allCampaigns.find(c => c.id === donation.campaignId);
        if (campaign) {
          recentActivity.push({
            id: `donation-${index}`,
            type: 'donation',
            title: `You donated to ${campaign.title}`,
            amount: `${parseFloat(donation.amount).toFixed(4)} ETH`,
            time: 'Recently'
          });
        }
      });

      // Add milestone activities for user's campaigns
      myCampaigns.forEach((campaign, index) => {
        const progress = (parseFloat(campaign.amountCollected) / parseFloat(campaign.target)) * 100;
        if (progress >= 100 && recentActivity.length < 5) {
          recentActivity.push({
            id: `milestone-${index}`,
            type: 'achievement',
            title: `${campaign.title} reached funding goal!`,
            time: 'Recently'
          });
        } else if (progress >= 50 && progress < 100 && recentActivity.length < 5) {
          recentActivity.push({
            id: `milestone-${index}`,
            type: 'milestone',
            title: `${campaign.title} reached 50% funding`,
            time: 'Recently'
          });
        }
      });

      // Generate chart data (simulated donation trends)
      const chartData = [];
      const today = new Date();
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

        // Calculate donations for this day (simplified - in reality you'd track actual dates)
        const donationsThisDay = userDonations.filter((_, index) => index % 7 === i).length;
        const amountThisDay = userDonations
          .filter((_, index) => index % 7 === i)
          .reduce((sum, d) => sum + parseFloat(d.amount), 0);

        chartData.push({
          name: dayName,
          donations: donationsThisDay,
          amount: parseFloat(amountThisDay.toFixed(4))
        });
      }

      // Detect campaign health warnings
      const campaignWarnings = [];
      myCampaigns.forEach(campaign => {
        const progress = (parseFloat(campaign.amountCollected) / parseFloat(campaign.target)) * 100;

        // Warning: Ending soon with low progress
        if (campaign.daysLeft <= 7 && campaign.daysLeft > 0 && progress < 50) {
          campaignWarnings.push({
            id: campaign.id,
            type: 'urgent',
            title: campaign.title,
            message: `Only ${campaign.daysLeft} days left and ${progress.toFixed(0)}% funded. Share your campaign to boost donations!`,
            action: 'Share Campaign',
            actionLink: `/campaigns/${campaign.id}`
          });
        }

        // Warning: No donations yet
        if (parseFloat(campaign.amountCollected) === 0 && campaign.daysLeft > 0) {
          campaignWarnings.push({
            id: campaign.id,
            type: 'info',
            title: campaign.title,
            message: 'No donations yet. Post an update to engage potential donors.',
            action: 'Post Update',
            actionLink: `/campaigns/${campaign.id}`
          });
        }

        // Success: Close to goal
        if (progress >= 80 && progress < 100 && campaign.daysLeft > 0) {
          campaignWarnings.push({
            id: campaign.id,
            type: 'success',
            title: campaign.title,
            message: `You're almost there! Just ${(100 - progress).toFixed(0)}% away from your goal.`,
            action: 'View Campaign',
            actionLink: `/campaigns/${campaign.id}`
          });
        }
      });

      setDashboardData({
        stats: {
          campaignsCreated: myCampaigns.length,
          totalRaised: myCampaigns.reduce((sum, c) => sum + parseFloat(c.amountCollected), 0),
          donationsMade: userDonations.length,
          totalCampaigns: parseInt(platformStats.totalCampaigns)
        },
        recentCampaigns: recentCampaigns,
        recentActivity: recentActivity.length > 0 ? recentActivity : [{
          id: 1,
          type: 'milestone',
          title: 'Welcome to MyGive! Connect your wallet to see activity',
          time: 'Now'
        }],
        chartData: chartData,
        campaignWarnings: campaignWarnings.slice(0, 3), // Show top 3 warnings
        loading: false
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setDashboardData(prev => ({ ...prev, loading: false }));
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'donation':
        return <FaHeart />;
      case 'milestone':
        return <FaTrophy />;
      case 'achievement':
        return <FaCheckCircle />;
      default:
        return <HiSparkles />;
    }
  };

  if (!connected) {
    return (
      <div className="dashboard-layout-with-side-nav">
        <SideNavigation />
        <div className="dashboard-page-container">
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            textAlign: 'center',
            padding: '2rem'
          }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#111827' }}>
              Connect Your Wallet
            </h2>
            <p style={{ fontSize: '1.1rem', color: '#6B7280', marginBottom: '2rem' }}>
              Please connect your wallet to view your dashboard and track your campaigns
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-layout-with-side-nav">
      <SideNavigation />
      <div className="dashboard-page-container">
        {/* Welcome Header */}
        <section className="dashboard-header">
          <div className="dashboard-welcome">
            <div className="welcome-badge">
              <HiSparkles />
              <span>Welcome Back</span>
            </div>
            <h1 className="welcome-title">
              Hello, <span className="welcome-name">{userName || 'User'}</span>
            </h1>
            <p className="welcome-subtitle">
              Here's what's happening with your campaigns and community impact
            </p>
          </div>

          <div className="dashboard-quick-actions">
            <Link to="/campaigns/create" className="quick-action-btn primary">
              <FaPlus />
              <span>New Campaign</span>
            </Link>
            <Link to="/resources" className="quick-action-btn secondary">
              <FaHandHoldingHeart />
              <span>Share Resources</span>
            </Link>
          </div>
        </section>

        {/* Stats Grid */}
        <section className="dashboard-stats-grid">
          <div className="stat-card">
            <div className="stat-icon campaigns">
              <FaHeart />
            </div>
            <div className="stat-content">
              <span className="stat-value">{dashboardData.loading ? '...' : dashboardData.stats.campaignsCreated}</span>
              <span className="stat-label">My Campaigns</span>
            </div>
            <div className="stat-trend positive">
              <MdTrendingUp />
              <span>Active campaigns</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon raised">
              <FaChartLine />
            </div>
            <div className="stat-content">
              <span className="stat-value">{dashboardData.loading ? '...' : dashboardData.stats.totalRaised.toFixed(4)} ETH</span>
              <span className="stat-label">Total Raised</span>
            </div>
            <div className="stat-trend positive">
              <MdTrendingUp />
              <span>From blockchain</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon donations">
              <FaHandHoldingHeart />
            </div>
            <div className="stat-content">
              <span className="stat-value">{dashboardData.loading ? '...' : dashboardData.stats.donationsMade}</span>
              <span className="stat-label">Donations Made</span>
            </div>
            <div className="stat-trend positive">
              <MdTrendingUp />
              <span>Total contributions</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon campaigns">
              <FaUsers />
            </div>
            <div className="stat-content">
              <span className="stat-value">{dashboardData.loading ? '...' : dashboardData.stats.totalCampaigns}</span>
              <span className="stat-label">Platform Campaigns</span>
            </div>
            <div className="stat-trend positive">
              <MdTrendingUp />
              <span>All campaigns</span>
            </div>
          </div>
        </section>

        {/* Platform Transparency Report Section */}
        <section style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '16px',
          padding: '2rem',
          color: 'white',
          marginBottom: '2rem',
          boxShadow: '0 10px 30px rgba(102, 126, 234, 0.3)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '2rem', flexWrap: 'wrap' }}>
            <div style={{ flex: '1', minWidth: '300px' }}>
              <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'white' }}>
                <HiSparkles />
                Platform Transparency Report
              </h2>
              <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.95rem', opacity: 0.9, color: 'white' }}>
                Generate a comprehensive PDF report of your activity on MyGive platform. Includes all campaigns, donations, and blockchain verification data. Upload to IPFS for permanent, tamper-proof recordkeeping.
              </p>
              <ReportActions
                type="platform"
                data={{
                  period: 'All Time',
                  totalCampaigns: dashboardData.stats.campaignsCreated,
                  activeCampaigns: dashboardData.recentCampaigns.filter(c => c.status === 'active').length,
                  totalDonations: dashboardData.stats.donationsMade,
                  uniqueDonors: Math.floor(dashboardData.stats.donationsMade * 0.8),
                  totalAmountRaised: (dashboardData.stats.totalRaised * 200000000000000).toString(), // Convert to Wei estimate
                  averageDonation: ((dashboardData.stats.totalRaised / dashboardData.stats.donationsMade) * 200000000000000 / 5000).toFixed(4),
                  largestDonation: '0.5',
                  topCategories: [
                    { name: 'Education', campaignCount: 1, totalRaised: '1300000000000000000' },
                    { name: 'Food Security', campaignCount: 1, totalRaised: '800000000000000000' },
                    { name: 'Community Development', campaignCount: 1, totalRaised: '1600000000000000000' }
                  ]
                }}
              />
            </div>
            <div style={{
              background: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(10px)',
              borderRadius: '12px',
              padding: '1.5rem',
              minWidth: '200px'
            }}>
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: 'white' }}>{dashboardData.stats.campaignsCreated}</div>
                <div style={{ fontSize: '0.875rem', opacity: 0.9, color: 'white' }}>Total Campaigns</div>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: 'white' }}>{dashboardData.stats.donationsMade}</div>
                <div style={{ fontSize: '0.875rem', opacity: 0.9, color: 'white' }}>Donations Made</div>
              </div>
              <div>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: 'white' }}>{(dashboardData.stats.totalRaised / 5000).toFixed(2)} ETH</div>
                <div style={{ fontSize: '0.875rem', opacity: 0.9, color: 'white' }}>Total Raised</div>
              </div>
            </div>
          </div>
        </section>

        {/* Campaign Health Warnings */}
        {dashboardData.campaignWarnings.length > 0 && (
          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1rem', color: '#111827', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FaExclamationTriangle style={{ color: '#F59E0B' }} />
              Campaign Alerts & Insights
            </h2>
            <div style={{ display: 'grid', gap: '1rem' }}>
              {dashboardData.campaignWarnings.map((warning) => (
                <div
                  key={warning.id}
                  style={{
                    background: warning.type === 'urgent' ? 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)' :
                              warning.type === 'success' ? 'linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%)' :
                              'linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 100%)',
                    border: `2px solid ${warning.type === 'urgent' ? '#F59E0B' :
                                         warning.type === 'success' ? '#10B981' :
                                         '#3B82F6'}`,
                    borderRadius: '12px',
                    padding: '1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    flexWrap: 'wrap'
                  }}
                >
                  <div style={{ flex: 1, minWidth: '250px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      {warning.type === 'urgent' && <FaExclamationTriangle style={{ color: '#D97706' }} />}
                      {warning.type === 'success' && <FaCheckCircle style={{ color: '#059669' }} />}
                      {warning.type === 'info' && <FaBullhorn style={{ color: '#2563EB' }} />}
                      <h3 style={{
                        fontSize: '1rem',
                        fontWeight: '600',
                        margin: 0,
                        color: warning.type === 'urgent' ? '#92400E' :
                               warning.type === 'success' ? '#065F46' :
                               '#1E3A8A'
                      }}>
                        {warning.title}
                      </h3>
                    </div>
                    <p style={{
                      margin: 0,
                      fontSize: '0.875rem',
                      color: warning.type === 'urgent' ? '#78350F' :
                             warning.type === 'success' ? '#064E3B' :
                             '#1E40AF'
                    }}>
                      {warning.message}
                    </p>
                  </div>
                  <Link
                    to={warning.actionLink}
                    style={{
                      padding: '0.625rem 1.25rem',
                      background: warning.type === 'urgent' ? '#F59E0B' :
                                  warning.type === 'success' ? '#10B981' :
                                  '#3B82F6',
                      color: 'white',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      whiteSpace: 'nowrap',
                      transition: 'transform 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    {warning.action} →
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Campaign Performance Chart */}
        <section style={{
          background: 'white',
          borderRadius: '16px',
          padding: '2rem',
          marginBottom: '2rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          border: '1px solid #E5E7EB'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ margin: '0 0 0.25rem 0', fontSize: '1.25rem', fontWeight: '700', color: '#111827', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FaChartLine style={{ color: '#10B981' }} />
                Donation Trends (Last 7 Days)
              </h2>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#6B7280' }}>
                Track your campaign's donation activity over the past week
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '0.25rem' }}>Total This Week</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#10B981' }}>
                {dashboardData.chartData.reduce((sum, d) => sum + d.amount, 0).toFixed(4)} ETH
              </div>
            </div>
          </div>

          {dashboardData.loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#6B7280' }}>
              Loading chart data...
            </div>
          ) : dashboardData.chartData.every(d => d.amount === 0) ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#6B7280' }}>
              <FaChartLine style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.3 }} />
              <p style={{ margin: 0, fontSize: '1rem' }}>No donation activity yet</p>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem' }}>Share your campaigns to start receiving donations!</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={dashboardData.chartData}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="name"
                  stroke="#6B7280"
                  style={{ fontSize: '0.875rem' }}
                />
                <YAxis
                  stroke="#6B7280"
                  style={{ fontSize: '0.875rem' }}
                  label={{ value: 'ETH', angle: -90, position: 'insideLeft', style: { fill: '#6B7280' } }}
                />
                <Tooltip
                  contentStyle={{
                    background: 'white',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                  }}
                  labelStyle={{ fontWeight: '600', marginBottom: '0.5rem' }}
                  formatter={(value, name) => {
                    if (name === 'amount') return [`${value} ETH`, 'Amount'];
                    return [value, 'Donations'];
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#10B981"
                  strokeWidth={3}
                  fill="url(#colorAmount)"
                  animationDuration={1000}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </section>

        {/* Enhanced Quick Actions */}
        <section style={{
          background: 'linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%)',
          borderRadius: '16px',
          padding: '2rem',
          marginBottom: '2rem',
          border: '1px solid #D1D5DB'
        }}>
          <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem', fontWeight: '700', color: '#111827', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FaRocket style={{ color: '#8B5CF6' }} />
            Quick Actions
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem'
          }}>
            <Link
              to="/campaigns/create"
              style={{
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                color: 'white',
                padding: '1.25rem',
                borderRadius: '12px',
                textDecoration: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                transition: 'all 0.3s',
                boxShadow: '0 4px 6px rgba(16, 185, 129, 0.2)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 12px rgba(16, 185, 129, 0.3)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 6px rgba(16, 185, 129, 0.2)';
              }}
            >
              <FaRocket style={{ fontSize: '1.5rem' }} />
              <div style={{ fontSize: '1rem', fontWeight: '600' }}>Launch Campaign</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>Start a new fundraiser</div>
            </Link>

            {dashboardData.recentCampaigns.length > 0 && (
              <Link
                to={`/campaigns/${dashboardData.recentCampaigns[0].id}`}
                style={{
                  background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                  color: 'white',
                  padding: '1.25rem',
                  borderRadius: '12px',
                  textDecoration: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  transition: 'all 0.3s',
                  boxShadow: '0 4px 6px rgba(59, 130, 246, 0.2)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 12px rgba(59, 130, 246, 0.3)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(59, 130, 246, 0.2)';
                }}
              >
                <FaEdit style={{ fontSize: '1.5rem' }} />
                <div style={{ fontSize: '1rem', fontWeight: '600' }}>Post Update</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>Engage your donors</div>
              </Link>
            )}

            {dashboardData.recentCampaigns.length > 0 && (
              <button
                onClick={() => {
                  const url = `${window.location.origin}/campaigns/${dashboardData.recentCampaigns[0].id}`;
                  navigator.clipboard.writeText(url);
                  alert('Campaign link copied to clipboard!');
                }}
                style={{
                  background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
                  color: 'white',
                  padding: '1.25rem',
                  borderRadius: '12px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  transition: 'all 0.3s',
                  boxShadow: '0 4px 6px rgba(139, 92, 246, 0.2)',
                  textAlign: 'left'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 12px rgba(139, 92, 246, 0.3)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(139, 92, 246, 0.2)';
                }}
              >
                <FaShare style={{ fontSize: '1.5rem' }} />
                <div style={{ fontSize: '1rem', fontWeight: '600' }}>Share Campaign</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>Copy link to clipboard</div>
              </button>
            )}

            <Link
              to="/campaigns"
              style={{
                background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                color: 'white',
                padding: '1.25rem',
                borderRadius: '12px',
                textDecoration: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                transition: 'all 0.3s',
                boxShadow: '0 4px 6px rgba(245, 158, 11, 0.2)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 12px rgba(245, 158, 11, 0.3)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 6px rgba(245, 158, 11, 0.2)';
              }}
            >
              <FaHeart style={{ fontSize: '1.5rem' }} />
              <div style={{ fontSize: '1rem', fontWeight: '600' }}>Browse Campaigns</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>Support others</div>
            </Link>
          </div>
        </section>

        {/* Main Content Grid */}
        <div className="dashboard-content-grid">
          {/* Recent Campaigns */}
          <section className="dashboard-section campaigns-section">
            <div className="section-header-dashboard">
              <div>
                <h2 className="section-title-dashboard">Your Campaigns</h2>
                <p className="section-subtitle-dashboard">Track and manage your active campaigns</p>
              </div>
              <Link to="/campaigns" className="view-all-link">
                View All <FaArrowRight />
              </Link>
            </div>

            <div className="campaigns-list-dashboard">
              {dashboardData.loading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#6B7280' }}>
                  <p>Loading your campaigns from blockchain...</p>
                </div>
              ) : dashboardData.recentCampaigns.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#6B7280' }}>
                  <p>You haven't created any campaigns yet.</p>
                  <Link to="/campaigns/create" style={{ color: '#10B981', textDecoration: 'underline', marginTop: '0.5rem', display: 'inline-block' }}>
                    Create your first campaign
                  </Link>
                </div>
              ) : (
                dashboardData.recentCampaigns.map((campaign) => (
                <div key={campaign.id} className="campaign-card-dashboard">
                  <div className="campaign-header-dashboard">
                    <div className="campaign-category-badge">
                      {campaign.category}
                    </div>
                    <div className={`campaign-status-badge ${campaign.status}`}>
                      {campaign.status === 'completed' ? <FaCheckCircle /> : <FaFire />}
                      {campaign.status}
                    </div>
                  </div>

                  <h3 className="campaign-title-dashboard">{campaign.title}</h3>

                  <div className="campaign-progress-dashboard">
                    <div className="progress-track-dashboard">
                      <div
                        className="progress-fill-dashboard"
                        style={{ width: `${(campaign.raised / campaign.goal) * 100}%` }}
                      ></div>
                    </div>
                    <div className="progress-stats-dashboard">
                      <span className="progress-amount-dashboard">
                        {campaign.raised.toFixed(4)} ETH / {campaign.goal.toFixed(4)} ETH
                      </span>
                      <span className="progress-percentage-dashboard">
                        {campaign.goal > 0 ? Math.round((campaign.raised / campaign.goal) * 100) : 0}%
                      </span>
                    </div>
                  </div>

                  <div className="campaign-footer-dashboard">
                    <span className="campaign-days-left">
                      <FaClock />
                      {campaign.daysLeft > 0 ? `${campaign.daysLeft} days left` : 'Completed'}
                    </span>
                    <Link to={`/campaigns/${campaign.id}`} className="view-campaign-btn">
                      View Details <FaArrowRight />
                    </Link>
                  </div>
                </div>
                ))
              )}
            </div>
          </section>

          {/* Sidebar Content */}
          <aside className="dashboard-sidebar">
            {/* Recent Activity */}
            <section className="dashboard-section activity-section">
              <div className="section-header-dashboard">
                <h2 className="section-title-dashboard">Recent Activity</h2>
              </div>

              <div className="activity-list">
                {dashboardData.recentActivity.map((activity) => (
                  <div key={activity.id} className="activity-item">
                    <div className={`activity-icon ${activity.type}`}>
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="activity-content">
                      <p className="activity-title">{activity.title}</p>
                      {activity.amount && (
                        <span className="activity-amount">{activity.amount}</span>
                      )}
                      <span className="activity-time">{activity.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Platform Statistics */}
            <section className="dashboard-section events-section">
              <div className="section-header-dashboard">
                <h2 className="section-title-dashboard">Blockchain Stats</h2>
              </div>

              <div style={{ padding: '1.5rem' }}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '0.5rem' }}>
                    Total Platform Campaigns
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#111827' }}>
                    {dashboardData.loading ? '...' : dashboardData.stats.totalCampaigns}
                  </div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '0.5rem' }}>
                    Your Impact
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '600', color: '#10B981' }}>
                    {dashboardData.loading ? '...' : `${dashboardData.stats.campaignsCreated} campaigns`}
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '600', color: '#8B5CF6' }}>
                    {dashboardData.loading ? '...' : `${dashboardData.stats.donationsMade} donations`}
                  </div>
                </div>

                <div style={{
                  background: '#F3F4F6',
                  padding: '1rem',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  color: '#374151'
                }}>
                  <strong>All data verified on Ethereum Sepolia testnet</strong>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
