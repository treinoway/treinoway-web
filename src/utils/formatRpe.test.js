import { describe, it, expect } from 'vitest';
import formatRpe from './formatRpe';

describe('formatRpe', () => {
  it('returns null for null', () => {
    expect(formatRpe(null)).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(formatRpe(undefined)).toBeNull();
  });

  it('returns null for NaN', () => {
    expect(formatRpe(NaN)).toBeNull();
  });

  it('formats integer RPE without decimal', () => {
    expect(formatRpe(7)).toBe('RPE 7');
    expect(formatRpe(10)).toBe('RPE 10');
    expect(formatRpe(1)).toBe('RPE 1');
  });

  it('formats float RPE with pt-BR comma', () => {
    expect(formatRpe(7.5)).toBe('RPE 7,5');
    expect(formatRpe(8.5)).toBe('RPE 8,5');
    expect(formatRpe(6.5)).toBe('RPE 6,5');
  });

  it('formats float that rounds to integer without decimal', () => {
    expect(formatRpe(7.0)).toBe('RPE 7');
  });

  it('rounds to 1 decimal place', () => {
    // 7.55 rounds to 7.6 at 1dp
    expect(formatRpe(7.55)).toBe('RPE 7,6');
    expect(formatRpe(7.54)).toBe('RPE 7,5');
  });

  it('handles edge values without clipping', () => {
    expect(formatRpe(0)).toBe('RPE 0');
    expect(formatRpe(11)).toBe('RPE 11');
  });
});
