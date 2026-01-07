import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useWeb3 } from './Web3Context';
import {
  FaHome,
  FaHeart,
  FaHandHoldingHeart,
  FaUsers,
  FaUser,
  FaBars,
  FaTimes,
  FaSignOutAlt,
  FaSignInAlt,
  FaUserPlus,
  FaWallet,
  FaChartLine
} from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi';

const Navigation = () => {
  const { connected, account, shortenAddress } = useWeb3();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { path: '/', label: 'Home', icon: <FaHome /> },
    { path: '/dashboard', label: 'Dashboard', icon: <FaChartLine /> },
    { path: '/campaigns', label: 'Campaigns', icon: <FaHeart /> },
    { path: '/resources', label: 'Resources', icon: <FaHandHoldingHeart /> },
  ];

  const isActivePath = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav className={`main-navigation ${scrolled ? 'scrolled' : ''}`}>
      <div className="nav-container">
        {/* Logo */}
        <Link to="/" className="nav-logo">
          <div className="logo-icon">
            <HiSparkles />
          </div>
          <div className="logo-text">
            <span className="logo-name">MyGive</span>
            <span className="logo-tagline">Blockchain Crowdfunding</span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <div className="nav-links-desktop">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`nav-link ${isActivePath(link.path) ? 'active' : ''}`}
            >
              <span className="nav-link-icon">{link.icon}</span>
              <span className="nav-link-label">{link.label}</span>
            </Link>
          ))}
        </div>

        {/* User Actions */}
        <div className="nav-actions">
          {/* RainbowKit Connect Button */}
          <div className="wallet-connect-wrapper">
            <ConnectButton.Custom>
              {({
                account,
                chain,
                openAccountModal,
                openChainModal,
                openConnectModal,
                mounted,
              }) => {
                const ready = mounted;
                const connected = ready && account && chain;

                return (
                  <div
                    {...(!ready && {
                      'aria-hidden': true,
                      style: {
                        opacity: 0,
                        pointerEvents: 'none',
                        userSelect: 'none',
                      },
                    })}
                  >
                    {(() => {
                      if (!connected) {
                        return (
                          <button
                            onClick={openConnectModal}
                            type="button"
                            className="btn-connect-wallet"
                          >
                            <FaWallet />
                            <span>Connect</span>
                          </button>
                        );
                      }

                      if (chain.unsupported) {
                        return (
                          <button
                            onClick={openChainModal}
                            type="button"
                            className="btn-wrong-network"
                          >
                            Wrong network
                          </button>
                        );
                      }

                      return (
                        <div className="wallet-connected">
                          <button
                            onClick={openChainModal}
                            type="button"
                            className="btn-chain"
                          >
                            {chain.hasIcon && (
                              <div
                                className="chain-icon"
                                style={{
                                  background: chain.iconBackground,
                                }}
                              >
                                {chain.iconUrl && (
                                  <img
                                    alt={chain.name ?? 'Chain icon'}
                                    src={chain.iconUrl}
                                    style={{ width: 16, height: 16 }}
                                  />
                                )}
                              </div>
                            )}
                          </button>

                          <button
                            onClick={openAccountModal}
                            type="button"
                            className="btn-account"
                          >
                            {account.displayName}
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                );
              }}
            </ConnectButton.Custom>
          </div>

          {connected && (
            <Link to="/profile" className="nav-profile-icon-only">
              <div className="profile-avatar">
                <FaUser />
              </div>
            </Link>
          )}

          {/* Mobile Menu Toggle */}
          <button
            className="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className={`mobile-menu ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="mobile-menu-content">
          <div className="mobile-nav-links">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`mobile-nav-link ${isActivePath(link.path) ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="mobile-nav-icon">{link.icon}</span>
                <span className="mobile-nav-label">{link.label}</span>
              </Link>
            ))}
          </div>

          <div className="mobile-nav-divider"></div>

          {/* Mobile Wallet Connect */}
          <div className="mobile-wallet-section">
            <ConnectButton />
          </div>

          <div className="mobile-nav-divider"></div>

          {connected && (
            <Link
              to="/profile"
              className="mobile-nav-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="mobile-nav-icon"><FaUser /></span>
              <span className="mobile-nav-label">Profile</span>
            </Link>
          )}
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="mobile-menu-overlay"
          onClick={() => setMobileMenuOpen(false)}
        ></div>
      )}
    </nav>
  );
};

export default Navigation;
