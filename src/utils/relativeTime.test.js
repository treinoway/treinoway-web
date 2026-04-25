import { describe, it, expect, vi, afterEach } from 'vitest';
import formatRelativeTime from './relativeTime';

afterEach(() => {
  vi.useRealTimers();
});

describe('formatRelativeTime', () => {
  it('returns null when iso is null', () => {
    expect(formatRelativeTime(null)).toBeNull();
  });

  it('returns null when iso is undefined', () => {
    expect(formatRelativeTime(undefined)).toBeNull();
  });

  it('returns null when iso is empty string', () => {
    expect(formatRelativeTime('')).toBeNull();
  });

  it('returns "agora" when diff is less than 1 minute', () => {
    vi.useFakeTimers();
    const now = new Date('2026-04-24T12:00:00Z');
    vi.setSystemTime(now);
    const iso = new Date(now.getTime() - 30000).toISOString(); // 30s ago
    expect(formatRelativeTime(iso)).toBe('agora');
  });

  it('returns "agora" when diff is exactly 0ms', () => {
    vi.useFakeTimers();
    const now = new Date('2026-04-24T12:00:00Z');
    vi.setSystemTime(now);
    expect(formatRelativeTime(now.toISOString())).toBe('agora');
  });

  it('returns "há 1min" when diff is exactly 1 minute', () => {
    vi.useFakeTimers();
    const now = new Date('2026-04-24T12:00:00Z');
    vi.setSystemTime(now);
    const iso = new Date(now.getTime() - 60000).toISOString();
    expect(formatRelativeTime(iso)).toBe('há 1min');
  });

  it('returns "há 5min" when diff is 5 minutes', () => {
    vi.useFakeTimers();
    const now = new Date('2026-04-24T12:00:00Z');
    vi.setSystemTime(now);
    const iso = new Date(now.getTime() - 5 * 60000).toISOString();
    expect(formatRelativeTime(iso)).toBe('há 5min');
  });

  it('returns "há 59min" when diff is 59 minutes', () => {
    vi.useFakeTimers();
    const now = new Date('2026-04-24T12:00:00Z');
    vi.setSystemTime(now);
    const iso = new Date(now.getTime() - 59 * 60000).toISOString();
    expect(formatRelativeTime(iso)).toBe('há 59min');
  });

  it('returns "há 1h" when diff is exactly 60 minutes', () => {
    vi.useFakeTimers();
    const now = new Date('2026-04-24T12:00:00Z');
    vi.setSystemTime(now);
    const iso = new Date(now.getTime() - 60 * 60000).toISOString();
    expect(formatRelativeTime(iso)).toBe('há 1h');
  });

  it('returns "há 3h" when diff is 3 hours', () => {
    vi.useFakeTimers();
    const now = new Date('2026-04-24T12:00:00Z');
    vi.setSystemTime(now);
    const iso = new Date(now.getTime() - 3 * 3600000).toISOString();
    expect(formatRelativeTime(iso)).toBe('há 3h');
  });

  it('returns "há 23h" when diff is 23 hours', () => {
    vi.useFakeTimers();
    const now = new Date('2026-04-24T12:00:00Z');
    vi.setSystemTime(now);
    const iso = new Date(now.getTime() - 23 * 3600000).toISOString();
    expect(formatRelativeTime(iso)).toBe('há 23h');
  });

  it('returns "há 1d" when diff is exactly 24 hours', () => {
    vi.useFakeTimers();
    const now = new Date('2026-04-24T12:00:00Z');
    vi.setSystemTime(now);
    const iso = new Date(now.getTime() - 24 * 3600000).toISOString();
    expect(formatRelativeTime(iso)).toBe('há 1d');
  });

  it('returns "há 3d" when diff is 3 days', () => {
    vi.useFakeTimers();
    const now = new Date('2026-04-24T12:00:00Z');
    vi.setSystemTime(now);
    const iso = new Date(now.getTime() - 3 * 24 * 3600000).toISOString();
    expect(formatRelativeTime(iso)).toBe('há 3d');
  });
});
