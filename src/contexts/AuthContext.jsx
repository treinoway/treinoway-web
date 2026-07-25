import { createContext, useContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import api from '../api/axios';
import { translateError } from '../i18n';
import { setSentryUser } from '../lib/sentry';
import { clearOnboardingSessionState } from '../hooks/useOnboardingStatus';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

function loadStoredToken() {
  try {
    return localStorage.getItem('accessToken') || null;
  } catch {
    return null;
  }
}

function loadStoredUser() {
  try {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function extractAuthData(data) {
  // API format: { token: { accessToken: "..." }, refreshToken: "..." }
  // Based on Postman collection: jsonData.token.accessToken and jsonData.refreshToken
  
  // Handle case where data might be a string (shouldn't happen with Axios, but safety check)
  let parsedData = data;
  if (typeof data === 'string') {
    // Check if it's HTML (common when API URL is wrong and returns frontend HTML)
    if (data.trim().startsWith('<!DOCTYPE') || data.trim().startsWith('<html')) {
      console.error('[Auth] Received HTML instead of JSON. This usually means the API URL is incorrect or pointing to the frontend.');
      console.error('[Auth] Check VITE_API_BASE_URL environment variable.');
      console.error('[Auth] Current BASE_URL:', import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000');
      return { token: null, refresh: null, userData: null };
    }
    
    try {
      parsedData = JSON.parse(data);
    } catch (e) {
      console.error('[Auth] Failed to parse response as JSON:', e);
      console.error('[Auth] Response preview:', data.substring(0, 200));
      return { token: null, refresh: null, userData: null };
    }
  }

  // Ensure it's an object
  if (!parsedData || typeof parsedData !== 'object' || Array.isArray(parsedData)) {
    console.error('[Auth] Invalid response format. Expected object, got:', typeof parsedData);
    console.error('[Auth] Response:', parsedData);
    return { token: null, refresh: null, userData: null };
  }

  // Access token: data.token.accessToken
  const token = parsedData.token?.accessToken ?? null;

  // Refresh token: data.refreshToken (top level, not nested)
  const refresh = parsedData.refreshToken ?? null;

  // User data (if present)
  const userData = parsedData.user ?? null;

  if (!token) {
    console.error('[Auth] No access token in API response. Expected format: { token: { accessToken: "..." }, refreshToken: "..." }');
    console.error('[Auth] Response type:', typeof parsedData);
    console.error('[Auth] Response keys:', Object.keys(parsedData));
    console.error('[Auth] Full response:', parsedData);
  }

  return { token, refresh, userData };
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(loadStoredUser);
  const [accessToken, setAccessToken] = useState(loadStoredToken);

  // Shared post-authentication sequence used by login, signup, loginWithGoogle,
  // and resetPassword: persist tokens, clear stale per-user session state,
  // fetch the current user, then batch the state updates into one render.
  const establishSession = async (responseData) => {
    const { token, refresh } = extractAuthData(responseData);

    if (!token) {
      return { success: false, error: 'Resposta da API sem token de acesso.' };
    }

    // Save token to localStorage early so the interceptor can use it for /me
    localStorage.setItem('accessToken', token);
    if (refresh) localStorage.setItem('refreshToken', refresh);

    // Clear per-user session state before fetching /me so optimistic flags
    // from a previous account don't bleed into the new session.
    clearOnboardingSessionState();

    // Fetch user data from /me
    const meResponse = await api.get('/me?include=address,socials');
    const userData = meResponse.data;

    localStorage.setItem('user', JSON.stringify(userData));
    // Batch setUser and setAccessToken together so React renders once with
    // both isAuthenticated=true and user already populated (prevents flash).
    setUser(userData);
    setAccessToken(token);

    // Return the fresh user so callers can route by `betaAccess` immediately,
    // without waiting for a re-render (prevents the beta-gate redirect flash).
    return { success: true, user: userData };
  };

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      return await establishSession(response.data);
    } catch (error) {
      return {
        success: false,
        error: translateError(error, 'Falha ao entrar.'),
      };
    }
  };

  const signup = async (email, password) => {
    try {
      const response = await api.post('/auth/signup', { email, password });
      return await establishSession(response.data);
    } catch (error) {
      return {
        success: false,
        error: translateError(error, 'Não foi possível criar a conta. Verifique os dados e tente novamente.'),
      };
    }
  };

  const loginWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();

      // Firebase session is not needed — backend manages auth via JWT
      await signOut(auth);

      const response = await api.post('/auth/google/web', { idToken });
      return await establishSession(response.data);
    } catch (error) {
      // Firebase popup closed by user
      if (error.code === 'auth/popup-closed-by-user') {
        return { success: false, error: null };
      }
      return {
        success: false,
        error: translateError(error, 'Falha na autenticação com Google.'),
      };
    }
  };

  const forgotPassword = async (email) => {
    try {
      await api.post('/auth/forgot-password', { email });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: translateError(error, 'Não foi possível enviar o código. Tente novamente mais tarde.'),
      };
    }
  };

  const resetPassword = async (token, password, passwordConfirmation) => {
    try {
      const response = await api.post('/auth/reset-password', {
        token,
        password,
        passwordConfirmation,
      });
      return await establishSession(response.data);
    } catch (error) {
      return {
        success: false,
        error: translateError(error, 'Não foi possível redefinir a senha.'),
      };
    }
  };

  const logout = () => {
    setAccessToken(null);
    setUser(null);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    clearOnboardingSessionState();
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const refreshUser = async () => {
    try {
      const response = await api.get('/me?include=address,socials');
      const userData = response.data;
      updateUser(userData);
      return userData;
    } catch (error) {
      console.error('Failed to refresh user:', error);
      return null;
    }
  };

  const hasRole = (role) => {
    if (!user?.roles || !Array.isArray(user.roles)) return false;
    // Case-insensitive comparison
    return user.roles.some(r => r.toUpperCase() === role.toUpperCase());
  };

  const updateTokens = (newAccessToken, newRefreshToken) => {
    if (newAccessToken) {
      localStorage.setItem('accessToken', newAccessToken);
      setAccessToken(newAccessToken);
    }
    if (newRefreshToken) {
      localStorage.setItem('refreshToken', newRefreshToken);
    }
  };

  // Bootstrap-admin grant: server returns refreshed user + rotated tokens.
  // Errors propagate so the caller can surface `error.userMessage`.
  const grantAdmin = async () => {
    const response = await api.post('/me/grant-admin');
    const updatedUser = response.data?.user ?? null;
    const newAccessToken = response.data?.token?.accessToken ?? null;
    const newRefreshToken = response.data?.refreshToken ?? null;

    if (updatedUser) {
      updateUser(updatedUser);
    }
    if (newAccessToken || newRefreshToken) {
      updateTokens(newAccessToken, newRefreshToken);
    }

    return response.data;
  };

  // Keep Sentry's user scope in sync (id only — never email/PII).
  // Covers login, signup, Google, localStorage bootstrap, and logout in one place.
  useEffect(() => {
    setSentryUser(user?.id ?? null);
  }, [user]);

  // Keep React state in sync when axios interceptor refreshes the token
  useEffect(() => {
    const handleTokensRefreshed = (e) => {
      const { newAccessToken, newRefreshToken } = e.detail || {};
      updateTokens(newAccessToken, newRefreshToken);
    };
    window.addEventListener('treinoway:tokensRefreshed', handleTokensRefreshed);
    return () => window.removeEventListener('treinoway:tokensRefreshed', handleTokensRefreshed);
  }, []);

  const isAdmin = Array.isArray(user?.roles)
    && user.roles.some((r) => typeof r === 'string' && r.toLowerCase() === 'admin');

  const value = {
    user,
    accessToken,
    login,
    loginWithGoogle,
    signup,
    forgotPassword,
    resetPassword,
    logout,
    updateUser,
    updateTokens,
    refreshUser,
    grantAdmin,
    hasRole,
    isAdmin,
    isAuthenticated: !!accessToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
