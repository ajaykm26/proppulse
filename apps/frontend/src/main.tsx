import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App';
import './index.css';

// Clerk publishable key — set via VITE_CLERK_PUBLISHABLE_KEY in .env
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;

if (!PUBLISHABLE_KEY) {
  console.warn(
    '[clerk] VITE_CLERK_PUBLISHABLE_KEY is not set. Auth features will not work.\n' +
    'Add it to apps/frontend/.env',
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY ?? 'pk_test_placeholder'}>
      <App />
    </ClerkProvider>
  </React.StrictMode>,
);
