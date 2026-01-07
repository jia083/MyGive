import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';

// RainbowKit & Wagmi imports
import '@rainbow-me/rainbowkit/styles.css';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from '../config/wagmi';

// Import pages
import ProfileRegistrationPage from './ProfileRegistrationPage';
import DashboardPage from './DashboardPage';
import CampaignsPage from './CampaignsPage';
import CampaignDetailsPage from './CampaignDetailsPage';
import CreateCampaignPage from './CreateCampaignPage';
import ResourcesPage from './ResourcesPage';
import AddResourcePage from './AddResourcePage';
import ResourceDetailsPage from './ResourceDetailsPage';
import MyClaimsPage from './MyClaimsPage';
import MyDonationsPage from './MyDonationsPage';
import ChatPage from './ChatPage';
import ProfilePage from './ProfilePage';

// Import context providers and components
import HomePage from '../components/HomePage';
import { AuthProvider } from '../components/AuthContext';
import { Web3Provider } from '../components/Web3Context';
import { NotificationProvider } from '../components/NotificationContext';
import WalletProfileModal from '../components/WalletProfileModal';
import ProtectedRoute from '../components/ProtectedRoute';

// Create a client for React Query
const queryClient = new QueryClient();

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: '#10B981',
            accentColorForeground: 'white',
            borderRadius: 'medium',
            fontStack: 'system',
          })}
        >
          <AuthProvider>
            <Web3Provider>
              <NotificationProvider>
                <Router>
                  <div className="App">
                    {/* Global Wallet Profile Modal */}
                    <WalletProfileModal />

                  <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<HomePage />} />
                    <Route path="/register-profile" element={<ProfileRegistrationPage />} />

                    {/* Protected Routes */}
                    <Route
                      path="/dashboard"
                      element={
                        <ProtectedRoute>
                          <DashboardPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/campaigns"
                      element={<CampaignsPage />}
                    />
                    <Route
                      path="/campaigns/create"
                      element={
                        <ProtectedRoute>
                          <CreateCampaignPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/campaigns/:id"
                      element={<CampaignDetailsPage />}
                    />
                    <Route
                      path="/resources"
                      element={
                        <ProtectedRoute>
                          <ResourcesPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/resources/add"
                      element={
                        <ProtectedRoute>
                          <AddResourcePage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/resources/:id"
                      element={
                        <ProtectedRoute>
                          <ResourceDetailsPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/my-claims"
                      element={
                        <ProtectedRoute>
                          <MyClaimsPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/my-donations"
                      element={
                        <ProtectedRoute>
                          <MyDonationsPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/chat/:resourceId/:claimId"
                      element={
                        <ProtectedRoute>
                          <ChatPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/profile"
                      element={
                        <ProtectedRoute>
                          <ProfilePage />
                        </ProtectedRoute>
                      }
                    />
                  </Routes>
                </div>
              </Router>
            </NotificationProvider>
            </Web3Provider>
          </AuthProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;
