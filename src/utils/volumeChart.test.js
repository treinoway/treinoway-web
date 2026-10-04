import { describe, it, expect } from 'vitest';
import {
  buildSessionAriaLabel,
  buildTickIndices,
  computeTooltipAnchor,
  computeValueLabelAlign,
  findKeyboardTarget,
  formatLongDate,
  formatShortDate,
  pickValueLabelIndices,
} from './volumeChart';

const session = (overrides = {}) => ({
  status: 'completed',
  volumeKg: 1000,
  hasLoad: true,
  pct: 100,
  sessionCount: 1,
  completedSets: 4,
  totalSets: 4,
  ...overrides,
});

/** 31 rest days with sessions placed at the given indices. */
const timeline = (sessionsByIndex) =>
  Array.from({ length: 31 }, (_, index) => ({
    date: `2026-09-${String(index + 1).padStart(2, '0')}`,
    session: sessionsByIndex[index] ?? null,
  }));

describe('date formatting', () => {
  it('formats axis and long dates in pt-BR', () => {
    expect(formatShortDate('2026-10-04')).toBe('4 out');
    expect(formatLongDate('2026-09-03')).toBe('Qui, 3 de set');
  });

  it('falls back to "-" for missing dates', () => {
    expect(formatShortDate(null)).toBe('-');
    expect(formatLongDate('')).toBe('-');
  });
});

describe('buildSessionAriaLabel', () => {
  it('includes date, status and volume', () => {
    expect(buildSessionAriaLabel('2026-09-03', session({ status: 'partial', volumeKg: 1700.4 })))
      .toBe('Qui, 3 de set: Treino parcial, 1.700 kg');
  });

  it('describes sessions without load and multi-session days', () => {
    expect(buildSessionAriaLabel('2026-09-03', session({ hasLoad: false, volumeKg: null, sessionCount: 2 })))
      .toBe('Qui, 3 de set: Treino completo, Sem carga registrada, 2 sessões');
  });
});

describe('buildTickIndices', () => {
  it('places weekly ticks anchored on the period end', () => {
    expect([...buildTickIndices(31)].sort((a, b) => a - b)).toEqual([2, 9, 16, 23, 30]);
  });

  it('always labels the single day of a one-day period', () => {
    expect([...buildTickIndices(1)]).toEqual([0]);
  });
});

describe('pickValueLabelIndices', () => {
  it('labels only the max and the latest bars', () => {
    const days = timeline({
      2: session({ volumeKg: 5000 }),
      10: session({ volumeKg: 9000 }),
      20: session({ volumeKg: 4000 }),
      29: session({ volumeKg: 6000 }),
    });
    expect([...pickValueLabelIndices(days)].sort((a, b) => a - b)).toEqual([10, 29]);
  });

  it('labels once when the latest bar is the max (ties go to the latest)', () => {
    const days = timeline({ 3: session({ volumeKg: 8000 }), 25: session({ volumeKg: 8000 }) });
    expect([...pickValueLabelIndices(days)]).toEqual([25]);
  });

  it('keeps only the max label when the latest would collide with it', () => {
    const days = timeline({ 27: session({ volumeKg: 9000 }), 29: session({ volumeKg: 3000 }) });
    expect([...pickValueLabelIndices(days)]).toEqual([27]);
  });

  it('does not label a latest session without load', () => {
    const days = timeline({ 5: session({ volumeKg: 9000 }), 29: session({ hasLoad: false, volumeKg: null }) });
    expect([...pickValueLabelIndices(days)]).toEqual([5]);
  });

  it('labels nothing when no session has load', () => {
    const days = timeline({ 5: session({ hasLoad: false, volumeKg: null }) });
    expect(pickValueLabelIndices(days).size).toBe(0);
  });
});

describe('edge alignment', () => {
  it('aligns value labels inward at the plot edges', () => {
    expect(computeValueLabelAlign(0, 31)).toBe('start');
    expect(computeValueLabelAlign(15, 31)).toBe('center');
    expect(computeValueLabelAlign(30, 31)).toBe('end');
  });

  it('anchors tooltips inward on the outer third', () => {
    expect(computeTooltipAnchor(3, 31)).toBe('left');
    expect(computeTooltipAnchor(15, 31)).toBe('center');
    expect(computeTooltipAnchor(27, 31)).toBe('right');
  });
});

describe('findKeyboardTarget', () => {
  const sessions = [2, 7, 20];

  it('moves to the next and previous session, clamped at the ends', () => {
    expect(findKeyboardTarget('ArrowRight', 2, sessions)).toBe(7);
    expect(findKeyboardTarget('ArrowLeft', 7, sessions)).toBe(2);
    expect(findKeyboardTarget('ArrowRight', 20, sessions)).toBe(20);
    expect(findKeyboardTarget('ArrowLeft', 2, sessions)).toBe(2);
  });

  it('jumps to the first and last session with Home and End', () => {
    expect(findKeyboardTarget('Home', 20, sessions)).toBe(2);
    expect(findKeyboardTarget('End', 2, sessions)).toBe(20);
  });

  it('ignores non-navigation keys', () => {
    expect(findKeyboardTarget('a', 2, sessions)).toBeNull();
  });
});
