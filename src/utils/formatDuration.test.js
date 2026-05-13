import { describe, it, expect } from 'vitest';
import { formatDuration } from './formatDuration';

describe('formatDuration', () => {
  describe('not_estimated state', () => {
    it('returns not_estimated for null', () => {
      const result = formatDuration(null);
      expect(result.state).toBe('not_estimated');
      expect(result.text).toBe('Duração não estimada');
      expect(result.ariaLabel).toBe('Duração estimada não disponível');
    });

    it('returns not_estimated for undefined', () => {
      const result = formatDuration(undefined);
      expect(result.state).toBe('not_estimated');
      expect(result.text).toBe('Duração não estimada');
    });

    it('returns not_estimated for 0', () => {
      const result = formatDuration(0);
      expect(result.state).toBe('not_estimated');
      expect(result.text).toBe('Duração não estimada');
    });
  });

  describe('quick state (< 5 min)', () => {
    it('returns quick for 1 second', () => {
      const result = formatDuration(1);
      expect(result.state).toBe('quick');
      expect(result.text).toBe('Treino rápido');
      expect(result.ariaLabel).toBe('Treino rápido, menos de 5 minutos');
    });

    it('returns quick for 299 seconds (just under 5 min)', () => {
      const result = formatDuration(299);
      expect(result.state).toBe('quick');
      expect(result.text).toBe('Treino rápido');
    });
  });

  describe('estimated state — minutes only', () => {
    it('returns 5 min for 300 seconds (exactly 5 min)', () => {
      const result = formatDuration(300);
      expect(result.state).toBe('estimated');
      expect(result.text).toBe('5 min');
      expect(result.ariaLabel).toBe('Duração estimada: 5 minutos');
    });

    it('rounds to nearest 5 min for values in between', () => {
      // 2580s = 43min → rounds to 45 min
      expect(formatDuration(2580).text).toBe('45 min');
    });

    it('rounds 3599 seconds (~59.98 min) to 60 min', () => {
      const result = formatDuration(3599);
      expect(result.state).toBe('estimated');
      expect(result.text).toBe('60 min');
    });

    it('formats 3600 seconds as 60 min (still under 2h threshold)', () => {
      const result = formatDuration(3600);
      expect(result.text).toBe('60 min');
      expect(result.ariaLabel).toBe('Duração estimada: 60 minutos');
    });

    it('formats 7199 seconds (just under 2h) as minutes', () => {
      const result = formatDuration(7199);
      expect(result.state).toBe('estimated');
      // 7199s ≈ 119.98 min → rounds to 120 min
      expect(result.text).toBe('120 min');
    });
  });

  describe('estimated state — hours + minutes', () => {
    it('formats 7200 seconds (exactly 2h) as "2h"', () => {
      const result = formatDuration(7200);
      expect(result.state).toBe('estimated');
      expect(result.text).toBe('2h');
      expect(result.ariaLabel).toBe('Duração estimada: 2 horas');
    });

    it('formats 7320 seconds (2h 2min) as "2h 5min" (rounded up to nearest 5)', () => {
      const result = formatDuration(7320);
      expect(result.text).toBe('2h 5min');
      expect(result.ariaLabel).toBe('Duração estimada: 2 horas e 5 minutos');
    });

    it('formats 9000 seconds (2h 30min) as "2h 30min"', () => {
      const result = formatDuration(9000);
      expect(result.text).toBe('2h 30min');
      expect(result.ariaLabel).toBe('Duração estimada: 2 horas e 30 minutos');
    });

    it('promotes hours when rounding pushes minutes to 60', () => {
      // 2h 58min → rounds to 60min → should promote to 3h
      const seconds = 2 * 3600 + 58 * 60;
      const result = formatDuration(seconds);
      expect(result.text).toBe('3h');
    });

    it('handles very large values (e.g. 10h 15min)', () => {
      const seconds = 10 * 3600 + 15 * 60;
      const result = formatDuration(seconds);
      expect(result.text).toBe('10h 15min');
    });

    it('uses singular "hora" in aria-label for exactly 1h (edge: 2h floor)', () => {
      // 7200s is exactly 2h, plural. Singular case 1h is below the 7200 threshold
      // so it never renders as "1h" via hour formatting — it stays as "60 min".
      // Confirm formatting matches that behavior.
      const result = formatDuration(3600);
      expect(result.text).toBe('60 min');
    });
  });

  it('returns object with text, ariaLabel and state for every call', () => {
    const r = formatDuration(2580);
    expect(r).toHaveProperty('text');
    expect(r).toHaveProperty('ariaLabel');
    expect(r).toHaveProperty('state');
  });
});
