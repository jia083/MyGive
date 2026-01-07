import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SideNavigation from '../components/SideNavigation';
import { useResourceSharing } from '../hooks/useResourceSharing';
import { useWeb3 } from '../components/Web3Context';
import { saveChatMessage, getChatMessages, getUserProfile } from '../utils/database';
import {
  FaArrowLeft,
  FaPaperPlane,
  FaUser,
  FaBox,
  FaMapMarkerAlt,
  FaCheckCircle,
  FaTimes,
  FaBan,
} from 'react-icons/fa';
import { MdVerified } from 'react-icons/md';
// CSS imported in _app.js

const ChatPage = () => {
  const { resourceId, claimId } = useParams();
  const navigate = useNavigate();
  const { connected, account } = useWeb3();
  const { getResource, getResourceClaims, completeClaim, cancelClaim, isContractReady } = useResourceSharing();

  const [resource, setResource] = useState(null);
  const [claim, setClaim] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [claimIndex, setClaimIndex] = useState(null);
  const messagesEndRef = useRef(null);

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    document.body.classList.add('with-side-nav');
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.classList.remove('with-side-nav');
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    const loadChatData = async () => {
      if (!isContractReady || !connected || !account) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Get resource details
        const resourceData = await getResource(resourceId);
        if (!resourceData) {
          setLoading(false);
          return;
        }

        // Get donor name from database
        let donorName = resourceData.owner.slice(0, 6) + '...' + resourceData.owner.slice(-4);
        try {
          const donorProfile = await getUserProfile(resourceData.owner);
          if (donorProfile.success && donorProfile.data && donorProfile.data.name) {
            donorName = donorProfile.data.name;
          }
        } catch (err) {
          console.error('Error loading donor profile:', err);
        }

        setResource({
          ...resourceData,
          donorName: donorName,
        });

        // Get chat messages from database
        const chatResult = await getChatMessages(resourceId, claimId);
        const chatMessages = chatResult.success ? (chatResult.data || []) : [];

        // Transform messages to match expected format
        const formattedMessages = chatMessages.map(msg => ({
          id: msg.id || msg.created_at,
          text: msg.message,
          sender: msg.sender,
          timestamp: msg.created_at,
          timeDisplay: new Date(msg.created_at).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          }),
        }));

        setClaim({
          claimerId: account,
          donorId: resourceData.owner,
          resourceId: resourceId,
          claimId: claimId,
        });
        setMessages(formattedMessages);

        // Get claim index and status from blockchain
        const claims = await getResourceClaims(resourceId);
        const foundClaimIndex = claims.findIndex(
          c => c.timestamp.toString() === claimId
        );
        setClaimIndex(foundClaimIndex);

        // Update claim with status from blockchain
        if (foundClaimIndex !== -1) {
          const claimData = claims[foundClaimIndex];
          setClaim(prev => ({
            ...prev,
            isCompleted: claimData.isCompleted,
            isCancelled: claimData.isCancelled,
          }));
        }
      } catch (error) {
        console.error('Error loading chat:', error);
      } finally {
        setLoading(false);
      }
    };

    loadChatData();
  }, [
    resourceId,
    claimId,
    isContractReady,
    connected,
    account,
    getResource,
    getResourceClaims,
  ]);

  const handleCompleteClaim = async () => {
    if (claimIndex === null || claimIndex === -1) {
      alert('Unable to find claim in blockchain');
      return;
    }

    if (!window.confirm('Mark this claim as completed? This confirms that the resource has been successfully handed over.')) {
      return;
    }

    setCompleting(true);
    try {
      const result = await completeClaim(resourceId, claimIndex);

      if (result.success) {
        alert('Claim marked as completed! ✅\n\nTransaction Hash: ' + result.transactionHash);

        // Reload claim data
        const claims = await getResourceClaims(resourceId);
        const updatedClaim = claims[claimIndex];

        // Update local state
        setClaim(prev => ({
          ...prev,
          isCompleted: updatedClaim.isCompleted
        }));
      } else {
        alert('Failed to complete claim: ' + result.error);
      }
    } catch (error) {
      console.error('Error completing claim:', error);
      alert('Error completing claim: ' + error.message);
    } finally {
      setCompleting(false);
    }
  };

  const handleCancelClaim = async () => {
    if (claimIndex === null || claimIndex === -1) {
      alert('Unable to find claim in blockchain');
      return;
    }

    if (!window.confirm('Are you sure you want to cancel this claim? This action cannot be undone and the resource quantity will be restored.')) {
      return;
    }

    setCancelling(true);
    try {
      const result = await cancelClaim(resourceId, claimIndex);

      if (result.success) {
        alert('Claim cancelled successfully.\n\nTransaction Hash: ' + result.transactionHash);

        // Reload claim data
        const claims = await getResourceClaims(resourceId);
        const updatedClaim = claims[claimIndex];

        // Update local state
        setClaim(prev => ({
          ...prev,
          isCancelled: updatedClaim.isCancelled
        }));
      } else {
        alert('Failed to cancel claim: ' + result.error);
      }
    } catch (error) {
      console.error('Error cancelling claim:', error);
      alert('Error cancelling claim: ' + error.message);
    } finally {
      setCancelling(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!newMessage.trim() || !resource) return;

    const messageText = newMessage.trim();
    const timestamp = new Date().toISOString();

    const message = {
      id: Date.now(),
      text: messageText,
      sender: account,
      timestamp: timestamp,
      timeDisplay: new Date().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }),
    };

    // Optimistically update UI
    setMessages(prev => [...prev, message]);
    setNewMessage('');

    // Save to database
    try {
      const result = await saveChatMessage(resourceId, claimId, account, messageText);
      if (!result.success) {
        console.error('Failed to save message to database:', result.error);
      }
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  const isDonor =
    connected &&
    account &&
    resource &&
    account.toLowerCase() === resource.owner.toLowerCase();

  const otherPersonName = isDonor ? 'Claimer' : resource?.donorName || 'Donor';

  // Cache for user names to avoid repeated database calls
  const [userNameCache, setUserNameCache] = useState({});

  const getRegisteredUserName = (address) => {
    // Return cached name if available
    if (userNameCache[address.toLowerCase()]) {
      return userNameCache[address.toLowerCase()];
    }

    // Return shortened address as fallback (will be updated asynchronously)
    const shortAddress = address.slice(0, 6) + '...' + address.slice(-4);

    // Fetch from database asynchronously
    getUserProfile(address).then(result => {
      if (result.success && result.data && result.data.name) {
        setUserNameCache(prev => ({
          ...prev,
          [address.toLowerCase()]: result.data.name
        }));
      }
    }).catch(err => {
      console.error('Error fetching user name:', err);
    });

    return shortAddress;
  };

  if (!connected) {
    return (
      <div className="chat-layout">
        <SideNavigation />
        <div className="chat-container">
          <div className="connect-notice">
            <h2>Connect Your Wallet</h2>
            <p>Please connect your wallet to access chat.</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="chat-layout">
        <SideNavigation />
        <div className="chat-container">
          <div className="loading-state">
            <div className="loading-spinner">⏳</div>
            <h3>Loading chat...</h3>
          </div>
        </div>
      </div>
    );
  }

  if (!resource) {
    return (
      <div className="chat-layout">
        <SideNavigation />
        <div className="chat-container">
          <div className="error-state">
            <h2>Resource Not Found</h2>
            <p>The resource you're trying to chat about doesn't exist.</p>
            <button onClick={() => navigate('/resources')} className="btn-back">
              Back to Resources
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-layout">
      <SideNavigation />
      <div className="chat-container">
        {/* Header */}
        <div className="chat-header">
          <button onClick={() => navigate(-1)} className="back-button">
            <FaArrowLeft />
          </button>

          <div className="chat-header-info">
            <div className="chat-avatar">
              <FaUser />
            </div>
            <div className="chat-header-details">
              <h2 className="chat-person-name">
                {otherPersonName}
                {!isDonor && resource.isVerified && (
                  <MdVerified className="verified-icon" />
                )}
              </h2>
              <p className="chat-person-role">
                {isDonor ? 'Resource Claimer' : 'Resource Donor'}
              </p>
            </div>
          </div>
        </div>

        {/* Resource Info Banner */}
        <div className="chat-resource-banner">
          <div className="resource-banner-icon">
            <FaBox />
          </div>
          <div className="resource-banner-info">
            <h3>{resource.title}</h3>
            <div className="resource-banner-meta">
              <span>
                <FaMapMarkerAlt />
                {resource.location}
              </span>
              <span>{resource.category}</span>
              {claim?.isCompleted && (
                <span style={{ color: '#059669', fontWeight: 600 }}>
                  <FaCheckCircle style={{ marginRight: '4px' }} />
                  Completed
                </span>
              )}
              {claim?.isCancelled && (
                <span style={{ color: '#dc2626', fontWeight: 600 }}>
                  <FaBan style={{ marginRight: '4px' }} />
                  Cancelled
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {isDonor && !claim?.isCompleted && !claim?.isCancelled && claimIndex !== null && claimIndex !== -1 && (
              <button
                onClick={handleCompleteClaim}
                className="btn-complete-claim"
                disabled={completing || cancelling}
              >
                {completing ? 'Processing...' : '✓ Mark Complete'}
              </button>
            )}
            {!claim?.isCompleted && !claim?.isCancelled && claimIndex !== null && claimIndex !== -1 && (
              <button
                onClick={handleCancelClaim}
                className="btn-cancel-claim"
                disabled={completing || cancelling}
              >
                {cancelling ? 'Cancelling...' : (
                  <>
                    <FaTimes /> Cancel
                  </>
                )}
              </button>
            )}
            <button
              onClick={() => navigate(`/resources/${resourceId}`)}
              className="btn-view-resource-small"
            >
              View Resource
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="chat-messages">
          {messages.length === 0 ? (
            <div className="chat-empty-state">
              <div className="empty-chat-icon">💬</div>
              <h3>Start the Conversation</h3>
              <p>
                {isDonor
                  ? 'Coordinate pickup or delivery details with the claimer.'
                  : 'Arrange pickup or delivery details with the donor.'}
              </p>
              <div className="chat-suggestions">
                <strong>You can discuss:</strong>
                <ul>
                  <li>📍 Pickup location and time</li>
                  <li>🚚 Delivery arrangements</li>
                  <li>📞 Contact information</li>
                  <li>📦 Item condition and details</li>
                </ul>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => {
                const isMyMessage =
                  message.sender.toLowerCase() === account.toLowerCase();
                const senderName = getRegisteredUserName(message.sender);

                return (
                  <div
                    key={message.id}
                    className={`chat-message ${
                      isMyMessage ? 'my-message' : 'other-message'
                    }`}
                  >
                    {!isMyMessage && (
                      <div className="message-avatar">
                        <FaUser />
                      </div>
                    )}
                    <div className="message-content">
                      {!isMyMessage && (
                        <div className="message-sender-name">{senderName}</div>
                      )}
                      <div className="message-bubble">
                        <p>{message.text}</p>
                      </div>
                      <div className="message-time">{message.timeDisplay}</div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Message Input - Full Width at Bottom */}
        <div className="chat-input-container">
          <form onSubmit={handleSendMessage} className="chat-input-form">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
              placeholder="Type a message... (Shift+Enter for new line)"
              className="chat-input"
              maxLength={500}
              rows={1}
            />
            <button
              type="submit"
              className="btn-send"
              disabled={!newMessage.trim()}
            >
              <FaPaperPlane />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
