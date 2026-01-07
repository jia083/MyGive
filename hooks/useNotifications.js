import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for managing user notifications
 * Stores notifications in localStorage per wallet address
 */
export const useNotifications = (walletAddress) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load notifications from localStorage when wallet connects
  useEffect(() => {
    if (walletAddress) {
      const key = `notifications_${walletAddress}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setNotifications(parsed);
          setUnreadCount(parsed.filter(n => !n.read).length);
        } catch (error) {
          console.error('Error loading notifications:', error);
          setNotifications([]);
        }
      }
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [walletAddress]);

  // Save notifications to localStorage
  const saveNotifications = useCallback((newNotifications) => {
    if (walletAddress) {
      const key = `notifications_${walletAddress}`;
      localStorage.setItem(key, JSON.stringify(newNotifications));
      setNotifications(newNotifications);
      setUnreadCount(newNotifications.filter(n => !n.read).length);
    }
  }, [walletAddress]);

  // Add a new notification
  const addNotification = useCallback((notification) => {
    const newNotification = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      read: false,
      ...notification,
    };

    const updated = [newNotification, ...notifications].slice(0, 50); // Keep only last 50
    saveNotifications(updated);
  }, [notifications, saveNotifications]);

  // Mark notification as read
  const markAsRead = useCallback((notificationId) => {
    const updated = notifications.map(n =>
      n.id === notificationId ? { ...n, read: true } : n
    );
    saveNotifications(updated);
  }, [notifications, saveNotifications]);

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    saveNotifications(updated);
  }, [notifications, saveNotifications]);

  // Delete notification
  const deleteNotification = useCallback((notificationId) => {
    const updated = notifications.filter(n => n.id !== notificationId);
    saveNotifications(updated);
  }, [notifications, saveNotifications]);

  // Clear all notifications
  const clearAll = useCallback(() => {
    saveNotifications([]);
  }, [saveNotifications]);

  return {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  };
};
