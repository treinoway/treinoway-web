import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  PAYMENT_STATUS,
  deriveEffectivePaymentStatus,
  addMonthsToDateString,
  computeDiscountedAmount,
  todayDateString,
  formatMonthLabel,
  isDateInYearMonth,
  firstDayOfNextMonth,
  normalizeForSearch,
} from './subscriptionHelpers';

const FIXED_TODAY = new Date('2026-05-15T12:00:00Z');

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_TODAY);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('deriveEffectivePaymentStatus', () => {
  it('keeps paid status as paid', () => {
    const result = deriveEffectivePaymentStatus({
      status: 'paid',
      cycleEndDate: '2026-04-01',
    });
    expect(result).toBe(PAYMENT_STATUS.PAID);
  });

  it('marks pending with past cycleEndDate as overdue', () => {
    const result = deriveEffectivePaymentStatus({
      status: 'pending',
      cycleEndDate: '2026-04-30',
    });
    expect(result).toBe(PAYMENT_STATUS.OVERDUE);
  });

  it('keeps pending with future cycleEndDate as pending', () => {
    const result = deriveEffectivePaymentStatus({
      status: 'pending',
      cycleEndDate: '2026-06-01',
    });
    expect(result).toBe(PAYMENT_STATUS.PENDING);
  });

  it('returns pending when no payment is provided', () => {
    expect(deriveEffectivePaymentStatus(null)).toBe(PAYMENT_STATUS.PENDING);
  });
});

describe('addMonthsToDateString', () => {
  it('adds whole months without timezone drift', () => {
    expect(addMonthsToDateString('2026-01-15', 1)).toBe('2026-02-15');
    expect(addMonthsToDateString('2026-11-30', 3)).toBe('2027-02-28');
  });

  it('clamps to last day when target month has fewer days', () => {
    expect(addMonthsToDateString('2026-01-31', 1)).toBe('2026-02-28');
  });
});

describe('computeDiscountedAmount', () => {
  it('applies percent discount', () => {
    expect(computeDiscountedAmount(270, { discountPercent: 10 })).toBe(243);
  });

  it('applies amount discount', () => {
    expect(computeDiscountedAmount(270, { discountAmount: 30 })).toBe(240);
  });

  it('returns base price when no discount is provided', () => {
    expect(computeDiscountedAmount(270, {})).toBe(270);
  });

  it('returns null for invalid base price', () => {
    expect(computeDiscountedAmount('not-a-number', {})).toBeNull();
  });
});

describe('formatMonthLabel', () => {
  it('formats a year-month string in Portuguese', () => {
    expect(formatMonthLabel('2026-05')).toBe('Maio de 2026');
  });

  it('returns input for invalid format', () => {
    expect(formatMonthLabel('invalid')).toBe('invalid');
  });
});

describe('todayDateString', () => {
  it('returns the current date in YYYY-MM-DD form', () => {
    // Depending on locale offset, the value should still be 2026-05-15
    // because FIXED_TODAY is noon UTC on that date.
    expect(todayDateString()).toBe('2026-05-15');
  });
});

describe('isDateInYearMonth', () => {
  it('matches dates inside the same month', () => {
    expect(isDateInYearMonth('2026-05-15', '2026-05')).toBe(true);
  });

  it('rejects dates outside the month', () => {
    expect(isDateInYearMonth('2026-04-30', '2026-05')).toBe(false);
  });
});

describe('firstDayOfNextMonth', () => {
  it('returns the first day of the following month', () => {
    expect(firstDayOfNextMonth('2026-05')).toBe('2026-06-01');
    expect(firstDayOfNextMonth('2026-12')).toBe('2027-01-01');
  });
});

describe('normalizeForSearch', () => {
  it('lowercases and strips accents', () => {
    expect(normalizeForSearch('Joao Pessoa')).toBe('joao pessoa');
    expect(normalizeForSearch('  JOÃO  ')).toBe('joao');
  });
});
