import React, { useState, useEffect } from 'react';
import { useWeb3 } from './Web3Context';
import { FaUser, FaTimes, FaCheckCircle } from 'react-icons/fa';
import { saveUserProfile, getUserProfile } from '../utils/database';

/**
 * Modal that appears when a user connects wallet for the first time
 * Prompts them to enter their name for registration
 */
const WalletProfileModal = () => {
  const { connected, account } = useWeb3();
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const checkRegistration = async () => {
      if (!connected || !account) {
        setShowModal(false);
        return;
      }

      // Check if user is already registered using database utility
      const result = await getUserProfile(account);

      if (!result.success || !result.data || !result.data.name) {
        // First time wallet connection - show modal
        setShowModal(true);
      } else {
        setShowModal(false);
      }
    };

    checkRegistration();
  }, [connected, account]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      alert('Please enter your name');
      return;
    }

    setSubmitting(true);

    try {
      // Save user profile using database utility (saves to both Supabase and localStorage)
      const result = await saveUserProfile(account, {
        name: name.trim(),
        email: '',
        phone: '',
        location: '',
        bio: '',
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to save profile');
      }

      // Close modal
      setShowModal(false);
      setName('');

      // Show success message
      alert(`Welcome, ${name.trim()}! 🎉\n\nYour profile has been created successfully.`);
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Error saving profile. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = async () => {
    // Allow skip but still create basic profile using database utility
    const defaultName = `User ${account.slice(0, 6)}`;

    await saveUserProfile(account, {
      name: defaultName,
      email: '',
      phone: '',
      location: '',
      bio: '',
    });

    setShowModal(false);
  };

  if (!showModal) return null;

  return (
    <>
      {/* Overlay */}
      <div className="wallet-modal-overlay" onClick={handleSkip}></div>

      {/* Modal */}
      <div className="wallet-profile-modal">
        <div className="modal-header">
          <div className="modal-icon">
            <FaUser />
          </div>
          <h2>Welcome to MyGive!</h2>
          <p className="modal-subtitle">
            Let's set up your profile
          </p>
          <button
            className="modal-close"
            onClick={handleSkip}
            aria-label="Close"
          >
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="name">
              Your Name <span className="required">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              className="modal-input"
              maxLength={50}
              autoFocus
              disabled={submitting}
            />
            <p className="form-helper">
              This name will be displayed when you create campaigns or donate resources.
            </p>
          </div>

          <div className="wallet-info">
            <div className="wallet-info-label">Connected Wallet:</div>
            <div className="wallet-address">{account}</div>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              onClick={handleSkip}
              className="btn-skip"
              disabled={submitting}
            >
              Skip for Now
            </button>
            <button
              type="submit"
              className="btn-submit"
              disabled={submitting || !name.trim()}
            >
              {submitting ? (
                'Creating Profile...'
              ) : (
                <>
                  <FaCheckCircle />
                  <span>Complete Setup</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default WalletProfileModal;
