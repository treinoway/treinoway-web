import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@sentry/react', () => ({ init: vi.fn(), setUser: vi.fn(), captureException: vi.fn() }));

// Loads the module fresh with a DSN so the helpers are active.
const loadSentry = async () => {
  vi.resetModules();
  vi.stubEnv('VITE_SENTRY_DSN', 'https://dsn@example.com/1');
  const Sentry = await import('@sentry/react');
  const mod = await import('./sentry');
  return { Sentry, mod };
};

describe('sentry: FCM token never leaves the device', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.unstubAllEnvs());

  it('normalizes the route tag of a failing DELETE /me/devices/:token', async () => {
    const { Sentry, mod } = await loadSentry();
    const error = new Error('boom');
    error.config = { url: '/me/devices/fcm%3Asecret-token', method: 'delete' };

    mod.reportApiError(error);

    expect(Sentry.captureException.mock.calls[0][1].tags.route).toBe('/me/devices/:token');
  });

  it('drops breadcrumbs of requests to /me/devices/', async () => {
    const { mod } = await loadSentry();

    expect(mod.filterBreadcrumb({ category: 'fetch', data: { url: '/me/devices/abc' } })).toBeNull();
    expect(mod.filterBreadcrumb({ category: 'xhr', message: 'DELETE /me/devices/abc' })).toBeNull();
    expect(mod.filterBreadcrumb({ category: 'fetch', data: { url: '/me' } })).toEqual({ category: 'fetch', data: { url: '/me' } });
  });

  it('scrubs the token from any string of an event and registers the filters at init', async () => {
    const { Sentry, mod } = await loadSentry();
    mod.initSentry();
    const options = Sentry.init.mock.calls[0][0];

    const event = options.beforeSend({ extra: { url: 'https://api/me/devices/fcm-secret?x=1' } });

    expect(JSON.stringify(event)).not.toContain('fcm-secret');
    expect(options.beforeBreadcrumb).toBe(mod.filterBreadcrumb);
  });
});
