import React from 'react';
import dynamic from 'next/dynamic';

// Import App with no SSR since it uses React Router which needs browser APIs
const App = dynamic(() => import('./App'), {
  ssr: false,
});

export default function Home() {
  return <App />;
}
