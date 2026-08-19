import { captureAnomaly } from '../lib/sentry';

/**
 * Resolves the API base URL from `VITE_API_BASE_URL`.
 *
 * The localhost default is DEV-ONLY on purpose. A production/staging bundle
 * built without the variable used to fall back to `http://localhost:3000`
 * silently, so every request failed with an opaque network error and the real
 * cause (a missing env var on the deploy platform) was invisible.
 *
 * In a non-dev build a missing value now fails LOUDLY: `console.error` plus a
 * Sentry `error` event, and an empty base URL so requests hit the app's own
 * origin (visible 404s) instead of the developer's machine.
 */

export const DEV_API_BASE_URL = 'http://localhost:3000';

export const MISSING_API_BASE_URL_MESSAGE =
  'VITE_API_BASE_URL is missing in a production build — API requests will fail. Set it in the deploy platform env vars.';

export function resolveApiBaseUrl(env) {
  const raw = env?.VITE_API_BASE_URL;
  const configured = typeof raw === 'string' ? raw.trim() : '';

  if (configured) return configured;
  if (env?.DEV) return DEV_API_BASE_URL;

  console.error(`[config] ${MISSING_API_BASE_URL_MESSAGE}`);
  // Deferred: Sentry is initialised in main.jsx AFTER this module is evaluated,
  // so a synchronous capture here would be dropped.
  setTimeout(() => {
    captureAnomaly(MISSING_API_BASE_URL_MESSAGE, {
      level: 'error',
      tags: { anomaly: 'missing_api_base_url' },
      extra: { mode: env?.MODE ?? 'unknown' },
    });
  }, 0);

  return '';
}

const API_BASE_URL = resolveApiBaseUrl(import.meta.env);

export default API_BASE_URL;
