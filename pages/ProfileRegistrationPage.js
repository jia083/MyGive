import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWeb3 } from '../components/Web3Context';
import { saveUserProfile, getUserProfile } from '../utils/database';
import { FaUser, FaCheckCircle, FaWallet } from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi';

const ProfileRegistrationPage = () => {
  const navigate = useNavigate();
  const { connected, account } = useWeb3();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    organization: '',
    bio: ''
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const checkRegistration = async () => {
      // Redirect if wallet not connected
      if (!connected) {
        navigate('/');
        return;
      }

      // Check if user already registered
      const result = await getUserProfile(account);
      if (result.success && result.data) {
        // User already registered, redirect to dashboard or campaigns
        navigate('/campaigns');
      }
    };

    checkRegistration();
  }, [connected, account, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    } else if (formData.name.length > 50) {
      newErrors.name = 'Name must be less than 50 characters';
    }

    if (formData.organization && formData.organization.length > 100) {
      newErrors.organization = 'Organization name must be less than 100 characters';
    }

    if (formData.bio && formData.bio.length > 500) {
      newErrors.bio = 'Bio must be less than 500 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      // Save user profile to database
      const result = await saveUserProfile(account, {
        name: formData.name.trim(),
        email: formData.email.trim() || '',
        location: formData.organization.trim() || '', // Map organization to location field
        bio: formData.bio.trim() || '',
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to save profile');
      }

      // Show success message
      alert('Registration successful! You can now create campaigns.');

      // Redirect to campaigns page
      navigate('/campaigns');
    } catch (error) {
      console.error('Error registering user:', error);
      alert('Failed to register. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!connected) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="profile-registration-page">
      <div className="registration-container">
        {/* Header */}
        <div className="registration-header">
          <div className="registration-icon">
            <HiSparkles />
          </div>
          <h1 className="registration-title">Welcome to MyGive!</h1>
          <p className="registration-subtitle">
            Complete your profile to start creating campaigns and making a difference
          </p>

          {/* Wallet Info */}
          <div className="wallet-info-box">
            <FaWallet />
            <div className="wallet-details">
              <span className="wallet-label">Connected Wallet</span>
              <span className="wallet-address">{account}</span>
            </div>
          </div>
        </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="registration-form">
          {/* Name (Required) */}
          <div className="form-group">
            <label htmlFor="name">
              Full Name / Organization Name <span className="required">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter your name or organization name"
              className={errors.name ? 'error' : ''}
              maxLength={50}
            />
            {errors.name && <span className="error-message">{errors.name}</span>}
            <span className="char-count">{formData.name.length}/50</span>
          </div>

          {/* Email (Optional) */}
          <div className="form-group">
            <label htmlFor="email">Email (Optional)</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="your.email@example.com"
            />
            <span className="field-hint">
              We'll never share your email publicly
            </span>
          </div>

          {/* Organization (Optional) */}
          <div className="form-group">
            <label htmlFor="organization">Organization / Affiliation (Optional)</label>
            <input
              type="text"
              id="organization"
              name="organization"
              value={formData.organization}
              onChange={handleChange}
              placeholder="e.g., ABC Foundation, Independent"
              className={errors.organization ? 'error' : ''}
              maxLength={100}
            />
            {errors.organization && <span className="error-message">{errors.organization}</span>}
            <span className="char-count">{formData.organization.length}/100</span>
          </div>

          {/* Bio (Optional) */}
          <div className="form-group">
            <label htmlFor="bio">About You / Your Mission (Optional)</label>
            <textarea
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              placeholder="Tell the community about yourself or your organization's mission..."
              rows={4}
              className={errors.bio ? 'error' : ''}
              maxLength={500}
            />
            {errors.bio && <span className="error-message">{errors.bio}</span>}
            <span className="char-count">{formData.bio.length}/500</span>
          </div>

          {/* Info Box */}
          <div className="info-box">
            <h4><FaCheckCircle /> Important Notes</h4>
            <ul>
              <li>Your name will be displayed as the campaign organizer</li>
              <li>This information is stored locally in your browser</li>
              <li>Your wallet address will be used for receiving donations</li>
              <li>You can update your profile information later</li>
            </ul>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn-register-submit"
            disabled={submitting}
          >
            {submitting ? (
              <>Registering...</>
            ) : (
              <>
                <FaUser /> Complete Registration
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfileRegistrationPage;
