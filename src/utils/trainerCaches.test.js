import { describe, it, expect, beforeEach } from 'vitest';
import {
  TRAINER_DASHBOARD_CACHE_KEY,
  TRAINER_ROSTER_CACHE_KEY,
  scopedCacheKey,
  readJsonCache,
  writeJsonCache,
  clearTrainerCaches,
} from './trainerCaches';

describe('trainerCaches', () => {
  beforeEach(() => localStorage.clear());

  it('scopes keys by user id and yields null while the id is unknown', () => {
    expect(scopedCacheKey(TRAINER_ROSTER_CACHE_KEY, 7)).toBe(`${TRAINER_ROSTER_CACHE_KEY}:7`);
    expect(scopedCacheKey(TRAINER_ROSTER_CACHE_KEY, undefined)).toBeNull();
    expect(scopedCacheKey(TRAINER_ROSTER_CACHE_KEY, null)).toBeNull();
  });

  it('round-trips JSON and returns null for missing, corrupt or keyless reads', () => {
    writeJsonCache('k', { a: 1 });
    expect(readJsonCache('k')).toEqual({ a: 1 });
    expect(readJsonCache('missing')).toBeNull();
    localStorage.setItem('bad', 'not-json');
    expect(readJsonCache('bad')).toBeNull();
    expect(readJsonCache(null)).toBeNull();
  });

  it('does not write without a key', () => {
    writeJsonCache(null, { a: 1 });
    expect(localStorage.length).toBe(0);
  });

  it('clears scoped entries of every user and the legacy unscoped keys, keeping unrelated keys', () => {
    localStorage.setItem(`${TRAINER_DASHBOARD_CACHE_KEY}:1`, '{}');
    localStorage.setItem(`${TRAINER_ROSTER_CACHE_KEY}:2`, '{}');
    localStorage.setItem(TRAINER_DASHBOARD_CACHE_KEY, '{}');
    localStorage.setItem(TRAINER_ROSTER_CACHE_KEY, '{}');
    localStorage.setItem('treinoway:onboardingDismissed:1', '1');

    clearTrainerCaches();

    expect(localStorage.length).toBe(1);
    expect(localStorage.getItem('treinoway:onboardingDismissed:1')).toBe('1');
  });
});
