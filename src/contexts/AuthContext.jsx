import { createContext, useContext, useState } from 'react';
import api from '../api/axios';
import { getErrorMessage } from '../utils/errorMessages';

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

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });

      const { token, refresh } = extractAuthData(response.data);

      if (!token) {
        return { success: false, error: 'Resposta da API sem token de acesso.' };
      }

      // Save tokens first
      localStorage.setItem('accessToken', token);
      if (refresh) localStorage.setItem('refreshToken', refresh);
      setAccessToken(token);

      // Fetch user data from /me
      const meResponse = await api.get('/me?include=address,socials');
      const userData = meResponse.data;
      
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.status === 401
          ? 'E-mail ou senha incorretos.'
          : getErrorMessage(error, 'Falha ao entrar.'),
      };
    }
  };

  const signup = async (email, password) => {
    try {
      const response = await api.post('/auth/signup', { email, password });

      const { token, refresh } = extractAuthData(response.data);

      if (!token) {
        return { success: false, error: 'Resposta da API sem token de acesso.' };
      }

      // Save tokens first
      localStorage.setItem('accessToken', token);
      if (refresh) localStorage.setItem('refreshToken', refresh);
      setAccessToken(token);

      // Fetch user data from /me
      const meResponse = await api.get('/me?include=address,socials');
      const userData = meResponse.data;

      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, 'Não foi possível criar a conta. Verifique os dados e tente novamente.'),
      };
    }
  };

  const logout = () => {
    setAccessToken(null);
    setUser(null);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
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

  const value = {
    user,
    accessToken,
    login,
    signup,
    logout,
    updateUser,
    updateTokens,
    refreshUser,
    hasRole,
    isAuthenticated: !!accessToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
