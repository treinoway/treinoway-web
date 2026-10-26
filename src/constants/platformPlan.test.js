import { describe, it, expect } from 'vitest';
import { PLATFORM_PLAN_TIERS, isTierDowngrade } from './platformPlan';

describe('PLATFORM_PLAN_TIERS', () => {
  it('contains BETA', () => {
    expect(PLATFORM_PLAN_TIERS).toContain('BETA');
  });
});

describe('isTierDowngrade with BETA', () => {
  it.each([
    ['BETA', 'DIAMOND', false],
    ['BETA', 'PRO', true],
    ['BETA', 'FREE', true],
    ['FREE', 'BETA', false],
    ['DIAMOND', 'BETA', false],
  ])('isTierDowngrade(%s, %s) is %s', (current, next, expected) => {
    expect(isTierDowngrade(current, next)).toBe(expected);
  });
});
