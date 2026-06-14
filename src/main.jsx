import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { initSentry } from './lib/sentry';
import App from './App.jsx';

// Errors-only Sentry. No-op when VITE_SENTRY_DSN is unset (local/dev).
initSentry();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
