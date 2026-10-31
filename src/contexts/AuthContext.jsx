import { createContext, useContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import api from '../api/axios';
import API_BASE_URL from '../api/baseUrl';
import { translateError } from '../i18n';
import { setSentryUser } from '../lib/sentry';
import { clearOnboardingSessionState } from '../hooks/useOnboardingStatus';
import { clearTrainerCaches } from '../utils/trainerCaches';
import { GOOGLE_POPUP_CANCEL_CODES } from '../constants/googleAuth';
import { NATIVE_AUTH_CANCELLED, NATIVE_AUTH_UNAVAILABLE, NATIVE_AUTH_UNAVAILABLE_MESSAGE } from '../constants/nativeAuth';
import { isNative, nativeAuth } from '../platform';
import { unregisterDevice } from '../utils/deviceRegistration';
import { discardLocalPushToken } from '../utils/pushToken';
import { bumpSessionGeneration, clearStoredSession, currentSessionGeneration, readWebSession, restoreStoredSession, writeSessionValue } from '../utils/sessionStore';

const AuthContext = createContext(null);

// The shared provider is a module singleton — never mutate it with a
// per-call hint, or the hint would leak into later unrelated sign-ins.
const buildGoogleProvider = (loginHint) => {
  if (!loginHint) return googleProvider;
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ login_hint: loginHint });
  return provider;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// Initial session state: synchronous from localStorage on the website, empty until the secure store is read in the native app.
function initialSession() {
  return isNative() ? { accessToken: null, user: null } : readWebSession();
}

// Maps a failed native sign-in to the result shape the login screens read.
function nativeSignInFailure(error, fallbackMessage) {
  if (error?.code === NATIVE_AUTH_CANCELLED) return { success: false, error: null };
  if (error?.code === NATIVE_AUTH_UNAVAILABLE) return { success: false, error: NATIVE_AUTH_UNAVAILABLE_MESSAGE };
  return { success: false, error: translateError(error, fallbackMessage) };
}

// Gives the session cleanup at most this long to remove the push device before logout continues.
const DEVICE_REMOVAL_TIMEOUT_MS = 3000;

