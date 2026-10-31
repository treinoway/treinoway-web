import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { initSentry } from './lib/sentry';
import App from './App.jsx';
import { clearSecureSessionOnFreshInstall } from './utils/installMarker';

// why: MODE is replaced at build time, so the website bundle drops this import and keeps loading Nunito Sans from Google Fonts.
if (import.meta.env.MODE === 'app') {
  import('./native/fonts.css');
}

// Errors-only Sentry. No-op when VITE_SENTRY_DSN is unset (local/dev).
initSentry();

// why: leftover Keychain keys of a previous install must be gone before AuthProvider restores the session.
clearSecureSessionOnFreshInstall().finally(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
});
