import { createContext, useContext, useState } from 'react';
import api from '../api/axios';

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
  // Handle nested token format: { token: { accessToken: "..." } }
  const token = data.token?.accessToken || data.accessToken || data.access_token;
  const refresh = data.refreshToken || data.refresh_token;
  const userData = data.user || null;

  if (!token) {
    console.error('[Auth] Nenhum token encontrado na resposta da API. Campos recebidos:', Object.keys(data));
    console.error('[Auth] Resposta completa:', data);
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
        return { success: false, error: 'Resposta da API sem token de acesso' };
      }

      // Save tokens first
      localStorage.setItem('accessToken', token);
      if (refresh) localStorage.setItem('refreshToken', refresh);
      setAccessToken(token);

      // Fetch user data from /me
      const meResponse = await api.get('/me');
      const userData = meResponse.data;
      
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Falha ao entrar',
      };
    }
  };

  const signup = async (email, password) => {
    try {
      const response = await api.post('/auth/signup', { email, password });
      const { token, refresh } = extractAuthData(response.data);

      if (!token) {
        return { success: false, error: 'Resposta da API sem token de acesso' };
      }

      // Save tokens first
      localStorage.setItem('accessToken', token);
      if (refresh) localStorage.setItem('refreshToken', refresh);
      setAccessToken(token);

      // Fetch user data from /me
      const meResponse = await api.get('/me');
      const userData = meResponse.data;
      
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Falha ao cadastrar',
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
      const response = await api.get('/me');
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
