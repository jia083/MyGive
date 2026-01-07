import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useWeb3 } from './Web3Context';
import { useNotificationContext } from './NotificationContext';
import { useCrowdFunding } from '../hooks/useCrowdFunding';
import { getUserProfile } from '../utils/database';
import {
  FaHome,
  FaHeart,
  FaHandHoldingHeart,
  FaUsers,
  FaUser,
  FaSignOutAlt,
  FaChartBar,
  FaBell,
  FaChevronLeft,
  FaChevronRight,
  FaClipboardList,
  FaGift
} from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi';
import { MdDashboard } from 'react-icons/md';

const SideNavigation = () => {
  const { connected, account, disconnect, shortenAddress } = useWeb3();
  const { notifications, unreadCount } = useNotificationContext();
  const { getCampaignsByOwner, getUserDonations, isContractReady } = useCrowdFunding();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [userName, setUserName] = useState('');
  const [userStats, setUserStats] = useState({
    campaignsCreated: 0,
    totalRaised: 0,
    donationsMade: 0
  });

  // Load user's registered name from database
  useEffect(() => {
    const loadUserName = async () => {
      if (account) {
        // Reset userName immediately when account changes to prevent showing stale data
        setUserName(shortenAddress(account));

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
  }, [account, shortenAddress]);

  // Load user's blockchain stats
  useEffect(() => {
    const loadUserStats = async () => {
      if (!isContractReady || !account) {
        return;
      }

      try {
        // Get user's campaigns
        const userCampaigns = await getCampaignsByOwner(account);

        // Get user's donations
        const userDonationData = await getUserDonations(account);

        // Calculate total raised from campaigns
        const totalRaised = userCampaigns.reduce((sum, campaign) => {
          return sum + Number(campaign.amountCollected);
        }, 0);

        setUserStats({
          campaignsCreated: userCampaigns.length,
          totalRaised: totalRaised,
          donationsMade: userDonationData.length
        });
      } catch (error) {
        console.error('Error loading user stats:', error);
      }
    };

    loadUserStats();
  }, [isContractReady, account, getCampaignsByOwner, getUserDonations]);

  const mainNavLinks = [
    { path: '/dashboard', label: 'Dashboard', icon: <MdDashboard /> },
    { path: '/campaigns', label: 'Campaigns', icon: <FaHeart /> },
    { path: '/resources', label: 'Resources', icon: <FaHandHoldingHeart /> },
    { path: '/my-claims', label: 'My Claims', icon: <FaClipboardList /> },
    { path: '/my-donations', label: 'My Donations', icon: <FaGift /> },
  ];

  const bottomNavLinks = [
    { path: '/profile', label: 'Profile', icon: <FaUser /> },
  ];

  const isActivePath = (path) => {
    return location.pathname.startsWith(path);
  };

  return (
    <>
      <aside className={`side-navigation ${collapsed ? 'collapsed' : ''}`}>
        {/* Logo/Brand */}
        <Link to="/" className="side-nav-brand">
          <div className="side-brand-icon">
            <HiSparkles />
          </div>
          {!collapsed && (
            <div className="side-brand-text">
              <span className="side-brand-name">MyGive</span>
              <span className="side-brand-tagline">Crowdfunding</span>
            </div>
          )}
        </Link>

        {/* Main Navigation */}
        <nav className="side-nav-main">
          <div className="side-nav-section">
            {!collapsed && <span className="side-nav-section-title">Main Menu</span>}
            {mainNavLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`side-nav-link ${isActivePath(link.path) ? 'active' : ''}`}
                title={collapsed ? link.label : ''}
              >
                <span className="side-nav-icon">{link.icon}</span>
                {!collapsed && <span className="side-nav-label">{link.label}</span>}
                {isActivePath(link.path) && <div className="side-nav-active-indicator"></div>}
              </Link>
            ))}
          </div>

          {/* User Stats Card */}
          {!collapsed && connected && (
            <div className="side-nav-stats-card">
              <div className="stats-card-header">
                <FaChartBar />
                <span>Your Impact</span>
              </div>
              <div className="stats-card-content">
                <div className="stat-mini-item">
                  <span className="stat-mini-value">{userStats.campaignsCreated}</span>
                  <span className="stat-mini-label">Campaigns</span>
                </div>
                <div className="stat-mini-item">
                  <span className="stat-mini-value">{userStats.totalRaised.toFixed(4)} ETH</span>
                  <span className="stat-mini-label">Raised</span>
                </div>
                <div className="stat-mini-item">
                  <span className="stat-mini-value">{userStats.donationsMade}</span>
                  <span className="stat-mini-label">Donations</span>
                </div>
              </div>
            </div>
          )}

          {/* Notifications */}
          {!collapsed && notifications.length > 0 && (
            <div className="side-nav-notification">
              <FaBell />
              <div className="notification-content">
                <span className="notification-title">{notifications[0].title}</span>
                <span className="notification-text">{notifications[0].message}</span>
              </div>
              {unreadCount > 0 && (
                <span className="notification-badge">{unreadCount}</span>
              )}
            </div>
          )}
        </nav>

        {/* Bottom Navigation */}
        <div className="side-nav-bottom">
          <div className="side-nav-section">
            {bottomNavLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`side-nav-link ${isActivePath(link.path) ? 'active' : ''}`}
                title={collapsed ? link.label : ''}
              >
                <span className="side-nav-icon">{link.icon}</span>
                {!collapsed && <span className="side-nav-label">{link.label}</span>}
              </Link>
            ))}
          </div>

          {/* User Profile */}
          {connected && (
            <div className="side-nav-user">
              <div className="side-user-avatar">
                <FaUser />
              </div>
              {!collapsed && (
                <div className="side-user-info">
                  <span className="side-user-name">{userName}</span>
                </div>
              )}
              <button
                onClick={disconnect}
                className="side-nav-logout"
                title={collapsed ? 'Disconnect' : ''}
              >
                <FaSignOutAlt />
              </button>
            </div>
          )}

          {/* Collapse Toggle */}
          <button
            className="side-nav-toggle"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <FaChevronRight /> : <FaChevronLeft />}
          </button>
        </div>
      </aside>

      {/* Spacer for fixed sidebar */}
      <div className={`side-nav-spacer ${collapsed ? 'collapsed' : ''}`}></div>
    </>
  );
};

export default SideNavigation;
