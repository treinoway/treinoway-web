import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Hoisted so the vi.mock factories below can reference these fakes.
const { fakeSecureStore, platform } = vi.hoisted(() => {
  const store = new Map();
  return {
    fakeSecureStore: store,
    platform: {
      isNative: vi.fn(),
      secureStorage: {
        getItem: vi.fn(async (key) => (store.has(key) ? store.get(key) : null)),
        setItem: vi.fn(async (key, value) => { store.set(key, value); }),
        removeItem: vi.fn(async (key) => { store.delete(key); }),
      },
    },
  };
});

vi.mock('../platform', () => platform);

const mockAdapter = vi.fn();

// Loads a fresh axios module.
const loadApi = async () => {
  vi.resetModules();
  const mod = await import('./axios');
  mod.default.defaults.adapter = mockAdapter;
  return mod;
};

// Adapter that always answers 401.
const alwaysUnauthorized = (config) => {
  const error = new Error('Unauthorized');
  error.response = { status: 401, data: {}, headers: {}, config };
  error.config = config;
  return Promise.reject(error);
};

describe('axios session end', () => {
  const sessionExpired = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    fakeSecureStore.clear();
    localStorage.clear();
    window.addEventListener('treinoway:sessionExpired', sessionExpired);
  });

  afterEach(() => {
    window.removeEventListener('treinoway:sessionExpired', sessionExpired);
  });

  it('in the native app clears the secure store and announces the end of the session instead of reloading the WebView', async () => {
    platform.isNative.mockReturnValue(true);
    fakeSecureStore.set('accessToken', 'old');
    mockAdapter.mockImplementation(alwaysUnauthorized);
    const { default: api } = await loadApi();

    await expect(api.get('/protected')).rejects.toBeTruthy();

    await vi.waitFor(() => expect(sessionExpired).toHaveBeenCalledTimes(1));
    expect(fakeSecureStore.size).toBe(0);
  });

  it('on the website clears localStorage and does not emit the native event', async () => {
    platform.isNative.mockReturnValue(false);
    localStorage.setItem('accessToken', 'old');
    mockAdapter.mockImplementation(alwaysUnauthorized);
    const { clearAuthAndRedirect } = await loadApi();

    expect(() => clearAuthAndRedirect()).not.toThrow();

    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(sessionExpired).not.toHaveBeenCalled();
  });
});
