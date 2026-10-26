import { describe, it, expect } from 'vitest';
import {
  MONEY_ERROR,
  parseMoneyToCents,
  toCents,
  parsePercentToHundredths,
  computeNetAmountCents,
  computeNetFromApi,
  formatCentsBRL,
  formatMoneyBRL,
  formatDiscountLine,
  formatDelinquencyRate,
  todayDateString,
  computeFirstCycle,
  currentYearMonth,
  timestampToBusinessDate,
  formatShortDate,
  formatFullDate,
  formatPaidAtDate,
  formatCyclePeriod,
  formatMonthYearShort,
  formatMonthLabel,
  isValidYearMonth,
  shiftYearMonth,
  firstDayOfNextMonth,
  normalizeForSearch,
} from './subscriptionHelpers';

const normalizeSpaces = (text) => text.replace(/\s/g, ' ');

describe('parseMoneyToCents', () => {
  it.each([
    ['1.234,56', 123456],
    ['1234,56', 123456],
    ['1234.56', 123456],
    ['99.90', 9990],
    ['99,9', 9990],
    ['0,01', 1],
    ['10.000', 1000000],
    ['R$ 15', 1500],
  ])('parses %s into %i cents', (input, expected) => {
    expect(parseMoneyToCents(input)).toEqual({ cents: expected, error: null });
  });

  it('rejects more than 2 decimals', () => {
    expect(parseMoneyToCents('0,001').error).toBe(MONEY_ERROR.DECIMALS);
  });

  it('rejects values above R$ 99.999.999,99', () => {
    expect(parseMoneyToCents('99.999.999,99').cents).toBe(9999999999);
    expect(parseMoneyToCents('100.000.000,00').error).toBe(MONEY_ERROR.MAX);
  });

  it('flags empty and malformed input', () => {
    expect(parseMoneyToCents('').error).toBe(MONEY_ERROR.EMPTY);
    expect(parseMoneyToCents('abc').error).toBe(MONEY_ERROR.INVALID);
    expect(parseMoneyToCents('-5').error).toBe(MONEY_ERROR.INVALID);
  });

  it('toCents converts API strings and tolerates null', () => {
    expect(toCents('270.00')).toBe(27000);
    expect(toCents(null)).toBeNull();
  });
});

describe('parsePercentToHundredths', () => {
  it('parses up to 2 decimals', () => {
    expect(parsePercentToHundredths('33,33')).toEqual({ hundredths: 3333, error: null });
    expect(parsePercentToHundredths('100')).toEqual({ hundredths: 10000, error: null });
  });

  it('rejects 3 decimals and values above 100', () => {
    expect(parsePercentToHundredths('33,333').error).toBe(MONEY_ERROR.DECIMALS);
    expect(parsePercentToHundredths('100,01').error).toBe(MONEY_ERROR.MAX);
  });
});

describe('computeNetAmountCents (backend parity, half-up)', () => {
  it('99,90 with 33,33% → R$ 66,60', () => {
    expect(computeNetAmountCents(9990, { percentHundredths: 3333 })).toBe(6660);
  });

  it('0,01 with 50% rounds half-up to R$ 0,01', () => {
    expect(computeNetAmountCents(1, { percentHundredths: 5000 })).toBe(1);
  });

  it('subtracts a fixed amount and never goes negative', () => {
    expect(computeNetAmountCents(9990, { discountCents: 1000 })).toBe(8990);
    expect(computeNetAmountCents(500, { discountCents: 1000 })).toBe(0);
  });

  it('returns the price without discount and null without price', () => {
    expect(computeNetAmountCents(9990)).toBe(9990);
    expect(computeNetAmountCents(null)).toBeNull();
  });

  it('computeNetFromApi reads API strings', () => {
    expect(computeNetFromApi({ price: '99.90', discountPercent: '33.33', discountAmount: null })).toBe(6660);
  });
});

describe('money display', () => {
  it('formats cents and API strings in pt-BR', () => {
    expect(normalizeSpaces(formatCentsBRL(123456))).toBe('R$ 1.234,56');
    expect(normalizeSpaces(formatMoneyBRL('99.90'))).toBe('R$ 99,90');
    expect(formatCentsBRL(null)).toBe('—');
  });

  it('builds the discount line', () => {
    expect(normalizeSpaces(formatDiscountLine(9990, { percentHundredths: 3333 }))).toBe('R$ 99,90 − 33,33%');
    expect(normalizeSpaces(formatDiscountLine(9990, { discountCents: 1000 }))).toBe('R$ 99,90 − R$ 10,00');
    expect(formatDiscountLine(9990)).toBeNull();
  });

  it('formats the delinquency rate with at most 1 decimal', () => {
    expect(formatDelinquencyRate(13.33)).toBe('13,3');
    expect(formatDelinquencyRate(0)).toBe('0');
  });
});

