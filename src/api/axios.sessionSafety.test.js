import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoisted so the vi.mock factory below can reference these fakes.
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

// Loads fresh axios and session modules sharing one module graph.
const load = async () => {
  vi.resetModules();
  const axiosModule = await import('axios');
  const mod = await import('./axios');
  const store = await import('../utils/sessionStore');
  mod.default.defaults.adapter = mockAdapter;
  return { mod, store, bareAxios: axiosModule.default };
};

// Adapter that always answers 401.
const unauthorized = (config) => {
  const error = new Error('Unauthorized');
  error.response = { status: 401, data: {}, headers: {}, config };
  error.config = config;
  return Promise.reject(error);
};

// Builds the error the refresh call raises for an HTTP status (or a network failure when null).
const refreshFailure = (status) => Object.assign(new Error('refresh failed'), status ? { response: { status, data: {} } } : {});

describe('axios session safety (native)', () => {
  const sessionExpired = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    fakeSecureStore.clear();
    fakeSecureStore.set('accessToken', 'old');
    fakeSecureStore.set('refreshToken', 'refresh');
    platform.isNative.mockReturnValue(true);
    platform.secureStorage.getItem.mockImplementation(async (key) => (fakeSecureStore.has(key) ? fakeSecureStore.get(key) : null));
    mockAdapter.mockImplementation(unauthorized);
    window.addEventListener('treinoway:sessionExpired', sessionExpired);
  });

  it.each([['network failure', null], ['a 500', 500], ['a 503', 503]])('keeps the session when the refresh fails with %s', async (name, status) => {
    const { mod, bareAxios } = await load();
    vi.spyOn(bareAxios, 'post').mockRejectedValue(refreshFailure(status));

    await expect(mod.default.get('/me')).rejects.toBeTruthy();
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(sessionExpired).not.toHaveBeenCalled();
    expect(fakeSecureStore.get('refreshToken')).toBe('refresh');
  });

  it('ends the session only when the refresh endpoint answers 401', async () => {
    const { mod, bareAxios } = await load();
    vi.spyOn(bareAxios, 'post').mockRejectedValue(refreshFailure(401));

    await expect(mod.default.get('/me')).rejects.toBeTruthy();

    await vi.waitFor(() => expect(sessionExpired).toHaveBeenCalledTimes(1));
    expect(fakeSecureStore.size).toBe(0);
  });

  it('does not end the session when the Keychain read failed (no refresh token read is not "signed out")', async () => {
    platform.secureStorage.getItem.mockRejectedValue(new Error('keystore locked'));
    const { mod } = await load();

    await expect(mod.default.get('/me')).rejects.toBeTruthy();
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(sessionExpired).not.toHaveBeenCalled();
    expect(fakeSecureStore.get('refreshToken')).toBe('refresh');
  });

  it('writes the rotated refresh token before the access token', async () => {
    const { mod, bareAxios } = await load();
    vi.spyOn(bareAxios, 'post').mockResolvedValue({ data: { token: { accessToken: 'new-access' }, refreshToken: 'new-refresh' } });

    await mod.refreshAccessToken();

    const order = platform.secureStorage.setItem.mock.calls.map(([key]) => key);
    expect(order).toEqual(['refreshToken', 'accessToken']);
  });

  it('discards a refresh that finishes after the session ended (no resurrected session)', async () => {
    const { mod, store, bareAxios } = await load();
    let finishRefresh;
    vi.spyOn(bareAxios, 'post').mockImplementation(() => new Promise((resolve) => { finishRefresh = resolve; }));

    const pending = mod.refreshAccessToken();
    await vi.waitFor(() => expect(finishRefresh).toBeTypeOf('function'));
    await store.clearStoredSession();
    finishRefresh({ data: { token: { accessToken: 'late-access' }, refreshToken: 'late-refresh' } });

    await expect(pending).resolves.toBeNull();
    expect(fakeSecureStore.size).toBe(0);
  });
});
