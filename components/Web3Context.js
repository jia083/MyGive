import React, { createContext, useContext } from 'react';
import { useAccount, useDisconnect, useChainId } from 'wagmi';

const Web3Context = createContext(null);

// Default values for SSR
const defaultValue = {
  account: null,
  connected: false,
  connecting: false,
  chainId: null,
  disconnect: () => {},
  shortenAddress: (addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  },
};

export const Web3Provider = ({ children }) => {
  const { address, isConnected, isConnecting } = useAccount();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();

  const value = {
    // Account state
    account: address,
    connected: isConnected,
    connecting: isConnecting,
    chainId,

    // Actions
    disconnect,

    // Helper methods
    shortenAddress: (addr) => {
      if (!addr) return '';
      return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    },
  };

  return (
    <Web3Context.Provider value={value}>
      {children}
    </Web3Context.Provider>
  );
};

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  // Return default values during SSR instead of throwing
  if (!context) {
    return defaultValue;
  }
  return context;
};
