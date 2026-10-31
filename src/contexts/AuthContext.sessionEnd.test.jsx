import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
      secureStorage: {
        getItem: vi.fn(async (key) => (store.has(key) ? store.get(key) : null)),
        setItem: vi.fn(async (key, value) => { store.set(key, value); }),
        removeItem: vi.fn(async (key) => { store.delete(key); }),
      },
      nativeAuth: { signInWithGoogle: vi.fn(), signInWithApple: vi.fn() },
      push: { deleteToken: vi.fn() },
    },
  };
});

vi.mock('../platform', () => platform);
vi.mock('../utils/deviceRegistration', () => ({ registerDevice: vi.fn(), unregisterDevice: vi.fn() }));
vi.mock('../firebase', () => ({ auth: {}, googleProvider: {} }));
vi.mock('firebase/auth', () => ({ signInWithPopup: vi.fn(), signOut: vi.fn(), GoogleAuthProvider: vi.fn() }));
vi.mock('../api/axios', () => ({ default: { post: vi.fn(), get: vi.fn() } }));
vi.mock('../i18n', () => ({ translateError: vi.fn((error, fallback) => error?.userMessage || fallback) }));

import { unregisterDevice } from '../utils/deviceRegistration';

// Shows the session and exposes logout and the token updater.
const Probe = () => {
  const { isAuthenticated, logout, updateTokens } = useAuth();
  return (
    <div>
      <span aria-label="isAuthenticated">{isAuthenticated ? 'true' : 'false'}</span>
      <button onClick={() => logout()}>Logout</button>
      <button onClick={() => updateTokens('late-access', 'late-refresh')}>Tokens</button>
    </div>
  );
};

// Renders the provider around the probe with a restored session.
const renderSignedIn = async () => {
  renderWithRouter(<AuthProvider><Probe /></AuthProvider>);
  await waitFor(() => expect(screen.getByLabelText('isAuthenticated')).toHaveTextContent('true'));
};

describe('AuthContext: ending the native session', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fakeSecureStore.clear();
    fakeSecureStore.set('accessToken', 'access');
    fakeSecureStore.set('refreshToken', 'refresh');
    fakeSecureStore.set('user', JSON.stringify({ id: 'u1', roles: ['TRAINER'] }));
    platform.isNative.mockReturnValue(true);
    platform.getPlatform.mockReturnValue('android');
    platform.push.deleteToken.mockResolvedValue(undefined);
    vi.mocked(unregisterDevice).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('deletes the local FCM token on logout', async () => {
    const user = userEvent.setup();
    await renderSignedIn();

    await user.click(screen.getByRole('button', { name: 'Logout' }));

    await waitFor(() => expect(platform.push.deleteToken).toHaveBeenCalledTimes(1));
  });

  it('logs out offline: the server call hangs, is aborted after the timeout, and the local token is still deleted', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let signal;
    vi.mocked(unregisterDevice).mockImplementation(({ signal: received }) => {
      signal = received;
      return new Promise(() => undefined);
    });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await renderSignedIn();

    await user.click(screen.getByRole('button', { name: 'Logout' }));
    await act(async () => { await vi.advanceTimersByTimeAsync(3100); });

    expect(signal.aborted).toBe(true);
    await waitFor(() => expect(screen.getByLabelText('isAuthenticated')).toHaveTextContent('false'));
    expect(platform.push.deleteToken).toHaveBeenCalledTimes(1);
    expect(fakeSecureStore.size).toBe(0);
  });

  it('deletes the local FCM token when the session expires', async () => {
    await renderSignedIn();

    act(() => { window.dispatchEvent(new CustomEvent('treinoway:sessionExpired')); });

    await waitFor(() => expect(platform.push.deleteToken).toHaveBeenCalledTimes(1));
  });

  it('does not let a refresh that belonged to an ended session sign the user back in', async () => {
    const user = userEvent.setup();
    await renderSignedIn();
    await user.click(screen.getByRole('button', { name: 'Logout' }));
    await waitFor(() => expect(screen.getByLabelText('isAuthenticated')).toHaveTextContent('false'));

    act(() => {
      window.dispatchEvent(new CustomEvent('treinoway:tokensRefreshed', { detail: { newAccessToken: 'late', newRefreshToken: 'late-r', generation: 0 } }));
    });

    expect(screen.getByLabelText('isAuthenticated')).toHaveTextContent('false');
    expect(fakeSecureStore.has('accessToken')).toBe(false);
  });
});
