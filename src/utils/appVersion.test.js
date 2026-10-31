import { describe, it, expect } from 'vitest';
import { compareVersions, isBelowMinimum } from './appVersion';

describe('compareVersions', () => {
  it('compares each part numerically', () => {
    expect(compareVersions('1.9.0', '1.10.0')).toBeLessThan(0);
    expect(compareVersions('2.0.0', '1.99.99')).toBeGreaterThan(0);
  });

  it('treats missing parts as zero', () => {
    expect(compareVersions('1.2', '1.2.0')).toBe(0);
    expect(compareVersions('1.2.1', '1.2')).toBeGreaterThan(0);
  });
});

describe('isBelowMinimum', () => {
  it('is true only when the current version is lower', () => {
    expect(isBelowMinimum('1.0.0', '1.0.1')).toBe(true);
    expect(isBelowMinimum('1.0.1', '1.0.1')).toBe(false);
  });

  it('never blocks without a minimum', () => {
    expect(isBelowMinimum('1.0.0', null)).toBe(false);
    expect(isBelowMinimum('1.0.0', undefined)).toBe(false);
  });
});
