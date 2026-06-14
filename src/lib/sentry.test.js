import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the Sentry SDK so we can assert on calls without a real transport.
vi.mock('@sentry/react', () => ({
  init: vi.fn(),
  setUser: vi.fn(),
  captureException: vi.fn(),
}));

// Loads the module fresh so `import.meta.env.VITE_SENTRY_DSN` is re-read after stubbing.
const loadSentry = async () => {
  vi.resetModules();
  const Sentry = await import('@sentry/react');
  const mod = await import('./sentry');
  return { Sentry, mod };
};

const makeAxiosError = ({ status, headers, data, config, code, name } = {}) => {
  const error = new Error('boom');
  if (code) error.code = code;
  if (name) error.name = name;
  if (status !== undefined || headers || data) {
    error.response = { status, headers: headers ?? {}, data: data ?? {} };
  }
  error.config = config ?? { url: '/trainer/students', method: 'get' };
  return error;
};

describe('sentry helper — env gating (no DSN)', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_SENTRY_DSN', '');
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('isSentryEnabled is false and initSentry is a no-op', async () => {
    const { Sentry, mod } = await loadSentry();
    expect(mod.isSentryEnabled).toBe(false);
    mod.initSentry();
    expect(Sentry.init).not.toHaveBeenCalled();
  });

  it('setSentryUser and reportApiError do nothing without a DSN', async () => {
    const { Sentry, mod } = await loadSentry();
    mod.setSentryUser('user-1');
    mod.reportApiError(makeAxiosError({ status: 500 }));
    expect(Sentry.setUser).not.toHaveBeenCalled();
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });
});

describe('sentry helper — enabled (DSN set)', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://abc@o1.ingest.sentry.io/123');
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('initSentry initializes with errors-only config and the default environment', async () => {
    // VITE_SENTRY_ENVIRONMENT is left undefined so the `?? 'beta'` default applies.
    const { Sentry, mod } = await loadSentry();
    mod.initSentry();
    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: 'https://abc@o1.ingest.sentry.io/123',
        environment: 'beta',
        tracesSampleRate: 0,
        replaysSessionSampleRate: 0,
      }),
    );
  });

  it('setSentryUser sends id only, and clears with null', async () => {
    const { Sentry, mod } = await loadSentry();
    mod.setSentryUser(42);
    expect(Sentry.setUser).toHaveBeenCalledWith({ id: '42' });
    mod.setSentryUser(null);
    expect(Sentry.setUser).toHaveBeenLastCalledWith(null);
  });

  it('reports 5xx with route/method tags', async () => {
    const { Sentry, mod } = await loadSentry();
    const error = makeAxiosError({ status: 503, config: { url: '/trainer/x', method: 'post' } });
    mod.reportApiError(error);
    expect(Sentry.captureException).toHaveBeenCalledWith(
      error,
      expect.objectContaining({
        tags: expect.objectContaining({ route: '/trainer/x', method: 'POST', status: '503' }),
      }),
    );
  });

  it('reports network/transport errors with a network kind tag', async () => {
    const { Sentry, mod } = await loadSentry();
    const error = makeAxiosError({ config: { url: '/me', method: 'get' } }); // no response
    mod.reportApiError(error);
    expect(Sentry.captureException).toHaveBeenCalledWith(
      error,
      expect.objectContaining({ tags: expect.objectContaining({ kind: 'network' }) }),
    );
  });

  it('attaches requestId from a response header when present', async () => {
    const { Sentry, mod } = await loadSentry();
    const error = makeAxiosError({ status: 500, headers: { 'x-request-id': 'req-99' } });
    mod.reportApiError(error);
    const [, options] = Sentry.captureException.mock.calls[0];
    expect(options.tags.requestId).toBe('req-99');
  });

  it('does NOT report expected 4xx business/validation errors', async () => {
    const { Sentry, mod } = await loadSentry();
    mod.reportApiError(makeAxiosError({ status: 404 }));
    mod.reportApiError(makeAxiosError({ status: 400 }));
    mod.reportApiError(makeAxiosError({ status: 422 }));
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it('does NOT report cancelled requests', async () => {
    const { Sentry, mod } = await loadSentry();
    mod.reportApiError(makeAxiosError({ code: 'ERR_CANCELED', name: 'CanceledError' }));
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });
});
