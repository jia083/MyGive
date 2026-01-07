import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SideNavigation from '../components/SideNavigation';
import { useResourceSharing } from '../hooks/useResourceSharing';
import { getIPFSGatewayUrl } from '../utils/ipfs';
import {
  FaSearch,
  FaFilter,
  FaMapMarkerAlt,
  FaBox,
  FaHandHoldingHeart,
  FaPlus,
  FaUtensils,
  FaTshirt,
  FaBook,
  FaHome,
  FaMedkit,
  FaLaptop,
  FaCheckCircle
} from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi';
import { MdVerified } from 'react-icons/md';

const ResourcesPage = () => {
  const navigate = useNavigate();
  const { getResources, isContractReady } = useResourceSharing();

  const [resources, setResources] = useState([]);
  const [filteredResources, setFilteredResources] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [availabilityFilter, setAvailabilityFilter] = useState('available'); // 'available', 'claimed', 'all'
  const [loading, setLoading] = useState(true);

  // Helper function to check if image is IPFS hash
  const isIPFSHash = (str) => {
    // IPFS v0 hashes start with Qm and are 46 chars
    // IPFS v1 hashes start with b and are longer
    return str && (str.startsWith('Qm') || str.startsWith('b')) && str.length > 20 && !str.includes(' ');
  };

  const categories = [
    { name: 'All', icon: <FaBox /> },
    { name: 'Food', icon: <FaUtensils /> },
    { name: 'Clothing', icon: <FaTshirt /> },
    { name: 'Educational Materials', icon: <FaBook /> },
    { name: 'Furniture', icon: <FaHome /> },
    { name: 'Medical Supplies', icon: <FaMedkit /> },
    { name: 'Electronics', icon: <FaLaptop /> }
  ];

  useEffect(() => {
    document.body.classList.add('with-side-nav');
    return () => {
      document.body.classList.remove('with-side-nav');
    };
  }, []);

  useEffect(() => {
    const loadResources = async () => {
      if (!isContractReady) return;

      setLoading(true);
      try {
        const blockchainResources = await getResources();

        // Get registered users for donor names
        const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '{}');

        // Format resources to match UI expectations
        const formattedResources = blockchainResources.map((resource) => {
          const donorName = registeredUsers[resource.owner]?.name ||
                            (resource.owner.slice(0, 6) + '...' + resource.owner.slice(-4));

          return {
            id: resource.id,
            title: resource.title,
            description: resource.description,
            category: resource.category,
            quantityAvailable: resource.quantityAvailable,
            unit: resource.unit,
            location: resource.location,
            distance: 'Blockchain verified', // You can calculate distance if you add coordinates
            donor: donorName,
            isVerified: resource.isVerified,
            postedDate: resource.postedDate,
            icon: resource.image || '📦',
            isActive: resource.isActive,
          };
        });

        setResources(formattedResources);
        setFilteredResources(formattedResources);
      } catch (error) {
        console.error('Error loading resources:', error);
      } finally {
        setLoading(false);
      }
    };

    loadResources();
  }, [isContractReady, getResources]);

  // Keep old mock data as fallback (commented out)
  /*
  useEffect(() => {
    // Simulated data - replace with API call
    const mockResources = [
      {
        id: 1,
        title: 'Fresh Vegetables and Fruits',
        description: 'Weekly donation of fresh produce from local farms. Suitable for families and community kitchens.',
        category: 'Food',
        quantityAvailable: 50,
        unit: 'kg',
        location: 'Kuala Lumpur',
        distance: '2.3 km',
        donor: 'Green Valley Farm',
        isVerified: true,
        postedDate: '2 days ago',
        icon: '🥗'
      },
      {
        id: 2,
        title: 'School Textbooks (Primary)',
        description: 'Complete set of primary school textbooks for Year 1-6. Good condition, suitable for students from low-income families.',
        category: 'Educational Materials',
        quantityAvailable: 30,
        unit: 'sets',
        location: 'Petaling Jaya',
        distance: '5.1 km',
        donor: 'Education for All Foundation',
        isVerified: true,
        postedDate: '1 week ago',
        icon: '📚'
      },
      {
        id: 3,
        title: 'Winter Clothing Collection',
        description: 'Gently used jackets, sweaters, and warm clothing. Various sizes available for children and adults.',
        category: 'Clothing',
        quantityAvailable: 120,
        unit: 'pieces',
        location: 'Shah Alam',
        distance: '8.7 km',
        donor: 'Community Wardrobe',
        isVerified: true,
        postedDate: '3 days ago',
        icon: '🧥'
      },
      {
        id: 4,
        title: 'Non-Perishable Food Items',
        description: 'Rice, canned goods, cooking oil, and other non-perishable items. Perfect for food banks and family assistance programs.',
        category: 'Food',
        quantityAvailable: 100,
        unit: 'boxes',
        location: 'Subang Jaya',
        distance: '4.5 km',
        donor: 'Helping Hands Grocery',
        isVerified: false,
        postedDate: '5 days ago',
        icon: '🍚'
      },
      {
        id: 5,
        title: 'Office Furniture - Desks & Chairs',
        description: 'Quality used office furniture available for community centers, schools, or non-profit organizations.',
        category: 'Furniture',
        quantityAvailable: 15,
        unit: 'sets',
        location: 'Kuala Lumpur',
        distance: '1.8 km',
        donor: 'Corporate Donations KL',
        isVerified: true,
        postedDate: '1 day ago',
        icon: '🪑'
      },
      {
        id: 6,
        title: 'First Aid Kits & Medical Supplies',
        description: 'Basic first aid kits, bandages, and medical supplies for community health programs.',
        category: 'Medical Supplies',
        quantityAvailable: 25,
        unit: 'kits',
        location: 'Cheras',
        distance: '6.2 km',
        donor: 'Health Care Foundation',
        isVerified: true,
        postedDate: '4 days ago',
        icon: '⚕️'
      },
      {
        id: 7,
        title: 'Laptops for Students',
        description: 'Refurbished laptops suitable for online learning. Pre-installed with educational software.',
        category: 'Electronics',
        quantityAvailable: 10,
        unit: 'units',
        location: 'Ampang',
        distance: '7.3 km',
        donor: 'Tech for Good Malaysia',
        isVerified: true,
        postedDate: '1 week ago',
        icon: '💻'
      },
      {
        id: 8,
        title: 'Children\'s Clothing (Age 5-12)',
        description: 'Clean, gently used children\'s clothing. Great variety of sizes and styles.',
        category: 'Clothing',
        quantityAvailable: 80,
        unit: 'pieces',
        location: 'Bangsar',
        distance: '3.4 km',
        donor: 'Kids Care Community',
        isVerified: false,
        postedDate: '2 days ago',
        icon: '👕'
      }
    ];
    setResources(mockResources);
    setFilteredResources(mockResources);
  }, []);
  */

  useEffect(() => {
    let filtered = resources;

    // Filter by availability status
    if (availabilityFilter === 'available') {
      // Show only resources with quantity > 0
      filtered = filtered.filter(r => r.quantityAvailable > 0);
    } else if (availabilityFilter === 'claimed') {
      // Show only fully claimed resources (quantity = 0)
      filtered = filtered.filter(r => r.quantityAvailable === 0);
    }
    // If 'all', show everything (no filter)

    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(r => r.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(r =>
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.donor.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredResources(filtered);
  }, [resources, selectedCategory, searchQuery, availabilityFilter]);

  return (
    <div className="resources-layout-with-side-nav">
      <SideNavigation />
      <div className="resources-page-container">
        {/* Hero Section */}
        <section className="resources-hero">
          <div className="resources-hero-content">
            <div className="resources-badge">
              <HiSparkles />
              <span>Community Resources</span>
            </div>
            <h1 className="resources-hero-title">
              Share & Access <span className="resources-hero-accent">Community</span> Resources
            </h1>
            <p className="resources-hero-subtitle">
              Connect with your community. Donate resources you no longer need or find resources that can help you.
            </p>
          </div>

          {/* Search Bar */}
          <div className="resources-search-bar">
            <div className="search-input-wrapper">
              <FaSearch />
              <input
                type="text"
                placeholder="Search resources, location, donor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
            <button onClick={() => navigate('/resources/add')} className="btn-primary-resources">
              <FaPlus />
              <span>Donate Resource</span>
            </button>
          </div>
        </section>

        {/* Main Content */}
        <section className="resources-main">
          <div className="resources-container">
            {/* Category Filter Sidebar */}
            <aside className="resources-sidebar">
              {/* Availability Filter */}
              <div className="sidebar-section">
                <div className="sidebar-header">
                  <FaCheckCircle />
                  <h3>Availability</h3>
                </div>
                <div className="availability-filters">
                  <button
                    className={`availability-btn ${availabilityFilter === 'available' ? 'active' : ''}`}
                    onClick={() => setAvailabilityFilter('available')}
                  >
                    <FaCheckCircle />
                    <span>Available</span>
                    <span className="filter-count">
                      {resources.filter(r => r.quantityAvailable > 0).length}
                    </span>
                  </button>
                  <button
                    className={`availability-btn ${availabilityFilter === 'claimed' ? 'active' : ''}`}
                    onClick={() => setAvailabilityFilter('claimed')}
                  >
                    <FaBox />
                    <span>Fully Claimed</span>
                    <span className="filter-count">
                      {resources.filter(r => r.quantityAvailable === 0).length}
                    </span>
                  </button>
                  <button
                    className={`availability-btn ${availabilityFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setAvailabilityFilter('all')}
                  >
                    <FaFilter />
                    <span>Show All</span>
                    <span className="filter-count">{resources.length}</span>
                  </button>
                </div>
              </div>

              {/* Category Filter */}
              <div className="sidebar-section">
                <div className="sidebar-header">
                  <FaFilter />
                  <h3>Categories</h3>
                </div>
                <ul className="category-list">
                  {categories.map(category => {
                    // Calculate count based on availability filter
                    let count = 0;
                    if (category.name === 'All') {
                      // For "All" category, count all resources that match availability filter
                      if (availabilityFilter === 'available') {
                        count = resources.filter(r => r.quantityAvailable > 0).length;
                      } else if (availabilityFilter === 'claimed') {
                        count = resources.filter(r => r.quantityAvailable === 0).length;
                      } else {
                        count = resources.length;
                      }
                    } else {
                      // For specific categories, count resources that match both category and availability
                      if (availabilityFilter === 'available') {
                        count = resources.filter(r => r.category === category.name && r.quantityAvailable > 0).length;
                      } else if (availabilityFilter === 'claimed') {
                        count = resources.filter(r => r.category === category.name && r.quantityAvailable === 0).length;
                      } else {
                        count = resources.filter(r => r.category === category.name).length;
                      }
                    }

                    return (
                      <li
                        key={category.name}
                        className={`category-item ${selectedCategory === category.name ? 'active' : ''}`}
                        onClick={() => setSelectedCategory(category.name)}
                      >
                        <span className="category-icon">{category.icon}</span>
                        <span className="category-name">{category.name}</span>
                        <span className="category-count">{count}</span>
                      </li>
                    );
                  })}
              </ul>
              </div>

              {/* Info Box */}
              <div className="sidebar-info-box">
                <div className="info-box-icon">
                  <FaHandHoldingHeart />
                </div>
                <h4>How It Works</h4>
                <p>Browse available resources, request what you need, or donate items to help others in your community.</p>
              </div>
            </aside>

            {/* Resources Grid */}
            <div className="resources-content">
              <div className="resources-header-bar">
                <h2 className="resources-results-title">
                  {selectedCategory === 'All' ? 'All Resources' : selectedCategory}
                  <span className="resources-count">({filteredResources.length})</span>
                </h2>
              </div>

              {loading ? (
                <div className="no-results">
                  <div className="no-results-icon">⏳</div>
                  <h3>Loading resources from blockchain...</h3>
                  <p>Please wait while we fetch the latest data</p>
                </div>
              ) : filteredResources.length === 0 ? (
                <div className="no-results">
                  <div className="no-results-icon">🔍</div>
                  <h3>No resources found</h3>
                  <p>Try adjusting your search or filters. Or be the first to donate a resource!</p>
                </div>
              ) : (
                <div className="resources-grid">
                  {filteredResources.map((resource) => (
                    <div key={resource.id} className="resource-card">
                      {/* Resource Icon or Image */}
                      <div className="resource-icon-large">
                        {isIPFSHash(resource.icon) ? (
                          <img
                            src={getIPFSGatewayUrl(resource.icon)}
                            alt={resource.title}
                            className="resource-ipfs-image"
                            onError={(e) => {
                              // Fallback to emoji if IPFS image fails to load
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'block';
                            }}
                          />
                        ) : null}
                        <span className="resource-emoji" style={{ display: isIPFSHash(resource.icon) ? 'none' : 'block' }}>
                          {resource.icon}
                        </span>
                      </div>

                      {/* Verification Badge */}
                      {resource.isVerified && (
                        <div className="verified-badge">
                          <MdVerified />
                          <span>Verified</span>
                        </div>
                      )}

                      {/* Resource Info */}
                      <div className="resource-header">
                        <span className="resource-category-tag">{resource.category}</span>
                        <span className="resource-posted-date">{resource.postedDate}</span>
                      </div>

                      <h3 className="resource-title">{resource.title}</h3>
                      <p className="resource-description">{resource.description}</p>

                      {/* Quantity */}
                      <div className="resource-quantity">
                        <FaBox />
                        <span>{resource.quantityAvailable} {resource.unit} available</span>
                      </div>

                      {/* Location */}
                      <div className="resource-location">
                        <FaMapMarkerAlt />
                        <span>{resource.location}</span>
                        <span className="resource-distance">{resource.distance}</span>
                      </div>

                      {/* Donor */}
                      <div className="resource-donor">
                        <span className="donor-label">Donated by</span>
                        <span className="donor-name">{resource.donor}</span>
                      </div>

                      {/* Actions */}
                      <div className="resource-actions">
                        <button
                          onClick={() => navigate(`/resources/${resource.id}`)}
                          className="btn-request-resource"
                        >
                          Request Resource
                        </button>
                        <button
                          onClick={() => navigate(`/resources/${resource.id}`)}
                          className="btn-view-details"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="resources-cta-banner">
          <div className="cta-banner-content">
            <h2 className="cta-banner-title">Have Resources to Share?</h2>
            <p className="cta-banner-text">
              Help your community by donating items you no longer need
            </p>
            <button onClick={() => navigate('/resources/add')} className="btn-cta-large">
              <FaPlus />
              Donate Resource
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ResourcesPage;
