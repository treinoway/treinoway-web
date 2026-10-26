import { describe, it, expect } from 'vitest';
import { computeFirstCycle, computeNextDueDate } from './subscriptionHelpers';

describe('computeNextDueDate', () => {
  it.each([
    ['2026-10-10', 5, 'monthly', '2026-11-05'],
    ['2026-10-03', 5, 'monthly', '2026-10-05'],
    ['2026-02-28', 31, 'monthly', '2026-03-31'],
    ['2026-11-30', 31, 'quarterly', '2027-02-28'],
    ['2026-10-10', null, 'monthly', '2026-11-10'],
    ['2026-01-31', null, 'monthly', '2026-02-28'],
  ])('start %s, day %s, %s → next due %s', (startDate, billingDay, recurrence, expected) => {
    expect(computeNextDueDate(computeFirstCycle(startDate, billingDay, recurrence))).toBe(expected);
  });

  it('rolls over the year end', () => {
    expect(computeNextDueDate({ cycleEndDate: '2026-12-31' })).toBe('2027-01-01');
  });
});