describe('business-timezone dates', () => {
  it('todayDateString uses São Paulo time, not UTC', () => {
    // 2026-10-06 01:30 UTC is still 2026-10-05 22:30 in São Paulo.
    expect(todayDateString(new Date('2026-10-06T01:30:00Z'))).toBe('2026-10-05');
    expect(currentYearMonth(new Date('2026-11-01T02:00:00Z'))).toBe('2026-10');
  });

  it('formats paidAt in São Paulo time (a payment after 21h keeps its day)', () => {
    expect(timestampToBusinessDate('2026-10-03T23:30:00-03:00')).toBe('2026-10-03');
    expect(formatPaidAtDate('2026-10-04T01:30:00Z', '2026-10-06')).toBe('03/10');
    expect(formatPaidAtDate(null)).toBe('—');
    expect(formatPaidAtDate('not-a-date')).toBe('—');
  });

  it('shows the year only when it differs from the current one', () => {
    expect(formatShortDate('2026-10-01', '2026-10-06')).toBe('01/10');
    expect(formatShortDate('2025-10-01', '2026-10-06')).toBe('01/10/2025');
    expect(formatShortDate(undefined)).toBe('—');
  });

  it('formats full dates, cycle periods and short month-years', () => {
    expect(formatFullDate('2026-01-31')).toBe('31/01/2026');
    expect(formatCyclePeriod('2026-10-01', '2026-10-31')).toBe('01/10 – 31/10/2026');
    expect(formatCyclePeriod('2025-12-15', '2026-01-14')).toBe('15/12/2025 – 14/01/2026');
    expect(formatMonthYearShort('2026-01-31')).toBe('jan/2026');
    expect(formatMonthYearShort(null)).toBe('—');
  });
});

describe('year-month helpers', () => {
  it('formats, validates and shifts months', () => {
    expect(formatMonthLabel('2026-10')).toBe('outubro de 2026');
    expect(isValidYearMonth('2026-13')).toBe(false);
    expect(isValidYearMonth('2026-01')).toBe(true);
    expect(shiftYearMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftYearMonth('2026-12', 1)).toBe('2027-01');
    expect(firstDayOfNextMonth('2026-12')).toBe('2027-01-01');
  });

  it('normalizeForSearch strips accents and case', () => {
    expect(normalizeForSearch('  João ')).toBe('joao');
  });
});

describe('computeFirstCycle (mirrors the backend billing-day rule)', () => {
  it.each([
    ['no billing day: cycle starts and is due on the start date', '2026-10-10', null, 'monthly', '2026-10-10', '2026-11-09', '2026-10-10'],
    ['no billing day clamps the end to the month length', '2026-01-31', null, 'monthly', '2026-01-31', '2026-02-27', '2026-01-31'],
    ['start after the billing day: cycle starts on D, due on the start date', '2026-10-10', 5, 'monthly', '2026-10-05', '2026-11-04', '2026-10-10'],
    ['start before the billing day: cycle starts the previous month', '2026-10-03', 5, 'monthly', '2026-09-05', '2026-10-04', '2026-10-03'],
    ['start on the billing day: due on that day', '2026-10-05', 5, 'monthly', '2026-10-05', '2026-11-04', '2026-10-05'],
    ['day 31 in a short month is the last day of the month', '2026-02-28', 31, 'monthly', '2026-02-28', '2026-03-30', '2026-02-28'],
    ['leap year: day 30 on Feb 29', '2028-02-29', 30, 'monthly', '2028-02-29', '2028-03-29', '2028-02-29'],
    ['quarterly day 31 clamps both ends without drift', '2026-11-30', 31, 'quarterly', '2026-11-30', '2027-02-27', '2026-11-30'],
  ])('%s', (_label, startDate, billingDay, recurrence, cycleStartDate, cycleEndDate, dueDate) => {
    expect(computeFirstCycle(startDate, billingDay, recurrence)).toEqual({ cycleStartDate, cycleEndDate, dueDate });
  });
});
