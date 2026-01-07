import React, { createContext, useContext } from 'react';
import { useNotifications } from '../hooks/useNotifications';
import { useWeb3 } from './Web3Context';

const NotificationContext = createContext(null);

// Default values for SSR
const defaultValue = {
  notifications: [],
  unreadCount: 0,
  addNotification: () => {},
  markAsRead: () => {},
  markAllAsRead: () => {},
  deleteNotification: () => {},
  clearAllNotifications: () => {},
};

export const useNotificationContext = () => {
  const context = useContext(NotificationContext);
  // Return default values during SSR instead of throwing
  if (!context) {
    return defaultValue;
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { account } = useWeb3();
  const notificationHook = useNotifications(account);

  return (
    <NotificationContext.Provider value={notificationHook}>
      {children}
    </NotificationContext.Provider>
  );
};
