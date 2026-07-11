import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Use a stable adapter mock so we can introspect the outgoing request config without a real network.
// Each test resets module state via vi.resetModules() so the in-flight refresh promise and listeners
// don't leak between cases.

const mockAdapter = vi.fn();

const setIntlTimezone = (tz) => {
  vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => ({
    resolvedOptions: () => ({ timeZone: tz }),
  }));
};

const makeIntlThrow = () => {
  vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => {
    throw new Error('Intl unavailable');
  });
};

const loadApi = async () => {
  vi.resetModules();
  const mod = await import('./axios');
  const api = mod.default;
  api.defaults.adapter = mockAdapter;
  return api;
};

describe('axios interceptor — app-timezone header', () => {
  beforeEach(() => {
    mockAdapter.mockReset();
    localStorage.clear();
    // Default: adapter resolves with a successful empty payload echoing the request config
    // so each test can introspect headers via mockAdapter.mock.calls[i][0].headers.
    mockAdapter.mockImplementation((config) =>
      Promise.resolve({ data: {}, status: 200, statusText: 'OK', headers: {}, config }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('attaches the Intl-resolved timezone exactly on authenticated requests', async () => {
    setIntlTimezone('America/Sao_Paulo');
    localStorage.setItem('accessToken', 'token-abc');
    const api = await loadApi();

    await api.get('/some/endpoint');

    const sentConfig = mockAdapter.mock.calls[0][0];
    expect(sentConfig.headers['app-timezone']).toBe('America/Sao_Paulo');
    expect(sentConfig.headers.Authorization).toBe('Bearer token-abc');
  });

  it('omits the header entirely (not the string "null") when Intl throws', async () => {
    makeIntlThrow();
    localStorage.setItem('accessToken', 'token-abc');
    const api = await loadApi();

    await api.get('/some/endpoint');

    const sentConfig = mockAdapter.mock.calls[0][0];
    expect(sentConfig.headers['app-timezone']).toBeUndefined();
  });

  it('does not attach the header when no access token is present (logged-out)', async () => {
    setIntlTimezone('America/Sao_Paulo');
    const api = await loadApi();

    await api.get('/public/endpoint');

    const sentConfig = mockAdapter.mock.calls[0][0];
    expect(sentConfig.headers['app-timezone']).toBeUndefined();
    expect(sentConfig.headers.Authorization).toBeUndefined();
  });

  it('does not attach the header when baseURL does not match the TeuFit API', async () => {
    setIntlTimezone('America/Sao_Paulo');
    localStorage.setItem('accessToken', 'token-abc');
    const api = await loadApi();

    await api.get('/foreign', { baseURL: 'https://third-party.example.com' });

    const sentConfig = mockAdapter.mock.calls[0][0];
    expect(sentConfig.headers['app-timezone']).toBeUndefined();
  });

  it('attaches the header on every concurrent request fired in the same tick', async () => {
    setIntlTimezone('America/Sao_Paulo');
    localStorage.setItem('accessToken', 'token-abc');
    const api = await loadApi();

    await Promise.all([
      api.get('/a'),
      api.get('/b'),
      api.get('/c'),
    ]);

    expect(mockAdapter).toHaveBeenCalledTimes(3);
    mockAdapter.mock.calls.forEach(([config]) => {
      expect(config.headers['app-timezone']).toBe('America/Sao_Paulo');
    });
  });

  it('re-resolves the timezone on the 401-retry attempt (not the original value)', async () => {
    // First Intl call returns the initial tz; second (retry) returns a different tz.
    const tzSequence = ['America/Sao_Paulo', 'Europe/Lisbon'];
    let intlCallCount = 0;
    vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => ({
      resolvedOptions: () => ({ timeZone: tzSequence[intlCallCount++] ?? 'Europe/Lisbon' }),
    }));

    localStorage.setItem('accessToken', 'token-old');
    localStorage.setItem('refreshToken', 'refresh-abc');

    // The refresh call uses bare axios.post, not our instance, so it bypasses our adapter.
    // We mock global axios.post to return a fresh access token.
    const axiosModule = await import('axios');
    const axiosPostSpy = vi.spyOn(axiosModule.default, 'post').mockResolvedValue({
      data: { accessToken: 'token-new', refreshToken: 'refresh-new' },
    });

    const api = await loadApi();

    // First call returns 401 on the original attempt, then 200 on the retry.
    let attempt = 0;
    mockAdapter.mockImplementation((config) => {
      attempt += 1;
      if (attempt === 1) {
        const error = new Error('Unauthorized');
        error.response = { status: 401, data: { error: 'INVALID_CREDENTIALS' }, headers: {}, config };
        error.config = config;
        return Promise.reject(error);
      }
      return Promise.resolve({ data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config });
    });

    await api.get('/protected/resource');

    expect(mockAdapter).toHaveBeenCalledTimes(2);
    const originalAttemptHeaders = mockAdapter.mock.calls[0][0].headers;
    const retryAttemptHeaders = mockAdapter.mock.calls[1][0].headers;

    expect(originalAttemptHeaders['app-timezone']).toBe('America/Sao_Paulo');
    expect(retryAttemptHeaders['app-timezone']).toBe('Europe/Lisbon');
    expect(retryAttemptHeaders.Authorization).toBe('Bearer token-new');

    axiosPostSpy.mockRestore();
  });

  it('scrubs a stale app-timezone header on retry when Intl starts throwing mid-flight', async () => {
    // First Intl call returns SP, second throws. Header should be ABSENT on retry, not stale.
    let intlCallCount = 0;
    vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => {
      intlCallCount += 1;
      if (intlCallCount === 1) {
        return { resolvedOptions: () => ({ timeZone: 'America/Sao_Paulo' }) };
      }
      throw new Error('Intl gone');
    });

    localStorage.setItem('accessToken', 'token-old');
    localStorage.setItem('refreshToken', 'refresh-abc');

    const axiosModule = await import('axios');
    const axiosPostSpy = vi.spyOn(axiosModule.default, 'post').mockResolvedValue({
      data: { accessToken: 'token-new', refreshToken: 'refresh-new' },
    });

    const api = await loadApi();

    let attempt = 0;
    mockAdapter.mockImplementation((config) => {
      attempt += 1;
      if (attempt === 1) {
        const error = new Error('Unauthorized');
        error.response = { status: 401, data: {}, headers: {}, config };
        error.config = config;
        return Promise.reject(error);
      }
      return Promise.resolve({ data: {}, status: 200, statusText: 'OK', headers: {}, config });
    });

    await api.get('/protected/resource');

    const retryHeaders = mockAdapter.mock.calls[1][0].headers;
    expect(retryHeaders['app-timezone']).toBeUndefined();

    axiosPostSpy.mockRestore();
  });
});
