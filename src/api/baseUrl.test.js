import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  resolveApiBaseUrl,
  DEV_API_BASE_URL,
  MISSING_API_BASE_URL_MESSAGE,
} from './baseUrl';
import { captureAnomaly } from '../lib/sentry';

vi.mock('../lib/sentry', () => ({
  captureAnomaly: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('resolveApiBaseUrl', () => {
  it('uses the configured value when present', () => {
    expect(resolveApiBaseUrl({ VITE_API_BASE_URL: 'https://api.example.com', DEV: false }))
      .toBe('https://api.example.com');
  });

  it('trims surrounding whitespace', () => {
    expect(resolveApiBaseUrl({ VITE_API_BASE_URL: '  https://api.example.com  ', DEV: false }))
      .toBe('https://api.example.com');
  });

  it('falls back to localhost only in dev', () => {
    expect(resolveApiBaseUrl({ VITE_API_BASE_URL: '', DEV: true })).toBe(DEV_API_BASE_URL);
  });

  it('does not report an anomaly in dev', () => {
    resolveApiBaseUrl({ VITE_API_BASE_URL: '', DEV: true });
    vi.runAllTimers();

    expect(console.error).not.toHaveBeenCalled();
    expect(captureAnomaly).not.toHaveBeenCalled();
  });

  it('never falls back to localhost in a production build', () => {
    expect(resolveApiBaseUrl({ VITE_API_BASE_URL: '', DEV: false, MODE: 'production' })).toBe('');
  });

  it('logs an error when the variable is missing in a production build', () => {
    resolveApiBaseUrl({ VITE_API_BASE_URL: '', DEV: false, MODE: 'production' });

    expect(console.error).toHaveBeenCalledWith(expect.stringContaining(MISSING_API_BASE_URL_MESSAGE));
  });

  it('reports the missing variable to Sentry as an error', () => {
    resolveApiBaseUrl({ VITE_API_BASE_URL: undefined, DEV: false, MODE: 'staging' });
    vi.runAllTimers();

    expect(captureAnomaly).toHaveBeenCalledWith(
      MISSING_API_BASE_URL_MESSAGE,
      expect.objectContaining({ level: 'error' }),
    );
  });

  it('treats a whitespace-only value as missing', () => {
    expect(resolveApiBaseUrl({ VITE_API_BASE_URL: '   ', DEV: false, MODE: 'production' })).toBe('');
  });
});
