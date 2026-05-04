import { describe, it, expect } from 'vitest';
import shouldShowSparkline from './shouldShowSparkline';

describe('shouldShowSparkline', () => {
  it('returns false for null input', () => {
    expect(shouldShowSparkline(null, null)).toBe(false);
  });

  it('returns false for non-array input', () => {
    expect(shouldShowSparkline(undefined, null)).toBe(false);
    expect(shouldShowSparkline('foo', null)).toBe(false);
  });

  it('returns false for empty array', () => {
    expect(shouldShowSparkline([], null)).toBe(false);
  });

  it('returns false for fewer than 3 non-null values', () => {
    expect(shouldShowSparkline([80, null, null, null, null, null], null)).toBe(false);
    expect(shouldShowSparkline([80, 75, null, null, null, null], null)).toBe(false);
  });

  it('returns false for all-null array', () => {
    expect(shouldShowSparkline([null, null, null, null, null, null], null)).toBe(false);
  });

  describe('rule b — large recent delta (|pct| > 5)', () => {
    it('returns true when lastDeltaPct > 5', () => {
      expect(shouldShowSparkline([80, 75, 72, 70, 68, 65], 10)).toBe(true);
    });

    it('returns true when lastDeltaPct < -5', () => {
      expect(shouldShowSparkline([60, 65, 70, 72, 75, 80], -8)).toBe(true);
    });

    it('does not trigger for |pct| ≤ 5', () => {
      // monotonic ascending — should still be false (rule c won't fire either)
      // using perfectly linear so CV is low
      const linear = [80, 78, 76, 74, 72, 70];
      expect(shouldShowSparkline(linear, 3)).toBe(false);
    });
  });

  describe('rule a — direction change in last 3', () => {
    it('returns true for single dip (peak then drop)', () => {
      // most-recent first: 70, 80, 75 — went up then down
      expect(shouldShowSparkline([70, 80, 75, 72, 70, 68], null)).toBe(true);
    });

    it('returns true for recovery after plateau (plateau then jump)', () => {
      // most-recent first: 85, 70, 70 — flat then jumped
      expect(shouldShowSparkline([85, 70, 70, 70, 68, 65], null)).toBe(true);
    });

    it('returns false for pure ascending (monotonic — most recent first is descending)', () => {
      // ascending progression: [80, 78, 76, 74, 72, 70] most-recent-first
      // d1 = 80-78 = 2, d2 = 78-76 = 2 — same sign, no direction change
      // CV = low for small steps
      const ascending = [80, 78, 76, 74, 72, 70];
      expect(shouldShowSparkline(ascending, 2)).toBe(false);
    });

    it('returns false for pure descending (tight, low CV)', () => {
      // Slow linear decline most-recent-first: [78, 80, 82, 84, 86, 88]
      // mean ≈ 83, std ≈ 3.7, CV ≈ 0.045 — below 0.08 threshold.
      // No direction change (all deltas negative). delta% = -3 (≤5).
      const descending = [78, 80, 82, 84, 86, 88];
      expect(shouldShowSparkline(descending, -3)).toBe(false);
    });

    it('returns false for flat series', () => {
      const flat = [70, 70, 70, 70, 70, 70];
      expect(shouldShowSparkline(flat, 0)).toBe(false);
    });
  });

  describe('rule c — coefficient of variation > 0.08', () => {
    it('returns true for highly volatile series (big swings)', () => {
      // [100, 50, 90, 40, 80, 60] — CV well above 0.08
      expect(shouldShowSparkline([100, 50, 90, 40, 80, 60], 0)).toBe(true);
    });

    it('returns false for low-volatility linear series', () => {
      // Perfectly linear: [80,78,76,74,72,70], mean=75, std≈3.7, CV≈0.049
      const linear = [80, 78, 76, 74, 72, 70];
      expect(shouldShowSparkline(linear, 0)).toBe(false);
    });
  });

  describe('null-heavy series', () => {
    it('returns false when only 2 valid values among nulls', () => {
      expect(shouldShowSparkline([90, null, 70, null, null, null], null)).toBe(false);
    });

    it('uses only non-null values for CV when some are null', () => {
      // 4 valid values with high variance → should still show
      expect(shouldShowSparkline([100, null, 50, 90, null, 40], null)).toBe(true);
    });
  });
});
