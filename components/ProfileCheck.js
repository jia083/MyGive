import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useWeb3 } from './Web3Context';

/**
 * Component to check if connected wallet user has registered their profile
 * Redirects to /register-profile if not registered
 * Use this in pages where you want to ensure user has a profile (like campaign creation)
 */
const ProfileCheck = ({ redirectIfNotRegistered = true }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { connected, account } = useWeb3();

  useEffect(() => {
    if (!connected || !account || !redirectIfNotRegistered) return;

    // Don't redirect if already on registration page
    if (location.pathname === '/register-profile') return;

    // Check if user is registered (check both lowercase and original case for compatibility)
    const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '{}');
    const isRegistered = registeredUsers[account.toLowerCase()] || registeredUsers[account];

    if (!isRegistered) {
      // User not registered, redirect to registration
      console.log('User not registered, redirecting to profile registration...');
      navigate('/register-profile', {
        state: { from: location.pathname }
      });
    }
  }, [connected, account, navigate, location, redirectIfNotRegistered]);

  return null;
};

export default ProfileCheck;
