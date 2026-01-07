import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet, sepolia } from 'wagmi/chains';

// RainbowKit configuration
export const config = getDefaultConfig({
  appName: 'MyGive - Blockchain Crowdfunding',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  chains: [sepolia, mainnet],
  ssr: true, // Enable SSR for Next.js
});

// Contract addresses
export const CONTRACTS = {
  crowdfunding: {
    sepolia: '0x6D0fD8bae61659a503cbAAa7E603E8bb39ca66Ab',
  },
  resourceSharing: {
    sepolia: '0x2e583Ac72Bc4A8f9C9C1Ad8f1398F54Ca05aDc13',
  },
};
