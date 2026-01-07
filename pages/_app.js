import '../styles/App.css';
import '../styles/HomePage.css';
import '../styles/CampaignsPage.css';
import '../styles/CampaignDetailsPage.css';
import '../styles/CreateCampaignPage.css';
import '../styles/Navigation.css';
import '../styles/SideNavigation.css';
import '../styles/DashboardPage.css';
import '../styles/AuthPages.css';
import '../styles/ResourcesPage.css';
import '../styles/AddResourcePage.css';
import '../styles/BlockchainPage.css';
import '../styles/ProfilePage.css';
import '../styles/ProfileRegistrationPage.css';
import '../styles/ResourceDetailsPage.css';
import '../styles/MyClaimsPage.css';
import '../styles/MyDonationsPage.css';
import '../styles/ChatPage.css';
import '../styles/WalletProfileModal.css';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the providers wrapper to avoid SSR issues
const ProvidersWrapper = dynamic(
  () => import('../components/ProvidersWrapper'),
  { ssr: false }
);

export default function MyApp({ Component, pageProps }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render anything on server side
  if (!mounted) {
    return null;
  }

  return (
    <ProvidersWrapper>
      <Component {...pageProps} />
    </ProvidersWrapper>
  );
}
