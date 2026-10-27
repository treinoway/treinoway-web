import axios from 'axios';
import { getErrorMessage } from '../utils/errorMessages';
import { extractErrorInfo } from '../i18n';
import { getDeviceTimezone } from '../utils/timezone';
import { reportApiError } from '../lib/sentry';
import API_BASE_URL from './baseUrl';

const BASE_URL = API_BASE_URL;

// Feature flag — flip to false to stop sending the timezone header without redeploy if needed.
// TODO(student-timezone): replace trainer-device tz with student.timezone when capture path lands.
const SEND_TIMEZONE_HEADER = true;

// Event emitter for network errors (bridges Axios → React toast)
const errorListeners = new Set();
export const onNetworkError = (callback) => {
  errorListeners.add(callback);
  return () => errorListeners.delete(callback);
};
const emitNetworkError = (message) => {
  errorListeners.forEach(cb => cb(message));
};

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach access token
api.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Request interceptor to attach the device timezone (resolved per-request, never cached).
// Guarded on the same auth source the Authorization interceptor uses, so it never leaks
// on logged-out requests. baseURL guard prevents leaking to any future third-party Axios
// instance that might share this module by accident.
api.interceptors.request.use(
  (config) => {
    if (!SEND_TIMEZONE_HEADER) return config;

    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) return config;

    const requestBaseURL = config.baseURL || api.defaults.baseURL;
    if (requestBaseURL !== BASE_URL) return config;

    const timezone = getDeviceTimezone();
    if (timezone === null) {
      // Defensive: scrub any stale header carried over from a prior attempt (401-retry path).
      delete config.headers['app-timezone'];
      return config;
    }

    config.headers['app-timezone'] = timezone;

    if (import.meta.env.DEV) {
      console.debug(`[tz] ${timezone} (Intl.DateTimeFormat)`);
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Single in-flight refresh (token rotation: only one refresh token use at a time)
let refreshPromise = null;

// Drops the stored session and sends the user to the login screen.
export function clearAuthAndRedirect() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  window.location.href = '/login';
}

async function performRefresh() {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return null;
  const response = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
  const newAccessToken = response.data.token?.accessToken || response.data.accessToken;
  const newRefreshToken = response.data.refreshToken;
  localStorage.setItem('accessToken', newAccessToken);
  if (newRefreshToken) localStorage.setItem('refreshToken', newRefreshToken);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('treinoway:tokensRefreshed', {
      detail: { newAccessToken, newRefreshToken },
    }));
  }
  return newAccessToken;
}

// Refreshes the session one call at a time; shared by the 401 interceptor and non-axios callers (SSE).
export function refreshAccessToken() {
  if (!refreshPromise) {
    // why: the settled promise lingers for one tick so a 401 signed just before the rotation reuses it instead of burning the new refresh token.
    refreshPromise = performRefresh().finally(() => {
      setTimeout(() => {
        refreshPromise = null;
      }, 0);
    });
  }
  return refreshPromise;
}

// Response interceptor to handle token refresh and detect HTML responses
api.interceptors.response.use(
  (response) => {
    // Check if response is HTML (shouldn't happen, but helps debug API URL issues)
    if (typeof response.data === 'string' && (response.data.trim().startsWith('<!DOCTYPE') || response.data.trim().startsWith('<html'))) {
      console.error('[API] Received HTML response instead of JSON. This means the API URL is incorrect.');
      console.error('[API] Request URL:', response.config.url);
      console.error('[API] Base URL:', BASE_URL);
      console.error('[API] Full URL:', response.config.baseURL + response.config.url);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Don't intercept auth endpoints (login/signup)
    if (originalRequest.url?.includes('/auth/login') ||
        originalRequest.url?.includes('/auth/signup') ||
        originalRequest.url?.includes('/auth/google')) {
      error.userMessage = getErrorMessage(error);
      error.errorInfo = extractErrorInfo(error);
      return Promise.reject(error);
    }

    // If 401 and we haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        clearAuthAndRedirect();
        return Promise.reject(error);
      }

      try {
        // Only one refresh at a time; concurrent 401s wait for the same result (token rotation)
        const newAccessToken = await refreshAccessToken();

        if (!newAccessToken) {
          clearAuthAndRedirect();
          return Promise.reject(error);
        }

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        clearAuthAndRedirect();
        return Promise.reject(refreshError);
      }
    }

    // Attach user-friendly message and structured error info
    error.userMessage = getErrorMessage(error);
    error.errorInfo = extractErrorInfo(error);

    // Report only UNEXPECTED failures (5xx + network/transport) to Sentry.
    // Expected 4xx business/validation errors are skipped to avoid noise.
    // No-op when VITE_SENTRY_DSN is unset.
    reportApiError(error);

    // For network errors (no response), emit event for toast.
    // Skip cancelled requests (AbortController / axios cancel) — those are intentional.
    const isCancelled = error.code === 'ERR_CANCELED'
      || error.name === 'CanceledError'
      || error.name === 'AbortError';
    if (!error.response && !isCancelled) {
      emitNetworkError(error.userMessage);
    }

    return Promise.reject(error);
  }
);

export default api;
