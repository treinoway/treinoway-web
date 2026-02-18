import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// Debug: Log the base URL being used (always log in production to help debug)
console.log('[API] Base URL:', BASE_URL);
console.log('[API] Env var:', import.meta.env.VITE_API_BASE_URL);

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
        originalRequest.url?.includes('/auth/signup')) {
      return Promise.reject(error);
    }

    // If 401 and we haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        // No refresh token, redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        // Try to refresh the token
        // Use axios directly to avoid circular interceptor calls
        const response = await axios.post(`${BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        // Handle nested token format: { token: { accessToken: "..." } }
        const newAccessToken = response.data.token?.accessToken || response.data.accessToken;
        const newRefreshToken = response.data.refreshToken;

        // Save new tokens
        localStorage.setItem('accessToken', newAccessToken);
        if (newRefreshToken) {
          localStorage.setItem('refreshToken', newRefreshToken);
        }

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, logout
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
