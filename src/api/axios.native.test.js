import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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
        getItem: vi.fn(),
        setItem: vi.fn(async (key, value) => { store.set(key, value); }),
        removeItem: vi.fn(async (key) => { store.delete(key); }),
      },
    },
  };
});

vi.mock('../platform', () => platform);

const mockAdapter = vi.fn();

// Loads a fresh axios module so refresh state never leaks between cases.
const loadApi = async () => {
  vi.resetModules();
  const mod = await import('./axios');
  mod.default.defaults.adapter = mockAdapter;
  return mod;
};

// Everything the app wrote to localStorage, as one searchable string.
const localStorageDump = () => JSON.stringify(Object.entries({ ...window.localStorage }));

// Adapter that answers 401 until the request carries the refreshed token.
const adapterAcceptingOnly = (acceptedToken) => (config) => {
  if (config.headers.Authorization === `Bearer ${acceptedToken}`) {
    return Promise.resolve({ data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config });
  }
  const error = new Error('Unauthorized');
  error.response = { status: 401, data: {}, headers: {}, config };
  error.config = config;
  return Promise.reject(error);
};

describe('axios in the native app', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdapter.mockReset();
    localStorage.clear();
    fakeSecureStore.clear();
    platform.isNative.mockReturnValue(true);
    platform.secureStorage.getItem.mockImplementation(async (key) => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      return fakeSecureStore.has(key) ? fakeSecureStore.get(key) : null;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('waits for the secure store, so the first request already carries the stored token', async () => {
    fakeSecureStore.set('accessToken', 'secure-access');
    mockAdapter.mockImplementation((config) =>
      Promise.resolve({ data: {}, status: 200, statusText: 'OK', headers: {}, config }));
    const { default: api } = await loadApi();

    await api.get('/protected');

    expect(mockAdapter.mock.calls[0][0].headers.Authorization).toBe('Bearer secure-access');
  });

  it('refreshes once for concurrent 401s and persists the new tokens only in the secure store', async () => {
    fakeSecureStore.set('accessToken', 'secure-old');
    fakeSecureStore.set('refreshToken', 'secure-refresh');
    const axiosModule = await import('axios');
    const postSpy = vi.spyOn(axiosModule.default, 'post').mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return { data: { token: { accessToken: 'secure-new' }, refreshToken: 'secure-refresh-2' } };
    });
    const { default: api } = await loadApi();
    mockAdapter.mockImplementation(adapterAcceptingOnly('secure-new'));

    const results = await Promise.all([api.get('/a'), api.get('/b'), api.get('/c')]);

    expect(results.every((response) => response.data.ok)).toBe(true);
    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(postSpy.mock.calls[0][0]).toContain('/auth/refresh');
    expect(postSpy.mock.calls[0][1]).toEqual({ refreshToken: 'secure-refresh' });
    expect(JSON.stringify([...fakeSecureStore.entries()])).toContain('secure-new');
    expect(JSON.stringify([...fakeSecureStore.entries()])).toContain('secure-refresh-2');
    expect(localStorageDump()).not.toContain('secure-new');
    expect(localStorageDump()).not.toContain('secure-refresh-2');
  });
});

describe('axios on the website', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdapter.mockReset();
    localStorage.clear();
    platform.isNative.mockReturnValue(false);
  });

  it('keeps reading the token from localStorage and never reads the secure store', async () => {
    localStorage.setItem('accessToken', 'web-access');
    mockAdapter.mockImplementation((config) =>
      Promise.resolve({ data: {}, status: 200, statusText: 'OK', headers: {}, config }));
    const { default: api } = await loadApi();

    await api.get('/protected');

    expect(mockAdapter.mock.calls[0][0].headers.Authorization).toBe('Bearer web-access');
    expect(platform.secureStorage.getItem).not.toHaveBeenCalled();
  });

  it('keeps refreshing through localStorage', async () => {
    localStorage.setItem('accessToken', 'web-old');
    localStorage.setItem('refreshToken', 'web-refresh');
    const axiosModule = await import('axios');
    vi.spyOn(axiosModule.default, 'post').mockResolvedValue({
      data: { token: { accessToken: 'web-new' }, refreshToken: 'web-refresh-2' },
    });
    const { default: api } = await loadApi();
    mockAdapter.mockImplementation(adapterAcceptingOnly('web-new'));

    await api.get('/a');

    expect(localStorage.getItem('accessToken')).toBe('web-new');
    expect(localStorage.getItem('refreshToken')).toBe('web-refresh-2');
    expect(platform.secureStorage.setItem).not.toHaveBeenCalled();
  });
});
