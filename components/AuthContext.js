import React, { createContext, useContext } from 'react';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  // Return empty object during SSR instead of throwing
  if (!context) {
    return {};
  }
  return context;
};

/**
 * Simplified AuthProvider - Authentication is now handled entirely by Web3Context
 * This context is kept for backward compatibility but all auth logic uses wallet connection
 */
export const AuthProvider = ({ children }) => {
  // AuthContext is now a placeholder - all authentication uses Web3Context
  // Kept to prevent breaking existing imports
  const value = {};

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};