// Removes the push device on the server, giving up (and aborting the request) after the timeout so logout never hangs offline.
const removeDeviceWithTimeout = async () => {
  const controller = new AbortController();
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => {
      controller.abort();
      resolve();
    }, DEVICE_REMOVAL_TIMEOUT_MS);
  });
  try {
    await Promise.race([unregisterDevice({ signal: controller.signal }), timeout]);
  } finally {
    clearTimeout(timer);
  }
};

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
      console.error('[Auth] Current BASE_URL:', API_BASE_URL || '(empty — same origin)');
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
  const [initial] = useState(initialSession);
  const [user, setUser] = useState(initial.user);
  const [accessToken, setAccessToken] = useState(initial.accessToken);
  const [isRestoring, setIsRestoring] = useState(isNative);

  // why: the Keychain/Keystore is async, so the native session is restored before any screen decides who is signed in.
  useEffect(() => {
    if (!isNative()) return undefined;
    let cancelled = false;
    restoreStoredSession().then((stored) => {
      if (cancelled) return;
      setUser(stored.user);
      setAccessToken(stored.accessToken && stored.user ? stored.accessToken : null);
      setIsRestoring(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Shared post-authentication sequence used by login, verifySignup, loginWithGoogle,
  // and resetPassword: persist tokens, clear stale per-user session state,
  // fetch the current user, then batch the state updates into one render.
  // `userPatch` lets a caller force fields the auth response itself proves
  // (e.g. betaAccess after an invite signup) in the same render as the token.
  const establishSession = async (responseData, userPatch = null) => {
    const { token, refresh } = extractAuthData(responseData);

    if (!token) {
      return { success: false, error: 'Resposta da API sem token de acesso.' };
    }

    // Persist the token early so the interceptor can use it for /me
    bumpSessionGeneration();
    // why: the refresh token is written first, so a crash between the writes never leaves a new access token with an old refresh token.
    if (refresh) await writeSessionValue('refreshToken', refresh);
    await writeSessionValue('accessToken', token);

    // Clear per-user session state before fetching /me so optimistic flags
    // from a previous account don't bleed into the new session.
    clearOnboardingSessionState();

    // Fetch user data from /me
    const meResponse = await api.get('/me?include=address,socials');
    const userData = userPatch ? { ...meResponse.data, ...userPatch } : meResponse.data;

    await writeSessionValue('user', JSON.stringify(userData));
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

  // Signup never authenticates: the backend always answers 202 (anti-enumeration)
  // and the account is only created by verifySignup once the code is confirmed.
  const signup = async (email, password) => {
    try {
      await api.post('/auth/signup', { email, password });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: translateError(error, 'Não foi possível criar a conta. Verifique os dados e tente novamente.'),
      };
    }
  };

  // The password travels again here because the backend does not keep it on the
  // pending signup — whoever proves the inbox chooses the account password.
  const verifySignup = async (email, code, password) => {
    try {
      const response = await api.post('/auth/signup/verify', { email, code, password });
      const session = await establishSession(response.data);
      return { ...session, linkedTrainers: response.data?.linkedTrainers ?? 0 };
    } catch (error) {
      return {
        success: false,
        error: translateError(error, 'Não foi possível confirmar o código. Tente novamente.'),
        messageCode: error.errorInfo?.messageCode ?? null,
      };
    }
  };

  // One-step trainer signup from a beta invite: the email comes from the invite,
  // so there is no verification code. A 201 already means the invite was
  // accepted, so betaAccess is trusted locally instead of a possibly-stale /me.
  const signupWithInvite = async (code, password) => {
    try {
      const response = await api.post('/auth/signup/invite', { code, password });
      const session = await establishSession(response.data, { betaAccess: true });
      return { ...session, linkedTrainers: response.data?.linkedTrainers ?? 0 };
    } catch (error) {
      return {
        success: false,
        error: translateError(error, 'Não foi possível criar a conta. Tente novamente.'),
        messageCode: error.errorInfo?.messageCode ?? null,
        details: error.errorInfo?.details ?? null,
      };
    }
  };

  const resendSignupCode = async (email) => {
    try {
      await api.post('/auth/signup/resend', { email });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: translateError(error, 'Não foi possível reenviar o código. Tente novamente.'),
      };
    }
  };

  const loginWithNativeProvider = async ({ signIn, endpoint, fallbackMessage }) => {
    try {
      const credentials = await signIn();
      const response = await api.post(endpoint, credentials);
      return await establishSession(response.data);
    } catch (error) {
      return nativeSignInFailure(error, fallbackMessage);
    }
  };

  const loginWithGoogle = async ({ loginHint, onPopupResolved } = {}) => {
    if (isNative()) {
      return loginWithNativeProvider({
        signIn: nativeAuth.signInWithGoogle,
        endpoint: '/auth/google/mobile',
        fallbackMessage: 'Falha na autenticação com Google.',
      });
    }
    try {
      const result = await signInWithPopup(auth, buildGoogleProvider(loginHint));
      onPopupResolved?.();
      const idToken = await result.user.getIdToken();

      // Firebase session is not needed — backend manages auth via JWT
      await signOut(auth);

      const response = await api.post('/auth/google/web', { idToken });
      return await establishSession(response.data);
    } catch (error) {
      if (GOOGLE_POPUP_CANCEL_CODES.has(error.code)) {
        return { success: false, error: null };
      }
      return {
        success: false,
        error: translateError(error, 'Falha na autenticação com Google.'),
      };
    }
  };

  const loginWithApple = () => loginWithNativeProvider({
    signIn: nativeAuth.signInWithApple,
    endpoint: '/auth/apple/mobile',
    fallbackMessage: 'Falha na autenticação com Apple.',
  });

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

  const resetPassword = async ({ email, code, password, passwordConfirmation }) => {
    try {
      const response = await api.post('/auth/reset-password', {
        email,
        code,
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

  const clearSession = () => {
    setAccessToken(null);
    setUser(null);
    clearOnboardingSessionState();
    clearTrainerCaches();
  };

  // why: in the native app the push device is removed before the tokens are cleared, while the token is still valid.
  const logout = async ({ skipDeviceRemoval = false } = {}) => {
    if (isNative() && !skipDeviceRemoval) await removeDeviceWithTimeout();
    discardLocalPushToken();
    const storedSessionCleared = clearStoredSession();
    clearSession();
    await storedSessionCleared;
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    writeSessionValue('user', JSON.stringify(updatedUser));
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

  const updateTokens = (newAccessToken, newRefreshToken, generation = currentSessionGeneration()) => {
    if (generation !== currentSessionGeneration()) return;
    if (newRefreshToken) {
      writeSessionValue('refreshToken', newRefreshToken, generation);
    }
    if (newAccessToken) {
      writeSessionValue('accessToken', newAccessToken, generation);
      setAccessToken(newAccessToken);
    }
  };

  // Keep Sentry's user scope in sync (id only — never email/PII).
  // Covers login, signup, Google, localStorage bootstrap, and logout in one place.
  useEffect(() => {
    setSentryUser(user?.id ?? null);
  }, [user]);

  // Keep React state in sync when axios interceptor refreshes the token
  useEffect(() => {
    const handleTokensRefreshed = (e) => {
      const { newAccessToken, newRefreshToken, generation } = e.detail || {};
      updateTokens(newAccessToken, newRefreshToken, generation);
    };
    window.addEventListener('treinoway:tokensRefreshed', handleTokensRefreshed);
    return () => window.removeEventListener('treinoway:tokensRefreshed', handleTokensRefreshed);
  }, []);

  // why: the axios layer cannot reload the native WebView, so it announces an ended session and the provider signs out.
  useEffect(() => {
    const handleSessionExpired = () => {
      discardLocalPushToken();
      clearSession();
    };
    window.addEventListener('treinoway:sessionExpired', handleSessionExpired);
    return () => window.removeEventListener('treinoway:sessionExpired', handleSessionExpired);
  }, []);

  const isAdmin = Array.isArray(user?.roles)
    && user.roles.some((r) => typeof r === 'string' && r.toLowerCase() === 'admin');

  const value = {
    user,
    accessToken,
    login,
    loginWithGoogle,
    loginWithApple,
    signup,
    verifySignup,
    signupWithInvite,
    resendSignupCode,
    forgotPassword,
    resetPassword,
    logout,
    updateUser,
    updateTokens,
    refreshUser,
    hasRole,
    isAdmin,
    isAuthenticated: !!accessToken,
    isRestoring,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
