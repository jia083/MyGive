import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SideNavigation from '../components/SideNavigation';
import ProfileCheck from '../components/ProfileCheck';
import { useCrowdFunding } from '../hooks/useCrowdFunding';
import { useWeb3 } from '../components/Web3Context';
import { uploadImageToIPFS, isPinataConfigured } from '../utils/ipfs';
import { FaRocket, FaCheckCircle, FaExclamationTriangle, FaCloudUploadAlt, FaImage, FaTimes } from 'react-icons/fa';

const CreateCampaignPage = () => {
  const navigate = useNavigate();
  const { connected, account } = useWeb3();
  const { createCampaign, isContractReady } = useCrowdFunding();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    target: '',
    duration: 30, // days
    category: 'Education',
    image: ''
  });

  const [creating, setCreating] = useState(false);
  const [errors, setErrors] = useState({});
  const [imageFile, setImageFile] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    document.body.classList.add('with-side-nav');
    return () => {
      document.body.classList.remove('with-side-nav');
    };
  }, []);

  const categories = [
    'Education',
    'Healthcare',
    'Food Security',
    'Environment',
    'Community Development',
    'Emergency Relief'
  ];

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

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, image: 'Image must be less than 5MB' }));
      return;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setErrors(prev => ({ ...prev, image: 'Please upload JPG, PNG, GIF, or WebP images' }));
      return;
    }

    // Clear error
    setErrors(prev => ({ ...prev, image: '' }));

    // Set file and create preview
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setFormData(prev => ({ ...prev, image: '' }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length < 10) {
      newErrors.title = 'Title must be at least 10 characters';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length < 50) {
      newErrors.description = 'Description must be at least 50 characters';
    }

    if (!formData.target || parseFloat(formData.target) <= 0) {
      newErrors.target = 'Target amount must be greater than 0';
    }

    if (!formData.duration || parseInt(formData.duration) < 1) {
      newErrors.duration = 'Duration must be at least 1 day';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!connected) {
      alert('Please connect your wallet first');
      return;
    }

    if (!isContractReady) {
      alert('Contract is not ready. Please wait...');
      return;
    }

    if (!validateForm()) {
      return;
    }

    setCreating(true);

    try {
      let imageToStore = formData.image || '📋'; // Default to emoji

      // Upload image to IPFS if user uploaded one
      if (imageFile && isPinataConfigured()) {
        setUploadingImage(true);
        const uploadResult = await uploadImageToIPFS(imageFile);

        if (uploadResult.success) {
          imageToStore = uploadResult.ipfsHash; // Store IPFS hash
          console.log('Campaign image uploaded to IPFS:', uploadResult.ipfsHash);
        } else {
          // Show warning but continue with emoji
          console.warn('Image upload failed:', uploadResult.error);
          alert(`Warning: Image upload failed (${uploadResult.error}). Continuing with emoji.`);
        }

        setUploadingImage(false);
      }

      // Calculate deadline (current time + duration in days)
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + parseInt(formData.duration));

      const campaignData = {
        title: formData.title,
        description: formData.description,
        target: formData.target,
        deadline: deadline,
        image: imageToStore,
        category: formData.category // Now stored on blockchain
      };

      const result = await createCampaign(campaignData);

      if (result.success) {
        // Increment user's campaign count (check lowercase for consistency)
        const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '{}');
        const userKey = account.toLowerCase();
        if (registeredUsers[userKey]) {
          registeredUsers[userKey].totalCampaigns = (registeredUsers[userKey].totalCampaigns || 0) + 1;
          localStorage.setItem('registeredUsers', JSON.stringify(registeredUsers));
        }

        alert(`Campaign created successfully! Transaction hash: ${result.transactionHash}`);
        navigate(`/campaigns/${result.campaignId}`);
      } else {
        alert(`Failed to create campaign: ${result.error}`);
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
      alert('Failed to create campaign. Please try again.');
    } finally {
      setCreating(false);
      setUploadingImage(false);
    }
  };

  return (
    <div className="campaign-details-layout">
      <ProfileCheck redirectIfNotRegistered={true} />
      <SideNavigation />
      <div className="campaign-details-container">
        <div className="create-campaign-page">
          {/* Header */}
          <div className="create-campaign-header">
            <h1 className="create-campaign-title">
              <FaRocket /> Create New Campaign
            </h1>
            <p className="create-campaign-subtitle">
              Launch your blockchain-verified crowdfunding campaign and make a difference
            </p>
          </div>

          {/* Warning if not connected */}
          {!connected && (
            <div className="warning-box">
              <FaExclamationTriangle />
              <p>Please connect your wallet to create a campaign</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="create-campaign-form">
            {/* Title */}
            <div className="form-group">
              <label htmlFor="title">Campaign Title *</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Enter a compelling title for your campaign"
                className={errors.title ? 'error' : ''}
                maxLength={100}
              />
              {errors.title && <span className="error-message">{errors.title}</span>}
              <span className="char-count">{formData.title.length}/100</span>
            </div>

            {/* Description */}
            <div className="form-group">
              <label htmlFor="description">Campaign Description *</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe your campaign, its goals, and how the funds will be used"
                rows={8}
                className={errors.description ? 'error' : ''}
                maxLength={1000}
              />
              {errors.description && <span className="error-message">{errors.description}</span>}
              <span className="char-count">{formData.description.length}/1000</span>
            </div>

            {/* Category */}
            <div className="form-group">
              <label htmlFor="category">Category *</label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Target Amount */}
            <div className="form-group">
              <label htmlFor="target">Target Amount (ETH) *</label>
              <input
                type="number"
                id="target"
                name="target"
                value={formData.target}
                onChange={handleChange}
                placeholder="0.0"
                step="0.0001"
                min="0"
                className={errors.target ? 'error' : ''}
              />
              {errors.target && <span className="error-message">{errors.target}</span>}
              <span className="field-hint">Enter the funding goal in ETH</span>
            </div>

            {/* Duration */}
            <div className="form-group">
              <label htmlFor="duration">Campaign Duration (Days) *</label>
              <input
                type="number"
                id="duration"
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                min="1"
                max="365"
                className={errors.duration ? 'error' : ''}
              />
              {errors.duration && <span className="error-message">{errors.duration}</span>}
              <span className="field-hint">
                Campaign will end on: {new Date(Date.now() + formData.duration * 24 * 60 * 60 * 1000).toLocaleDateString()}
              </span>
            </div>

            {/* Image Upload */}
            <div className="form-group">
              <label htmlFor="image">Campaign Image (Optional)</label>

              {!imagePreview ? (
                <div className="image-upload-area">
                  <input
                    type="file"
                    id="image"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    onChange={handleImageChange}
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="image" className="image-upload-label">
                    <FaCloudUploadAlt className="upload-icon" />
                    <span className="upload-text">Click to upload image</span>
                    <span className="upload-hint">JPG, PNG, GIF or WebP (Max 5MB)</span>
                  </label>
                </div>
              ) : (
                <div className="image-preview-container">
                  <img src={imagePreview} alt="Campaign preview" className="image-preview" />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="remove-image-btn"
                    title="Remove image"
                  >
                    <FaTimes />
                  </button>
                </div>
              )}

              {errors.image && <span className="error-message">{errors.image}</span>}

              <div style={{ marginTop: '0.5rem' }}>
                <span className="field-hint">Or use an emoji:</span>
                <input
                  type="text"
                  name="image"
                  value={formData.image}
                  onChange={handleChange}
                  placeholder="📚 (Enter an emoji)"
                  maxLength={10}
                  style={{ marginTop: '0.5rem', width: '100%' }}
                />
              </div>
            </div>

            {/* Important Notes */}
            <div className="info-box">
              <h4><FaCheckCircle /> Important Notes</h4>
              <ul>
                <li>Your campaign will be verified on the blockchain</li>
                <li>Donations are sent directly to your wallet address</li>
                <li>You'll need to pay gas fees to create the campaign</li>
                <li>Campaign details cannot be edited after creation</li>
                <li>Funds are transferred instantly to you when someone donates</li>
              </ul>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="btn-create-campaign-submit"
              disabled={creating || uploadingImage || !connected || !isContractReady}
            >
              {uploadingImage ? (
                <>
                  <FaCloudUploadAlt /> Uploading Image...
                </>
              ) : creating ? (
                <>Creating Campaign...</>
              ) : !connected ? (
                <>Connect Wallet First</>
              ) : (
                <>
                  <FaRocket /> Launch Campaign
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateCampaignPage;
