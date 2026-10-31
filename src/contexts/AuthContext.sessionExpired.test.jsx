import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, act } from '@testing-library/react';
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
    },
  };
});

vi.mock('../platform', () => platform);
vi.mock('../utils/deviceRegistration', () => ({ registerDevice: vi.fn(), unregisterDevice: vi.fn() }));
vi.mock('../firebase', () => ({ auth: {}, googleProvider: {} }));
vi.mock('firebase/auth', () => ({ signInWithPopup: vi.fn(), signOut: vi.fn(), GoogleAuthProvider: vi.fn() }));
vi.mock('../api/axios', () => ({ default: { post: vi.fn(), get: vi.fn() } }));
vi.mock('../i18n', () => ({ translateError: vi.fn((error, fallback) => error?.userMessage || fallback) }));

// Shows the session flags the boot flow depends on.
const Probe = () => {
  const { isAuthenticated, isRestoring } = useAuth();
  return (
    <div>
      <span aria-label="isAuthenticated">{isAuthenticated ? 'true' : 'false'}</span>
      <span aria-label="isRestoring">{isRestoring ? 'true' : 'false'}</span>
    </div>
  );
};

describe('AuthContext session lifecycle in the native app', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fakeSecureStore.clear();
    platform.isNative.mockReturnValue(true);
    platform.getPlatform.mockReturnValue('android');
    fakeSecureStore.set('accessToken', 'stored-access');
    fakeSecureStore.set('user', JSON.stringify({ id: 'u1', roles: ['TRAINER'] }));
  });

  it('reports isRestoring until the secure store was read, then restores the session', async () => {
    renderWithRouter(<AuthProvider><Probe /></AuthProvider>);

    expect(screen.getByLabelText('isRestoring')).toHaveTextContent('true');
    expect(screen.getByLabelText('isAuthenticated')).toHaveTextContent('false');
    await waitFor(() => expect(screen.getByLabelText('isRestoring')).toHaveTextContent('false'));

    expect(screen.getByLabelText('isAuthenticated')).toHaveTextContent('true');
  });

  it('signs out when the axios layer announces the session ended', async () => {
    renderWithRouter(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByLabelText('isAuthenticated')).toHaveTextContent('true'));

    act(() => { window.dispatchEvent(new CustomEvent('treinoway:sessionExpired')); });

    await waitFor(() => expect(screen.getByLabelText('isAuthenticated')).toHaveTextContent('false'));
  });

  it('is not restoring on the website', () => {
    platform.isNative.mockReturnValue(false);

    renderWithRouter(<AuthProvider><Probe /></AuthProvider>);

    expect(screen.getByLabelText('isRestoring')).toHaveTextContent('false');
  });
});
