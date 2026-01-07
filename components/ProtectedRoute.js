import React from 'react';
import { Navigate } from 'react-router-dom';
import { useWeb3 } from './Web3Context';

/**
 * Protected Route component that requires wallet connection
 * Redirects to homepage if wallet is not connected
 */
const ProtectedRoute = ({ children }) => {
  const { connected } = useWeb3();

  if (!connected) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
