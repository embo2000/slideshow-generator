import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import PhotoIntakePage from './components/PhotoIntakePage.tsx';
import ShareTargetPage from './components/ShareTargetPage.tsx';
import TermsPage from './components/TermsPage.tsx';
import PrivacyPolicyPage from './components/PrivacyPolicyPage.tsx';
import { DialogProvider } from './components/ui/DialogProvider.tsx';
import { registerSW } from 'virtual:pwa-register';
import './index.css';

registerSW({ immediate: true });

const path = window.location.pathname;
const intakeMatch = path.match(/^\/intake\/([^/]+)$/);
const isShareTargetPath = path === '/share-target';
const isTermsPath = path === '/terms';
const isPrivacyPath = path === '/privacy' || path === '/privacy-policy';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DialogProvider>
      {isTermsPath ? (
        <TermsPage />
      ) : isPrivacyPath ? (
        <PrivacyPolicyPage />
      ) : isShareTargetPath ? (
        <ShareTargetPage />
      ) : intakeMatch ? (
        <PhotoIntakePage token={decodeURIComponent(intakeMatch[1])} />
      ) : (
        <App />
      )}
    </DialogProvider>
  </StrictMode>
);
