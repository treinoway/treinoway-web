import { describe, it, expect, vi, afterEach } from 'vitest';
import { getDeviceTimezone } from './timezone';

describe('getDeviceTimezone', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the Intl-resolved timezone string when available', () => {
    vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => ({
      resolvedOptions: () => ({ timeZone: 'America/Sao_Paulo' }),
    }));

    expect(getDeviceTimezone()).toBe('America/Sao_Paulo');
  });

  it('returns null when Intl throws', () => {
    vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => {
      throw new Error('boom');
    });

    expect(getDeviceTimezone()).toBeNull();
  });

  it('returns null when resolvedOptions returns an empty timezone string', () => {
    vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => ({
      resolvedOptions: () => ({ timeZone: '' }),
    }));

    expect(getDeviceTimezone()).toBeNull();
  });

  it('returns null when resolvedOptions returns a non-string timezone', () => {
    vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => ({
      resolvedOptions: () => ({ timeZone: undefined }),
    }));

    expect(getDeviceTimezone()).toBeNull();
  });

  it('returns null when resolvedOptions itself throws', () => {
    vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => ({
      resolvedOptions: () => {
        throw new Error('not supported');
      },
    }));

    expect(getDeviceTimezone()).toBeNull();
  });
});
