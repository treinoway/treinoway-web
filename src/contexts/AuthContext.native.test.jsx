import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../test/test-utils';
import { AuthProvider, useAuth } from './AuthContext';

// Hoisted so the vi.mock factories below can reference these fakes.
const { fakeSecureStore, platform } = vi.hoisted(() => {
  const store = new Map();
  return {
    fakeSecureStore: store,
    platform: {
      isNative: vi.fn(),
      getPlatform: vi.fn(),
      getAppInfo: vi.fn(),
      secureStorage: {
        getItem: vi.fn(async (key) => (store.has(key) ? store.get(key) : null)),
        setItem: vi.fn(async (key, value) => { store.set(key, value); }),
        removeItem: vi.fn(async (key) => { store.delete(key); }),
      },
      nativeAuth: { signInWithGoogle: vi.fn(), signInWithApple: vi.fn() },
      push: { requestPermission: vi.fn(), getToken: vi.fn(), onNotificationOpened: vi.fn() },
    },
  };
});

vi.mock('../platform', () => platform);
vi.mock('../utils/deviceRegistration', () => ({
  registerDevice: vi.fn(),
  unregisterDevice: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../firebase', () => ({ auth: {}, googleProvider: {} }));
vi.mock('firebase/auth', () => ({
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  GoogleAuthProvider: vi.fn(),
}));
vi.mock('../api/axios', () => ({
  default: { post: vi.fn(), get: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));
vi.mock('../i18n', () => ({
  translateError: vi.fn((error, fallback) => error?.userMessage || fallback),
}));

import api from '../api/axios';
import { signInWithPopup } from 'firebase/auth';
import { unregisterDevice } from '../utils/deviceRegistration';

const TRAINER_USER = {
  id: 'user-1',
  email: 'trainer@example.com',
  roles: ['TRAINER'],
  firstName: 'Trainer',
  lastName: 'User',
};

const AUTH_RESPONSE = {
  data: {
    token: { accessToken: 'access-token-123' },
    refreshToken: 'refresh-token-abc',
  },
};

// Everything the app wrote to localStorage, as one searchable string.
const localStorageDump = () => JSON.stringify(Object.entries({ ...window.localStorage }));

// Everything written to the secure store, as one searchable string.
const secureStoreDump = () => JSON.stringify([...fakeSecureStore.entries()]);

// Exposes the auth state and actions the native flows need.
const Probe = () => {
  const { isAuthenticated, user, login, loginWithGoogle, loginWithApple, logout } = useAuth();
  return (
    <div>
      <span aria-label="isAuthenticated">{isAuthenticated ? 'true' : 'false'}</span>
      <span aria-label="email">{user?.email ?? ''}</span>
      <button onClick={() => login('trainer@example.com', 'pass123')}>Login</button>
      <button onClick={() => loginWithGoogle()}>Google</button>
      <button onClick={() => loginWithApple?.()}>Apple</button>
      <button onClick={() => logout()}>Logout</button>
    </div>
  );
};

// Renders the provider around the probe.
const renderProvider = () => renderWithRouter(<AuthProvider><Probe /></AuthProvider>);

describe('AuthContext in the native app', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    fakeSecureStore.clear();
    platform.isNative.mockReturnValue(true);
    platform.getPlatform.mockReturnValue('ios');
    api.post.mockResolvedValue(AUTH_RESPONSE);
    api.get.mockResolvedValue({ data: TRAINER_USER });
  });

  describe('native Google sign-in', () => {
    beforeEach(() => {
      platform.nativeAuth.signInWithGoogle.mockResolvedValue({ idToken: 'google-id-token' });
    });

    it('uses the platform adapter and exchanges the id token on /auth/google/mobile', async () => {
      const user = userEvent.setup();
      renderProvider();

      await user.click(screen.getByRole('button', { name: 'Google' }));

      await waitFor(() => expect(screen.getByLabelText('isAuthenticated')).toHaveTextContent('true'));
      expect(platform.nativeAuth.signInWithGoogle).toHaveBeenCalledTimes(1);
      expect(api.post).toHaveBeenCalledWith('/auth/google/mobile', expect.objectContaining({ idToken: 'google-id-token' }));
    });

    it('never opens the Firebase popup nor calls the web endpoint', async () => {
      const user = userEvent.setup();
      renderProvider();

      await user.click(screen.getByRole('button', { name: 'Google' }));

      await waitFor(() => expect(screen.getByLabelText('isAuthenticated')).toHaveTextContent('true'));
      expect(signInWithPopup).not.toHaveBeenCalled();
      expect(api.post).not.toHaveBeenCalledWith('/auth/google/web', expect.anything());
    });

    it('does not authenticate when the native sign-in fails', async () => {
      const user = userEvent.setup();
      platform.nativeAuth.signInWithGoogle.mockRejectedValue(new Error('native failure'));
      renderProvider();

      await user.click(screen.getByRole('button', { name: 'Google' }));

      await waitFor(() => expect(platform.nativeAuth.signInWithGoogle).toHaveBeenCalled());
      expect(api.post).not.toHaveBeenCalled();
      expect(screen.getByLabelText('isAuthenticated')).toHaveTextContent('false');
    });
  });

  describe('native Apple sign-in', () => {
    it('uses the platform adapter and exchanges the identity token on /auth/apple/mobile', async () => {
      const user = userEvent.setup();
      platform.nativeAuth.signInWithApple.mockResolvedValue({ identityToken: 'apple-identity-token', nonce: 'nonce-1' });
      renderProvider();

      await user.click(screen.getByRole('button', { name: 'Apple' }));

      await waitFor(() => expect(screen.getByLabelText('isAuthenticated')).toHaveTextContent('true'));
      expect(api.post).toHaveBeenCalledWith(
        '/auth/apple/mobile',
        expect.objectContaining({ identityToken: 'apple-identity-token', nonce: 'nonce-1' }),
      );
      expect(signInWithPopup).not.toHaveBeenCalled();
    });

    it('does not authenticate when the native sign-in fails', async () => {
      const user = userEvent.setup();
      platform.nativeAuth.signInWithApple.mockRejectedValue(new Error('native failure'));
      renderProvider();

      await user.click(screen.getByRole('button', { name: 'Apple' }));

      await waitFor(() => expect(platform.nativeAuth.signInWithApple).toHaveBeenCalled());
      expect(api.post).not.toHaveBeenCalled();
      expect(screen.getByLabelText('isAuthenticated')).toHaveTextContent('false');
    });
  });

  describe('token storage', () => {
    it('keeps the tokens in the secure store and out of localStorage after login', async () => {
      const user = userEvent.setup();
      renderProvider();

      await user.click(screen.getByRole('button', { name: 'Login' }));

      await waitFor(() => expect(screen.getByLabelText('isAuthenticated')).toHaveTextContent('true'));
      expect(secureStoreDump()).toContain('access-token-123');
      expect(secureStoreDump()).toContain('refresh-token-abc');
      expect(localStorageDump()).not.toContain('access-token-123');
      expect(localStorageDump()).not.toContain('refresh-token-abc');
    });

    it('sends the secure-store token on the /me request that follows login', async () => {
      const user = userEvent.setup();
      renderProvider();

      await user.click(screen.getByRole('button', { name: 'Login' }));

      await waitFor(() => expect(api.get).toHaveBeenCalled());
      expect(secureStoreDump()).toContain('access-token-123');
      expect(localStorage.getItem('accessToken')).toBeNull();
    });

    it('restores the session from the secure store on boot', async () => {
      fakeSecureStore.set('accessToken', 'stored-access');
      fakeSecureStore.set('refreshToken', 'stored-refresh');
      fakeSecureStore.set('user', JSON.stringify(TRAINER_USER));

      renderProvider();

      await waitFor(() => expect(screen.getByLabelText('isAuthenticated')).toHaveTextContent('true'));
      expect(screen.getByLabelText('email')).toHaveTextContent('trainer@example.com');
      expect(localStorage.getItem('accessToken')).toBeNull();
    });

    it('stays signed out on boot when the secure store is empty', async () => {
      renderProvider();

      await waitFor(() => expect(platform.secureStorage.getItem).toHaveBeenCalled());
      expect(screen.getByLabelText('isAuthenticated')).toHaveTextContent('false');
    });

    it('clears the secure store on logout', async () => {
      const user = userEvent.setup();
      fakeSecureStore.set('accessToken', 'stored-access');
      fakeSecureStore.set('refreshToken', 'stored-refresh');
      fakeSecureStore.set('user', JSON.stringify(TRAINER_USER));
      renderProvider();
      await waitFor(() => expect(screen.getByLabelText('isAuthenticated')).toHaveTextContent('true'));

      await act(async () => { await user.click(screen.getByRole('button', { name: 'Logout' })); });

      await waitFor(() => expect(screen.getByLabelText('isAuthenticated')).toHaveTextContent('false'));
      expect(secureStoreDump()).not.toContain('stored-access');
      expect(secureStoreDump()).not.toContain('stored-refresh');
    });

    it('removes the push device before the tokens are cleared on logout', async () => {
      const user = userEvent.setup();
      renderProvider();
      await user.click(screen.getByRole('button', { name: 'Login' }));
      await waitFor(() => expect(screen.getByLabelText('isAuthenticated')).toHaveTextContent('true'));

      await act(async () => { await user.click(screen.getByRole('button', { name: 'Logout' })); });

      await waitFor(() => expect(unregisterDevice).toHaveBeenCalledTimes(1));
      const firstRemoval = Math.min(...platform.secureStorage.removeItem.mock.invocationCallOrder);
      expect(vi.mocked(unregisterDevice).mock.invocationCallOrder[0]).toBeLessThan(firstRemoval);
    });
  });
});

describe('AuthContext on the website', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    fakeSecureStore.clear();
    platform.isNative.mockReturnValue(false);
    api.post.mockResolvedValue(AUTH_RESPONSE);
    api.get.mockResolvedValue({ data: TRAINER_USER });
  });

  it('keeps the tokens in localStorage and never touches the secure store', async () => {
    const user = userEvent.setup();
    renderProvider();

    await user.click(screen.getByRole('button', { name: 'Login' }));

    await waitFor(() => expect(screen.getByLabelText('isAuthenticated')).toHaveTextContent('true'));
    expect(localStorage.getItem('accessToken')).toBe('access-token-123');
    expect(localStorage.getItem('refreshToken')).toBe('refresh-token-abc');
    expect(platform.secureStorage.setItem).not.toHaveBeenCalled();
    expect(platform.secureStorage.getItem).not.toHaveBeenCalled();
  });

  it('restores the session from localStorage', () => {
    localStorage.setItem('accessToken', 'stored-access');
    localStorage.setItem('user', JSON.stringify(TRAINER_USER));

    renderProvider();

    expect(screen.getByLabelText('isAuthenticated')).toHaveTextContent('true');
    expect(platform.secureStorage.getItem).not.toHaveBeenCalled();
  });

  it('does not unregister a push device on logout', async () => {
    localStorage.setItem('accessToken', 'stored-access');
    localStorage.setItem('user', JSON.stringify(TRAINER_USER));
    const user = userEvent.setup();
    renderProvider();

    await user.click(screen.getByRole('button', { name: 'Logout' }));

    expect(unregisterDevice).not.toHaveBeenCalled();
    expect(localStorage.getItem('accessToken')).toBeNull();
  });
});
