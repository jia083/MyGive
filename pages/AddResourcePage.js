import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SideNavigation from '../components/SideNavigation';
import { useResourceSharing } from '../hooks/useResourceSharing';
import { useWeb3 } from '../components/Web3Context';
import { uploadImageToIPFS, isPinataConfigured } from '../utils/ipfs';
import {
  FaArrowLeft,
  FaBox,
  FaUtensils,
  FaTshirt,
  FaBook,
  FaHome,
  FaMedkit,
  FaLaptop,
  FaMapMarkerAlt,
  FaCheckCircle,
  FaCloudUploadAlt,
  FaImage
} from 'react-icons/fa';
// CSS imported in _app.js

const AddResourcePage = () => {
  const navigate = useNavigate();
  const { connected } = useWeb3();
  const { postResource, isContractReady } = useResourceSharing();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Food',
    quantity: '',
    unit: '',
    location: '',
    image: '📦'
  });

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [imageFile, setImageFile] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    document.body.classList.add('with-side-nav');
    return () => {
      document.body.classList.remove('with-side-nav');
    };
  }, []);

  const categories = [
    { name: 'Food', icon: '🥗', emoji: '🥗' },
    { name: 'Clothing', icon: '👕', emoji: '🧥' },
    { name: 'Educational Materials', icon: '📚', emoji: '📚' },
    { name: 'Furniture', icon: '🪑', emoji: '🪑' },
    { name: 'Medical Supplies', icon: '⚕️', emoji: '⚕️' },
    { name: 'Electronics', icon: '💻', emoji: '💻' }
  ];

  const units = [
    'kg',
    'pieces',
    'sets',
    'boxes',
    'units',
    'bags',
    'liters',
    'items'
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleCategoryChange = (categoryName) => {
    const category = categories.find(c => c.name === categoryName);
    setFormData(prev => ({
      ...prev,
      category: categoryName,
      image: imageFile ? prev.image : category.emoji // Keep IPFS hash if image uploaded
    }));
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

    // Set file only
    setImageFile(file);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    const category = categories.find(c => c.name === formData.category);
    setFormData(prev => ({ ...prev, image: category.emoji }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length < 5) {
      newErrors.title = 'Title must be at least 5 characters';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length < 20) {
      newErrors.description = 'Description must be at least 20 characters';
    }

    if (!formData.quantity || formData.quantity <= 0) {
      newErrors.quantity = 'Quantity must be greater than 0';
    }

    if (!formData.unit) {
      newErrors.unit = 'Please select a unit';
    }

    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
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

    setSubmitting(true);

    try {
      let imageToStore = formData.image; // Default to emoji

      // Upload image to IPFS if user uploaded one
      if (imageFile && isPinataConfigured()) {
        setUploadingImage(true);
        const uploadResult = await uploadImageToIPFS(imageFile);

        if (uploadResult.success) {
          imageToStore = uploadResult.ipfsHash; // Store IPFS hash
          console.log('Image uploaded to IPFS:', uploadResult.ipfsHash);
        } else {
          // Show warning but continue with emoji
          console.warn('Image upload failed:', uploadResult.error);
          alert(`Warning: Image upload failed (${uploadResult.error}). Continuing with category emoji.`);
        }

        setUploadingImage(false);
      }

      const resourceData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        quantity: parseInt(formData.quantity),
        unit: formData.unit,
        location: formData.location,
        image: imageToStore
      };

      const result = await postResource(resourceData);

      if (result.success) {
        alert(`Resource posted successfully! 🎉\n\nTransaction Hash: ${result.transactionHash}\nResource ID: ${result.resourceId}\n\nYour resource is now live on the blockchain!`);

        // Navigate to resources page
        navigate('/resources');
      } else {
        alert(`Failed to post resource: ${result.error}`);
      }
    } catch (error) {
      console.error('Error posting resource:', error);
      alert('An error occurred while posting the resource');
    } finally {
      setSubmitting(false);
      setUploadingImage(false);
    }
  };

  return (
    <div className="add-resource-layout">
      <SideNavigation />
      <div className="add-resource-container">
        {/* Header */}
        <div className="add-resource-header">
          <button onClick={() => navigate('/resources')} className="back-button" title="Back to Resources">
            &lt;
          </button>

          <h1 className="add-resource-title">Donate a Resource</h1>
          <p className="add-resource-subtitle">
            Share resources you no longer need with your community. All listings are recorded on the blockchain for transparency.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="add-resource-form">
          {/* Title */}
          <div className="form-group">
            <label htmlFor="title" className="form-label">
              Resource Title <span className="required">*</span>
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="e.g., Fresh Vegetables and Fruits"
              className={`form-input ${errors.title ? 'error' : ''}`}
              maxLength={100}
            />
            {errors.title && <span className="error-message">{errors.title}</span>}
            <span className="character-count">{formData.title.length}/100</span>
          </div>

          {/* Description */}
          <div className="form-group">
            <label htmlFor="description" className="form-label">
              Description <span className="required">*</span>
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Provide detailed information about the resource, its condition, and any special notes..."
              className={`form-textarea ${errors.description ? 'error' : ''}`}
              rows={5}
              maxLength={500}
            />
            {errors.description && <span className="error-message">{errors.description}</span>}
            <span className="character-count">{formData.description.length}/500</span>
          </div>

          {/* Category */}
          <div className="form-group">
            <label className="form-label">
              Category <span className="required">*</span>
            </label>
            <div className="category-grid">
              {categories.map((category) => (
                <button
                  key={category.name}
                  type="button"
                  onClick={() => handleCategoryChange(category.name)}
                  className={`category-card ${formData.category === category.name ? 'selected' : ''}`}
                >
                  <span className="category-emoji">{category.emoji}</span>
                  <span className="category-name">{category.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quantity and Unit */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="quantity" className="form-label">
                Quantity Available <span className="required">*</span>
              </label>
              <input
                type="number"
                id="quantity"
                name="quantity"
                value={formData.quantity}
                onChange={handleInputChange}
                placeholder="0"
                className={`form-input ${errors.quantity ? 'error' : ''}`}
                min="1"
              />
              {errors.quantity && <span className="error-message">{errors.quantity}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="unit" className="form-label">
                Unit <span className="required">*</span>
              </label>
              <select
                id="unit"
                name="unit"
                value={formData.unit}
                onChange={handleInputChange}
                className={`form-select ${errors.unit ? 'error' : ''}`}
              >
                <option value="">Select unit...</option>
                {units.map(unit => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
              {errors.unit && <span className="error-message">{errors.unit}</span>}
            </div>
          </div>

          {/* Location */}
          <div className="form-group">
            <label htmlFor="location" className="form-label">
              <FaMapMarkerAlt />
              Location <span className="required">*</span>
            </label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              placeholder="e.g., Kuala Lumpur, Petaling Jaya"
              className={`form-input ${errors.location ? 'error' : ''}`}
              maxLength={100}
            />
            {errors.location && <span className="error-message">{errors.location}</span>}
          </div>

          {/* Image Upload */}
          <div className="form-group">
            <label className="form-label">
              <FaImage />
              Resource Image (Optional)
            </label>
            <p className="form-helper-text">
              Upload an image of your resource. Stored on IPFS for permanent, decentralized access.
              {!isPinataConfigured() && <span className="warning-text"> (IPFS not configured - will use category emoji)</span>}
            </p>

            <div className="image-upload-area">
              <input
                type="file"
                id="image-upload"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                onChange={handleImageChange}
                className="image-upload-input"
              />
              <label htmlFor="image-upload" className="image-upload-label">
                <FaCloudUploadAlt className="upload-icon" />
                <span className="upload-text">
                  {imageFile ? `Selected: ${imageFile.name}` : 'Click to upload image'}
                </span>
                <span className="upload-subtext">JPG, PNG, GIF, or WebP (max 5MB)</span>
              </label>
              {imageFile && (
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="btn-remove-image"
                >
                  Remove Image
                </button>
              )}
            </div>

            {errors.image && <span className="error-message">{errors.image}</span>}
          </div>

          {/* Important Notice */}
          <div className="blockchain-notice">
            <FaCheckCircle />
            <div>
              <strong>Blockchain Recording</strong>
              <p>This resource will be permanently recorded on the Ethereum blockchain. You'll need to pay a small gas fee for the transaction.</p>
            </div>
          </div>

          {/* Submit Button */}
          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate('/resources')}
              className="btn-cancel"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-submit"
              disabled={submitting || uploadingImage || !connected || !isContractReady}
            >
              {uploadingImage ? 'Uploading Image to IPFS...' : submitting ? 'Posting to Blockchain...' : connected ? 'Post Resource' : 'Connect Wallet First'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddResourcePage;
